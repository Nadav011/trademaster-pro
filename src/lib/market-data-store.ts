'use client'

/**
 * Centralized Market Data Store
 * 
 * This store manages all market data with a single refresh interval
 * to prevent excessive API calls and improve performance.
 * 
 * Features:
 * - Single 10-minute refresh interval for all data
 * - Subscription system for components to react to updates
 * - Manual refresh with rate limiting (minimum 30 seconds between calls)
 * - Automatic caching and deduplication
 * - Error handling and retry logic
 */

import { finnhubAPI } from './finnhub'
import { apiConfig } from './api-config'
import { MarketData } from '@/types'

type Subscriber = (data: MarketDataState) => void

interface MarketDataState {
  stocks: Record<string, MarketData>
  isLoading: boolean
  isRefreshing: boolean
  lastUpdate: Date | null
  error: string | null
}

class MarketDataStore {
  private state: MarketDataState = {
    stocks: {},
    isLoading: false,
    isRefreshing: false,
    lastUpdate: null,
    error: null,
  }

  private subscribers: Set<Subscriber> = new Set()
  private refreshInterval: NodeJS.Timeout | null = null
  private symbols: Set<string> = new Set()
  private lastManualRefresh: number = 0
  private isInitialized: boolean = false
  
  // Configuration
  private readonly AUTO_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes
  private readonly MANUAL_REFRESH_COOLDOWN = 30 * 1000 // 30 seconds
  private readonly BATCH_SIZE = 5 // Process symbols in batches
  private readonly BATCH_DELAY = 200 // Delay between batches in ms

  /**
   * Subscribe to market data updates
   */
  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback)
    
    // Immediately notify subscriber of current state
    callback(this.state)
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Notify all subscribers of state changes
   */
  private notify() {
    this.subscribers.forEach(callback => callback(this.state))
  }

  /**
   * Update state and notify subscribers
   */
  private setState(updates: Partial<MarketDataState>) {
    this.state = { ...this.state, ...updates }
    this.notify()
  }

  /**
   * Add symbols to track
   */
  addSymbols(newSymbols: string[]) {
    const sizeBefore = this.symbols.size
    newSymbols.forEach(symbol => this.symbols.add(symbol))
    
    // If new symbols were added and we're initialized, fetch their data
    if (this.symbols.size > sizeBefore && this.isInitialized) {
      this.fetchMarketData()
    }
  }

  /**
   * Remove symbols from tracking
   */
  removeSymbols(symbolsToRemove: string[]) {
    symbolsToRemove.forEach(symbol => this.symbols.delete(symbol))
  }

  /**
   * Get current symbols being tracked
   */
  getSymbols(): string[] {
    return Array.from(this.symbols)
  }

  /**
   * Initialize the store and start auto-refresh
   */
  async initialize(initialSymbols: string[] = []) {
    if (this.isInitialized) {
      console.log('📊 Market data store already initialized')
      return
    }

    console.log('🚀 Initializing market data store...')
    
    // Add initial symbols
    this.addSymbols(initialSymbols)

    // Set up Finnhub API
    const finnhubApiKey = apiConfig.getFinnhubApiKey()
    if (finnhubApiKey) {
      finnhubAPI.setApiKey(finnhubApiKey)
    }

    this.isInitialized = true

    // Fetch initial data
    await this.fetchMarketData()

    // Start auto-refresh interval
    this.startAutoRefresh()

    console.log('✅ Market data store initialized with', this.symbols.size, 'symbols')
  }

  /**
   * Start automatic refresh interval
   */
  private startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }

    this.refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing market data (10-minute interval)...')
      this.fetchMarketData()
    }, this.AUTO_REFRESH_INTERVAL)

    console.log('⏰ Auto-refresh started (every 10 minutes)')
  }

  /**
   * Stop automatic refresh interval
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
      console.log('⏸️ Auto-refresh stopped')
    }
  }

  /**
   * Manual refresh with rate limiting
   */
  async refresh(): Promise<boolean> {
    const now = Date.now()
    const timeSinceLastRefresh = now - this.lastManualRefresh

    if (timeSinceLastRefresh < this.MANUAL_REFRESH_COOLDOWN) {
      const remainingTime = Math.ceil((this.MANUAL_REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000)
      console.log(`⏳ Please wait ${remainingTime} seconds before refreshing again`)
      this.setState({ 
        error: `אנא המתן ${remainingTime} שניות לפני רענון נוסף` 
      })
      return false
    }

    this.lastManualRefresh = now
    await this.fetchMarketData()
    return true
  }

  /**
   * Fetch market data for all tracked symbols
   */
  private async fetchMarketData() {
    if (this.symbols.size === 0) {
      console.log('📊 No symbols to fetch')
      return
    }

    const wasLoading = this.state.isLoading
    this.setState({ 
      isLoading: !wasLoading, 
      isRefreshing: wasLoading,
      error: null 
    })

    try {
      const symbols = Array.from(this.symbols)
      const stocksData: Record<string, MarketData> = {}
      
      console.log(`📊 Fetching market data for ${symbols.length} symbols...`)

      // Process symbols in batches to avoid rate limiting
      for (let i = 0; i < symbols.length; i += this.BATCH_SIZE) {
        const batch = symbols.slice(i, i + this.BATCH_SIZE)
        
        const batchResults = await Promise.allSettled(
          batch.map(async (symbol) => {
            try {
              const quote = await Promise.race([
                finnhubAPI.getQuote(symbol),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), 5000)
                )
              ]) as any

              if (quote && quote.price) {
                return {
                  symbol,
                  data: {
                    symbol,
                    price: quote.price,
                    change: quote.change || 0,
                    change_percent: quote.changePercent || 0,
                    timestamp: new Date().toISOString(),
                  } as MarketData
                }
              }
              return null
            } catch (error) {
              console.error(`Failed to fetch ${symbol}:`, error)
              return null
            }
          })
        )

        // Process batch results
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            stocksData[result.value.symbol] = result.value.data
          }
        })

        // Add delay between batches (except for the last batch)
        if (i + this.BATCH_SIZE < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY))
        }
      }

      console.log(`✅ Successfully fetched ${Object.keys(stocksData).length}/${symbols.length} symbols`)

      this.setState({
        stocks: stocksData,
        isLoading: false,
        isRefreshing: false,
        lastUpdate: new Date(),
        error: null,
      })
    } catch (error) {
      console.error('❌ Failed to fetch market data:', error)
      this.setState({
        isLoading: false,
        isRefreshing: false,
        error: 'שגיאה בטעינת נתוני שוק - בדוק את הגדרות ה-API',
      })
    }
  }

  /**
   * Get current state
   */
  getState(): MarketDataState {
    return this.state
  }

  /**
   * Get stock data for a specific symbol
   */
  getStock(symbol: string): MarketData | null {
    return this.state.stocks[symbol] || null
  }

  /**
   * Get stocks data for multiple symbols
   */
  getStocks(symbols: string[]): Record<string, MarketData> {
    const result: Record<string, MarketData> = {}
    symbols.forEach(symbol => {
      const stock = this.state.stocks[symbol]
      if (stock) {
        result[symbol] = stock
      }
    })
    return result
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopAutoRefresh()
    this.subscribers.clear()
    this.symbols.clear()
    this.state = {
      stocks: {},
      isLoading: false,
      isRefreshing: false,
      lastUpdate: null,
      error: null,
    }
    this.isInitialized = false
    console.log('🗑️ Market data store destroyed')
  }
}

// Create singleton instance
export const marketDataStore = new MarketDataStore()

// Export for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).marketDataStore = marketDataStore
}