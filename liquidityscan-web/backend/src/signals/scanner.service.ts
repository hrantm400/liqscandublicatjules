import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CandlesService } from '../candles/candles.service';
import { SignalsService, WebhookSignalInput } from './signals.service';
import {
    calculateRSI,
    detectICTBias,
    detectRSIDivergence,
    detectSuperEngulfing,
    detectCRT,
    CandleData,
} from './indicators';

import { checkStrategy1 as checkStrategy1Indicator } from './strategy1.indicator';

@Injectable()
export class ScannerService implements OnModuleInit {
    private readonly logger = new Logger(ScannerService.name);
    private isScanningBasic = false;
    private isScanningStrategy1 = false;

    // --- Live bias cache (TTL 60 seconds per timeframe) ---
    private liveBiasCache = new Map<string, {
        timestamp: number;
        data: Record<string, { bias: string; prevHigh: number; prevLow: number; direction: string }>;
    }>();
    private static readonly BIAS_CACHE_TTL_MS = 60_000;

    constructor(
        private readonly candlesService: CandlesService,
        private readonly signalsService: SignalsService,
    ) { }

    /**
     * Compute live ICT bias for every unique ICT_BIAS symbol in the given timeframe.
     * Results are cached for 60 seconds to avoid hammering Binance.
     */
    async getLiveBias(
        timeframe: string,
    ): Promise<Record<string, { bias: string; prevHigh: number; prevLow: number; direction: string }>> {
        // Check cache
        const cached = this.liveBiasCache.get(timeframe);
        if (cached && Date.now() - cached.timestamp < ScannerService.BIAS_CACHE_TTL_MS) {
            return cached.data;
        }

        // Get unique symbols that have ICT_BIAS signals for this timeframe from DB
        let symbols: string[] = [];
        try {
            const rows = await (this.signalsService as any).prisma.superEngulfingSignal.findMany({
                where: { strategyType: 'ICT_BIAS', timeframe },
                select: { symbol: true },
                distinct: ['symbol'],
            });
            symbols = rows.map((r: any) => r.symbol as string);
        } catch (err) {
            this.logger.error(`Failed to query ICT_BIAS symbols: ${err}`);
            return {};
        }

        if (symbols.length === 0) return {};

        this.logger.log(`[LiveBias] Computing live ${timeframe} bias for ${symbols.length} symbols...`);

        // Batch fetch with concurrency limit of 10
        const CONCURRENCY = 10;
        const result: Record<string, { bias: string; prevHigh: number; prevLow: number; direction: string }> = {};

        for (let i = 0; i < symbols.length; i += CONCURRENCY) {
            const batch = symbols.slice(i, i + CONCURRENCY);
            const promises = batch.map(async (symbol) => {
                try {
                    const klines = await this.candlesService.getKlines(symbol, timeframe, 5);
                    const candles: CandleData[] = klines.map(k => ({
                        openTime: k.openTime, open: k.open, high: k.high,
                        low: k.low, close: k.close, volume: k.volume,
                    }));
                    const sig = detectICTBias(candles);
                    if (sig) {
                        result[symbol] = {
                            bias: sig.bias,
                            prevHigh: sig.prevHigh,
                            prevLow: sig.prevLow,
                            direction: sig.direction,
                        };
                    }
                } catch (err) {
                    this.logger.warn(`[LiveBias] Failed for ${symbol}: ${err}`);
                }
            });
            await Promise.all(promises);
        }

        // Store in cache
        this.liveBiasCache.set(timeframe, { timestamp: Date.now(), data: result });
        this.logger.log(`[LiveBias] Cached ${Object.keys(result).length} results for ${timeframe}`);

        return result;
    }

    onModuleInit() {
        this.logger.log('ScannerService initialized.');
        // Start scanning loop - run every 30 minutes (1800000 ms)
        setInterval(() => {
            this.scanBasicStrategies().catch((err) => this.logger.error(`Basic scan error: ${err.message}`));
        }, 30 * 60 * 1000);

        // Strategy 1 scanning loop - run every 5 minutes (300000 ms)
        setInterval(() => {
            this.scanStrategy1All().catch((err) => this.logger.error(`Strategy 1 scan error: ${err.message}`));
        }, 5 * 60 * 1000);

        // Run both once on startup after a slight delay
        setTimeout(() => {
            this.scanBasicStrategies().catch((err) => this.logger.error(`Startup basic scan error: ${err.message}`));
            this.scanStrategy1All().catch((err) => this.logger.error(`Startup Strategy 1 scan error: ${err.message}`));
        }, 10000);
    }

    /**
     * Fetch all trading pairs from the active Data Provider.
     */
    async fetchSymbols(): Promise<string[]> {
        return this.candlesService.fetchSymbols();
    }

    async scanBasicStrategies() {
        if (this.isScanningBasic) {
            this.logger.warn('Basic scan already in progress, skipping...');
            return;
        }
        this.isScanningBasic = true;
        const start = Date.now();

        try {
            const symbols = await this.fetchSymbols();
            if (symbols.length === 0) {
                this.logger.warn('No symbols found to scan.');
                return;
            }
            this.logger.log(`Starting scan for ${symbols.length} symbols (chunked)...`);

            let signalCount = 0;
            const CHUNK_SIZE = 15; // Increased safely for active provider 
            const DELAY_MS = 500; // Decreased delay for faster completion

            for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
                const chunk = symbols.slice(i, i + CHUNK_SIZE);
                // Process chunk in parallel
                const results = await Promise.all(chunk.map(s => this.scanSymbol(s)));
                signalCount += results.reduce((a, b) => a + b, 0);

                // Progress log every 50 symbols
                if ((i + CHUNK_SIZE) % 50 === 0) {
                    this.logger.log(`Scanned ${i + CHUNK_SIZE}/${symbols.length} symbols...`);
                }

                // Rate limit delay
                if (i + CHUNK_SIZE < symbols.length) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            }

            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            this.logger.log(`Scan completed in ${elapsed}s. Found ${signalCount} new signals.`);
        } catch (err) {
            this.logger.error(`Basic scan failed: ${err.message}`);
        } finally {
            this.isScanningBasic = false;
        }
    }

    private async scanSymbol(symbol: string): Promise<number> {
        let count = 0;
        try {
            // 1. Super Engulfing (4h, 1d, 1w)
            for (const tf of ['4h', '1d', '1w']) {
                count += await this.checkSuperEngulfing(symbol, tf);
            }

            // 2. ICT Bias (4h, 1d, 1w)
            for (const tf of ['4h', '1d', '1w']) {
                count += await this.checkICTBias(symbol, tf);
            }

            // 3. RSI Divergence (1h, 4h, 1d)
            for (const tf of ['1h', '4h', '1d']) {
                count += await this.checkRSIDivergence(symbol, tf);
            }

            // 4. CRT (4h, 1d, 1w)
            for (const tf of ['4h', '1d', '1w']) {
                count += await this.checkCRT(symbol, tf);
            }


        } catch (e) {
            // safely ignore individual symbol errors to keep scanning
        }
        return count;
    }

    private async scanStrategy1All() {
        if (this.isScanningStrategy1) {
            this.logger.warn('Strategy 1 scan already in progress, skipping...');
            return;
        }
        this.isScanningStrategy1 = true;
        const start = Date.now();

        try {
            const symbols = await this.fetchSymbols();
            if (symbols.length === 0) return;
            this.logger.log(`Starting 5-min Strategy 1 scan for ${symbols.length} symbols...`);

            let signalCount = 0;
            const CHUNK_SIZE = 15; // Increased to speed up 5-min scans
            const DELAY_MS = 100; // 100ms is perfectly fine for most private APIs

            for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
                const chunk = symbols.slice(i, i + CHUNK_SIZE);
                const results = await Promise.all(chunk.map(symbol => this.checkStrategy1Signal(symbol)));
                signalCount += results.reduce((a, b) => a + b, 0);

                if (i + CHUNK_SIZE < symbols.length) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            }

            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            this.logger.log(`Strategy 1 scan completed in ${elapsed}s. Found ${signalCount} new signals.`);
        } catch (err) {
            this.logger.error(`Strategy 1 scan failed: ${err.message}`);
        } finally {
            this.isScanningStrategy1 = false;
        }
    }

    private async getCandles(symbol: string, interval: string): Promise<CandleData[]> {
        const klines = await this.candlesService.getKlines(symbol, interval, 120); // Increased for RSI divergence lookback
        return klines.map(k => ({
            openTime: k.openTime,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
        }));
    }

    private async saveSignal(
        strategyType: string,
        symbol: string,
        timeframe: string,
        signalType: string,
        price: number,
        detectedAt: number,
        metadata?: Record<string, any>,
    ) {
        const id = `${strategyType}-${symbol}-${timeframe}-${detectedAt}`;

        const input = {
            id,
            strategyType,
            symbol,
            timeframe,
            signalType, // BUY / SELL
            price,
            detectedAt: new Date(detectedAt).toISOString(),
            lifecycleStatus: 'PENDING',
            status: 'PENDING', // deprecated, kept for safety
            metadata,
        };

        return this.signalsService.addSignals([input]);
    }

    // --- Strategies ---

    private async checkSuperEngulfing(symbol: string, timeframe: string): Promise<number> {
        const candles = await this.getCandles(symbol, timeframe);
        const closedCandles = candles.slice(0, -1);

        if (closedCandles.length < 2) return 0;

        const confirmedSignals = detectSuperEngulfing(closedCandles);

        let added = 0;
        for (const sig of confirmedSignals) {
            added += await this.saveSignal(
                'SUPER_ENGULFING', symbol, timeframe, sig.direction, sig.price, sig.time,
                {
                    pattern: sig.pattern,
                    direction: sig.direction === 'BUY' ? 'BULL' : 'BEAR',
                    se_entry_zone: sig.entryZone,
                    se_sl: sig.sl,
                    se_tp1: sig.tp1,
                    se_tp2: sig.tp2,
                    se_current_sl: sig.sl
                }
            );
        }
        return added;
    }

    private async checkICTBias(symbol: string, timeframe: string): Promise<number> {
        const candles = await this.getCandles(symbol, timeframe);

        // detectICTBias uses candles[last] as current forming, [last-1] as Candle B, [last-2] as Candle A
        // Do NOT slice — the forming candle must stay in the array
        const sig = detectICTBias(candles);
        if (!sig || sig.bias === 'RANGING') return 0;

        const signalType = sig.direction === 'NEUTRAL' ? 'BUY' : sig.direction;
        const biasDirection = sig.bias === 'BULLISH' ? 'BULL' : 'BEAR';
        // bias_level = the close of the candle that confirmed bias
        const biasLevel = candles[candles.length - 2].close;

        // Use stable ID (no timestamp) + upsert: only 1 bias per symbol+timeframe
        const stableId = `ICT_BIAS-${symbol}-${timeframe}`;
        return this.signalsService.upsertSignal({
            id: stableId,
            strategyType: 'ICT_BIAS',
            symbol,
            timeframe,
            signalType,
            price: candles[candles.length - 1].close,
            detectedAt: new Date(sig.time).toISOString(),
            lifecycleStatus: 'ACTIVE',
            metadata: {
                bias: sig.bias,
                prevHigh: sig.prevHigh,
                prevLow: sig.prevLow,
                bias_direction: biasDirection,
                bias_level: biasLevel,
            },
        });
    }

    private async checkRSIDivergence(symbol: string, timeframe: string): Promise<number> {
        const candles = await this.getCandles(symbol, timeframe);
        const closedCandles = candles.slice(0, -1);
        if (closedCandles.length < 30) return 0; // Need history for RSI

        const lbR = 5; // Must match the pivot lookback-right used in detectRSIDivergence
        const signals = detectRSIDivergence(closedCandles);

        // The latest possible confirmed pivot is at index (closedCandles.length - 1 - lbR)
        // because a pivot needs lbR bars to the right for confirmation.
        // Save signals from the most recently confirmed pivot window.
        const latestPivotIndex = closedCandles.length - 1 - lbR;

        let added = 0;
        for (const sig of signals) {
            // Save signals where the pivot is at the latest confirmable position
            if (sig.barIndex >= latestPivotIndex) {
                const signalType = sig.type.includes('bullish') ? 'BUY' : 'SELL';
                await this.saveSignal(
                    'RSI_DIVERGENCE', symbol, timeframe, signalType, sig.price, sig.time,
                    {
                        divergenceType: sig.type,
                        rsiValue: sig.rsiValue,
                        // Pivot coordinates for drawing divergence lines on chart
                        pivotBarIndex: sig.barIndex,
                        pivotPrice: sig.price,
                        pivotTime: closedCandles[sig.barIndex]?.openTime,
                        prevPivotBarIndex: sig.prevBarIndex,
                        prevPivotPrice: sig.prevPrice,
                        prevPivotRsiValue: sig.prevRsiValue,
                        prevPivotTime: closedCandles[sig.prevBarIndex]?.openTime,
                    }
                );
                added++;
            }
        }
        return added;
    }



    private async checkCRT(symbol: string, timeframe: string): Promise<number> {
        const candles = await this.getCandles(symbol, timeframe);
        const closedCandles = candles.slice(0, -1);

        if (closedCandles.length < 2) return 0;

        const sig = detectCRT(closedCandles);
        if (!sig) return 0;

        return this.saveSignal(
            'CRT', symbol, timeframe, sig.direction, sig.price, sig.time,
            {
                crt_direction: sig.direction === 'BUY' ? 'BULLISH' : 'BEARISH',
                swept_level: sig.sweptLevel,
                prev_high: sig.prevHigh,
                prev_low: sig.prevLow,
                sweep_extreme: sig.sweepExtreme,
            }
        );
    }



    private async checkStrategy1Signal(symbol: string): Promise<number> {
        try {
            // Get 4H candles (need at least 15 including forming candle)
            const candles4H = await this.candlesService.getKlines(symbol, '4h', 20);
            if (candles4H.length < 15) return 0;

            // Get 5M candles (need recent ones for break detection)
            const candles5M = await this.candlesService.getKlines(symbol, '5m', 120);
            if (candles5M.length < 30) return 0;

            // Map to CandleData format
            const mapped4H: CandleData[] = candles4H.map(k => ({
                openTime: k.openTime, open: k.open, high: k.high,
                low: k.low, close: k.close, volume: k.volume,
            }));
            const mapped5M: CandleData[] = candles5M.map(k => ({
                openTime: k.openTime, open: k.open, high: k.high,
                low: k.low, close: k.close, volume: k.volume,
            }));

            const signal = checkStrategy1Indicator(mapped4H, mapped5M);
            if (!signal) return 0;

            // Use SE candle time for dedup — prevents duplicate signals for same SE pattern
            const signalId = `STRATEGY_1-${symbol}-5m-${signal.seTime}`;

            const input = {
                id: signalId,
                strategyType: 'STRATEGY_1',
                symbol,
                timeframe: '5m',
                signalType: signal.direction,
                price: signal.price,
                detectedAt: new Date(signal.time).toISOString(),
                status: 'ACTIVE',
                metadata: {
                    sePattern: signal.sePattern,
                    seDirection: signal.seDirection,
                    breakLevel: signal.breakLevel,
                    session: signal.session,
                    stopLoss: signal.stopLoss,
                    tp1: signal.tp1,
                    tp2: signal.tp2,
                    riskPercent: signal.riskPercent,
                    label: signal.label,
                    seTime: signal.seTime,
                },
            };

            return this.signalsService.addSignals([input]);
        } catch (e) {
            return 0;
        }
    }
}
