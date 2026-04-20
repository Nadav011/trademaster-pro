'use client'

import { useState, useEffect, useCallback } from 'react'
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
  initializeDatabase,
} from '@/lib/database-client'
import { marketDataStore } from '@/lib/market-data-store'
import { 
  DashboardKPIs, 
  TradeWithCalculations, 
  Trade 
} from '@/types'
import { TrendingUp, BarChart3, RefreshCw } from 'lucide-react'

export default function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
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
  })
  const [openTrades, setOpenTrades] = useState<TradeWithCalculations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marketDataState, setMarketDataState] = useState(marketDataStore.getState())

  // Subscribe to market data updates
  useEffect(() => {
    const unsubscribe = marketDataStore.subscribe((state) => {
      setMarketDataState(state)
      
      // Update open trades with new prices
      if (Object.keys(state.stocks).length > 0) {
        updateOpenTradesWithPrices(state.stocks)
      }
    })

    return () => unsubscribe()
  }, [])

  const updateOpenTradesWithPrices = useCallback((stocks: Record<string, any>) => {
    setOpenTrades(prevTrades => {
      return prevTrades.map(trade => {
        const stockData = stocks[trade.symbol]
        if (!stockData) return trade

        const currentPrice = stockData.price
        const entryPrice = trade.entry_price
        const positionSize = trade.position_size
        const direction = trade.direction

        // Calculate unrealized P&L
        const priceDiff = direction === 'Long' ? currentPrice - entryPrice : entryPrice - currentPrice
        const unrealizedPnl = priceDiff * positionSize

        // Calculate R units
        const riskPerShare = Math.abs(entryPrice - trade.planned_stop_loss)
        const unrealizedRUnits = riskPerShare > 0 ? unrealizedPnl / (riskPerShare * positionSize) : 0

        return {
          ...trade,
          current_price: currentPrice,
          daily_change: stockData.change,
          unrealized_pnl: unrealizedPnl,
          unrealized_r_units: unrealizedRUnits,
          unrealized_percentage: (priceDiff / entryPrice) * 100,
        }
      })
    })
  }, [])

  const recalculateKPIsWithUpdatedPrices = useCallback(async (updatedOpenTrades: TradeWithCalculations[]) => {
    try {
      // Get all trades
      const allTrades = await tradeDatabase.findAll()
      const closedTrades = allTrades.filter(trade => trade.exit_price)
      
      // Calculate KPIs
      const winningClosedTrades = closedTrades.filter(trade => 
        trade.result_dollars !== undefined && trade.result_dollars > 0
      )
      const losingClosedTrades = closedTrades.filter(trade => 
        trade.result_dollars !== undefined && trade.result_dollars < 0
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

      // Calculate daily change
      const today = new Date().toDateString()
      const todayClosedTrades = closedTrades.filter(trade => 
        new Date(trade.exit_datetime || trade.datetime).toDateString() === today
      )
      const todayOpenTrades = updatedOpenTrades.filter(trade => 
        new Date(trade.datetime).toDateString() === today
      )

      const dailyProfitLossClosed = todayClosedTrades.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      )
      const dailyProfitLossOpen = todayOpenTrades.reduce((sum, trade) => {
        return sum + (trade.unrealized_pnl || 0)
      }, 0)

      const dailyChangeDollars = dailyProfitLossClosed + dailyProfitLossOpen
      
      // Calculate weekly change
      const startOfWeek = getStartOfWeek(new Date())
      const weekClosedTrades = closedTrades.filter(trade => {
        const tradeDate = new Date(trade.exit_datetime || trade.datetime)
        return tradeDate >= startOfWeek
      })
      const weekOpenTrades = updatedOpenTrades.filter(trade => {
        const tradeDate = new Date(trade.datetime)
        return tradeDate >= startOfWeek
      })

      const weeklyProfitLossClosed = weekClosedTrades.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      )
      const weeklyProfitLossOpen = weekOpenTrades.reduce((sum, trade) => {
        return sum + (trade.unrealized_pnl || 0)
      }, 0)

      const weeklyChangeDollars = weeklyProfitLossClosed + weeklyProfitLossOpen
      
      // Get total current capital
      let totalCurrentCapital = 0
      try {
        const capitalSummary = await capitalDatabase.getCapitalSummary()
        totalCurrentCapital = capitalSummary.total_equity
      } catch (error) {
        console.error('Failed to get capital summary:', error)
        const baseCapital = 10000
        totalCurrentCapital = baseCapital + totalProfitLossClosed
      }
      
      // Calculate percentages
      const dailyChangePercent = totalCurrentCapital > 0 
        ? (dailyChangeDollars / totalCurrentCapital) * 100 
        : 0
      
      const weeklyChangePercent = totalCurrentCapital > 0 
        ? (weeklyChangeDollars / totalCurrentCapital) * 100 
        : 0

      // Calculate open trades P&L
      const totalProfitLossOpen = updatedOpenTrades.reduce((sum, trade) => {
        return sum + (trade.unrealized_pnl || 0)
      }, 0)

      const winRate = totalTradesForWinRate > 0 
        ? (totalWinningTrades / totalTradesForWinRate) * 100 
        : 0

      const updatedKpis: DashboardKPIs = {
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

      setKpis(updatedKpis)
    } catch (error) {
      console.error('Error recalculating KPIs:', error)
    }
  }, [])

  // Watch for open trades updates and recalculate KPIs
  useEffect(() => {
    if (openTrades.length > 0) {
      recalculateKPIsWithUpdatedPrices(openTrades)
    }
  }, [openTrades, recalculateKPIsWithUpdatedPrices])

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Initialize database
      await initializeDatabase()

      // Load trades
      const allTrades = await tradeDatabase.findAll()
      const openTradesData = await tradeDatabase.getOpenTrades()

      // Calculate initial KPIs
      const closedTrades = allTrades.filter(trade => trade.exit_price)

      const winningClosedTrades = closedTrades.filter(trade => 
        trade.result_dollars !== undefined && trade.result_dollars > 0
      )
      const losingClosedTrades = closedTrades.filter(trade => 
        trade.result_dollars !== undefined && trade.result_dollars < 0
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

      const winRate = totalTradesForWinRate > 0 
        ? (totalWinningTrades / totalTradesForWinRate) * 100 
        : 0

      const calculatedKpis: DashboardKPIs = {
        win_rate: winRate,
        daily_change_percent: 0,
        daily_change_dollars: 0,
        weekly_change_percent: 0,
        weekly_change_dollars: 0,
        total_r: totalRUnits,
        total_profit_loss_closed: totalProfitLossClosed,
        total_profit_loss_open: 0,
        total_trades: totalTradesForWinRate,
        winning_trades: totalWinningTrades,
        losing_trades: totalLosingTrades,
      }

      // Convert open trades
      const openTradesWithCalculations: TradeWithCalculations[] = openTradesData.map(trade => ({
        ...trade,
        is_open: true,
        current_price: undefined,
        daily_change: undefined,
        unrealized_pnl: undefined,
        unrealized_r_units: undefined,
        unrealized_percentage: undefined,
      }))

      setOpenTrades(openTradesWithCalculations)
      setKpis(calculatedKpis)
      setIsLoading(false)

      // Extract symbols and initialize market data store
      const symbols = [...new Set(openTradesData.map(trade => trade.symbol))]
      if (symbols.length > 0) {
        marketDataStore.addSymbols(symbols)
        
        // Initialize store if not already initialized
        if (!marketDataStore.getState().lastUpdate) {
          await marketDataStore.initialize(symbols)
        }
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('שגיאה בטעינת נתוני הדאשבורד')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
    
    // Auto-sync initialization
    const initializeAuth = async () => {
      try {
        const { initializeAuthListener, auth, startAutoSyncService } = await import('@/lib/supabase')
        
        initializeAuthListener()
        
        const isAuthStateSaved = auth.isAuthStateSaved()
        const savedEmail = auth.getSavedUserEmail()
        
        if (isAuthStateSaved && savedEmail) {
          const { triggerAutoSync } = await import('@/lib/supabase')
          triggerAutoSync().catch(console.error)
          startAutoSyncService().catch(console.error)
          
          setTimeout(() => {
            loadDashboardData().catch(console.error)
          }, 1000)
        } else {
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
        console.error('❌ Auto-sync on load failed:', error)
      }
    }
    
    setTimeout(initializeAuth, 1000)
    
    // Listen for sync events
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
    
    // Clean up market data store on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      
      import('@/lib/supabase').then(({ stopAutoSyncService }) => {
        stopAutoSyncService()
      })
    }
  }, [loadDashboardData])

  const handleManualRefresh = async () => {
    const success = await marketDataStore.refresh()
    if (success) {
      await loadDashboardData()
    }
  }

  const handleCloseTrade = async (tradeId: string) => {
    try {
      window.location.href = `/trades/${tradeId}`
    } catch (error) {
      console.error('Failed to navigate to trade:', error)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="apple-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-red-600 text-lg mb-4">{error}</div>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="apple-button"
                  >
                    רענן דף
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="p-6 lg:mr-64">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                דאשבורד מסחר
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                סקירה כללית של ביצועי המסחר שלך
              </p>
              {marketDataState.lastUpdate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  עודכן לאחרונה: {new Date(marketDataState.lastUpdate).toLocaleTimeString('he-IL')}
                  {' • '}
                  רענון אוטומטי כל 10 דקות
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={marketDataState.isRefreshing}
                className="flex items-center space-x-2 space-x-reverse"
              >
                <RefreshCw className={`h-4 w-4 ${marketDataState.isRefreshing ? 'animate-spin' : ''}`} />
                <span>רענן נתונים</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboardData}
                disabled={isLoading}
                className="flex items-center space-x-2 space-x-reverse"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">רענן דשבורד</span>
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <KPICards kpis={kpis} isLoading={isLoading} />

          {/* Stop Loss Alerts */}
          <StopLossAlerts />

          {/* Live Stocks */}
          <LiveStocks 
            openTrades={openTrades}
          />

          {/* Open Trades */}
          <OpenTrades 
            trades={openTrades} 
            isLoading={isLoading}
            isLoadingPrices={marketDataState.isLoading || marketDataState.isRefreshing}
            onCloseTrade={handleCloseTrade}
          />

          {/* Performance Chart Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="apple-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>ביצועים מצטברים</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-center p-4">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      תרשים ביצועים מצטברים
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      יציג את התפתחות ההון לאורך זמן
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader>
                <CardTitle>עסקאות מובילות</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-center p-4">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      טבלת עסקאות מובילות
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      עסקאות הכי מרוויחות ומפסידות
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