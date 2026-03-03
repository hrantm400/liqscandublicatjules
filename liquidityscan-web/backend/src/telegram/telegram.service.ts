import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '../prisma/prisma.service';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TelegramService.name);
    private bot: TelegramBot | null = null;
    private readonly isEnabled: boolean;
    private fontBuffer: Buffer | null = null;

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

        // Load the font file for Satori
        try {
            const fontPath = path.join(__dirname, 'Roboto-Bold.ttf');
            if (fs.existsSync(fontPath)) {
                this.fontBuffer = fs.readFileSync(fontPath);
            } else {
                this.logger.warn(`Font file not found at ${fontPath}. Signal Image Generation might fail.`);
            }
        } catch (err) {
            this.logger.error(`Failed to load font: ${err.message}`);
        }

        // Handle /start command
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const responseText = `👋 *Welcome to LiquidityScan Custom Alerts!*\n\n` +
                `Your unique Telegram Chat ID is:\n\`${chatId}\`\n\n` +
                `Go to the **Custom Alerts** page on the website and enter this ID to connect your account. After that, you'll receive instant alerts for any coins and strategies you track!`;

            this.bot?.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
        });

        // Handle incoming errors to prevent crashes
        this.bot.on('polling_error', (error: any) => {
            if (error.code === 'EFATAL' || error.message?.includes('ETIMEDOUT')) {
                // Telegram long-polling timeouts are normal, just log as debug
                this.logger.debug(`Telegram polling timeout (auto-reconnecting)...`);
            } else {
                this.logger.error(`Polling error: ${error.message || error}`);
            }
        });
    }

    onModuleDestroy() {
        if (this.bot) {
            this.bot.stopPolling();
            this.logger.log('Telegram Bot stopped');
        }
    }

    /**
     * Generates a beautiful "Trading Card" style image for the signal using Satori & resvg-js.
     */
    private async generateSignalCard(
        symbol: string,
        strategyType: string,
        timeframe: string,
        signalType: string,
        price: number
    ): Promise<Buffer | null> {
        if (!this.fontBuffer) return null;

        const isBuy = signalType.includes('BUY');
        const color = isBuy ? '#13ec37' : '#ff3b30'; // Primary green / Red
        const bgGradientStart = isBuy ? '#0a1f0f' : '#1f0a0a';

        const markup = html`
            <div style="display: flex; flex-direction: column; width: 800px; height: 418px; background: linear-gradient(135deg, #0b140d 0%, ${bgGradientStart} 100%); color: white; padding: 40px; font-family: 'Roboto'; border: 2px solid #1f2923; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; width: 100%;">
                    <div style="display: flex; align-items: center;">
                        <span style="font-size: 24px; font-weight: bold; color: rgba(255,255,255,0.6); margin-right: 10px;">LIQUIDITY</span>
                        <span style="font-size: 24px; font-weight: bold; color: white;">SCANNER</span>
                    </div>
                    <div style="display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 5px 15px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size: 16px; color: ${color}; font-weight: bold; margin-right: 8px;">•</span>
                        <span style="font-size: 16px; color: rgba(255,255,255,0.8);">${strategyType.replace('_', ' ')}</span>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; align-items: center; width: 100%;">
                    <div style="display: flex; font-size: 80px; font-weight: bold; letter-spacing: -2px; margin-bottom: 10px; color: white;">
                        ${symbol}
                    </div>
                    <div style="display: flex; font-size: 40px; font-weight: bold; color: ${color}; letter-spacing: 2px;">
                        ${signalType}
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 16px; color: rgba(255,255,255,0.5); margin-bottom: 5px;">ENTRY PRICE</span>
                        <span style="font-size: 32px; font-weight: bold; color: white;">$${price}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                        <span style="font-size: 16px; color: rgba(255,255,255,0.5); margin-bottom: 5px;">TIMEFRAME</span>
                        <span style="font-size: 32px; font-weight: bold; color: white;">${timeframe}</span>
                    </div>
                </div>
            </div>
        `;

        try {
            const svg = await satori(markup as any, {
                width: 800,
                height: 418,
                fonts: [
                    {
                        name: 'Roboto',
                        data: this.fontBuffer,
                        weight: 700,
                        style: 'normal',
                    }
                ],
            });

            const resvg = new Resvg(svg, {
                background: '#0b140d',
                font: { loadSystemFonts: false }
            });

            const pngData = resvg.render();
            return pngData.asPng();
        } catch (err) {
            this.logger.error(`Failed to generate Satori image: ${err.message}`);
            return null;
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
            // Find all ACTIVE subscriptions matching this symbol and strategy
            const subs = await this.prisma.alertSubscription.findMany({
                where: { symbol, strategyType, isActive: true },
                include: { user: true }
            });

            if (subs.length === 0) return;

            const directionEmoji = signalType.includes('BUY') ? '🟢' : '🔴';
            const directionKey = signalType.includes('BUY') ? 'BUY' : 'SELL';

            const message =
                `${directionEmoji} *NEW SIGNAL ALERT* ${directionEmoji}\n\n` +
                `🪙 *Asset:* #${symbol}\n` +
                `📊 *Strategy:* ${strategyType.replace('_', ' ')}\n` +
                `⏳ *Timeframe:* ${timeframe}\n` +
                `📈 *Direction:* ${signalType}\n` +
                `💲 *Price:* ${price}\n\n` +
                `[Open Monitor Dashboard](http://173.249.3.156:8080)`;

            const imageBuffer = await this.generateSignalCard(symbol, strategyType, timeframe, signalType, price);

            let msgsSent = 0;
            let skipped = 0;
            for (const sub of subs) {
                // --- Apply rich filters ---
                // 1. Timeframe filter
                if (sub.timeframes && Array.isArray(sub.timeframes)) {
                    if (!(sub.timeframes as string[]).includes(timeframe)) {
                        skipped++;
                        continue;
                    }
                }

                // 2. Direction filter
                if (sub.directions && Array.isArray(sub.directions)) {
                    if (!(sub.directions as string[]).includes(directionKey)) {
                        skipped++;
                        continue;
                    }
                }

                // Send alert if user has associated their telegramId
                if (sub.user.telegramId) {
                    try {
                        if (imageBuffer) {
                            await this.bot.sendPhoto(
                                sub.user.telegramId,
                                imageBuffer,
                                {
                                    caption: message,
                                    parse_mode: 'Markdown'
                                },
                                {
                                    filename: 'signal.png',
                                    contentType: 'image/png',
                                }
                            );
                        } else {
                            // Fallback to text only if image fails
                            await this.bot.sendMessage(sub.user.telegramId, message, { parse_mode: 'Markdown' });
                        }
                        msgsSent++;
                    } catch (e) {
                        this.logger.error(`Failed to send telegram alert to ${sub.user.telegramId}: ${e.message}`, e.stack);
                    }
                }
            }

            this.logger.log(`Sent ${msgsSent} Telegram alerts for ${symbol} via ${strategyType} (skipped ${skipped} by filters)`);
        } catch (err) {
            this.logger.error(`Error sending signal alert block: ${err.message}`);
        }
    }
}
