'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, ExternalLink, RefreshCw, Clock, Target, DollarSign, X, Activity } from 'lucide-react'
import Link from 'next/link'
import { TradeWithCalculations } from '@/types'
import { formatCurrency, formatDate, getProfitLossColor } from '@/lib/utils'
import { memo } from 'react'

interface OpenTradesProps {
  trades: TradeWithCalculations[]
  isLoading?: boolean
  isLoadingPrices?: boolean
  onCloseTrade?: (tradeId: string) => void
}

const OpenTrades = memo(function OpenTrades({ trades, isLoading = false, isLoadingPrices = false, onCloseTrade }: OpenTradesProps) {
  if (isLoading) {
    return (
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="apple-card animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (trades.length === 0) {
    return (
      <Card className="apple-card hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>עסקאות פתוחות</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center">
              <Activity className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              אין עסקאות פתוחות
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">
              התחל לעקוב אחר העסקאות שלך
            </p>
            <Link href="/add-trade">
              <Button className="apple-button bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 text-lg">
                הוסף עסקה ראשונה
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getChangeIcon = (pnl: number) => {
    if (pnl > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (pnl < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" />
  }

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400'
    if (value < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getChangeBgColor = (value: number) => {
    if (value > 0) return 'bg-green-50 dark:bg-green-900/20'
    if (value < 0) return 'bg-red-50 dark:bg-red-900/20'
    return 'bg-gray-50 dark:bg-gray-900/20'
  }

  const calculateDaysOpen = (entryDate: string) => {
    const entry = new Date(entryDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - entry.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const calculatePercentageChange = (entryPrice: number, currentPrice: number) => {
    if (!currentPrice || !entryPrice) return 0
    return ((currentPrice - entryPrice) / entryPrice) * 100
  }

  return (
    <Card className="apple-card hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>עסקאות פתוחות</span>
            {isLoadingPrices && (
              <div className="flex items-center space-x-1 space-x-reverse text-xs text-blue-600">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>מעדכן מחירים...</span>
              </div>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Link href="/trades">
              <Button variant="outline" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <ExternalLink className="h-4 w-4 ml-2" />
                כל העסקאות
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trades.slice(0, 8).map((trade) => {
            const daysOpen = calculateDaysOpen(trade.datetime)
            const percentageChange = calculatePercentageChange(trade.entry_price, trade.current_price || 0)
            const unrealizedPnl = trade.unrealized_pnl || 0
            const unrealizedRUnits = trade.unrealized_r_units || 0

            return (
              <Card 
                key={trade.id} 
                className={`apple-card border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                  unrealizedPnl > 0 ? 'border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10' : 
                  unrealizedPnl < 0 ? 'border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10' : 
                  'border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/10 dark:to-slate-900/10'
                }`}
              >
                <CardContent className="p-5">
                  {/* Header with symbol and direction */}
                  <div className="flex items-center space-x-3 space-x-reverse mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                      unrealizedPnl > 0 ? 'bg-green-100 dark:bg-green-900/30' :
                      unrealizedPnl < 0 ? 'bg-red-100 dark:bg-red-900/30' :
                      'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {getChangeIcon(unrealizedPnl)}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xl text-gray-900 dark:text-white">{trade.symbol}</div>
                      <Badge 
                        variant={trade.direction === 'Long' ? 'default' : 'secondary'} 
                        className={`text-xs ${
                          trade.direction === 'Long' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}
                      >
                        {trade.direction === 'Long' ? 'Long' : 'Short'}
                      </Badge>
                    </div>
                  </div>

                  {/* Current Price */}
                  <div className="text-center mb-5">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {trade.current_price ? formatCurrency(trade.current_price) : 'טוען...'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">מחיר נוכחי</div>
                  </div>

                  {/* Entry Price vs Current */}
                  <div className={`p-4 rounded-xl mb-4 shadow-sm ${
                    percentageChange > 0 ? 'bg-blue-50 dark:bg-blue-900/20' :
                    percentageChange < 0 ? 'bg-red-50 dark:bg-red-900/20' :
                    'bg-gray-50 dark:bg-gray-900/20'
                  }`}>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">מחיר כניסה:</div>
                    <div className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                      {formatCurrency(trade.entry_price)}
                    </div>
                    <div className={`text-sm font-semibold ${getChangeColor(percentageChange)}`}>
                      {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%
                    </div>
                  </div>

                  {/* P&L */}
                  <div className={`p-4 rounded-xl mb-4 shadow-sm ${
                    unrealizedPnl > 0 ? 'bg-green-50 dark:bg-green-900/20' :
                    unrealizedPnl < 0 ? 'bg-red-50 dark:bg-red-900/20' :
                    'bg-gray-50 dark:bg-gray-900/20'
                  }`}>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">רווח/הפסד צף:</div>
                    <div className={`font-bold text-lg ${getChangeColor(unrealizedPnl)} mb-1`}>
                      {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
                    </div>
                    <div className={`text-sm font-semibold ${getChangeColor(unrealizedRUnits)}`}>
                      {unrealizedRUnits >= 0 ? '+' : ''}{unrealizedRUnits.toFixed(2)} R
                    </div>
                  </div>

                  {/* Trade Info */}
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 ml-1" />
                        סכום פוזיציה
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(trade.entry_price * trade.position_size)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Target className="h-4 w-4 ml-1" />
                        סטופ לוס
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(trade.planned_stop_loss)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 ml-1" />
                        {daysOpen} ימים פתוח
                      </span>
                      <span className="text-sm">
                        {formatDate(trade.datetime)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Link href={`/trades/${trade.id}`}>
                        <Button variant="outline" size="sm" className="w-full text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          צפה בפרטים
                        </Button>
                      </Link>
                      {onCloseTrade && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => onCloseTrade(trade.id)}
                        >
                          <X className="h-4 w-4 ml-1" />
                          סגור
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export { OpenTrades }
