import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// FREE tier allowed symbols
const FREE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'XAUUSDT', 'XAGUSDT'];

// FREE tier daily quotas
const FREE_RSI_QUOTA = 1;
const FREE_BIAS_QUOTA = 1;

export interface TierInfo {
    tier: string;
    isPaid: boolean;
    canUseTelegram: boolean;
    symbolsAllowed: 'ALL' | string[];
    rsiQuota: number | null;    // null = unlimited
    biasQuota: number | null;
    rsiUsed: number;
    biasUsed: number;
    historyDays: number | null; // null = unlimited
}

@Injectable()
export class PricingService {
    private readonly logger = new Logger(PricingService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get full tier info for a user
     */
    async getTierInfo(userId: string): Promise<TierInfo> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Reset daily quota if needed
        await this.resetDailyQuotaIfNeeded(userId);

        const isPaid = user.tier !== 'FREE';

        return {
            tier: user.tier,
            isPaid,
            canUseTelegram: isPaid,
            symbolsAllowed: isPaid ? 'ALL' : FREE_SYMBOLS,
            rsiQuota: isPaid ? null : FREE_RSI_QUOTA,
            biasQuota: isPaid ? null : FREE_BIAS_QUOTA,
            rsiUsed: user.dailyRsiUsed,
            biasUsed: user.dailyBiasUsed,
            historyDays: isPaid ? null : 1, // Free = 24h only
        };
    }

    /**
     * Check if user can access a specific symbol
     */
    async canAccessSymbol(userId: string, symbol: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return false;
        if (user.tier !== 'FREE') return true;
        return FREE_SYMBOLS.includes(symbol.toUpperCase());
    }

    /**
     * Check if user can view more RSI signals today
     */
    async canViewRsi(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return false;
        if (user.tier !== 'FREE') return true;
        await this.resetDailyQuotaIfNeeded(userId);
        const fresh = await this.prisma.user.findUnique({ where: { id: userId } });
        return (fresh?.dailyRsiUsed ?? 0) < FREE_RSI_QUOTA;
    }

    /**
     * Check if user can view more Bias signals today
     */
    async canViewBias(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return false;
        if (user.tier !== 'FREE') return true;
        await this.resetDailyQuotaIfNeeded(userId);
        const fresh = await this.prisma.user.findUnique({ where: { id: userId } });
        return (fresh?.dailyBiasUsed ?? 0) < FREE_BIAS_QUOTA;
    }

    /**
     * Increment daily RSI usage
     */
    async incrementRsi(userId: string): Promise<void> {
        await this.resetDailyQuotaIfNeeded(userId);
        await this.prisma.user.update({
            where: { id: userId },
            data: { dailyRsiUsed: { increment: 1 } },
        });
    }

    /**
     * Increment daily Bias usage
     */
    async incrementBias(userId: string): Promise<void> {
        await this.resetDailyQuotaIfNeeded(userId);
        await this.prisma.user.update({
            where: { id: userId },
            data: { dailyBiasUsed: { increment: 1 } },
        });
    }

    /**
     * Check if user can use Telegram alerts
     */
    async canUseTelegram(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        return user ? user.tier !== 'FREE' : false;
    }

    /**
     * Upgrade user tier after payment
     */
    async upgradeTier(userId: string, plan: 'PAID_MONTHLY' | 'PAID_ANNUAL'): Promise<void> {
        const durationDays = plan === 'PAID_ANNUAL' ? 365 : 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                tier: plan,
                subscriptionStatus: 'active',
                subscriptionExpiresAt: expiresAt,
            },
        });

        this.logger.log(`User ${userId} upgraded to ${plan}, expires ${expiresAt.toISOString()}`);
    }

    /**
     * Check and expire subscriptions past their expiry date (run via cron)
     */
    async expireOverdueSubscriptions(): Promise<number> {
        const now = new Date();
        const { count } = await this.prisma.user.updateMany({
            where: {
                tier: { not: 'FREE' },
                subscriptionExpiresAt: { lt: now },
            },
            data: {
                tier: 'FREE',
                subscriptionStatus: 'expired',
            },
        });
        if (count > 0) {
            this.logger.log(`Expired ${count} overdue subscriptions`);
        }
        return count;
    }

    /**
     * Reset daily quotas at midnight UTC
     */
    private async resetDailyQuotaIfNeeded(userId: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return;

        const now = new Date();
        const resetAt = user.dailyQuotaResetAt;
        const nowDay = now.toISOString().substring(0, 10);
        const resetDay = resetAt.toISOString().substring(0, 10);

        if (nowDay !== resetDay) {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    dailyRsiUsed: 0,
                    dailyBiasUsed: 0,
                    dailyQuotaResetAt: now,
                },
            });
        }
    }
}
