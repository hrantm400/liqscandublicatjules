import { useQuery } from '@tanstack/react-query';

export interface CoinMarketData {
    id: string;
    symbol: string;
    name: string;
    market_cap_rank: number;
}

/**
 * Fetch top 300 coins market cap data from CoinGecko.
 * Returns a map of symbol (uppercase, e.g., 'BTC') to market cap rank.
 * Cached for 15 minutes to respect rate limits.
 */
async function fetchMarketCapRanks(): Promise<Map<string, number>> {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1');
        if (!res.ok) return new Map();
        const data: CoinMarketData[] = await res.json();
        
        const map = new Map<string, number>();
        for (const coin of data) {
            // CoinGecko symbols are lowercase ('btc'), we normalize to uppercase to match Binance ('BTCUSDT')
            map.set(coin.symbol.toUpperCase(), coin.market_cap_rank);
        }
        return map;
    } catch {
        return new Map();
    }
}

/**
 * React hook: provides market cap ranking data.
 * Returns { marketCapMap, getRank, isLoading }
 */
export function useMarketCapData() {
    const { data: marketCapMap = new Map<string, number>(), isLoading } = useQuery({
        queryKey: ['coingecko-market-caps'],
        queryFn: fetchMarketCapRanks,
        staleTime: 15 * 60 * 1000,    // 15 min cache
        refetchInterval: 15 * 60 * 1000,
    });

    const getRank = (symbol: string): number | null => {
        // Binance symbols are like BTCUSDT or BTCUSDT_PERP
        // We extract the base asset ('BTC') to match with CoinGecko
        let baseSymbol = symbol.replace('USDT', '').replace('_PERP', '').replace('PERP', '');
        return marketCapMap.get(baseSymbol) || null;
    };

    return { marketCapMap, getRank, isLoading };
}
