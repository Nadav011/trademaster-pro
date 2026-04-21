'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff, DollarSign, Activity } from 'lucide-react'
import Link from 'next/link'
import { marketDataUtils } from '@/lib/database-client'
import { MarketData, Trade, TradeWithCalculations } from '@/types'
import { formatCurrency, getProfitLossColor } from '@/lib/utils'

interface LiveStocksProps {
  symbols: string[]
  openTrades?: TradeWithCalculations[]
  onTradeUpdate?: (trades: TradeWithCalculations[]) => void
}

const LiveStocks = memo(function LiveStocks({ symbols, openTrades = [], onTradeUpdate }: LiveStocksProps) {
  const [stocks, setStocks] = useState<Record<string, MarketData>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStocks = useCallback(async () => {
    if (symbols.length === 0) return

    setIsLoading(true)
    setError(null)
    
    try {
      const stocksMap = await marketDataUtils.getCurrentPrices(symbols)
      setStocks(stocksMap)
      setLastUpdate(new Date())
      setIsOnline(true)
    } catch (err) {
      console.error('Failed to fetch stocks:', err)
      setError('שגיאה בטעינת נתוני מניות - בדוק את הגדרות ה-API')
      setIsOnline(false)
    } finally {
      setIsLoading(false)
    }
  }, [symbols])

  useEffect(() => {
    fetchStocks()
    
    // Auto-refresh every 2 minutes (reduced frequency for better performance)
    const interval = setInterval(fetchStocks, 2 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [symbols, fetchStocks])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

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

  const getChangeBgColor = (change: number) => {
    if (change > 0) return 'bg-green-50 dark:bg-green-900/20'
    if (change < 0) return 'bg-red-50 dark:bg-red-900/20'
    return 'bg-gray-50 dark:bg-gray-900/20'
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

    // Calculate daily change in position value based on stock's daily change
    // This shows how much your position value changed today
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

  return (
    <Card className="apple-card hover:shadow-xl transition-all duration-300">
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
            </div>
          </CardTitle>
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={fetchStocks}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {lastUpdate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                עודכן: {formatTime(lastUpdate)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-red-600" />
            </div>
            <div className="text-red-600 text-lg mb-4">{error}</div>
            <div className="space-y-3">
              <button
                onClick={fetchStocks}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                נסה שוב
              </button>
              <div className="text-xs text-gray-500">
                ודא שה-API key מוגדר בהגדרות
              </div>
            </div>
          </div>
        )}

        {symbols.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center">
              <Activity className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              אין מניות להצגה
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              הוסף עסקאות כדי לראות מניות בלייב
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {symbols.map((symbol) => {
              const stock = stocks[symbol]
              if (!stock) {
                return (
                  <Link key={symbol} href={`/trades?symbol=${symbol}`}>
                    <Card className="apple-card border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 animate-pulse">
                      <CardContent className="p-5">
                        <div className="flex items-center space-x-3 space-x-reverse mb-4">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                          <div className="font-bold text-xl">{symbol}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-400 mb-2">טוען...</div>
                          <div className="text-sm text-gray-500">מחיר נוכחי</div>
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
                  <Card className={`apple-card border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer ${
                    stock.change > 0 ? 'border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10' : 
                    stock.change < 0 ? 'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10' : 
                    'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/10 dark:to-slate-900/10'
                  }`}>
                  <CardContent className="p-5">
                    {/* Header with symbol and icon */}
                    <div className="flex items-center space-x-3 space-x-reverse mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                        stock.change > 0 ? 'bg-green-100 dark:bg-green-900/30' :
                        stock.change < 0 ? 'bg-red-100 dark:bg-red-900/30' :
                        'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {getChangeIcon(stock.change)}
                      </div>
                      <div className="font-bold text-xl text-gray-900 dark:text-white">{symbol}</div>
                    </div>

                    {/* Current Price */}
                    <div className="text-center mb-5">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {formatCurrency(stock.price)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">מחיר נוכחי</div>
                    </div>

                    {/* Daily Change - Show position change if available, otherwise stock change */}
                    {hasPosition ? (
                      <div className={`p-4 rounded-xl mb-4 shadow-sm ${
                        tradeProfit.dailyChange > 0 ? 'bg-green-50 dark:bg-green-900/20' :
                        tradeProfit.dailyChange < 0 ? 'bg-red-50 dark:bg-red-900/20' :
                        'bg-gray-50 dark:bg-gray-900/20'
                      }`}>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">שינוי יומי בפוזיציה:</div>
                        <div className={`font-bold text-lg ${getChangeColor(tradeProfit.dailyChange)} mb-1`}>
                          {tradeProfit.dailyChange >= 0 ? '+' : ''}{formatCurrency(tradeProfit.dailyChange)}
                        </div>
                        <div className={`text-sm font-semibold ${getChangeColor(tradeProfit.dailyChange)}`}>
                          ({tradeProfit.dailyChangePercent >= 0 ? '+' : ''}{tradeProfit.dailyChangePercent.toFixed(2)}%)
                        </div>
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl mb-4 shadow-sm ${
                        stock.change > 0 ? 'bg-blue-50 dark:bg-blue-900/20' :
                        stock.change < 0 ? 'bg-red-50 dark:bg-red-900/20' :
                        'bg-gray-50 dark:bg-gray-900/20'
                      }`}>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">שינוי יומי במניה:</div>
                        <div className={`font-bold text-lg ${getChangeColor(stock.change)} mb-1`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}$
                        </div>
                        <div className={`text-sm font-semibold ${getChangeColor(stock.change)}`}>
                          ({stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%)
                        </div>
                      </div>
                    )}

                    {/* Trade Profit/Loss */}
                    {hasPosition && (
                      <div className={`p-4 rounded-xl mb-4 shadow-sm ${
                        tradeProfit.amount > 0 ? 'bg-green-50 dark:bg-green-900/20' :
                        tradeProfit.amount < 0 ? 'bg-red-50 dark:bg-red-900/20' :
                        'bg-gray-50 dark:bg-gray-900/20'
                      }`}>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">רווח/הפסד:</div>
                        <div className={`font-bold text-lg ${getChangeColor(tradeProfit.amount)} mb-1`}>
                          {tradeProfit.percentage >= 0 ? '+' : ''}{tradeProfit.percentage.toFixed(2)}%
                        </div>
                        <div className={`text-sm font-semibold ${getChangeColor(tradeProfit.amount)}`}>
                          {tradeProfit.amount >= 0 ? '+' : ''}{formatCurrency(tradeProfit.amount)}
                        </div>
                      </div>
                    )}

                    {/* Position Info */}
                    {hasPosition && (
                      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {tradeProfit.totalShares} מניות • {formatCurrency(tradeProfit.totalCost || 0)} השקעה
                      </div>
                    )}
                  </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <div className="text-sm text-gray-500">טוען נתונים...</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { LiveStocks }
