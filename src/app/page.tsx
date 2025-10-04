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
  initializeDatabase 
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
    average_r: 0,
    total_r: 0,
    total_profit_loss: 0,
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0,
  })
  const [openTrades, setOpenTrades] = useState<TradeWithCalculations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveStockSymbols, setLiveStockSymbols] = useState<string[]>([])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

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

      const totalProfitLoss = closedTrades.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      )
      const totalRUnits = closedTrades.reduce((sum, trade) => 
        sum + (trade.result_r_units || 0), 0
      )

      const winRate = totalTradesForWinRate > 0 
        ? (totalWinningTrades / totalTradesForWinRate) * 100 
        : 0
      const averageR = totalTradesForWinRate > 0 
        ? totalRUnits / totalTradesForWinRate 
        : 0

      const calculatedKpis: DashboardKPIs = {
        win_rate: winRate,
        average_r: averageR,
        total_r: totalRUnits,
        total_profit_loss: totalProfitLoss,
        total_trades: totalTradesForWinRate,
        winning_trades: totalWinningTrades,
        losing_trades: totalLosingTrades,
      }

      setKpis(calculatedKpis)

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

    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('שגיאה בטעינת נתוני הדאשבורד')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh dashboard data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    
    return () => clearInterval(interval)
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
          <OpenTrades trades={openTrades} isLoading={isLoading} />

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
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      תרשים ביצועים יוצג כאן
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      נדרש להגדיר Recharts
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
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      טבלת עסקאות מובילות תוצג כאן
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
