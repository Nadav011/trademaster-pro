'use client'

import { useState, useEffect } from 'react'
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
  const [liveStockSymbols, setLiveStockSymbols] = useState<string[]>([])
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [priceCache, setPriceCache] = useState<Map<string, { data: any, timestamp: number }>>(new Map())

  // Function to close a trade
  const handleCloseTrade = async (tradeId: string) => {
    try {
      // Navigate to trade details page to close the trade
      window.location.href = `/trades/${tradeId}`
    } catch (error) {
      console.error('Failed to navigate to trade:', error)
    }
  }

  const loadCurrentPrices = async (trades: Trade[]) => {
    try {
      setIsLoadingPrices(true)
      const symbols = [...new Set(trades.map(trade => trade.symbol))]
      if (symbols.length === 0) {
        setIsLoadingPrices(false)
        return
      }

      // Check cache first and filter symbols that need fresh data
      const now = Date.now()
      const cacheTimeout = 60 * 1000 // 1 minute cache
      
      const symbolsToFetch = symbols.filter(symbol => {
        const cached = priceCache.get(symbol)
        return !cached || (now - cached.timestamp) > cacheTimeout
      })

      console.log(`📊 Fetching prices for ${symbolsToFetch.length} symbols (${symbols.length - symbolsToFetch.length} from cache)`)

      // Get fresh prices only for symbols not in cache
      const freshPrices = symbolsToFetch.length > 0 ? await Promise.allSettled(
        symbolsToFetch.map(async (symbol) => {
          try {
            // Add timeout to prevent hanging
            const marketData = await Promise.race([
              finnhubAPI.getQuote(symbol),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
              )
            ])
            return { symbol, data: marketData }
          } catch (error) {
            console.error(`Failed to get price for ${symbol}:`, error)
            return { symbol, data: null }
          }
        })
      ).then(results => 
        results.map(result => 
          result.status === 'fulfilled' ? result.value : { symbol: 'unknown', data: null }
        )
      ) : []

      // Update cache with fresh prices
      const newCache = new Map(priceCache)
      freshPrices.forEach(priceData => {
        if (priceData.data) {
          newCache.set(priceData.symbol, { data: priceData.data, timestamp: now })
        }
      })
      setPriceCache(newCache)

      // Combine cached and fresh prices
      const allPrices = symbols.map(symbol => {
        const cached = newCache.get(symbol)
        if (cached) {
          return { symbol, data: cached.data }
        }
        const fresh = freshPrices.find(p => p.symbol === symbol)
        return fresh || { symbol, data: null }
      })

      // Update open trades with current prices
      setOpenTrades(prevTrades => {
        return prevTrades.map(trade => {
          const priceData = allPrices.find(p => p.symbol === trade.symbol)
          if (!priceData?.data) return trade

          const currentPrice = priceData.data.price
          const entryPrice = trade.entry_price
          const positionSize = trade.position_size
          const direction = trade.direction

          // Calculate unrealized P&L
          let unrealizedPnl = 0
          if (direction === 'Long') {
            unrealizedPnl = (currentPrice - entryPrice) * positionSize
          } else {
            unrealizedPnl = (entryPrice - currentPrice) * positionSize
          }

          // Calculate R units
          const riskPerShare = Math.abs(entryPrice - trade.planned_stop_loss)
          const unrealizedRUnits = riskPerShare > 0 ? unrealizedPnl / (riskPerShare * positionSize) : 0

          return {
            ...trade,
            current_price: currentPrice,
            daily_change: priceData.data.change,
            unrealized_pnl: unrealizedPnl,
            unrealized_r_units: unrealizedRUnits,
            unrealized_percentage: ((currentPrice - entryPrice) / entryPrice) * 100,
          }
        })
      })
    } catch (error) {
      console.error('Failed to load current prices:', error)
    } finally {
      setIsLoadingPrices(false)
    }
  }

  const recalculateKPIsWithUpdatedPrices = async (updatedOpenTrades: TradeWithCalculations[]) => {
    try {
      console.log('🔄 Updating KPIs with real-time prices...')
      
      // Get all trades again
      const allTrades = await tradeDatabase.findAll()
      const closedTrades = allTrades.filter(trade => trade.exit_price)
      
      // Calculate KPIs with updated open trades
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

      // Calculate daily change for today's trades (both closed and open)
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
      
      // Calculate weekly change for this week's trades (both closed and open)
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
      
      // Get total current capital for percentage calculations
      let totalCurrentCapital = 0
      try {
        const capitalSummary = await capitalDatabase.getCapitalSummary()
        totalCurrentCapital = capitalSummary.total_equity
        console.log('📊 Updated Capital Summary:', capitalSummary)
        console.log('💰 Updated Total Current Capital:', totalCurrentCapital)
      } catch (error) {
        console.error('Failed to get capital summary:', error)
        // Fallback: use base capital + closed P&L
        const baseCapital = 10000 // Default base capital
        totalCurrentCapital = baseCapital + totalProfitLossClosed
        console.log('⚠️ Using fallback capital calculation:', totalCurrentCapital)
      }
      
      // Calculate daily change percentage based on total capital
      const dailyChangePercent = totalCurrentCapital > 0 
        ? (dailyChangeDollars / totalCurrentCapital) * 100 
        : 0
      
      // Calculate weekly change percentage based on total capital
      const weeklyChangePercent = totalCurrentCapital > 0 
        ? (weeklyChangeDollars / totalCurrentCapital) * 100 
        : 0

      console.log('📈 Updated Change Calculations:')
      console.log('Daily change dollars:', dailyChangeDollars)
      console.log('Weekly change dollars:', weeklyChangeDollars)
      console.log('Daily change percent:', dailyChangePercent)
      console.log('Weekly change percent:', weeklyChangePercent)

      // Calculate open trades P&L with updated prices
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

      console.log('📊 Final KPIs with real-time prices:')
      console.log('Total profit/loss open:', totalProfitLossOpen)
      console.log('Daily change dollars:', dailyChangeDollars)
      console.log('Weekly change dollars:', weeklyChangeDollars)

      // Update KPIs with real-time data
      setKpis(updatedKpis)
    } catch (error) {
      console.error('Error recalculating KPIs:', error)
    }
  }

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('🚀 Loading dashboard data...')

      // Initialize database if needed
      await initializeDatabase()

      // Set up Finnhub API key
      const finnhubApiKey = apiConfig.getFinnhubApiKey()
      if (finnhubApiKey) {
        finnhubAPI.setApiKey(finnhubApiKey)
      }

      // Load all trades
      const allTrades = await tradeDatabase.findAll()
      const openTradesData = await tradeDatabase.getOpenTrades()

      // Calculate KPIs - include both closed and open trades
      const closedTrades = allTrades.filter(trade => trade.exit_price)
      const openTrades = allTrades.filter(trade => !trade.exit_price)

      // Don't show KPIs until we have complete data
      if (allTrades.length === 0) {
        setKpis({
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
        setIsLoading(false)
        return
      }
      
      // For closed trades
      const winningClosedTrades = closedTrades.filter(trade => 
        trade.result_dollars !== undefined && trade.result_dollars > 0
      )
      const losingClosedTrades = closedTrades.filter(trade => 
        trade.result_dollars !== undefined && trade.result_dollars < 0
      )

      // For open trades, we'll calculate based on current prices if available
      // For now, we'll only count closed trades for win rate to avoid confusion
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

      // Calculate daily change for today's trades (both closed and open)
      const today = new Date().toDateString()
      const todayClosedTrades = closedTrades.filter(trade => 
        new Date(trade.exit_datetime || trade.datetime).toDateString() === today
      )
      const todayOpenTrades = openTrades.filter(trade => 
        new Date(trade.datetime).toDateString() === today
      )

      const dailyProfitLossClosed = todayClosedTrades.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      )
      const dailyProfitLossOpen = todayOpenTrades.reduce((sum, trade) => {
        // Calculate unrealized P&L for open trades
        const currentPrice = trade.current_price || trade.entry_price
        const profitLoss = trade.direction === 'Long' 
          ? (currentPrice - trade.entry_price) * trade.position_size
          : (trade.entry_price - currentPrice) * trade.position_size
        return sum + profitLoss
      }, 0)

      const dailyChangeDollars = dailyProfitLossClosed + dailyProfitLossOpen
      
      // Calculate weekly change for this week's trades (both closed and open)
      const startOfWeek = getStartOfWeek(new Date())
      const weekClosedTrades = closedTrades.filter(trade => {
        const tradeDate = new Date(trade.exit_datetime || trade.datetime)
        return tradeDate >= startOfWeek
      })
      const weekOpenTrades = openTrades.filter(trade => {
        const tradeDate = new Date(trade.datetime)
        return tradeDate >= startOfWeek
      })

      const weeklyProfitLossClosed = weekClosedTrades.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      )
      const weeklyProfitLossOpen = weekOpenTrades.reduce((sum, trade) => {
        // Calculate unrealized P&L for open trades
        const currentPrice = trade.current_price || trade.entry_price
        const profitLoss = trade.direction === 'Long' 
          ? (currentPrice - trade.entry_price) * trade.position_size
          : (trade.entry_price - currentPrice) * trade.position_size
        return sum + profitLoss
      }, 0)

      const weeklyChangeDollars = weeklyProfitLossClosed + weeklyProfitLossOpen
      
      // Get total current capital for percentage calculations
      let totalCurrentCapital = 0
      try {
        const capitalSummary = await capitalDatabase.getCapitalSummary()
        totalCurrentCapital = capitalSummary.total_equity
        console.log('📊 Capital Summary:', capitalSummary)
        console.log('💰 Total Current Capital:', totalCurrentCapital)
      } catch (error) {
        console.error('Failed to get capital summary:', error)
        // Fallback: use base capital + closed P&L
        const baseCapital = 10000 // Default base capital
        totalCurrentCapital = baseCapital + totalProfitLossClosed
        console.log('⚠️ Using fallback capital calculation:', totalCurrentCapital)
      }
      
      // Calculate daily change percentage based on total capital
      const dailyChangePercent = totalCurrentCapital > 0 
        ? (dailyChangeDollars / totalCurrentCapital) * 100 
        : 0
      
      // Calculate weekly change percentage based on total capital
      const weeklyChangePercent = totalCurrentCapital > 0 
        ? (weeklyChangeDollars / totalCurrentCapital) * 100 
        : 0

      console.log('📈 Change Calculations:')
      console.log('Daily change dollars:', dailyChangeDollars)
      console.log('Weekly change dollars:', weeklyChangeDollars)
      console.log('Daily change percent:', dailyChangePercent)
      console.log('Weekly change percent:', weeklyChangePercent)

      // Calculate open trades P&L - FIXED: Now properly calculates for all open trades
      const totalProfitLossOpen = openTrades.reduce((sum, trade) => {
        // Use current_price if available, otherwise use entry_price
        const currentPrice = trade.current_price || trade.entry_price
        const profitLoss = trade.direction === 'Long' 
          ? (currentPrice - trade.entry_price) * trade.position_size
          : (trade.entry_price - currentPrice) * trade.position_size
        return sum + profitLoss
      }, 0)

      console.log('🔍 Open trades P&L calculation:')
      console.log('Open trades count:', openTrades.length)
      openTrades.forEach((trade, index) => {
        console.log(`Trade ${index + 1}:`, {
          symbol: trade.symbol,
          direction: trade.direction,
          entry_price: trade.entry_price,
          current_price: trade.current_price,
          position_size: trade.position_size,
          calculated_pnl: trade.direction === 'Long' 
            ? ((trade.current_price || trade.entry_price) - trade.entry_price) * trade.position_size
            : (trade.entry_price - (trade.current_price || trade.entry_price)) * trade.position_size
        })
      })
      console.log('Total profit/loss open:', totalProfitLossOpen)

      const winRate = totalTradesForWinRate > 0 
        ? (totalWinningTrades / totalTradesForWinRate) * 100 
        : 0

      const calculatedKpis: DashboardKPIs = {
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

      console.log('📊 KPIs Debug:')
      console.log('Open trades count:', openTrades.length)
      console.log('Open trades data:', openTrades)
      console.log('Total profit/loss open:', totalProfitLossOpen)
      console.log('Daily change dollars:', dailyChangeDollars)
      console.log('Weekly change dollars:', weeklyChangeDollars)

      // Check if running on mobile and warn about data sync
      const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (isMobile && allTrades.length === 0) {
        setError('הנתונים לא מסונכרנים עם הנייד. אנא הוסף נתונים דרך הדסקטופ או לחץ על כפתור הרענון.')
      }

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

      setOpenTrades(openTradesWithCalculations)

      // Extract unique symbols from open trades for live stocks
      const symbols = [...new Set(openTradesData.map(trade => trade.symbol))]
      setLiveStockSymbols(symbols)

      // Set KPIs only after all data is ready
      setKpis(calculatedKpis)
      setIsLoading(false)

      // Load current prices for open trades (only if API key is configured)
      // This will only update the open trades display, not the KPIs
      if (openTradesData.length > 0 && finnhubApiKey) {
        console.log('🔄 Loading current prices for open trades display...')
        loadCurrentPrices(openTradesData).catch(error => {
          console.error('Background price loading failed:', error)
        })
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('שגיאה בטעינת נתוני הדאשבורד')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh dashboard data every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
    
    // Auto-refresh prices every 2 minutes (reduced frequency for better performance)
    const priceInterval = setInterval(async () => {
      const openTradesData = await tradeDatabase.getOpenTrades()
      const finnhubApiKey = apiConfig.getFinnhubApiKey()
      if (openTradesData.length > 0 && finnhubApiKey) {
        console.log('🔄 Auto-refreshing prices...')
        loadCurrentPrices(openTradesData).catch(error => {
          console.error('Auto-refresh failed:', error)
        })
      }
    }, 2 * 60 * 1000)
    
    return () => {
      clearInterval(interval)
      clearInterval(priceInterval)
    }
  }, [])

  const handleTradeUpdate = (updatedTrades: TradeWithCalculations[]) => {
    setOpenTrades(updatedTrades)
    // Also refresh dashboard data when trades are updated
    loadDashboardData()
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
    <div className="min-h-screen">
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
            </div>
            <div className="flex items-center justify-between sm:justify-end space-x-4 space-x-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const trades = await tradeDatabase.findAll()
                  const capital = await capitalDatabase.getCapitalHistory()
                  alert(`נתונים מקומיים:\nעסקאות: ${trades.length}\nרשומות הון: ${capital.length}`)
                }}
                className="flex items-center space-x-2 space-x-reverse"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">בדוק נתונים</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { supabase } = await import('@/lib/supabase')
                    const { data: { user }, error } = await supabase.auth.getUser()
                    if (error) {
                      alert(`שגיאת התחברות: ${error.message}`)
                    } else if (user) {
                      alert(`מחובר כ: ${user.email}\nID: ${user.id}`)
                    } else {
                      alert('לא מחובר')
                    }
                  } catch (error) {
                    alert(`שגיאה: ${error}`)
                  }
                }}
                className="flex items-center space-x-2 space-x-reverse"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">בדוק חיבור</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  // Create sample data for testing
                  const sampleTrade = {
                    symbol: 'AAPL',
                    direction: 'Long' as const,
                    entry_price: 150,
                    position_size: 100,
                    datetime: new Date().toISOString(),
                    exit_price: 155,
                    exit_datetime: new Date(Date.now() + 86400000).toISOString(),
                    result_dollars: 500,
                    result_percent: 3.33,
                    r_units: 1.5,
                    stop_loss: 145,
                    take_profit: 160,
                    entry_reason: 'Breakout above resistance',
                    emotional_state: 'Confident',
                    market_timing: 'Market' as const,
                    risk_level: 2 as const,
                    planned_stop_loss: 145,
                    emotional_entry: 'Confident' as const
                  }
                  
                  const sampleCapital = {
                    type: 'Deposit' as const,
                    date: new Date().toISOString(),
                    actual_datetime: new Date().toISOString(),
                    amount: 10000,
                    description: 'Initial capital deposit'
                  }
                  
                  await tradesDb.create(sampleTrade)
                  await capitalDb.create(sampleCapital)
                  
                  alert('נתונים לדוגמה נוצרו! לחץ על רענן כדי לראות אותם בדשבורד.')
                  loadDashboardData()
                }}
                className="flex items-center space-x-2 space-x-reverse"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">נתונים לדוגמה</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboardData}
                disabled={isLoading}
                className="flex items-center space-x-2 space-x-reverse"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">רענן</span>
              </Button>
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500 dark:text-gray-400">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">TradeMaster Pro</span>
                <span className="sm:hidden">TM Pro</span>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <KPICards kpis={kpis} isLoading={isLoading} />

          {/* Stop Loss Alerts */}
          <StopLossAlerts />

          {/* Live Stocks */}
          <LiveStocks 
            symbols={liveStockSymbols} 
            openTrades={openTrades} 
            onTradeUpdate={handleTradeUpdate}
          />

          {/* Open Trades */}
          <OpenTrades 
            trades={openTrades} 
            isLoading={isLoading}
            isLoadingPrices={isLoadingPrices}
            onCloseTrade={handleCloseTrade}
          />

          {/* Additional Dashboard Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Performance Chart Placeholder */}
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      כולל הפקדות, משיכות ורווחים/הפסדים
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top/Bottom Trades Placeholder */}
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
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
