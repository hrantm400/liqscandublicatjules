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
            // ONLY load properties that are ACTIVE in the new lifecycle
            const activeSignals = await (this.prisma as any).superEngulfingSignal.findMany({
                where: { lifecycleStatus: 'ACTIVE' },
            });

            if (activeSignals.length === 0) {
                this.logger.log('Lifecycle check: 0 active signals, nothing to do.');
                return;
            }

            this.logger.log(`Lifecycle check: processing ${activeSignals.length} active signals...`);

            const priceMap = await this.fetchAllPrices();
            if (priceMap.size === 0) {
                this.logger.warn('No prices fetched — skipping lifecycle check');
                return;
            }

            const now = new Date();
            let hitTp = 0, hitSl = 0, expired = 0;

            for (const signal of activeSignals) {
                const config = STRATEGY_CONFIG[signal.strategyType] || STRATEGY_CONFIG.SUPER_ENGULFING;
                const signalPrice = Number(signal.price);
                const currentPrice = priceMap.get(signal.symbol);

                if (currentPrice === undefined || signalPrice === 0) continue;

                const isBuy = signal.signalType === 'BUY';
                const pnl = isBuy
                    ? ((currentPrice - signalPrice) / signalPrice) * 100
                    : ((signalPrice - currentPrice) / signalPrice) * 100;

                // Priority 1: Take Profit
                if (pnl >= config.tpPercent) {
                    await this.stateService.transitionSignal(signal.id, SignalStatus.COMPLETED, {
                        result: SignalResult.WIN, closedPrice: currentPrice, pnlPercent: pnl
                    });
                    hitTp++;
                    continue;
                }

                // Priority 2: Stop Loss
                if (pnl <= -config.slPercent) {
                    await this.stateService.transitionSignal(signal.id, SignalStatus.COMPLETED, {
                        result: SignalResult.LOSS, closedPrice: currentPrice, pnlPercent: pnl
                    });
                    hitSl++;
                    continue;
                }

                // Priority 3: Expiry
                const tfMs = TF_MS[signal.timeframe.toLowerCase()] || TF_MS['4h'];
                const expiryTime = new Date(signal.detectedAt).getTime() + config.expiryCandleCount * tfMs;
                if (now.getTime() >= expiryTime) {
                    await this.stateService.transitionSignal(signal.id, SignalStatus.EXPIRED, {
                        closedPrice: currentPrice, pnlPercent: pnl
                    });
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
}
