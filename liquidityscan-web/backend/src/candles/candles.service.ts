import { Injectable } from '@nestjs/common';

const BINANCE_KLINES_URL = 'https://fapi.binance.com/fapi/v1/klines';

/** Valid Binance interval strings (our frontend uses 5m, 15m, 1h, 4h, 1d, 1w). */
const VALID_INTERVALS = new Set([
  '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M',
]);

export interface CandleDto {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class CandlesService {
  private cache = new Map<string, { timestamp: number, data: CandleDto[] }>();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  /**
   * Fetch klines from Binance and normalize to CandleDto[].
   * Includes a 30s memory cache to dramatically reduce API rate limit weight.
   */
  async getKlines(symbol: string, interval: string, limit = 500): Promise<CandleDto[]> {
    const sym = (symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const int = (interval || '4h').toLowerCase();
    if (!sym) return [];
    const intervalParam = VALID_INTERVALS.has(int) ? int : '4h';
    const limitParam = Math.min(Math.max(1, Number(limit) || 500), 1000);

    const cacheKey = `${sym}_${intervalParam}_${limitParam}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `${BINANCE_KLINES_URL}?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(intervalParam)}&limit=${limitParam}`;
      const headers: HeadersInit = {};
      const apiKey = process.env.BINANCE_API_KEY;
      if (apiKey) {
        headers['X-MBX-APIKEY'] = apiKey;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[candles] Binance klines error:', res.status, await res.text().catch(() => ''));
        }
        return [];
      }
      const raw: unknown = await res.json();
      if (!Array.isArray(raw)) return [];

      const out: CandleDto[] = [];
      for (const row of raw) {
        if (!Array.isArray(row) || row.length < 6) continue;
        const openTime = Number(row[0]);
        const open = Number(row[1]);
        const high = Number(row[2]);
        const low = Number(row[3]);
        const close = Number(row[4]);
        const volume = Number(row[5]) || 0;
        if (!Number.isFinite(openTime) || !Number.isFinite(close)) continue;
        out.push({ openTime, open, high, low, close, volume });
      }

      this.cache.set(cacheKey, { timestamp: Date.now(), data: out });
      return out;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[candles] Binance fetch error:', msg);
      }
      return [];
    }
  }
}
