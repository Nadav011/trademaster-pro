// TradeMaster Pro - API Configuration

const API_CONFIG_KEY = 'trademaster_api_config'

export interface ApiConfig {
  finnhubApiKey: string
}

export const apiConfig = {
  // Get API configuration from localStorage
  get(): ApiConfig | null {
    if (typeof window === 'undefined') return null
    
    try {
      const config = localStorage.getItem(API_CONFIG_KEY)
      return config ? JSON.parse(config) : null
    } catch (error) {
      console.error('Failed to load API config:', error)
      return null
    }
  },

  // Save API configuration to localStorage
  set(config: ApiConfig): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save API config:', error)
    }
  },

  // Get Finnhub API key
  getFinnhubApiKey(): string {
    const config = this.get()
    return config?.finnhubApiKey || ''
  },

  // Set Finnhub API key
  setFinnhubApiKey(apiKey: string): void {
    const currentConfig = this.get() || { finnhubApiKey: '' }
    this.set({
      ...currentConfig,
      finnhubApiKey: apiKey
    })
  },

  // Clear all API configuration
  clear(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(API_CONFIG_KEY)
    } catch (error) {
      console.error('Failed to clear API config:', error)
    }
  }
}

export default apiConfig
