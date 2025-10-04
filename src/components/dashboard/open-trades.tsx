'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, ExternalLink, RefreshCw, Clock, Target, DollarSign, X } from 'lucide-react'
import Link from 'next/link'
import { TradeWithCalculations } from '@/types'
import { formatCurrency, formatDate, getProfitLossColor } from '@/lib/utils'

interface OpenTradesProps {
  trades: TradeWithCalculations[]
  isLoading?: boolean
  isLoadingPrices?: boolean
  onCloseTrade?: (tradeId: string) => void
}

export function OpenTrades({ trades, isLoading = false, isLoadingPrices = false, onCloseTrade }: OpenTradesProps) {
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
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (trades.length === 0) {
    return (
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>עסקאות פתוחות</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              אין עסקאות פתוחות
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              התחל לעקוב אחר העסקאות שלך
            </p>
            <Link href="/add-trade">
              <Button className="apple-button">
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
    <Card className="apple-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="h-5 w-5 text-blue-600" />
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
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 ml-2" />
                כל העסקאות
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              אין עסקאות פתוחות
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              הוסף עסקאות כדי לראות אותן כאן
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trades.slice(0, 8).map((trade) => {
              const daysOpen = calculateDaysOpen(trade.datetime)
              const percentageChange = calculatePercentageChange(trade.entry_price, trade.current_price || 0)
              const unrealizedPnl = trade.unrealized_pnl || 0
              const unrealizedRUnits = trade.unrealized_r_units || 0

              return (
                <Card key={trade.id} className={`apple-card border-2 transition-all duration-200 hover:shadow-lg ${
                  unrealizedPnl > 0 ? 'border-green-200 dark:border-green-800' : 
                  unrealizedPnl < 0 ? 'border-red-200 dark:border-red-800' : 
                  'border-gray-200 dark:border-gray-700'
                }`}>
                  <CardContent className="p-4">
                    {/* Header with symbol and direction */}
                    <div className="flex items-center space-x-3 space-x-reverse mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        unrealizedPnl > 0 ? 'bg-green-100 dark:bg-green-900/30' :
                        unrealizedPnl < 0 ? 'bg-red-100 dark:bg-red-900/30' :
                        'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {getChangeIcon(unrealizedPnl)}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900 dark:text-white">{trade.symbol}</div>
                        <Badge variant={trade.direction === 'Long' ? 'default' : 'secondary'} className="text-xs">
                          {trade.direction === 'Long' ? 'Long' : 'Short'}
                        </Badge>
                      </div>
                    </div>

                    {/* Current Price */}
                    <div className="text-center mb-4">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {trade.current_price ? formatCurrency(trade.current_price) : 'טוען...'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">מחיר נוכחי</div>
                    </div>

                    {/* Entry Price vs Current */}
                    <div className={`p-3 rounded-lg mb-3 ${
                      percentageChange > 0 ? 'bg-blue-50 dark:bg-blue-900/20' :
                      percentageChange < 0 ? 'bg-red-50 dark:bg-red-900/20' :
                      'bg-gray-50 dark:bg-gray-900/20'
                    }`}>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">מחיר כניסה:</div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(trade.entry_price)}
                      </div>
                      <div className={`text-sm ${getChangeColor(percentageChange)}`}>
                        {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%
                      </div>
                    </div>

                    {/* P&L */}
                    <div className={`p-3 rounded-lg mb-3 ${
                      unrealizedPnl > 0 ? 'bg-green-50 dark:bg-green-900/20' :
                      unrealizedPnl < 0 ? 'bg-red-50 dark:bg-red-900/20' :
                      'bg-gray-50 dark:bg-gray-900/20'
                    }`}>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">רווח/הפסד צף:</div>
                      <div className={`font-bold ${getChangeColor(unrealizedPnl)}`}>
                        {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
                      </div>
                      <div className={`text-sm ${getChangeColor(unrealizedRUnits)}`}>
                        {unrealizedRUnits >= 0 ? '+' : ''}{unrealizedRUnits.toFixed(2)} R
                      </div>
                    </div>

                    {/* Trade Info */}
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 ml-1" />
                          סכום פוזיציה
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(trade.entry_price * trade.position_size)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Target className="h-3 w-3 ml-1" />
                          סטופ לוס
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(trade.planned_stop_loss)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 ml-1" />
                          {daysOpen} ימים פתוח
                        </span>
                        <span className="text-xs">
                          {formatDate(trade.datetime)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Link href={`/trades/${trade.id}`}>
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            צפה בפרטים
                          </Button>
                        </Link>
                        {onCloseTrade && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => onCloseTrade(trade.id)}
                          >
                            <X className="h-3 w-3 ml-1" />
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
        )}
      </CardContent>
    </Card>
  )
}
