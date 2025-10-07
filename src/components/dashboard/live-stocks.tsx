'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { marketDataStore } from '@/lib/market-data-store'
import { MarketData, TradeWithCalculations } from '@/types'
import { formatCurrency, getProfitLossColor } from '@/lib/utils'

interface LiveStocksProps {
  openTrades?: TradeWithCalculations[]
}

export function LiveStocks({ openTrades = [] }: LiveStocksProps) {
  const [marketState, setMarketState] = useState(marketDataStore.getState())

  // Subscribe to market data updates
  useEffect(() => {
    const unsubscribe = marketDataStore.subscribe((state) => {
      setMarketState(state)
    })

    return () => unsubscribe()
  }, [])

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400'
    if (change < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  // Calculate profit/loss since purchase
  const calculateTradeProfit = (symbol: string, currentPrice: number, stockChangePercent: number) => {
    const trades = openTrades.filter(trade => trade.symbol === symbol)
    if (trades.length === 0) return { percentage: 0, amount: 0, totalShares: 0, dailyChange: 0, dailyChangePercent: 0 }

    let totalShares = 0
    let totalCost = 0
    let totalValue = 0

    trades.forEach(trade => {
      const shares = trade.position_size
      const entryPrice = trade.entry_price
      const cost = shares * entryPrice
      const value = shares * currentPrice

      totalShares += shares
      totalCost += cost
      totalValue += value
    })

    const profitAmount = totalValue - totalCost
    const profitPercentage = totalCost > 0 ? (profitAmount / totalCost) * 100 : 0

    // Calculate daily change in position value
    const stockDailyChange = stockChangePercent / 100
    const yesterdayValue = totalValue / (1 + stockDailyChange)
    const dailyChange = totalValue - yesterdayValue
    const dailyChangePercent = yesterdayValue > 0 ? (dailyChange / yesterdayValue) * 100 : 0

    return {
      percentage: profitPercentage,
      amount: profitAmount,
      totalShares,
      totalCost,
      totalValue,
      dailyChange,
      dailyChangePercent
    }
  }

  // Get unique symbols from open trades
  const symbols = [...new Set(openTrades.map(trade => trade.symbol))]
  const isOnline = !marketState.error

  return (
    <Card className="apple-card shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <span>מניות בלייב</span>
              {(marketState.isLoading || marketState.isRefreshing) && (
                <div className="flex items-center space-x-1 space-x-reverse">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </CardTitle>
          <div className="flex items-center space-x-2 space-x-reverse">
            {marketState.lastUpdate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                עודכן: {new Date(marketState.lastUpdate).toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {marketState.error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2 space-x-reverse text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{marketState.error}</span>
            </div>
          </div>
        )}

        {symbols.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              אין מניות להצגה
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              הוסף עסקאות פתוחות כדי לראות מניות בלייב
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {symbols.map((symbol) => {
              const stock = marketState.stocks[symbol]
              
              if (!stock) {
                return (
                  <Link key={symbol} href={`/trades?symbol=${symbol}`}>
                    <Card className="apple-card border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 space-x-reverse mb-3">
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                          <div className="font-bold text-lg">{symbol}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-400 mb-2">טוען...</div>
                          <div className="text-sm text-gray-500">מחכה לנתונים</div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              }

              const tradeProfit = calculateTradeProfit(symbol, stock.price, stock.change_percent)
              const hasPosition = tradeProfit.totalShares > 0

              return (
                <Link key={symbol} href={`/trades?symbol=${symbol}`}>
                  <Card className={`apple-card border-2 transition-all duration-300 hover:shadow-xl cursor-pointer transform hover:scale-105 ${
                    stock.change > 0 ? 'border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700' : 
                    stock.change < 0 ? 'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700' : 
                    'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                    <CardContent className="p-4">
                      {/* Header with symbol and icon */}
                      <div className="flex items-center space-x-3 space-x-reverse mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          stock.change > 0 ? 'bg-green-100 dark:bg-green-900/30' :
                          stock.change < 0 ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {getChangeIcon(stock.change)}
                        </div>
                        <div className="font-bold text-xl text-gray-900 dark:text-white">{symbol}</div>
                      </div>

                      {/* Current Price */}
                      <div className="text-center mb-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                          {formatCurrency(stock.price)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">מחיר נוכחי</div>
                      </div>

                      {/* Daily Change */}
                      {hasPosition ? (
                        <div className={`p-3 rounded-lg mb-3 ${
                          tradeProfit.dailyChange > 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                          tradeProfit.dailyChange < 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                          'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">שינוי יומי בפוזיציה:</div>
                          <div className={`font-bold text-lg ${getChangeColor(tradeProfit.dailyChange)}`}>
                            {tradeProfit.dailyChange >= 0 ? '+' : ''}{formatCurrency(tradeProfit.dailyChange)}
                          </div>
                          <div className={`text-sm ${getChangeColor(tradeProfit.dailyChange)}`}>
                            ({tradeProfit.dailyChangePercent >= 0 ? '+' : ''}{tradeProfit.dailyChangePercent.toFixed(2)}%)
                          </div>
                        </div>
                      ) : (
                        <div className={`p-3 rounded-lg mb-3 ${
                          stock.change > 0 ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
                          stock.change < 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                          'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">שינוי יומי במניה:</div>
                          <div className={`font-bold text-lg ${getChangeColor(stock.change)}`}>
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}$
                          </div>
                          <div className={`text-sm ${getChangeColor(stock.change)}`}>
                            ({stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%)
                          </div>
                        </div>
                      )}

                      {/* Trade Profit/Loss */}
                      {hasPosition && (
                        <div className={`p-3 rounded-lg border ${
                          tradeProfit.amount > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                          tradeProfit.amount < 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                          'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">רווח/הפסד כולל:</div>
                          <div className={`font-bold text-lg ${getChangeColor(tradeProfit.amount)}`}>
                            {tradeProfit.percentage >= 0 ? '+' : ''}{tradeProfit.percentage.toFixed(2)}%
                          </div>
                          <div className={`text-sm ${getChangeColor(tradeProfit.amount)}`}>
                            {tradeProfit.amount >= 0 ? '+' : ''}{formatCurrency(tradeProfit.amount)}
                          </div>
                        </div>
                      )}

                      {/* Position Info */}
                      {hasPosition && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{tradeProfit.totalShares} מניות</span>
                            <span>{formatCurrency(tradeProfit.totalCost || 0)}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}