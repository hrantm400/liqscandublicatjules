import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
    constructor(private readonly prisma: PrismaService) { }

    async getUserAlerts(userId: string) {
        return this.prisma.alertSubscription.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createAlert(
        userId: string,
        symbol: string,
        strategyType: string,
        timeframes?: string[],
        directions?: string[],
        minWinRate?: number,
    ) {
        if (!symbol || !strategyType) {
            throw new BadRequestException('Symbol and strategyType are required');
        }

        try {
            return await this.prisma.alertSubscription.create({
                data: {
                    userId,
                    symbol,
                    strategyType,
                    timeframes: timeframes || null,
                    directions: directions || null,
                    minWinRate: minWinRate || null,
                },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException('You are already tracking this coin with this strategy');
            }
            throw error;
        }
    }

    async updateAlert(
        userId: string,
        alertId: string,
        data: {
            timeframes?: string[];
            directions?: string[];
            minWinRate?: number;
            isActive?: boolean;
        },
    ) {
        const alert = await this.prisma.alertSubscription.findUnique({
            where: { id: alertId },
        });

        if (!alert) {
            throw new NotFoundException('Alert subscription not found');
        }

        if (alert.userId !== userId) {
            throw new BadRequestException('You do not own this alert subscription');
        }

        return this.prisma.alertSubscription.update({
            where: { id: alertId },
            data: {
                timeframes: data.timeframes !== undefined ? data.timeframes : undefined,
                directions: data.directions !== undefined ? data.directions : undefined,
                minWinRate: data.minWinRate !== undefined ? data.minWinRate : undefined,
                isActive: data.isActive !== undefined ? data.isActive : undefined,
            },
        });
    }

    async deleteAlert(userId: string, alertId: string) {
        const alert = await this.prisma.alertSubscription.findUnique({
            where: { id: alertId },
        });

        if (!alert) {
            throw new NotFoundException('Alert subscription not found');
        }

        if (alert.userId !== userId) {
            throw new BadRequestException('You do not own this alert subscription');
        }

        await this.prisma.alertSubscription.delete({
            where: { id: alertId },
        });

        return { success: true };
    }

    async saveTelegramId(userId: string, telegramId: string) {
        if (!telegramId) {
            throw new BadRequestException('telegramId is required');
        }

        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: { telegramId },
            });
            return { success: true };
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException('This Telegram ID is already linked to another account');
            }
            throw error;
        }
    }

    async getTelegramId(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { telegramId: true },
        });
        return { telegramId: user?.telegramId || null };
    }
}
