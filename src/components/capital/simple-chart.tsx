'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp } from 'lucide-react'
import { capitalDatabase, tradeDatabase, marketDataUtils } from '@/lib/database-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Capital } from '@/types'

interface ChartDataPoint {
  date: string
  ownCapital: number
  totalEquity: number
  performancePercent: number
}

interface SimpleChartProps {
  capitalHistory: Capital[]
}

export function SimpleChart({ capitalHistory }: SimpleChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1D' | '3D' | '1W' | '1M' | '1Y' | 'ALL'>('ALL')

  useEffect(() => {
    loadChartData()
  }, [capitalHistory, timeRange])

  const loadChartData = async () => {
    try {
      setIsLoading(true)
      
      // Get date range based on selection
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timeRange) {
        case '1D':
          startDate.setDate(endDate.getDate() - 1)
          break
        case '3D':
          startDate.setDate(endDate.getDate() - 3)
          break
        case '1W':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '1M':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case '1Y':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
        case 'ALL':
          startDate.setFullYear(2020)
          break
      }

      // Create data points based on actual capital history and trades
      const dataPoints: ChartDataPoint[] = []
      let runningOwnCapital = 0
      let runningRealizedPnl = 0
      
      // Get all trades for calculations
      const allTrades = await tradeDatabase.getClosedTrades()
      
      // Create real data based on actual capital history and trades
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        
        // Check if there's a capital entry for this date
        const capitalEntries = capitalHistory.filter(capital => 
          capital.actual_datetime.startsWith(dateStr)
        )
        
        // Process capital entries for this date
        capitalEntries.forEach(entry => {
          if (entry.type === 'Initial') {
            runningOwnCapital = entry.amount
          } else if (entry.type === 'Deposit') {
            runningOwnCapital += entry.amount
          } else if (entry.type === 'Withdrawal') {
            runningOwnCapital -= entry.amount
          } else if (entry.type === 'Reconciliation') {
            runningOwnCapital = entry.amount
            runningRealizedPnl = 0 // Reset P&L after reconciliation
          }
        })
        
        // Calculate realized P&L from trades up to this date
        const lastReconciliation = await capitalDatabase.getLastReconciliation()
        const reconciliationDate = lastReconciliation ? new Date(lastReconciliation.actual_datetime) : new Date(0)
        
        const tradesUpToDate = allTrades.filter(trade => {
          const tradeDate = new Date(trade.datetime)
          return tradeDate <= currentDate && tradeDate > reconciliationDate
        })
        
        runningRealizedPnl = tradesUpToDate.reduce((sum, trade) => 
          sum + (trade.result_dollars || 0), 0
        )
        
        // Calculate unrealized P&L from open trades
        const openTrades = await tradeDatabase.getOpenTrades()
        const openTradesUpToDate = openTrades.filter(trade => 
          new Date(trade.datetime) <= currentDate && new Date(trade.datetime) > reconciliationDate
        )
        
        let unrealizedPnl = 0
        if (openTradesUpToDate.length > 0) {
          const symbols = [...new Set(openTradesUpToDate.map(trade => trade.symbol))]
          const marketData = await marketDataUtils.getCurrentPrices(symbols)
          
          unrealizedPnl = openTradesUpToDate.reduce((sum, trade) => {
            const currentData = marketData[trade.symbol]
            if (!currentData) return sum
            
            const currentPrice = currentData.price
            const unrealizedPnl = trade.direction === 'Long' 
              ? (currentPrice - trade.entry_price) * trade.position_size
              : (trade.entry_price - currentPrice) * trade.position_size
            
            return sum + unrealizedPnl
          }, 0)
        }
        
        const totalEquity = runningOwnCapital + runningRealizedPnl + unrealizedPnl
        
        dataPoints.push({
          date: dateStr,
          ownCapital: runningOwnCapital,
          totalEquity: totalEquity,
          performancePercent: runningOwnCapital > 0 
            ? ((totalEquity - runningOwnCapital) / runningOwnCapital) * 100 
            : 0
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      console.log('📊 Chart data loaded:', {
        dataPointsCount: dataPoints.length,
        capitalHistoryCount: capitalHistory.length,
        allTradesCount: allTrades.length,
        runningOwnCapital,
        runningRealizedPnl,
        timeRange
      })
      
      setChartData(dataPoints)
    } catch (error) {
      console.error('Failed to load chart data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>גרף התפתחות הון</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">טוען נתוני גרף...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>גרף התפתחות הון</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">אין נתונים להצגה</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                הוסף רשומות הון כדי לראות את הגרף
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => Math.max(d.totalEquity, d.ownCapital))) : 1000
  const minValue = chartData.length > 0 ? Math.min(...chartData.map(d => Math.min(d.totalEquity, d.ownCapital))) : 0

  return (
    <Card className="apple-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>גרף התפתחות הון</span>
          </CardTitle>
          
          <Select value={timeRange} onValueChange={(value: '1D' | '3D' | '1W' | '1M' | '1Y' | 'ALL') => setTimeRange(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1D">יומי</SelectItem>
              <SelectItem value="3D">3 ימים</SelectItem>
              <SelectItem value="1W">שבועי</SelectItem>
              <SelectItem value="1M">חודשי</SelectItem>
              <SelectItem value="1Y">שנתי</SelectItem>
              <SelectItem value="ALL">הכל</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {/* Simple Bar Chart */}
          <div className="h-full flex items-end justify-between space-x-2 space-x-reverse p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            {chartData.length > 0 ? chartData.map((point, index) => {
              const ownCapitalHeight = maxValue > minValue ? ((point.ownCapital - minValue) / (maxValue - minValue)) * 100 : 50
              const totalEquityHeight = maxValue > minValue ? ((point.totalEquity - minValue) / (maxValue - minValue)) * 100 : 50
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                  <div className="flex flex-col items-center space-y-1 h-48 justify-end">
                    {/* Total Equity Bar */}
                    <div 
                      className="w-6 bg-blue-500 rounded-t"
                      style={{ height: `${totalEquityHeight}%` }}
                      title={`הון כולל: ${formatCurrency(point.totalEquity)}`}
                    ></div>
                    {/* Own Capital Bar */}
                    <div 
                      className="w-6 bg-green-500 rounded-t"
                      style={{ height: `${ownCapitalHeight}%` }}
                      title={`הון עצמי: ${formatCurrency(point.ownCapital)}`}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {formatDate(point.date)}
                  </div>
                  <div className="text-xs font-medium text-center">
                    <div className="text-blue-600">{formatCurrency(point.totalEquity)}</div>
                    <div className="text-green-600">{formatCurrency(point.ownCapital)}</div>
                  </div>
                </div>
              )
            }) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">אין נתונים לתקופה זו</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 space-x-reverse mt-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">הון כולל נוכחי</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">הון עצמי</span>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(chartData[chartData.length - 1]?.totalEquity || 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">הון כולל נוכחי</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(chartData[chartData.length - 1]?.ownCapital || 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">הון עצמי</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              (chartData[chartData.length - 1]?.performancePercent || 0) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {(chartData[chartData.length - 1]?.performancePercent || 0) >= 0 ? '+' : ''}
              {(chartData[chartData.length - 1]?.performancePercent || 0).toFixed(2)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">ביצועים</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              (chartData[chartData.length - 1]?.totalEquity || 0) >= (chartData[chartData.length - 1]?.ownCapital || 0)
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency((chartData[chartData.length - 1]?.totalEquity || 0) - (chartData[chartData.length - 1]?.ownCapital || 0))}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">הפער</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
