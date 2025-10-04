'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { TradeWithCalculations } from '@/types'
import { formatCurrency, formatDate, getProfitLossColor } from '@/lib/utils'

interface OpenTradesProps {
  trades: TradeWithCalculations[]
  isLoading?: boolean
}

export function OpenTrades({ trades, isLoading = false }: OpenTradesProps) {
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

  return (
    <Card className="apple-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>עסקאות פתוחות</span>
          </div>
          <Link href="/trades">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 ml-2" />
              כל העסקאות
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trades.slice(0, 5).map((trade) => (
            <div key={trade.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {trade.symbol}
                  </span>
                  <Badge variant={trade.direction === 'Long' ? 'default' : 'secondary'}>
                    {trade.direction === 'Long' ? (
                      <>
                        <TrendingUp className="h-3 w-3 ml-1" />
                        Long
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 ml-1" />
                        Short
                      </>
                    )}
                  </Badge>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(trade.datetime)}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">מחיר כניסה:</span>
                  <span className="font-medium text-gray-900 dark:text-white mr-2">
                    {formatCurrency(trade.entry_price)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">מחיר נוכחי:</span>
                  <span className="font-medium text-gray-900 dark:text-white mr-2">
                    {trade.current_price ? formatCurrency(trade.current_price) : 'טוען...'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">P&L צף:</span>
                  <span className={`font-medium mr-2 ${getProfitLossColor(trade.unrealized_pnl || 0)}`}>
                    {trade.unrealized_pnl ? formatCurrency(trade.unrealized_pnl) : 'טוען...'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">R Units:</span>
                  <span className={`font-medium mr-2 ${getProfitLossColor(trade.unrealized_r_units || 0)}`}>
                    {trade.unrealized_r_units ? trade.unrealized_r_units.toFixed(2) : 'טוען...'}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <Link href={`/trades/${trade.id}`}>
                  <Button variant="outline" size="sm">
                    צפה בפרטים
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
