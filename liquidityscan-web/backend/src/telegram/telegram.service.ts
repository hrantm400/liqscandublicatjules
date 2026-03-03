import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '../prisma/prisma.service';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import * as fs from 'fs';
import * as path from 'path';
import { CandlesService, CandleDto } from '../candles/candles.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TelegramService.name);
    private bot: TelegramBot | null = null;
    private readonly isEnabled: boolean;
    private fontBuffer: Buffer | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly candlesService: CandlesService
    ) {
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
            const fontPath = path.join(process.cwd(), 'src', 'telegram', 'Roboto-Bold.ttf');
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

    private generateSvgChart(candles: CandleDto[], width: number, height: number, signalColor: string, entryPrice: number): string {
        if (!candles || candles.length === 0) return '';
        const min = Math.min(...candles.map(c => c.low));
        const max = Math.max(...candles.map(c => c.high));
        const range = max - min || 1;
        const padding = range * 0.15;
        const actualMin = min - padding;
        const actualMax = max + padding;
        const actualRange = actualMax - actualMin;

        // Reserve 100px on the right for price labels
        const chartWidth = width - 100;
        const candleWidth = chartWidth / candles.length;
        const spacing = candleWidth * 0.2;
        const rectWidth = candleWidth - spacing;

        let svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="${chartWidth}" height="${height}" viewBox="0 0 ${chartWidth} ${height}" style="position: absolute; top: 0; left: 0; display: flex;">`;
        let overlayHtml = '';

        // 1. Draw Grid Lines & Y-Axis Labels
        const numLabels = 3;
        for (let i = 0; i < numLabels; i++) {
            const priceVal = actualMax - (i * (actualRange / (numLabels - 1)));
            const y = height - ((priceVal - actualMin) / actualRange) * height;

            svgHtml += `<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="white" stroke-opacity="0.1" stroke-width="1" stroke-dasharray="4 4" />`;

            const formattedPrice = priceVal > 10 ? priceVal.toFixed(2) : priceVal > 0.1 ? priceVal.toFixed(4) : priceVal.toFixed(6);
            overlayHtml += `
            <div style="position: absolute; right: 0px; top: ${y - 8}px; width: 90px; display: flex; align-items: center;">
                <span style="color: rgba(255,255,255,0.5); font-size: 14px;">${formattedPrice}</span>
            </div>`;
        }

        // 2. Draw Entry Price Line (Dashed)
        const entryY = height - ((entryPrice - actualMin) / actualRange) * height;
        if (entryY >= 0 && entryY <= height) {
            svgHtml += `<line x1="0" y1="${entryY}" x2="${chartWidth}" y2="${entryY}" stroke="${signalColor}" stroke-width="2" stroke-dasharray="8 4" />`;
            const formattedEntry = entryPrice > 10 ? entryPrice.toFixed(2) : entryPrice > 0.1 ? entryPrice.toFixed(4) : entryPrice.toFixed(6);

            overlayHtml += `
            <div style="position: absolute; right: 0px; top: ${entryY - 12}px; width: 90px; height: 24px; background: rgba(${signalColor === '#13ec37' ? '19,236,55,0.2' : '255,59,48,0.2'}); border-radius: 4px; display: flex; align-items: center; padding-left: 8px;">
                <span style="color: ${signalColor}; font-size: 14px; font-weight: bold;">${formattedEntry}</span>
            </div>`;
        }

        // 3. Draw Candles
        candles.forEach((c, i) => {
            const x = i * candleWidth + spacing / 2;
            const color = c.close >= c.open ? '#13ec37' : '#ff3b30';

            const yHigh = height - ((c.high - actualMin) / actualRange) * height;
            const yLow = height - ((c.low - actualMin) / actualRange) * height;
            const yOpen = height - ((c.open - actualMin) / actualRange) * height;
            const yClose = height - ((c.close - actualMin) / actualRange) * height;

            const rectY = Math.min(yOpen, yClose);
            const rectH = Math.max(Math.abs(yClose - yOpen), 1);

            // Wick
            svgHtml += `<line x1="${x + rectWidth / 2}" y1="${yHigh}" x2="${x + rectWidth / 2}" y2="${yLow}" stroke="${color}" stroke-width="2" />`;
            // Body
            svgHtml += `<rect x="${x}" y="${rectY}" width="${rectWidth}" height="${rectH}" fill="${color}" />`;

            // Current Price Tracker (dot on the last candle)
            if (i === candles.length - 1) {
                svgHtml += `<circle cx="${x + rectWidth / 2}" cy="${yClose}" r="4" fill="${color}" />`;
            }
        });

        svgHtml += `</svg>`;

        // Return combined composition wrapped in a relative container
        return `
            <div style="position: relative; width: ${width}px; height: ${height}px; display: flex;">
                ${svgHtml}
                ${overlayHtml}
            </div>
        `;
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

        const candles = await this.candlesService.getKlines(symbol, timeframe, 50);
        const chartHtml = this.generateSvgChart(candles, 800, 200, color, price);

        const markupHtml = `
            <div style="display: flex; flex-direction: column; width: 800px; height: 500px; background: linear-gradient(135deg, #0b140d 0%, ${bgGradientStart} 100%); color: white; padding: 40px; font-family: 'Roboto'; border: 3px solid ${color}; box-sizing: border-box; border-radius: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; width: 100%;">
                    <div style="display: flex; align-items: center;">
                        <span style="font-size: 28px; font-weight: bold; color: rgba(255,255,255,0.6); margin-right: 10px;">LIQUIDITY</span>
                        <span style="font-size: 28px; font-weight: bold; color: white;">SCANNER</span>
                    </div>
                    <div style="display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size: 20px; color: ${color}; font-weight: bold; margin-right: 12px;">●</span>
                        <span style="font-size: 20px; color: rgba(255,255,255,0.9);">${strategyType.replace('_', ' ')}</span>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 20px;">
                     <div style="display: flex; font-size: 64px; font-weight: bold; letter-spacing: -2px; color: white;">
                        ${symbol}
                    </div>
                    <div style="display: flex; font-size: 36px; font-weight: bold; color: ${color}; letter-spacing: 2px;">
                        ${signalType.replace('_SIGNAL', '')}
                    </div>
                </div>

                <div style="display: flex; width: 100%; height: 200px; margin-top: 10px;">
                    ${chartHtml}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 10px;">
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 16px; color: rgba(255,255,255,0.5); margin-bottom: 5px; letter-spacing: 1px;">ENTRY PRICE</span>
                        <span style="font-size: 32px; font-weight: bold; color: white;">$${price}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                        <span style="font-size: 16px; color: rgba(255,255,255,0.5); margin-bottom: 5px; letter-spacing: 1px;">TIMEFRAME</span>
                        <span style="font-size: 32px; font-weight: bold; color: white;">${timeframe}</span>
                    </div>
                </div>
            </div>
        `;

        const markup = html(markupHtml as any);

        try {
            const svg = await satori(markup, {
                width: 800,
                height: 500,
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
