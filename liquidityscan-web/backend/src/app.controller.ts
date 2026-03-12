import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  private cachedCmcData: any = null;
  private lastFetchTime: number = 0;
  private readonly CMC_CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache to preserve basic 10k/mo limits

  @Get('cmc/ranks')
  async getCmcRanks() {
    const now = Date.now();
    if (this.cachedCmcData && now - this.lastFetchTime < this.CMC_CACHE_TTL) {
      return this.cachedCmcData; // Return RAM Cache
    }

    try {
      const apiKey = process.env.CMCAPIKEY;
      if (!apiKey) {
        throw new Error('CMCAPIKEY is missing from environment');
      }

      // Fetch top 300 coins, sorted by market cap
      const response = await fetch(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=300&sort=market_cap&sort_dir=desc',
        {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CMC API error: ${response.statusText}`);
      }

      const rawData = await response.json();
      
      // We process symbols to map them identical to the CoinGecko expected response structure 
      // where frontend just loops and maps `symbol.toUpperCase()` to `market_cap_rank`
      let rankCounter = 1;
      const mappedData = (rawData.data || []).map((coin: any) => {
        return {
          id: coin.slug,
          symbol: coin.symbol,
          name: coin.name,
          market_cap_rank: rankCounter++
        };
      });

      this.cachedCmcData = mappedData;
      this.lastFetchTime = now;

      return this.cachedCmcData;

    } catch (error) {
      console.error('[CMC Proxy] Error fetching market caps:', error);
      // Fallback to stale cache if available, otherwise return empty array
      return this.cachedCmcData || [];
    }
  }
}
