'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Navigation } from '@/components/layout/navigation'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { OpenTrades } from '@/components/dashboard/open-trades'
import { StopLossAlerts } from '@/components/dashboard/stop-loss-alerts'
import { LiveStocks } from '@/components/dashboard/live-stocks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  tradeDatabase, 
  capitalDatabase, 
  calculateTradeMetrics,
  initializeDatabase,
  tradesDb,
  capitalDb
} from '@/lib/database-client'
import { finnhubAPI } from '@/lib/finnhub'
import { apiConfig } from '@/lib/api-config'
import { 
  DashboardKPIs, 
  TradeWithCalculations, 
  Trade 
} from '@/types'
import { TrendingUp, BarChart3, RefreshCw, Activity, DollarSign, Target, Clock } from 'lucide-react'

// Dashboard state interface for better type safety
interface DashboardState {
  kpis: DashboardKPIs
  openTrades: TradeWithCalculations[]
  liveStockSymbols: string[]
  isLoading: boolean
  isLoadingPrices: boolean
  error: string | null
  lastUpdate: Date | null
}

// Initial state
const initialDashboardState: DashboardState = {
  kpis: {
    win_rate: 0,
    daily_change_percent: 0,
    daily_change_dollars: 0,
    weekly_change_percent: 0,
    weekly_change_dollars: 0,
    total_r: 0,
    total_profit_loss_closed: 0,
    total_profit_loss_open: 0,
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0,
  },
  openTrades: [],
  liveStockSymbols: [],
  isLoading: true,
  isLoadingPrices: false,
  error: null,
  lastUpdate: null,
}

export default function Dashboard() {
  // Consolidated state management
  const [dashboardState, setDashboardState] = useState<DashboardState>(initialDashboardState)
  const [priceCache, setPriceCache] = useState<Map<string, { data: any, timestamp: number }>>(new Map())
  const [isInitialized, setIsInitialized] = useState(false)

  // Optimized state update function
  const updateDashboardState = useCallback((updates: Partial<DashboardState>) => {
    setDashboardState(prev => ({
      ...prev,
      ...updates,
      lastUpdate: new Date()
    }))
  }, [])

  // Function to close a trade
  const handleCloseTrade = useCallback(async (tradeId: string) => {
    try {
      window.location.href = `/trades/${tradeId}`
    } catch (error) {
      console.error('Failed to navigate to trade:', error)
    }
  }, [])

  // Optimized price loading with better caching and error handling
  const loadCurrentPrices = useCallback(async (trades: Trade[]) => {
    if (trades.length === 0) return

    updateDashboardState({ isLoadingPrices: true })
    
    try {
      const symbols = [...new Set(trades.map(trade => trade.symbol))]
      const now = Date.now()
      const cacheTimeout = 3 * 60 * 1000 // 3 minutes cache for better performance
      
      // Filter symbols that need fresh data
      const symbolsToFetch = symbols.filter(symbol => {
        const cached = priceCache.get(symbol)
        return !cached || (now - cached.timestamp) > cacheTimeout
      })

      if (symbolsToFetch.length === 0) {
        // All data is cached, just update trades with cached prices
        updateTradesWithCachedPrices(trades)
        return
      }

      // Fetch fresh prices with optimized batching
      const freshPrices = await Promise.allSettled(
        symbolsToFetch.map(async (symbol) => {
          try {
            const marketData = await Promise.race([
              finnhubAPI.getQuote(symbol),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 2000)
              )
            ])
            return { symbol, data: marketData }
          } catch (error) {
            console.warn(`Failed to get price for ${symbol}:`, error)
            return { symbol, data: null }
          }
        })
      )

      // Update cache with fresh prices
      const newCache = new Map(priceCache)
      freshPrices.forEach(result => {
        if (result.status === 'fulfilled' && result.value.data) {
          newCache.set(result.value.symbol, { 
            data: result.value.data, 
            timestamp: now 
          })
        }
      })
      setPriceCache(newCache)

      // Update trades with all available prices
      updateTradesWithPrices(trades, newCache)
      
    } catch (error) {
      console.error('Failed to load current prices:', error)
    } finally {
      updateDashboardState({ isLoadingPrices: false })
    }
  }, [priceCache, updateDashboardState])

  // Helper function to update trades with cached prices
  const updateTradesWithCachedPrices = useCallback((trades: Trade[]) => {
    const updatedTrades = trades.map(trade => {
      const cached = priceCache.get(trade.symbol)
      if (!cached?.data) return trade

      return calculateTradeWithCurrentPrice(trade, cached.data)
    })
    
    updateDashboardState({ openTrades: updatedTrades })
  }, [priceCache, updateDashboardState])

  // Helper function to update trades with all available prices
  const updateTradesWithPrices = useCallback((trades: Trade[], cache: Map<string, any>) => {
    const updatedTrades = trades.map(trade => {
      const cached = cache.get(trade.symbol)
      if (!cached?.data) return trade

      return calculateTradeWithCurrentPrice(trade, cached.data)
    })
    
    updateDashboardState({ openTrades: updatedTrades })
  }, [updateDashboardState])

  // Helper function to calculate trade with current price
  const calculateTradeWithCurrentPrice = useCallback((trade: Trade, priceData: any) => {
    const currentPrice = priceData.price
    const entryPrice = trade.entry_price
    const positionSize = trade.position_size
    const direction = trade.direction

    const priceDiff = direction === 'Long' ? currentPrice - entryPrice : entryPrice - currentPrice
    const unrealizedPnl = priceDiff * positionSize
    const riskPerShare = Math.abs(entryPrice - trade.planned_stop_loss)
    const unrealizedRUnits = riskPerShare > 0 ? unrealizedPnl / (riskPerShare * positionSize) : 0

    return {
      ...trade,
      current_price: currentPrice,
      daily_change: priceData.change,
      unrealized_pnl: unrealizedPnl,
      unrealized_r_units: unrealizedRUnits,
      unrealized_percentage: (priceDiff / entryPrice) * 100,
    }
  }, [])

  // Optimized KPI calculation with memoization
  const calculateKPIs = useCallback(async (openTrades: TradeWithCalculations[] = []) => {
    try {
      const allTrades = await tradeDatabase.findAll()
      const closedTrades = allTrades.filter(trade => trade.exit_price)
      
      // Calculate basic metrics
      const winningClosedTrades = closedTrades.filter(trade => 
        (trade.result_dollars || 0) > 0
      )
      const losingClosedTrades = closedTrades.filter(trade => 
        (trade.result_dollars || 0) < 0
      )

      const totalWinningTrades = winningClosedTrades.length
      const totalLosingTrades = losingClosedTrades.length
      const totalTradesForWinRate = closedTrades.length

      const totalProfitLossClosed = closedTrades.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      )
      const totalRUnits = closedTrades.reduce((sum, trade) => 
        sum + (trade.result_r_units || 0), 0
      )

      // Helper function to get start of week (Sunday)
      const getStartOfWeek = (date: Date) => {
        const start = new Date(date)
        const day = start.getDay()
        const diff = start.getDate() - day
        start.setDate(diff)
        start.setHours(0, 0, 0, 0)
        return start
      }

      // Calculate daily and weekly changes
      const today = new Date().toDateString()
      const startOfWeek = getStartOfWeek(new Date())
      
      const todayClosedTrades = closedTrades.filter(trade => 
        new Date(trade.exit_datetime || trade.datetime).toDateString() === today
      )
      const todayOpenTrades = openTrades.filter(trade => 
        new Date(trade.datetime).toDateString() === today
      )

      const weekClosedTrades = closedTrades.filter(trade => {
        const tradeDate = new Date(trade.exit_datetime || trade.datetime)
        return tradeDate >= startOfWeek
      })
      const weekOpenTrades = openTrades.filter(trade => {
        const tradeDate = new Date(trade.datetime)
        return tradeDate >= startOfWeek
      })

      const dailyProfitLossClosed = todayClosedTrades.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      )
      const dailyProfitLossOpen = todayOpenTrades.reduce((sum, trade) => 
        sum + (trade.unrealized_pnl || 0), 0
      )

      const weeklyProfitLossClosed = weekClosedTrades.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      )
      const weeklyProfitLossOpen = weekOpenTrades.reduce((sum, trade) => 
        sum + (trade.unrealized_pnl || 0), 0
      )

      const dailyChangeDollars = dailyProfitLossClosed + dailyProfitLossOpen
      const weeklyChangeDollars = weeklyProfitLossClosed + weeklyProfitLossOpen
      
      // Get total current capital for percentage calculations
      let totalCurrentCapital = 0
      try {
        const capitalSummary = await capitalDatabase.getCapitalSummary()
        totalCurrentCapital = capitalSummary.total_equity
      } catch (error) {
        console.warn('Failed to get capital summary, using fallback:', error)
        const baseCapital = 10000
        totalCurrentCapital = baseCapital + totalProfitLossClosed
      }
      
      const dailyChangePercent = totalCurrentCapital > 0 
        ? (dailyChangeDollars / totalCurrentCapital) * 100 
        : 0
      
      const weeklyChangePercent = totalCurrentCapital > 0 
        ? (weeklyChangeDollars / totalCurrentCapital) * 100 
        : 0

      const totalProfitLossOpen = openTrades.reduce((sum, trade) => 
        sum + (trade.unrealized_pnl || 0), 0
      )

      const winRate = totalTradesForWinRate > 0 
        ? (totalWinningTrades / totalTradesForWinRate) * 100 
        : 0

      return {
        win_rate: winRate,
        daily_change_percent: dailyChangePercent,
        daily_change_dollars: dailyChangeDollars,
        weekly_change_percent: weeklyChangePercent,
        weekly_change_dollars: weeklyChangeDollars,
        total_r: totalRUnits,
        total_profit_loss_closed: totalProfitLossClosed,
        total_profit_loss_open: totalProfitLossOpen,
        total_trades: totalTradesForWinRate,
        winning_trades: totalWinningTrades,
        losing_trades: totalLosingTrades,
      }
    } catch (error) {
      console.error('Error calculating KPIs:', error)
      return initialDashboardState.kpis
    }
  }, [])

  // Optimized main data loading function
  const loadDashboardData = useCallback(async () => {
    try {
      updateDashboardState({ isLoading: true, error: null })
      
      // Initialize database if needed
      if (!isInitialized) {
        await initializeDatabase()
        setIsInitialized(true)
      }

      // Set up Finnhub API key
      const finnhubApiKey = apiConfig.getFinnhubApiKey()
      if (finnhubApiKey) {
        finnhubAPI.setApiKey(finnhubApiKey)
      }

      // Load all data in parallel for better performance
      const [allTrades, openTradesData] = await Promise.all([
        tradeDatabase.findAll(),
        tradeDatabase.getOpenTrades()
      ])

      // Convert open trades to TradeWithCalculations
      const openTradesWithCalculations: TradeWithCalculations[] = openTradesData.map(trade => ({
        ...trade,
        is_open: true,
        current_price: undefined,
        daily_change: undefined,
        unrealized_pnl: undefined,
        unrealized_r_units: undefined,
        unrealized_percentage: undefined,
      }))

      // Extract unique symbols from open trades for live stocks
      const symbols = [...new Set(openTradesData.map(trade => trade.symbol))]

      // Calculate KPIs with current open trades
      const calculatedKpis = await calculateKPIs(openTradesWithCalculations)

      // Update all state at once for better performance
      updateDashboardState({
        kpis: calculatedKpis,
        openTrades: openTradesWithCalculations,
        liveStockSymbols: symbols,
        isLoading: false,
        error: null
      })

      // Load current prices in background if API key is available
      if (openTradesData.length > 0 && finnhubApiKey) {
        // Use setTimeout to prevent blocking the UI
        setTimeout(() => {
          loadCurrentPrices(openTradesData).catch(error => {
            console.warn('Background price loading failed:', error)
          })
        }, 100)
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      updateDashboardState({ 
        error: 'שגיאה בטעינת נתוני הדאשבורד',
        isLoading: false 
      })
    }
  }, [isInitialized, calculateKPIs, loadCurrentPrices, updateDashboardState])

  // Optimized useEffect with better performance
  useEffect(() => {
    loadDashboardData()
    
    // Initialize auth and sync in background
    const initializeAuth = async () => {
      try {
        const { initializeAuthListener, auth, startAutoSyncService } = await import('@/lib/supabase')
        
        initializeAuthListener()
        
        const isAuthStateSaved = auth.isAuthStateSaved()
        const savedEmail = auth.getSavedUserEmail()
        
        if (isAuthStateSaved && savedEmail) {
          // Start auto-sync in background
          const { triggerAutoSync } = await import('@/lib/supabase')
          triggerAutoSync().catch(console.error)
          startAutoSyncService().catch(console.error)
          
          // Reload dashboard data after sync
          setTimeout(loadDashboardData, 1000)
        } else {
          // Check if user is authenticated
          const { supabase } = await import('@/lib/supabase')
          const { data: { user }, error: authError } = await supabase.auth.getUser()
          
          if (user && !authError) {
            localStorage.setItem('trademaster_auth_state', 'authenticated')
            localStorage.setItem('trademaster_user_email', user.email || '')
            localStorage.setItem('trademaster_user_id', user.id)
            
            const { triggerAutoSync } = await import('@/lib/supabase')
            await triggerAutoSync()
            await startAutoSyncService()
            setTimeout(loadDashboardData, 1000)
          }
        }
      } catch (error) {
        console.error('Auto-sync initialization failed:', error)
      }
    }
    
    // Run auth initialization after a short delay
    setTimeout(initializeAuth, 500)
    
    // Listen for sync events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'trademaster_sync_event' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue)
          if (event.type === 'DATA_SYNCED') {
            loadDashboardData()
          }
        } catch (error) {
          console.error('Failed to parse sync event:', error)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Auto-refresh intervals
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000) // 5 minutes
    const priceInterval = setInterval(async () => {
      const openTradesData = await tradeDatabase.getOpenTrades()
      const finnhubApiKey = apiConfig.getFinnhubApiKey()
      if (openTradesData.length > 0 && finnhubApiKey) {
        loadCurrentPrices(openTradesData).catch(console.error)
      }
    }, 3 * 60 * 1000) // 3 minutes
    
    return () => {
      clearInterval(interval)
      clearInterval(priceInterval)
      window.removeEventListener('storage', handleStorageChange)
      
      import('@/lib/supabase').then(({ stopAutoSyncService }) => {
        stopAutoSyncService()
      })
    }
  }, [loadDashboardData, loadCurrentPrices])

  // Optimized trade update handler
  const handleTradeUpdate = useCallback((updatedTrades: TradeWithCalculations[]) => {
    updateDashboardState({ openTrades: updatedTrades })
    // Recalculate KPIs with updated trades
    calculateKPIs(updatedTrades).then(kpis => {
      updateDashboardState({ kpis })
    })
  }, [updateDashboardState, calculateKPIs])

  // Memoized component props for better performance
  const memoizedProps = useMemo(() => ({
    kpis: dashboardState.kpis,
    openTrades: dashboardState.openTrades,
    liveStockSymbols: dashboardState.liveStockSymbols,
    isLoading: dashboardState.isLoading,
    isLoadingPrices: dashboardState.isLoadingPrices,
    error: dashboardState.error,
    onCloseTrade: handleCloseTrade,
    onTradeUpdate: handleTradeUpdate
  }), [dashboardState, handleCloseTrade, handleTradeUpdate])

  // Error state component
  if (dashboardState.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Navigation />
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="apple-card border-red-200 dark:border-red-800">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <Activity className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    שגיאה בטעינת הנתונים
                  </h2>
                  <div className="text-red-600 text-lg mb-6">{dashboardState.error}</div>
                  <div className="space-y-3">
                    <Button 
                      onClick={loadDashboardData}
                      className="apple-button bg-blue-500 hover:bg-blue-600"
                    >
                      <RefreshCw className="h-4 w-4 ml-2" />
                      נסה שוב
                    </Button>
                    <Button 
                      onClick={() => window.location.reload()} 
                      variant="outline"
                      className="mr-3"
                    >
                      רענן דף
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      <main className="p-4 lg:p-6 lg:mr-64">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Enhanced Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                דאשבורד מסחר
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                סקירה כללית של ביצועי המסחר שלך
              </p>
              {dashboardState.lastUpdate && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  עודכן לאחרונה: {dashboardState.lastUpdate.toLocaleTimeString('he-IL')}
                </p>
              )}
            </div>
            
            {/* Enhanced Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboardData}
                disabled={dashboardState.isLoading}
                className="flex items-center space-x-2 space-x-reverse"
              >
                <RefreshCw className={`h-4 w-4 ${dashboardState.isLoading ? 'animate-spin' : ''}`} />
                <span>רענן</span>
              </Button>
              
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500 dark:text-gray-400">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">TradeMaster Pro</span>
                <span className="sm:hidden">TM Pro</span>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <KPICards 
            kpis={memoizedProps.kpis} 
            isLoading={memoizedProps.isLoading} 
          />

          {/* Stop Loss Alerts */}
          <StopLossAlerts />

          {/* Live Stocks */}
          <LiveStocks 
            symbols={memoizedProps.liveStockSymbols} 
            openTrades={memoizedProps.openTrades} 
            onTradeUpdate={memoizedProps.onTradeUpdate}
          />

          {/* Open Trades */}
          <OpenTrades 
            trades={memoizedProps.openTrades} 
            isLoading={memoizedProps.isLoading}
            isLoadingPrices={memoizedProps.isLoadingPrices}
            onCloseTrade={memoizedProps.onCloseTrade}
          />

          {/* Enhanced Dashboard Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart Placeholder */}
            <Card className="apple-card hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>ביצועים מצטברים</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      תרשים ביצועים מצטברים
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-3">
                      יציג את התפתחות ההון לאורך זמן
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      כולל הפקדות, משיכות ורווחים/הפסדים
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top/Bottom Trades Placeholder */}
            <Card className="apple-card hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <span>עסקאות מובילות</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      טבלת עסקאות מובילות
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-3">
                      עסקאות הכי מרוויחות ומפסידות
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      כולל רווח/הפסד בדולרים ו-R units
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
