'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react'
import { capitalDatabase, tradeDatabase, marketDataUtils } from '@/lib/database-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Capital } from '@/types'

interface ChartDataPoint {
  date: string
  ownCapital: number // הון עצמי (התחלתי + הפקדות)
  totalEquity: number // הון כולל נוכחי (הון עצמי + P&L)
  deposits: number
  withdrawals: number
  realizedPnl: number
  unrealizedPnl: number
  performancePercent: number
  tradesCount: number
}

interface CapitalGrowthChartProps {
  capitalHistory: Capital[]
}

export function CapitalGrowthChart({ capitalHistory }: CapitalGrowthChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1D' | '3D' | '1W' | '1M' | '1Y' | 'ALL'>('ALL')
  const [chartType, setChartType] = useState<'line' | 'area'>('area')

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
          startDate.setFullYear(2020) // Start from 2020
          break
      }

      // Filter capital history by date range
      const filteredHistory = capitalHistory.filter(capital => 
        new Date(capital.actual_datetime) >= startDate
      )

      // Create daily data points
      const dataPoints: ChartDataPoint[] = []
      const currentDate = new Date(startDate)
      
      let runningOwnCapital = 0 // הון עצמי (התחלתי + הפקדות - משיכות)
      let runningDeposits = 0
      let runningWithdrawals = 0
      let runningRealizedPnl = 0
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        
        // Check if there's a capital entry for this date
        const capitalEntries = filteredHistory.filter(capital => 
          capital.actual_datetime.startsWith(dateStr)
        )
        
        // Process capital entries for this date
        capitalEntries.forEach(entry => {
          if (entry.type === 'Initial') {
            runningOwnCapital = entry.amount
          } else if (entry.type === 'Deposit') {
            runningOwnCapital += entry.amount
            runningDeposits += entry.amount
          } else if (entry.type === 'Withdrawal') {
            runningOwnCapital -= entry.amount
            runningWithdrawals += entry.amount
          } else if (entry.type === 'Reconciliation') {
            runningOwnCapital = entry.amount
            runningRealizedPnl = 0 // Reset P&L after reconciliation
          }
        })
        
        // Calculate realized P&L from trades up to this date
        const allTrades = await tradeDatabase.getClosedTrades()
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
        
        // הון כולל נוכחי = הון עצמי + P&L
        const totalEquity = runningOwnCapital + runningRealizedPnl + unrealizedPnl
        
        // Calculate performance percentage from own capital
        const performancePercent = runningOwnCapital > 0 
          ? ((totalEquity - runningOwnCapital) / runningOwnCapital) * 100 
          : 0
        
        dataPoints.push({
          date: dateStr,
          ownCapital: runningOwnCapital,
          totalEquity: totalEquity,
          deposits: runningDeposits,
          withdrawals: runningWithdrawals,
          realizedPnl: runningRealizedPnl,
          unrealizedPnl: unrealizedPnl,
          performancePercent: performancePercent,
          tradesCount: tradesUpToDate.length + openTradesUpToDate.length
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      setChartData(dataPoints)
    } catch (error) {
      console.error('Failed to load chart data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'performancePercent') {
      return [`${value.toFixed(2)}%`, 'ביצועים']
    }
    const formattedValue = formatCurrency(value)
    const labels: { [key: string]: string } = {
      ownCapital: 'הון עצמי',
      totalEquity: 'הון כולל נוכחי',
      deposits: 'הפקדות',
      withdrawals: 'משיכות',
      realizedPnl: 'P&L סגור',
      unrealizedPnl: 'P&L צף',
      tradesCount: 'מספר עסקאות'
    }
    return [formattedValue, labels[name] || name]
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

  return (
    <Card className="apple-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>גרף התפתחות הון</span>
          </CardTitle>
          
          <div className="flex items-center space-x-4 space-x-reverse">
            <Select value={chartType} onValueChange={(value: 'line' | 'area') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">אזור</SelectItem>
                <SelectItem value="line">קו</SelectItem>
              </SelectContent>
            </Select>
            
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => formatDate(value)}
                  className="text-xs"
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelFormatter={(value) => `תאריך: ${formatDate(value)}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="totalEquity" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.4}
                  name="הון כולל נוכחי"
                />
                <Area 
                  type="monotone" 
                  dataKey="ownCapital" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                  name="הון עצמי"
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => formatDate(value)}
                  className="text-xs"
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelFormatter={(value) => `תאריך: ${formatDate(value)}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalEquity" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="הון כולל נוכחי"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ownCapital" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="הון עצמי"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="realizedPnl" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="P&L סגור"
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="unrealizedPnl" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="P&L צף"
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
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
