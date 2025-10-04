'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { TradeCard } from '@/components/trades/trade-card'
import { TradesFilter } from '@/components/trades/trades-filter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { 
  tradesDb, 
  marketDataUtils,
  initializeDatabase 
} from '@/lib/database-client'
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
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    } catch (err) {
      console.error('Failed to load trades:', err)
      setError('שגיאה בטעינת העסקאות')
    } finally {
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
        // 'all' doesn't filter anything
      }
    }

    // Date range filter
    if (filters.date_from) {
      const fromDate = new Date(filters.date_from)
      filtered = filtered.filter(trade => new Date(trade.datetime) >= fromDate)
    }

    if (filters.date_to) {
      const toDate = new Date(filters.date_to)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(trade => new Date(trade.datetime) <= toDate)
    }

    setFilteredTrades(filtered)
  }

  const refreshPrices = async () => {
    setIsRefreshingPrices(true)
    try {
      const openTrades = trades.filter(trade => !trade.exit_price)
      if (openTrades.length === 0) return

      const symbols = [...new Set(openTrades.map(trade => trade.symbol))]
      const marketData = await marketDataUtils.getCurrentPrices(symbols)

      const updatedTrades = trades.map(trade => {
        if (trade.exit_price) return trade // Skip closed trades

        const currentData = marketData[trade.symbol]
        if (!currentData) return trade

        const currentPrice = currentData.price
        const unrealizedPnl = trade.direction === 'Long' 
          ? (currentPrice - trade.entry_price) * trade.position_size
          : (trade.entry_price - currentPrice) * trade.position_size

        const riskPerShare = Math.abs(trade.entry_price - trade.planned_stop_loss)
        const unrealizedRUnits = riskPerShare > 0 ? unrealizedPnl / (riskPerShare * trade.position_size) : 0
        const unrealizedPercentage = ((currentPrice - trade.entry_price) / trade.entry_price) * 100

        return {
          ...trade,
          current_price: currentPrice,
          daily_change: currentData.change,
          unrealized_pnl: unrealizedPnl,
          unrealized_r_units: unrealizedRUnits,
          unrealized_percentage: unrealizedPercentage,
        }
      })

      setTrades(updatedTrades)
    } catch (err) {
      console.error('Failed to refresh prices:', err)
    } finally {
      setIsRefreshingPrices(false)
    }
  }

  const handleEditTrade = (trade: TradeWithCalculations) => {
    router.push(`/edit-trade/${trade.id}`)
  }

  const handleDeleteTrade = async (trade: TradeWithCalculations) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את העסקה?')) {
      try {
        await tradesDb.delete(trade.id)
        
        // Trigger auto-sync after deleting trade
        console.log('🔄 Trade deleted, triggering auto-sync...')
        try {
          const { triggerAutoSync } = await import('@/lib/supabase')
          await triggerAutoSync()
          console.log('✅ Auto-sync completed after trade deletion')
        } catch (syncError) {
          console.error('❌ Auto-sync failed after trade deletion:', syncError)
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
      <div className="min-h-screen">
        <Navigation />
        <main className="p-6 lg:mr-64">
          <div className="max-w-7xl mx-auto">
            <Card className="apple-card">
              <CardContent className="p-6">
                <div className="text-center">טוען עסקאות...</div>
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
                רשימת עסקאות
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                ניהול ועקיבה אחר כל העסקאות שלך
              </p>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                onClick={refreshPrices}
                disabled={isRefreshingPrices}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshingPrices ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">רענן מחירים</span>
                <span className="sm:hidden">רענן</span>
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

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="apple-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  סך עסקאות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalTrades}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.openTrades} פתוחות, {stats.closedTrades} סגורות
                </p>
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  P&L צף
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getProfitLossColor(stats.totalUnrealizedPnl)}`}>
                  {formatCurrency(stats.totalUnrealizedPnl)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.openTrades} עסקאות פתוחות
                </p>
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  P&L סגור
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getProfitLossColor(stats.totalRealizedPnl)}`}>
                  {formatCurrency(stats.totalRealizedPnl)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.closedTrades} עסקאות סגורות
                </p>
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  סך R Units
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getProfitLossColor(stats.totalRUnits)}`}>
                  {stats.totalRUnits.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
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
            <Card className="apple-card">
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
