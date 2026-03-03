import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IExchangeProvider, IKline } from '../providers/data-provider.interface';
import { BinanceProvider } from '../providers/binance.provider';
import { CoinrayProvider } from '../providers/coinray.provider';
import { DataProvider } from '@prisma/client';

export type CandleDto = IKline;

@Injectable()
export class CandlesService {
  private readonly logger = new Logger(CandlesService.name);
  private binanceProvider = new BinanceProvider();
  private coinrayProvider = new CoinrayProvider();

  private cache = new Map<string, { timestamp: number, data: CandleDto[] }>();
  private readonly CACHE_TTL_MS = 15000; // 15 seconds

  constructor(private readonly prisma: PrismaService) { }

  private async getProvider(): Promise<IExchangeProvider> {
    try {
      const settings = await this.prisma.settings.findUnique({ where: { id: 'singleton' } });
      if (settings?.activeProvider === DataProvider.COINRAY) {
        return this.coinrayProvider;
      }
    } catch (err) {
      this.logger.error(`Failed to get settings, defaulting to Binance: ${err.message}`);
    }
    return this.binanceProvider; // Default
  }

  async getKlines(symbol: string, interval: string, limit = 500): Promise<CandleDto[]> {
    const sym = (symbol || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
    const limitParam = Math.min(Math.max(1, Number(limit) || 500), 1000);

    const cacheKey = `${sym}_${interval}_${limitParam}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const provider = await this.getProvider();
      const out = await provider.getKlines(sym, interval, limitParam);
      this.cache.set(cacheKey, { timestamp: Date.now(), data: out });
      return out;
    } catch (err) {
      this.logger.warn(`Provider fetch error for ${sym} ${interval}: ${err.message}`);
      return [];
    }
  }

  async fetchSymbols(): Promise<string[]> {
    try {
      const provider = await this.getProvider();
      return await provider.fetchSymbols();
    } catch (err) {
      this.logger.warn(`Failed to fetch symbols: ${err.message}`);
      return ['BTCUSDT', 'ETHUSDT'];
    }
  }

  async getCurrentPrices(): Promise<Map<string, number>> {
    try {
      const provider = await this.getProvider();
      return await provider.getCurrentPrices();
    } catch (err) {
      this.logger.warn(`Failed to fetch current prices: ${err.message}`);
      return new Map();
    }
  }
}
