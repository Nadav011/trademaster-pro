'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Eye, 
  TrendingUp, 
  DollarSign,
  RefreshCw,
  Zap,
  Clock,
  Activity
} from 'lucide-react'
import { tradeDatabase, capitalDatabase } from '@/lib/database-client'
import { formatCurrency, formatTime } from '@/lib/utils'

interface QuickStats {
  openTrades: number
  todayPnL: number
  lastActivity: Date | null
  needsAttention: number
}

interface QuickActionsWidgetProps {
  className?: string
}

export function QuickActionsWidget({ className }: QuickActionsWidgetProps) {
  const [stats, setStats] = useState<QuickStats>({
    openTrades: 0,
    todayPnL: 0,
    lastActivity: null,
    needsAttention: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const loadQuickStats = async () => {
    try {
      setIsLoading(true)
      
      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      // Get open trades
      const openTrades = await tradeDatabase.getOpenTrades()
      
      // Get today's closed trades for P&L calculation
      const allTrades = await tradeDatabase.findAll()
      const todayClosedTrades = allTrades.filter(trade => {
        if (!trade.exit_price || !trade.updated_at) return false
        const tradeDate = new Date(trade.updated_at)
        return tradeDate >= startOfDay && trade.result_dollars !== undefined
      })
      
      const todayPnL = todayClosedTrades.reduce((sum, trade) => sum + (trade.result_dollars || 0), 0)
      
      // Find last activity (most recent trade or capital change)
      const allCapital = await capitalDatabase.getCapitalHistory()
      const lastTradeActivity = allTrades.length > 0 
        ? new Date(Math.max(...allTrades.map(t => new Date(t.updated_at || t.created_at).getTime())))
        : null
      const lastCapitalActivity = allCapital.length > 0
        ? new Date(Math.max(...allCapital.map(c => new Date(c.updated_at || c.created_at).getTime())))
        : null
      
      let lastActivity = null
      if (lastTradeActivity && lastCapitalActivity) {
        lastActivity = lastTradeActivity > lastCapitalActivity ? lastTradeActivity : lastCapitalActivity
      } else if (lastTradeActivity) {
        lastActivity = lastTradeActivity
      } else if (lastCapitalActivity) {
        lastActivity = lastCapitalActivity
      }
      
      // Count trades that need attention (open trades with significant unrealized loss)
      let needsAttention = 0
      for (const trade of openTrades) {
        if (trade.current_price) {
          const currentPnL = trade.direction === 'Long' 
            ? (trade.current_price - trade.entry_price) * trade.position_size
            : (trade.entry_price - trade.current_price) * trade.position_size
          
          // If unrealized loss is more than 2R, needs attention
          const riskPerShare = Math.abs(trade.entry_price - (trade.planned_stop_loss || trade.entry_price))
          const riskAmount = riskPerShare * trade.position_size
          if (currentPnL < -2 * riskAmount) {
            needsAttention++
          }
        }
      }
      
      setStats({
        openTrades: openTrades.length,
        todayPnL,
        lastActivity,
        needsAttention
      })
    } catch (error) {
      console.error('Error loading quick stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQuickStats()
    
    // Refresh every minute
    const interval = setInterval(loadQuickStats, 60000)
    
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <Card className={`apple-card ${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`apple-card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Zap className="h-5 w-5 text-blue-600" />
            <span>פעולות מהירות</span>
          </div>
          <Button
            onClick={loadQuickStats}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.openTrades}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              עסקאות פתוחות
            </div>
          </div>
          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className={`text-2xl font-bold ${stats.todayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.todayPnL)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              P&L היום
            </div>
          </div>
        </div>

        {/* Attention Alerts */}
        {stats.needsAttention > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Activity className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                {stats.needsAttention} עסקאות דורשות תשומת לב
              </span>
            </div>
          </div>
        )}

        {/* Last Activity */}
        {stats.lastActivity && (
          <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>פעילות אחרונה: {formatTime(stats.lastActivity)}</span>
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => window.location.href = '/add-trade'}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 ml-1" />
            עסקה חדשה
          </Button>
          <Button
            onClick={() => window.location.href = '/trades'}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Eye className="h-4 w-4 ml-1" />
            צפה בעסקאות
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => window.location.href = '/capital'}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <DollarSign className="h-4 w-4 ml-1" />
            ניהול הון
          </Button>
          <Button
            onClick={() => window.location.href = '/changes'}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Activity className="h-4 w-4 ml-1" />
            שינויים
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}