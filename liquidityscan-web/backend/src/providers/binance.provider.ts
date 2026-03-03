import { Logger } from '@nestjs/common';
import { IExchangeProvider, IKline } from './data-provider.interface';

export class BinanceProvider implements IExchangeProvider {
    private readonly logger = new Logger(BinanceProvider.name);

    async fetchSymbols(): Promise<string[]> {
        try {
            const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
            if (!res.ok) throw new Error(`Failed to fetch exchange info: ${res.statusText}`);
            const data = await res.json();
            const symbols = (data.symbols as any[])
                .filter((s) => s.status === 'TRADING' && s.quoteAsset === 'USDT' && (s.contractType === 'PERPETUAL' || s.contractType === 'TRADIFI_PERPETUAL'))
                .map((s) => s.symbol);
            return symbols;
        } catch (error) {
            this.logger.error(`Error fetching symbols from Binance: ${error.message}`);
            return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
        }
    }

    async getKlines(symbol: string, interval: string, limit: number): Promise<IKline[]> {
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Binance HTTP ${res.status} for ${symbol} on ${interval}`);
        }
        const data = await res.json();
        return data.map((d: any[]) => ({
            openTime: d[0],
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5]),
        }));
    }

    async getCurrentPrices(): Promise<Map<string, number>> {
        const map = new Map<string, number>();
        try {
            const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/price');
            if (!res.ok) {
                this.logger.error(`Binance ticker API returned ${res.status}`);
                return map;
            }
            const tickers = await res.json();
            for (const t of tickers) {
                map.set(t.symbol, parseFloat(t.price));
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to fetch Binance prices: ${msg}`);
        }
        return map;
    }
}
