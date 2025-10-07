'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { TradeCard } from '@/components/trades/trade-card'
import { TradesFilter } from '@/components/trades/trades-filter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, RefreshCw, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { 
  tradesDb, 
  initializeDatabase 
} from '@/lib/database-client'
import { marketDataStore } from '@/lib/market-data-store'
import { 
  Trade, 
  TradeWithCalculations, 
  TradeFilters 
} from '@/types'
import { formatCurrency, getProfitLossColor } from '@/lib/utils'

export default function TradesList() {
  const router = useRouter()
  const [trades, setTrades] = useState<TradeWithCalculations[]>([])
  const [filteredTrades, setFilteredTrades] = useState<TradeWithCalculations[]>([])
  const [filters, setFilters] = useState<TradeFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marketState, setMarketState] = useState(marketDataStore.getState())

  // Subscribe to market data updates
  useEffect(() => {
    const unsubscribe = marketDataStore.subscribe((state) => {
      setMarketState(state)
      
      // Update trades with new prices
      if (Object.keys(state.stocks).length > 0) {
        updateTradesWithPrices(state.stocks)
      }
    })

    return () => unsubscribe()
  }, [])

  const updateTradesWithPrices = useCallback((stocks: Record<string, any>) => {
    setTrades(prevTrades => {
      return prevTrades.map(trade => {
        // Skip closed trades
        if (trade.exit_price) return trade

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

  useEffect(() => {
    loadTrades()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [trades, filters])

  const loadTrades = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Initialize database
      await initializeDatabase()

      const allTrades = await tradesDb.findAll()
      
      // Convert to TradeWithCalculations and sort by date (newest first)
      const tradesWithCalculations: TradeWithCalculations[] = allTrades
        .map(trade => ({
          ...trade,
          is_open: !trade.exit_price,
          current_price: undefined,
          daily_change: undefined,
          unrealized_pnl: undefined,
          unrealized_r_units: undefined,
          unrealized_percentage: undefined,
        }))
        .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())

      setTrades(tradesWithCalculations)
      setIsLoading(false)

      // Extract symbols from open trades and add to market data store
      const openTrades = tradesWithCalculations.filter(trade => !trade.exit_price)
      if (openTrades.length > 0) {
        const symbols = [...new Set(openTrades.map(trade => trade.symbol))]
        marketDataStore.addSymbols(symbols)
        
        // Initialize store if not already initialized
        if (!marketDataStore.getState().lastUpdate) {
          await marketDataStore.initialize(symbols)
        }
      }
    } catch (err) {
      console.error('Failed to load trades:', err)
      setError('שגיאה בטעינת העסקאות')
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...trades]

    // Symbol filter
    if (filters.symbol) {
      filtered = filtered.filter(trade => 
        trade.symbol.toLowerCase().includes(filters.symbol!.toLowerCase())
      )
    }

    // Direction filter
    if (filters.direction) {
      filtered = filtered.filter(trade => trade.direction === filters.direction)
    }

    // Status filter
    if (filters.status) {
      switch (filters.status) {
        case 'open':
          filtered = filtered.filter(trade => !trade.exit_price)
          break
        case 'closed':
          filtered = filtered.filter(trade => !!trade.exit_price)
          break
        case 'profit':
          filtered = filtered.filter(trade => 
            trade.result_dollars !== undefined && trade.result_dollars > 0
          )
          break
        case 'loss':
          filtered = filtered.filter(trade => 
            trade.result_dollars !== undefined && trade.result_dollars < 0
          )
          break
      }
    }

    // Date range filter
    if (filters.date_from) {
      const fromDate = new Date(filters.date_from)
      filtered = filtered.filter(trade => new Date(trade.datetime) >= fromDate)
    }

    if (filters.date_to) {
      const toDate = new Date(filters.date_to)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(trade => new Date(trade.datetime) <= toDate)
    }

    setFilteredTrades(filtered)
  }

  const handleManualRefresh = async () => {
    await marketDataStore.refresh()
  }

  const handleEditTrade = (trade: TradeWithCalculations) => {
    router.push(`/edit-trade/${trade.id}`)
  }

  const handleDeleteTrade = async (trade: TradeWithCalculations) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את העסקה?')) {
      try {
        await tradesDb.delete(trade.id)
        
        // Trigger immediate sync
        try {
          const { performImmediateSync } = await import('@/lib/supabase')
          await performImmediateSync()
        } catch (syncError) {
          console.error('Immediate sync failed:', syncError)
        }
        
        await loadTrades()
      } catch (err) {
        console.error('Failed to delete trade:', err)
        setError('שגיאה במחיקת העסקה')
      }
    }
  }

  const getTotalStats = () => {
    const openTrades = filteredTrades.filter(trade => !trade.exit_price)
    const closedTrades = filteredTrades.filter(trade => !!trade.exit_price)
    
    const totalUnrealizedPnl = openTrades.reduce((sum, trade) => sum + (trade.unrealized_pnl || 0), 0)
    const totalRealizedPnl = closedTrades.reduce((sum, trade) => sum + (trade.result_dollars || 0), 0)
    const totalRUnits = closedTrades.reduce((sum, trade) => sum + (trade.result_r_units || 0), 0)

    return {
      totalTrades: filteredTrades.length,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
      totalUnrealizedPnl,
      totalRealizedPnl,
      totalRUnits,
    }
  }

  const stats = getTotalStats()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <main className="p-6 lg:mr-64">
          <div className="max-w-7xl mx-auto">
            <Card className="apple-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <div>טוען עסקאות...</div>
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
                רשימת עסקאות
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                ניהול ועקיבה אחר כל העסקאות שלך
              </p>
              {marketState.lastUpdate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  מחירים עודכנו: {new Date(marketState.lastUpdate).toLocaleTimeString('he-IL')}
                  {' • '}
                  רענון אוטומטי כל 10 דקות
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                onClick={handleManualRefresh}
                disabled={marketState.isRefreshing}
                size="sm"
                className="flex items-center space-x-2 space-x-reverse"
              >
                <RefreshCw className={`h-4 w-4 ${marketState.isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">רענן מחירים</span>
              </Button>
              <Link href="/add-trade">
                <Button className="apple-button" size="sm">
                  <Plus className="h-4 w-4 ml-2" />
                  <span className="hidden sm:inline">הוסף עסקה</span>
                  <span className="sm:hidden">הוסף</span>
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <Card className="apple-card border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="text-red-600">{error}</div>
              </CardContent>
            </Card>
          )}

          {marketState.error && (
            <Card className="apple-card border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="p-4">
                <div className="text-yellow-800 dark:text-yellow-200">{marketState.error}</div>
              </CardContent>
            </Card>
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="apple-card shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  סך עסקאות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalTrades}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.openTrades} פתוחות • {stats.closedTrades} סגורות
                </p>
              </CardContent>
            </Card>

            <Card className="apple-card shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  P&L צף
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getProfitLossColor(stats.totalUnrealizedPnl)}`}>
                  {formatCurrency(stats.totalUnrealizedPnl)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.openTrades} עסקאות פתוחות
                </p>
              </CardContent>
            </Card>

            <Card className="apple-card shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  P&L סגור
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getProfitLossColor(stats.totalRealizedPnl)}`}>
                  {formatCurrency(stats.totalRealizedPnl)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.closedTrades} עסקאות סגורות
                </p>
              </CardContent>
            </Card>

            <Card className="apple-card shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  סך R Units
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getProfitLossColor(stats.totalRUnits)}`}>
                  {stats.totalRUnits.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  עסקאות סגורות בלבד
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <TradesFilter
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={() => setFilters({})}
          />

          {/* Trades List */}
          {filteredTrades.length === 0 ? (
            <Card className="apple-card shadow-md">
              <CardContent className="p-8">
                <div className="text-center">
                  <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    אין עסקאות
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {Object.keys(filters).length > 0 
                      ? 'לא נמצאו עסקאות התואמות לפילטרים'
                      : 'התחל ליצור עסקאות חדשות'
                    }
                  </p>
                  <Link href="/add-trade">
                    <Button className="apple-button">
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף עסקה ראשונה
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredTrades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onEdit={handleEditTrade}
                  onDelete={handleDeleteTrade}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}