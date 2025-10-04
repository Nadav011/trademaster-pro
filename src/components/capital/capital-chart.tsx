'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3 } from 'lucide-react'
import { capitalDatabase, tradeDatabase, marketDataUtils } from '@/lib/database-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Capital } from '@/types'

interface ChartDataPoint {
  date: string
  ownCapital: number      // הון עצמי (התחלתי + הפקדות)
  totalCapital: number    // הון כולל נוכחי
  performance: number     // ביצועים באחוזים
  gap: number            // הפער בדולרים
}

interface CapitalChartProps {
  capitalHistory: Capital[]
}

export function CapitalChart({ capitalHistory }: CapitalChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1D' | '3D' | '1W' | '1M' | '1Y' | 'ALL'>('ALL')

  useEffect(() => {
    loadChartData()
  }, [capitalHistory, timeRange])

  const loadChartData = async () => {
    try {
      setIsLoading(true)
      
      // Get date range
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

      // Calculate current values
      const currentOwnCapital = calculateOwnCapital(capitalHistory)
      const currentTotalCapital = await calculateTotalCapital()
      
      // Create data points for the selected time range
      const dataPoints: ChartDataPoint[] = []
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        
        // For now, we'll show current values for all dates
        // In the future, we can calculate historical values
        const ownCapital = currentOwnCapital
        const totalCapital = currentTotalCapital
        const gap = totalCapital - ownCapital
        const performance = ownCapital > 0 ? (gap / ownCapital) * 100 : 0
        
        dataPoints.push({
          date: dateStr,
          ownCapital,
          totalCapital,
          performance,
          gap
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Limit to reasonable number of points for display
      const displayPoints = dataPoints.slice(-30) // Show last 30 days max
      
      setChartData(displayPoints)
    } catch (error) {
      console.error('Failed to load chart data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate own capital (initial + deposits)
  const calculateOwnCapital = (history: Capital[]): number => {
    let ownCapital = 0
    
    history.forEach(entry => {
      if (entry.type === 'Initial') {
        ownCapital = entry.amount
      } else if (entry.type === 'Deposit') {
        ownCapital += entry.amount
      } else if (entry.type === 'Withdrawal') {
        ownCapital -= entry.amount
      } else if (entry.type === 'Reconciliation') {
        ownCapital = entry.amount
      }
    })
    
    return ownCapital
  }

  // Calculate total current capital (own capital + P&L)
  const calculateTotalCapital = async (): Promise<number> => {
    try {
      // Get current capital summary
      const capitalSummary = await capitalDatabase.getCapitalSummary()
      return capitalSummary.total_equity
    } catch (error) {
      console.error('Failed to get capital summary:', error)
      return 0
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

  const maxValue = Math.max(...chartData.map(d => Math.max(d.ownCapital, d.totalCapital)))
  const minValue = Math.min(...chartData.map(d => Math.min(d.ownCapital, d.totalCapital)))

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
            {chartData.map((point, index) => {
              const ownCapitalHeight = maxValue > minValue ? ((point.ownCapital - minValue) / (maxValue - minValue)) * 100 : 50
              const totalCapitalHeight = maxValue > minValue ? ((point.totalCapital - minValue) / (maxValue - minValue)) * 100 : 50
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                  <div className="flex flex-col items-center space-y-1 h-48 justify-end">
                    {/* Total Capital Bar */}
                    <div 
                      className="w-6 bg-blue-500 rounded-t"
                      style={{ height: `${totalCapitalHeight}%` }}
                      title={`הון כולל נוכחי: ${formatCurrency(point.totalCapital)}`}
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
                    <div className="text-blue-600">{formatCurrency(point.totalCapital)}</div>
                    <div className="text-green-600">{formatCurrency(point.ownCapital)}</div>
                  </div>
                </div>
              )
            })}
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
              {formatCurrency(chartData[chartData.length - 1]?.totalCapital || 0)}
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
              (chartData[chartData.length - 1]?.performance || 0) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {(chartData[chartData.length - 1]?.performance || 0) >= 0 ? '+' : ''}
              {(chartData[chartData.length - 1]?.performance || 0).toFixed(2)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">ביצועים</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              (chartData[chartData.length - 1]?.gap || 0) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency(chartData[chartData.length - 1]?.gap || 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">הפער</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
