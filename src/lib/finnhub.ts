// TradeMaster Pro - Finnhub API Integration with Rate Limiting

import { FinnhubQuoteResponse, MarketData } from '@/types';

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  callsPerMinute: 60, // Finnhub free tier limit
  batchSize: 2, // Process 2 symbols at a time
  delayBetweenBatches: 1500, // 1.5 seconds between batches
  delayBetweenCalls: 1000, // 1 second between individual calls
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds retry delay
};

class RateLimiter {
  private lastCallTime = 0;
  private callCount = 0;
  private resetTime = Date.now() + 60000; // Reset every minute

  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if minute has passed
    if (now > this.resetTime) {
      this.callCount = 0;
      this.resetTime = now + 60000;
    }

    // Check if we've hit the rate limit
    if (this.callCount >= RATE_LIMIT_CONFIG.callsPerMinute) {
      const waitTime = this.resetTime - now;
      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await this.delay(waitTime);
      this.callCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    // Wait if too soon since last call
    const timeSinceLastCall = now - this.lastCallTime;
    if (timeSinceLastCall < RATE_LIMIT_CONFIG.delayBetweenCalls) {
      const waitTime = RATE_LIMIT_CONFIG.delayBetweenCalls - timeSinceLastCall;
      await this.delay(waitTime);
    }

    this.lastCallTime = Date.now();
    this.callCount++;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class FinnhubAPI {
  private apiKey: string;
  private rateLimiter: RateLimiter;

  constructor() {
    // For client-side usage, we need to get the API key from localStorage or pass it explicitly
    this.apiKey = '';
    this.rateLimiter = new RateLimiter();
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    if (!this.apiKey) {
      console.warn('Finnhub API key not set');
    }
  }

  private async makeRequest<T>(url: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not configured');
    }

    await this.rateLimiter.waitForRateLimit();

    const fullUrl = `https://finnhub.io/api/v1${url}&token=${this.apiKey}`;
    
    try {
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log('Rate limit hit, waiting longer...');
          await this.delay(RATE_LIMIT_CONFIG.retryDelay);
          return this.makeRequest<T>(url);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`API error: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error('Finnhub API request failed:', error);
      throw error;
    }
  }

  async getQuote(symbol: string): Promise<MarketData> {
    try {
      // Check if API key is available
      if (!this.apiKey) {
        throw new Error('Finnhub API key not configured');
      }

      const response = await this.makeRequest<FinnhubQuoteResponse>(`/quote?symbol=${symbol}`);
      
      return {
        symbol,
        price: response.c,
        change: response.d,
        change_percent: response.dp,
        timestamp: new Date(response.t * 1000).toISOString(),
      };
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error);
      throw error;
    }
  }


  async getMultipleQuotes(symbols: string[]): Promise<MarketData[]> {
    const results: MarketData[] = [];
    const batches = this.createBatches(symbols, RATE_LIMIT_CONFIG.batchSize);

    console.log(`Fetching quotes for ${symbols.length} symbols in ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} symbols`);

      // Process batch concurrently
      const batchPromises = batch.map(async (symbol) => {
        try {
          return await this.getQuote(symbol);
        } catch (error) {
          console.error(`Failed to fetch quote for ${symbol}:`, error);
          return {
            symbol,
            price: 0,
            change: 0,
            change_percent: 0,
            timestamp: new Date().toISOString(),
            error: true,
          } as MarketData & { error: boolean };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Wait between batches (except for the last one)
      if (i < batches.length - 1) {
        console.log(`Waiting ${RATE_LIMIT_CONFIG.delayBetweenBatches}ms before next batch...`);
        await this.delay(RATE_LIMIT_CONFIG.delayBetweenBatches);
      }
    }

    return results.filter(result => !('error' in result));
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getQuote('AAPL');
      return true;
    } catch (error) {
      console.error('Finnhub API connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const finnhubAPI = new FinnhubAPI();

// Helper functions for market data
export const marketDataUtils = {
  async getCurrentPrices(symbols: string[]): Promise<Record<string, MarketData>> {
    try {
      const marketData = await finnhubAPI.getMultipleQuotes(symbols);
      return marketData.reduce((acc, data) => {
        acc[data.symbol] = data;
        return acc;
      }, {} as Record<string, MarketData>);
    } catch (error) {
      console.error('Failed to get current prices:', error);
      return {};
    }
  },

  async getSinglePrice(symbol: string): Promise<MarketData | null> {
    try {
      return await finnhubAPI.getQuote(symbol);
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error);
      return null;
    }
  },

  formatPrice(price: number): string {
    return price.toFixed(2);
  },

  formatChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  },

  formatChangePercent(changePercent: number): string {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  },

  getChangeColor(change: number): string {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  },
};

export default finnhubAPI;
