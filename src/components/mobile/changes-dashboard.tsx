'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus, 
  Edit, 
  Eye,
  Clock,
  DollarSign,
  Activity,
  Zap
} from 'lucide-react'
import { tradeDatabase, capitalDatabase } from '@/lib/database-client'
import { Trade, Capital } from '@/types'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

interface ChangeItem {
  id: string
  type: 'trade_added' | 'trade_closed' | 'trade_edited' | 'capital_added'
  title: string
  description: string
  amount?: number
  timestamp: Date
  data: any
}

interface ChangesDashboardProps {
  className?: string
}

export function ChangesDashboard({ className }: ChangesDashboardProps) {
  const [changes, setChanges] = useState<ChangeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [todayStats, setTodayStats] = useState({
    tradesAdded: 0,
    tradesClosed: 0,
    totalPnL: 0,
    capitalChanges: 0
  })

  const loadRecentChanges = async () => {
    try {
      setIsLoading(true)
      
      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      
      // Get recent trades (last 24 hours)
      const allTrades = await tradeDatabase.findAll()
      const recentTrades = allTrades.filter(trade => {
        const tradeDate = new Date(trade.updated_at || trade.created_at)
        return tradeDate >= startOfDay && tradeDate < endOfDay
      })
      
      // Get recent capital changes
      const allCapital = await capitalDatabase.getCapitalHistory()
      const recentCapital = allCapital.filter(capital => {
        const capitalDate = new Date(capital.updated_at || capital.created_at)
        return capitalDate >= startOfDay && capitalDate < endOfDay
      })
      
      // Create change items
      const changeItems: ChangeItem[] = []
      
      // Process trades
      recentTrades.forEach(trade => {
        const createdDate = new Date(trade.created_at)
        const updatedDate = new Date(trade.updated_at || trade.created_at)
        
        // Check if trade was created today
        if (createdDate >= startOfDay && createdDate < endOfDay) {
          changeItems.push({
            id: `trade_added_${trade.id}`,
            type: 'trade_added',
            title: `עסקה חדשה: ${trade.symbol}`,
            description: `${trade.direction} ב-${formatCurrency(trade.entry_price)} | כמות: ${trade.position_size}`,
            timestamp: createdDate,
            data: trade
          })
        }
        
        // Check if trade was closed today
        if (trade.exit_price && updatedDate >= startOfDay && updatedDate < endOfDay && updatedDate > createdDate) {
          const pnl = trade.result_dollars || 0
          changeItems.push({
            id: `trade_closed_${trade.id}`,
            type: 'trade_closed',
            title: `עסקה נסגרה: ${trade.symbol}`,
            description: `${pnl >= 0 ? 'רווח' : 'הפסד'}: ${formatCurrency(Math.abs(pnl))}`,
            amount: pnl,
            timestamp: updatedDate,
            data: trade
          })
        }
        
        // Check if trade was edited today (but not closed)
        if (!trade.exit_price && updatedDate >= startOfDay && updatedDate < endOfDay && updatedDate > createdDate) {
          changeItems.push({
            id: `trade_edited_${trade.id}`,
            type: 'trade_edited',
            title: `עסקה עודכנה: ${trade.symbol}`,
            description: `עודכן ב-${formatTime(updatedDate)}`,
            timestamp: updatedDate,
            data: trade
          })
        }
      })
      
      // Process capital changes
      recentCapital.forEach(capital => {
        const capitalDate = new Date(capital.created_at)
        if (capitalDate >= startOfDay && capitalDate < endOfDay) {
          changeItems.push({
            id: `capital_${capital.id}`,
            type: 'capital_added',
            title: `שינוי הון: ${capital.type}`,
            description: `${capital.amount >= 0 ? '+' : ''}${formatCurrency(capital.amount)}`,
            amount: capital.amount,
            timestamp: capitalDate,
            data: capital
          })
        }
      })
      
      // Sort by timestamp (newest first)
      changeItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      // Calculate today's stats
      const stats = {
        tradesAdded: changeItems.filter(c => c.type === 'trade_added').length,
        tradesClosed: changeItems.filter(c => c.type === 'trade_closed').length,
        totalPnL: changeItems
          .filter(c => c.type === 'trade_closed' && c.amount !== undefined)
          .reduce((sum, c) => sum + (c.amount || 0), 0),
        capitalChanges: changeItems.filter(c => c.type === 'capital_added').length
      }
      
      setChanges(changeItems)
      setTodayStats(stats)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error loading recent changes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecentChanges()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRecentChanges, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getChangeIcon = (type: ChangeItem['type']) => {
    switch (type) {
      case 'trade_added':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'trade_closed':
        return <Minus className="h-4 w-4 text-blue-600" />
      case 'trade_edited':
        return <Edit className="h-4 w-4 text-orange-600" />
      case 'capital_added':
        return <DollarSign className="h-4 w-4 text-purple-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getChangeColor = (type: ChangeItem['type']) => {
    switch (type) {
      case 'trade_added':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
      case 'trade_closed':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
      case 'trade_edited':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
      case 'capital_added':
        return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'
    }
  }

  if (isLoading) {
    return (
      <Card className={`apple-card ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Activity className="h-5 w-5 animate-pulse" />
            <span>טוען שינויים...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Today's Summary */}
      <Card className="apple-card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Zap className="h-5 w-5 text-blue-600" />
              <span>סיכום היום</span>
            </div>
            <Badge variant="outline" className="text-xs">
              עודכן: {formatTime(lastUpdate)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {todayStats.tradesAdded}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                עסקאות חדשות
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {todayStats.tradesClosed}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                עסקאות נסגרו
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${todayStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(todayStats.totalPnL)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                P&L היום
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {todayStats.capitalChanges}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                שינויי הון
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Changes */}
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Activity className="h-5 w-5" />
              <span>שינויים אחרונים</span>
            </div>
            <Button 
              onClick={loadRecentChanges}
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              <Eye className="h-3 w-3 ml-1" />
              רענן
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {changes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>אין שינויים היום</p>
              <p className="text-sm">השינויים יופיעו כאן כשתבצע פעולות</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className={`p-4 rounded-lg border-2 ${getChangeColor(change.type)} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 space-x-reverse flex-1">
                      <div className="mt-1">
                        {getChangeIcon(change.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {change.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {change.description}
                        </p>
                        <div className="flex items-center space-x-2 space-x-reverse mt-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatTime(change.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {change.amount !== undefined && (
                      <div className={`text-lg font-bold ${change.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change.amount >= 0 ? '+' : ''}{formatCurrency(change.amount)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}