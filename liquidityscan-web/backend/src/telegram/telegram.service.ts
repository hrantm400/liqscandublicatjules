import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TelegramService.name);
    private bot: TelegramBot | null = null;
    private readonly isEnabled: boolean;

    constructor(private readonly prisma: PrismaService) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        this.isEnabled = !!token;

        if (this.isEnabled && token) {
            // Use polling for local/simple deployments, configure webhooks for high scale if needed
            this.bot = new TelegramBot(token, { polling: true });
        } else {
            this.logger.warn('TELEGRAM_BOT_TOKEN not provided, alerting is disabled.');
        }
    }

    onModuleInit() {
        if (!this.bot) return;

        this.logger.log('Telegram Bot initialized');

        // Handle /start command
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const responseText = `👋 *Welcome to LiquidityScan Custom Alerts!*\n\n` +
                `Your unique Telegram Chat ID is:\n\`${chatId}\`\n\n` +
                `Go to the **Custom Alerts** page on the website and enter this ID to connect your account. After that, you'll receive instant alerts for any coins and strategies you track!`;

            this.bot?.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
        });

        // Handle incoming errors to prevent crashes
        this.bot.on('polling_error', (error) => {
            this.logger.error(`Polling error: ${error.message}`);
        });
    }

    onModuleDestroy() {
        if (this.bot) {
            this.bot.stopPolling();
            this.logger.log('Telegram Bot stopped');
        }
    }

    /**
     * Dispatch a strategy signal to all users who subscribed to this exact symbol + strategy combination
     */
    async sendSignalAlert(
        symbol: string,
        strategyType: string,
        timeframe: string,
        signalType: string,
        price: number
    ) {
        if (!this.bot) return;

        try {
            // Find all subscriptions matching this symbol and strategy
            const subs = await this.prisma.alertSubscription.findMany({
                where: { symbol, strategyType },
                include: { user: true }
            });

            if (subs.length === 0) return;

            const directionEmoji = signalType.includes('BUY') ? '🟢' : '🔴';

            const message =
                `${directionEmoji} *NEW SIGNAL ALERT* ${directionEmoji}\n\n` +
                `🪙 *Asset:* #${symbol}\n` +
                `📊 *Strategy:* ${strategyType.replace('_', ' ')}\n` +
                `⏳ *Timeframe:* ${timeframe}\n` +
                `📈 *Direction:* ${signalType}\n` +
                `💲 *Price:* ${price}\n\n` +
                `[Open Monitor Dashboard](http://173.249.3.156:8080)`;

            let msgsSent = 0;
            for (const sub of subs) {
                // Send alert if user has associated their telegramId
                if (sub.user.telegramId) {
                    try {
                        await this.bot.sendMessage(sub.user.telegramId, message, { parse_mode: 'Markdown' });
                        msgsSent++;
                    } catch (e) {
                        this.logger.error(`Failed to send telegram alert to ${sub.user.telegramId}: ${e.message}`);
                    }
                }
            }

            this.logger.log(`Sent ${msgsSent} Telegram alerts for ${symbol} via ${strategyType}`);
        } catch (err) {
            this.logger.error(`Error sending signal alert block: ${err.message}`);
        }
    }
}
