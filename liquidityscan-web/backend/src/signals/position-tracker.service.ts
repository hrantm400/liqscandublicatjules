import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SignalsService, StoredSignal } from './signals.service';

/**
 * Tracks basic ACTIVE signals (SUPER_ENGULFING, RSI_DIVERGENCE, ICT_BIAS)
 * and automatically closes them based on dynamic rules.
 * 
 * Rules:
 * - WON (HIT_TP): Price moves +1.5% in favor of the signal.
 * - LOST (HIT_SL): Price moves -1.0% against the signal.
 * - EXPIRED: Signal is older than 24 hours.
 */
@Injectable()
export class PositionTrackerService implements OnModuleInit {
    private readonly logger = new Logger(PositionTrackerService.name);
    private isTracking = false;

    // Default basic tracking rules
    private readonly TP_PERCENT = 1.5; // +1.5% profit
    private readonly SL_PERCENT = 1.0; // -1.0% loss
    private readonly EXPIRY_HOURS = 24;

    constructor(private readonly signalsService: SignalsService) { }

    onModuleInit() {
        this.logger.log('PositionTrackerService initialized.');

        // Run tracker every 5 minutes
        setInterval(() => {
            this.trackActiveSignals().catch(err => this.logger.error(`Tracker error: ${err.message}`));
        }, 5 * 60 * 1000);

        // Run once on startup
        setTimeout(() => {
            this.trackActiveSignals().catch(err => this.logger.error(`Startup tracker error: ${err.message}`));
        }, 15000);
    }

    private async fetchCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
        const prices: Record<string, number> = {};
        if (symbols.length === 0) return prices;

        try {
            // Fetch all ticker prices from Binance (lighter than 24hr hr ticker)
            const res = await fetch('https://api.binance.com/api/v3/ticker/price');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { symbol: string; price: string }[];

            const symbolSet = new Set(symbols);
            for (const item of data) {
                if (symbolSet.has(item.symbol)) {
                    prices[item.symbol] = parseFloat(item.price);
                }
            }
        } catch (err) {
            this.logger.error(`Failed to fetch current prices: ${err.message}`);
        }
        return prices;
    }

    async trackActiveSignals() {
        if (this.isTracking) return;
        this.isTracking = true;

        try {
            // 1. Get all basic active signals
            const basicStrategies = ['SUPER_ENGULFING', 'RSI_DIVERGENCE', 'ICT_BIAS'];
            let activeSignals: StoredSignal[] = [];

            for (const strat of basicStrategies) {
                const signals = await this.signalsService.getSignals(strat);
                activeSignals = activeSignals.concat(signals.filter(s => s.status === 'ACTIVE'));
            }

            if (activeSignals.length === 0) {
                this.isTracking = false;
                return;
            }

            this.logger.log(`[Position Tracker] Evaluating ${activeSignals.length} active basic signals...`);

            // 2. Extract unique symbols
            const symbols = Array.from(new Set(activeSignals.map(s => s.symbol)));

            // 3. Fetch current prices
            const prices = await this.fetchCurrentPrices(symbols);

            let closedCount = 0;
            const now = Date.now();

            // 4. Evaluate each signal
            for (const sig of activeSignals) {
                const currentPrice = prices[sig.symbol];
                if (!currentPrice) continue;

                const entryPrice = sig.price;
                const detectedAt = new Date(sig.detectedAt).getTime();
                const hoursAlive = (now - detectedAt) / (1000 * 60 * 60);

                let isClosed = false;
                let newStatus = 'ACTIVE';
                let outcome = '';
                let pnlPercent = 0;

                // Calculate PnL %
                if (sig.signalType === 'BUY') {
                    pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
                } else if (sig.signalType === 'SELL') {
                    pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
                }

                if (pnlPercent >= this.TP_PERCENT) {
                    // HIT TP -> WON
                    isClosed = true;
                    newStatus = 'HIT_TP';
                    outcome = 'HIT_TP';
                } else if (pnlPercent <= -this.SL_PERCENT) {
                    // HIT SL -> LOST
                    isClosed = true;
                    newStatus = 'HIT_SL';
                    outcome = 'HIT_SL';
                } else if (hoursAlive >= this.EXPIRY_HOURS) {
                    // EXPIRED
                    isClosed = true;
                    newStatus = 'EXPIRED';
                    outcome = 'EXPIRED';
                }

                // Update signal if closed
                if (isClosed) {
                    await this.signalsService.updateSignalStatus({
                        id: sig.id,
                        status: newStatus,
                        outcome,
                        closedPrice: currentPrice,
                        closedAt: new Date(now).toISOString(),
                        pnlPercent: Math.round(pnlPercent * 100) / 100, // Round to 2 decimals
                    });
                    closedCount++;
                }
            }

            if (closedCount > 0) {
                this.logger.log(`[Position Tracker] Closed ${closedCount} signals.`);
            }

        } catch (err) {
            this.logger.error(`[Position Tracker] Error tracking signals: ${err.message}`);
        } finally {
            this.isTracking = false;
        }
    }
}
