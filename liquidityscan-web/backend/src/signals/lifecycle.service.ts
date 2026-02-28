import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Thresholds per strategy
const STRATEGY_CONFIG: Record<string, { tpPercent: number; slPercent: number; expiryCandleCount: number }> = {
    SUPER_ENGULFING: { tpPercent: 3.0, slPercent: 2.0, expiryCandleCount: 20 },
    ICT_BIAS: { tpPercent: 2.5, slPercent: 1.5, expiryCandleCount: 15 },
    RSI_DIVERGENCE: { tpPercent: 4.0, slPercent: 2.5, expiryCandleCount: 25 },
};

// Timeframe to milliseconds
const TF_MS: Record<string, number> = {
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

    constructor(private readonly prisma: PrismaService) { }

    onModuleInit() {
        this.logger.log('Signal Lifecycle Service started — checking every 5 minutes');
        // Run immediately on start, then every 5 minutes
        setTimeout(() => this.checkAllSignals(), 10_000); // 10s after startup
        this.intervalRef = setInterval(() => this.checkAllSignals(), 5 * 60 * 1000);
    }

    /**
     * Fetch all current Binance prices in a single call.
     */
    private async fetchAllPrices(): Promise<Map<string, number>> {
        const map = new Map<string, number>();
        try {
            const res = await fetch('https://api.binance.com/api/v3/ticker/price');
            if (!res.ok) {
                this.logger.error(`Binance ticker API returned ${res.status}`);
                return map;
            }
            const tickers: BinanceTicker[] = await res.json() as BinanceTicker[];
            for (const t of tickers) {
                map.set(t.symbol, parseFloat(t.price));
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to fetch Binance prices: ${msg}`);
        }
        return map;
    }

    /**
     * Check all active signals against current prices and update outcomes.
     */
    async checkAllSignals(): Promise<void> {
        try {
            // 1. Load all ACTIVE signals
            const activeSignals = await (this.prisma as any).superEngulfingSignal.findMany({
                where: { status: 'ACTIVE' },
            });

            if (activeSignals.length === 0) {
                this.logger.log('Lifecycle check: 0 active signals, nothing to do.');
                return;
            }

            this.logger.log(`Lifecycle check: processing ${activeSignals.length} active signals...`);

            // 2. Fetch current prices from Binance
            const priceMap = await this.fetchAllPrices();
            if (priceMap.size === 0) {
                this.logger.warn('No prices fetched — skipping lifecycle check');
                return;
            }

            const now = new Date();
            let hitTp = 0, hitSl = 0, expired = 0;

            // 3. Process each signal
            for (const signal of activeSignals) {
                const config = STRATEGY_CONFIG[signal.strategyType] || STRATEGY_CONFIG.SUPER_ENGULFING;
                const signalPrice = Number(signal.price);
                const currentPrice = priceMap.get(signal.symbol);

                if (currentPrice === undefined || signalPrice === 0) continue;

                // Calculate PnL based on direction
                const isBuy = signal.signalType === 'BUY';
                const pnl = isBuy
                    ? ((currentPrice - signalPrice) / signalPrice) * 100
                    : ((signalPrice - currentPrice) / signalPrice) * 100;

                // Check TP
                if (pnl >= config.tpPercent) {
                    await this.closeSignal(signal.id, 'HIT_TP', currentPrice, pnl, now);
                    hitTp++;
                    continue;
                }

                // Check SL
                if (pnl <= -config.slPercent) {
                    await this.closeSignal(signal.id, 'HIT_SL', currentPrice, pnl, now);
                    hitSl++;
                    continue;
                }

                // Check Expiry
                const tfMs = TF_MS[signal.timeframe.toLowerCase()] || TF_MS['4h'];
                const expiryTime = new Date(signal.detectedAt).getTime() + config.expiryCandleCount * tfMs;
                if (now.getTime() >= expiryTime) {
                    await this.closeSignal(signal.id, 'EXPIRED', currentPrice, pnl, now);
                    expired++;
                    continue;
                }
            }

            this.logger.log(
                `Lifecycle check complete: ${hitTp} HIT_TP, ${hitSl} HIT_SL, ${expired} EXPIRED, ` +
                `${activeSignals.length - hitTp - hitSl - expired} still ACTIVE`,
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Lifecycle check failed: ${msg}`);
        }
    }

    /**
     * Update a signal's status in the database.
     */
    private async closeSignal(
        id: string,
        outcome: string,
        closedPrice: number,
        pnlPercent: number,
        closedAt: Date,
    ): Promise<void> {
        try {
            await (this.prisma as any).superEngulfingSignal.update({
                where: { id },
                data: {
                    status: outcome,
                    outcome,
                    closedPrice,
                    pnlPercent: Math.round(pnlPercent * 100) / 100, // Round to 2 decimals
                    closedAt,
                },
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to close signal ${id}: ${msg}`);
        }
    }
}
