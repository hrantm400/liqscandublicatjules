import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignalStateService } from './signal-state.service';
import { SignalStatus, SignalResult } from '@prisma/client';
import { CandlesService } from '../candles/candles.service';

// Thresholds per strategy for extended scanning (if needed). Assuming standard thresholds for SE
const STRATEGY_CONFIG: Record<string, { tpPercent: number; slPercent: number; expiryCandleCount: number }> = {
    SUPER_ENGULFING: { tpPercent: 3.0, slPercent: 2.0, expiryCandleCount: 20 },
    ICT_BIAS: { tpPercent: 2.5, slPercent: 1.5, expiryCandleCount: 15 },
    RSI_DIVERGENCE: { tpPercent: 4.0, slPercent: 2.5, expiryCandleCount: 25 },
    STRATEGY_1: { tpPercent: 3.0, slPercent: 2.0, expiryCandleCount: 20 }, // Added strategy 1 fallback
};

const TF_MS: Record<string, number> = {
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
    '1w': 604800000,
};

interface BinanceTicker {
    symbol: string;
    price: string;
}

@Injectable()
export class LifecycleService implements OnModuleInit {
    private readonly logger = new Logger(LifecycleService.name);
    private intervalRef: ReturnType<typeof setInterval> | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly stateService: SignalStateService,
        private readonly candlesService: CandlesService,
    ) { }

    onModuleInit() {
        this.logger.log('Signal Lifecycle Service started — checking every 5 minutes');
        setTimeout(() => this.checkAllSignals(), 10_000); // 10s after startup
        this.intervalRef = setInterval(() => this.checkAllSignals(), 5 * 60 * 1000);
    }

    private async fetchAllPrices(): Promise<Map<string, number>> {
        return this.candlesService.getCurrentPrices();
    }

    async checkAllSignals(): Promise<void> {
        try {
            // Process PENDING and ACTIVE signals
            const processSignals = await (this.prisma as any).superEngulfingSignal.findMany({
                where: { lifecycleStatus: { in: ['PENDING', 'ACTIVE'] } },
            });

            if (processSignals.length === 0) {
                this.logger.log('Lifecycle check: 0 active/pending signals, nothing to do.');
                return;
            }

            this.logger.log(`Lifecycle check: processing ${processSignals.length} signals...`);

            const priceMap = await this.fetchAllPrices();
            if (priceMap.size === 0) {
                this.logger.warn('No prices fetched — skipping lifecycle check');
                return;
            }

            const now = new Date();
            let hitTp = 0, hitSl = 0, expired = 0, oppositeRev = 0, activated = 0;

            for (const signal of processSignals) {
                const currentPrice = priceMap.get(signal.symbol);
                if (currentPrice === undefined) continue;

                // 1. If PENDING, check if entry is confirmed
                if (signal.lifecycleStatus === 'PENDING') {
                    // Entry condition: price drops to entry zone (bull) or rallies to entry zone (bear)
                    const isBull = signal.direction === 'BULL';
                    const isBear = signal.direction === 'BEAR';
                    const touched = (isBull && currentPrice <= signal.se_entry_zone) ||
                        (isBear && currentPrice >= signal.se_entry_zone);

                    if (touched || Math.abs(currentPrice - signal.se_entry_zone) / signal.se_entry_zone < 0.001) {
                        await (this.prisma as any).superEngulfingSignal.update({
                            where: { id: signal.id },
                            data: {
                                lifecycleStatus: 'ACTIVE',
                                entryConfirmedAt: now
                            }
                        });
                        activated++;
                    } else if (signal.candles_tracked >= signal.max_candles) {
                        // Expire if it takes too long to enter
                        await this.stateService.transitionSignal(signal.id, SignalStatus.EXPIRED, {
                            closedPrice: currentPrice, pnlPercent: 0
                        });
                        await (this.prisma as any).superEngulfingSignal.update({
                            where: { id: signal.id },
                            data: { se_close_reason: 'EXPIRED' }
                        });
                        expired++;
                    } else {
                        await (this.prisma as any).superEngulfingSignal.update({
                            where: { id: signal.id },
                            data: { candles_tracked: { increment: 1 } }
                        });
                    }
                    continue;
                }

                // 2. ACTIVE SIGNALS LIFECYCLE
                const isBull = signal.direction === 'BULL';
                const isBear = signal.direction === 'BEAR';

                await (this.prisma as any).superEngulfingSignal.update({
                    where: { id: signal.id },
                    data: { candles_tracked: { increment: 1 } }
                });

                const candlesTracked = signal.candles_tracked + 1;
                let resolved = false;

                // Priority 1: Stop Loss
                if ((isBull && currentPrice <= signal.se_current_sl) || (isBear && currentPrice >= signal.se_current_sl)) {
                    await this.stateService.transitionSignal(signal.id, SignalStatus.COMPLETED, {
                        result: SignalResult.LOSS, closedPrice: currentPrice, pnlPercent: this.calcPnl(isBull, signal.se_entry_zone, currentPrice)
                    });
                    await (this.prisma as any).superEngulfingSignal.update({
                        where: { id: signal.id },
                        data: { se_close_price: currentPrice, se_close_reason: 'SL', closedAt: now }
                    });
                    hitSl++;
                    continue;
                }

                // Priority 2: Breakeven (2R)
                if (!signal.se_r_ratio_hit) {
                    if ((isBull && currentPrice >= signal.se_tp1) || (isBear && currentPrice <= signal.se_tp1)) {
                        await (this.prisma as any).superEngulfingSignal.update({
                            where: { id: signal.id },
                            data: {
                                se_current_sl: signal.se_entry_zone,
                                se_r_ratio_hit: true
                            }
                        });
                        this.logger.log(`Signal ${signal.id} hit 2R. Stop Loss moved to Breakeven (${signal.se_entry_zone}).`);
                        // continue processing because it could also hit TP2 in identical tick
                    }
                }

                // Priority 3: TP2 WIN
                if ((isBull && currentPrice >= signal.se_tp2) || (isBear && currentPrice <= signal.se_tp2)) {
                    await this.stateService.transitionSignal(signal.id, SignalStatus.COMPLETED, {
                        result: SignalResult.WIN, closedPrice: signal.se_tp2, pnlPercent: this.calcPnl(isBull, signal.se_entry_zone, signal.se_tp2)
                    });
                    await (this.prisma as any).superEngulfingSignal.update({
                        where: { id: signal.id },
                        data: { se_close_price: signal.se_tp2, se_close_reason: 'TP2', closedAt: now }
                    });
                    hitTp++;
                    continue;
                }

                // Priority 4: Opposite REV Closure
                if (signal.entryConfirmedAt) {
                    const oppositeDir = isBull ? 'BEAR' : 'BULL';
                    const oppositeRevSearch = await (this.prisma as any).superEngulfingSignal.findFirst({
                        where: {
                            symbol: signal.symbol,
                            timeframe: signal.timeframe,
                            direction: oppositeDir,
                            signalType: { in: ['rev_bull', 'rev_bull_plus', 'rev_bear', 'rev_bear_plus'] }, // Handle untransformed types
                            detectedAt: { gt: signal.entryConfirmedAt }
                        }
                    });

                    if (oppositeRevSearch) {
                        const closePrice = oppositeRevSearch.se_entry_zone;
                        const isWin = isBull ? closePrice > signal.se_entry_zone : closePrice < signal.se_entry_zone;

                        await this.stateService.transitionSignal(signal.id, SignalStatus.COMPLETED, {
                            result: isWin ? SignalResult.WIN : SignalResult.LOSS,
                            closedPrice: closePrice,
                            pnlPercent: this.calcPnl(isBull, signal.se_entry_zone, closePrice)
                        });

                        await (this.prisma as any).superEngulfingSignal.update({
                            where: { id: signal.id },
                            data: { se_close_price: closePrice, se_close_reason: 'OPPOSITE_REV', closedAt: now }
                        });
                        oppositeRev++;
                        continue;
                    }
                }

                // Priority 5: Expiry
                if (candlesTracked >= signal.max_candles) {
                    await this.stateService.transitionSignal(signal.id, SignalStatus.EXPIRED, {
                        closedPrice: currentPrice, pnlPercent: this.calcPnl(isBull, signal.se_entry_zone, currentPrice)
                    });
                    await (this.prisma as any).superEngulfingSignal.update({
                        where: { id: signal.id },
                        data: { se_close_reason: 'EXPIRED', closedAt: now }
                    });
                    expired++;
                    continue;
                }
            }

            this.logger.log(
                `SE Lifecycle check complete: ${activated} ACTIVATED, ${hitTp} HIT_TP, ${hitSl} HIT_SL, ${oppositeRev} OPP_REV, ${expired} EXPIRED.`
            );

            // ============================
            // ICT BIAS LIFECYCLE — Next Candle Body Close Validation
            // ============================
            const biasSignals = await (this.prisma as any).superEngulfingSignal.findMany({
                where: {
                    strategyType: 'ICT_BIAS',
                    lifecycleStatus: 'PENDING',
                    bias_level: { not: null },
                    bias_direction: { not: null },
                },
            });

            let biasWin = 0, biasFailed = 0;

            for (const bias of biasSignals) {
                try {
                    // Get the latest closed candles for this TF
                    const tfCandles = await this.candlesService.getKlines(bias.symbol, bias.timeframe, 5);
                    if (tfCandles.length < 2) continue;

                    // The bias was detected at bias.detectedAt — we need the NEXT closed candle after that
                    const biasDetectedMs = new Date(bias.detectedAt).getTime();
                    const tfMs = TF_MS[bias.timeframe] || 14400000;

                    // Find the first candle that opened AFTER the bias detection
                    const nextCandle = tfCandles.find(c => {
                        const candleOpenMs = new Date(c.openTime).getTime();
                        return candleOpenMs >= biasDetectedMs;
                    });

                    if (!nextCandle) continue; // Next candle hasn't formed yet

                    // Check if this candle is CLOSED (its open time + TF duration < now)
                    const candleCloseMs = new Date(nextCandle.openTime).getTime() + tfMs;
                    if (candleCloseMs > Date.now()) continue; // Still forming, wait

                    // BODY CLOSE VALIDATION — ignore wicks!
                    const nextClose = nextCandle.close;
                    let result: 'WIN' | 'FAILED';

                    if (bias.bias_direction === 'BULL') {
                        result = nextClose > bias.bias_level ? 'WIN' : 'FAILED';
                    } else {
                        result = nextClose < bias.bias_level ? 'WIN' : 'FAILED';
                    }

                    // Update signal
                    const signalResult = result === 'WIN' ? SignalResult.WIN : SignalResult.LOSS;
                    await this.stateService.transitionSignal(bias.id, SignalStatus.COMPLETED, {
                        result: signalResult,
                        closedPrice: nextClose,
                        pnlPercent: this.calcPnl(bias.bias_direction === 'BULL', bias.bias_level, nextClose),
                    });

                    await (this.prisma as any).superEngulfingSignal.update({
                        where: { id: bias.id },
                        data: {
                            bias_result: result,
                            bias_validated_at: new Date(),
                            closedAt: new Date(),
                            se_close_price: nextClose,
                        },
                    });

                    if (result === 'WIN') biasWin++;
                    else biasFailed++;
                } catch (err) {
                    this.logger.error(`Bias lifecycle error for ${bias.id}: ${err}`);
                }
            }

            if (biasSignals.length > 0) {
                this.logger.log(`Bias Lifecycle: ${biasWin} WIN, ${biasFailed} FAILED out of ${biasSignals.length} pending.`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Lifecycle check failed: ${msg}`);
        }
    }

    private calcPnl(isBull: boolean, entry: number, exit: number): number {
        if (!entry) return 0;
        return isBull ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
    }
}
