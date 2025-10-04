'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { CloseTradeDialog } from '@/components/trades/close-trade-dialog'
import { ChartImage } from '@/components/trades/chart-image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Edit, 
  Trash2, 
  ArrowRight,
  RefreshCw,
  Calendar,
  DollarSign,
  Target,
  BarChart3
} from 'lucide-react'
import { 
  tradesDb, 
  marketDataUtils,
  initializeDatabase 
} from '@/lib/database-client'
import { 
  Trade, 
  TradeWithCalculations,
  CloseTradeFormData 
} from '@/types'
import { 
  formatCurrency, 
  formatDate, 
  formatDateOnly,
  getProfitLossColor,
  getProfitLossBgColor 
} from '@/lib/utils'

export default function TradeDetails() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tradeId = searchParams.get('id')

  const [trade, setTrade] = useState<TradeWithCalculations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (tradeId) {
      loadTrade()
    } else {
      setError('מזהה עסקה לא נמצא')
      setIsLoading(false)
    }
  }, [tradeId])

  const loadTrade = async () => {
    if (!tradeId) return

    try {
      setIsLoading(true)
      setError(null)
      await initializeDatabase()

      const tradeData = await tradesDb.findById(tradeId)
      if (!tradeData) {
        setError('עסקה לא נמצאה')
        return
      }

      const tradeWithCalculations: TradeWithCalculations = {
        ...tradeData,
        is_open: !tradeData.exit_price,
        current_price: undefined,
        daily_change: undefined,
        unrealized_pnl: undefined,
        unrealized_r_units: undefined,
        unrealized_percentage: undefined,
      }

      setTrade(tradeWithCalculations)

      // If trade is open, fetch current price
      if (!tradeData.exit_price) {
        await fetchCurrentPrice()
      }
    } catch (err) {
      console.error('Failed to load trade:', err)
      setError('שגיאה בטעינת העסקה')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCurrentPrice = async () => {
    if (!trade) return

    setIsRefreshingPrice(true)
    try {
      const marketData = await marketDataUtils.getSinglePrice(trade.symbol)
      if (marketData) {
        const currentPrice = marketData.price
        const unrealizedPnl = trade.direction === 'Long' 
          ? (currentPrice - trade.entry_price) * trade.position_size
          : (trade.entry_price - currentPrice) * trade.position_size

        const riskPerShare = Math.abs(trade.entry_price - trade.planned_stop_loss)
        const unrealizedRUnits = riskPerShare > 0 ? unrealizedPnl / (riskPerShare * trade.position_size) : 0
        const unrealizedPercentage = ((currentPrice - trade.entry_price) / trade.entry_price) * 100

        setTrade(prev => prev ? {
          ...prev,
          current_price: currentPrice,
          daily_change: marketData.change,
          unrealized_pnl: unrealizedPnl,
          unrealized_r_units: unrealizedRUnits,
          unrealized_percentage: unrealizedPercentage,
        } : null)
      }
    } catch (err) {
      console.error('Failed to fetch current price:', err)
    } finally {
      setIsRefreshingPrice(false)
    }
  }

  const handleCloseTrade = async (tradeId: string, closeData: CloseTradeFormData) => {
    if (!trade) return;
    
    try {
      await tradesDb.update(tradeId, {
        exit_price: closeData.exit_price,
        result_dollars: closeData.exit_price ? 
          (trade.direction === 'Long' 
            ? (closeData.exit_price - trade.entry_price) * trade.position_size
            : (trade.entry_price - closeData.exit_price) * trade.position_size
          ) : undefined,
        result_r_units: closeData.exit_price ? 
          (Math.abs(trade.entry_price - trade.planned_stop_loss) > 0 ? 
            ((trade.direction === 'Long' 
              ? (closeData.exit_price - trade.entry_price) * trade.position_size
              : (trade.entry_price - closeData.exit_price) * trade.position_size
            ) / (Math.abs(trade.entry_price - trade.planned_stop_loss) * trade.position_size)) : 0
          ) : undefined,
        result_percentage: closeData.exit_price ? 
          ((closeData.exit_price - trade.entry_price) / trade.entry_price) * 100
          : undefined,
        emotional_state: closeData.emotional_state,
        followed_plan: closeData.followed_plan,
        discipline_rating: closeData.discipline_rating,
        what_worked: closeData.what_worked,
        what_to_improve: closeData.what_to_improve,
        exit_chart_url: closeData.exit_chart_url,
        notes: closeData.notes,
      })

      // Trigger auto-sync after closing trade
      console.log('🔄 Trade closed, triggering auto-sync...')
      const { triggerAutoSync } = await import('@/lib/supabase')
      await triggerAutoSync()

      await loadTrade()
    } catch (err) {
      console.error('Failed to close trade:', err)
      throw err
    }
  }

  const handleDeleteTrade = async () => {
    if (!trade) return
    
    if (window.confirm('האם אתה בטוח שברצונך למחוק את העסקה?')) {
      try {
        await tradesDb.delete(trade.id)
        
        // Trigger auto-sync after deleting trade
        console.log('🔄 Trade deleted, triggering auto-sync...')
        const { triggerAutoSync } = await import('@/lib/supabase')
        await triggerAutoSync()
        
        router.push('/trades/')
      } catch (err) {
        console.error('Failed to delete trade:', err)
        setError('שגיאה במחיקת העסקה')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="p-6 lg:mr-64">
          <div className="max-w-4xl mx-auto">
            <Card className="apple-card">
              <CardContent className="p-6">
                <div className="text-center">טוען פרטי עסקה...</div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (error || !trade) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="p-6 lg:mr-64">
          <div className="max-w-4xl mx-auto">
            <Card className="apple-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-red-600 text-lg mb-4">{error || 'עסקה לא נמצאה'}</div>
                  <Button onClick={() => router.back()}>חזור</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  const isOpen = !trade.exit_price
  const pnl = isOpen ? trade.unrealized_pnl : trade.result_dollars
  const rUnits = isOpen ? trade.unrealized_r_units : trade.result_r_units
  const percentage = isOpen ? trade.unrealized_percentage : trade.result_percentage

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="p-6 lg:mr-64">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button variant="outline" onClick={() => router.back()} size="sm">
                <ArrowRight className="h-4 w-4 ml-2" />
                חזור
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {trade.symbol}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                  {formatDate(trade.datetime)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
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
              <Badge variant="outline" className={isOpen ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                {isOpen ? 'פתוח' : 'סגור'}
              </Badge>
            </div>
          </div>

          {/* P&L Summary */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span>תוצאות {isOpen ? 'צף' : 'סופי'}</span>
                </div>
                {isOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchCurrentPrice}
                    disabled={isRefreshingPrice}
                  >
                    <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshingPrice ? 'animate-spin' : ''}`} />
                    רענן מחיר
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">P&L</div>
                  <div className={`text-3xl font-bold ${getProfitLossColor(pnl || 0)}`}>
                    {pnl ? formatCurrency(pnl) : 'טוען...'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">R Units</div>
                  <div className={`text-3xl font-bold ${getProfitLossColor(rUnits || 0)}`}>
                    {rUnits ? rUnits.toFixed(2) : 'טוען...'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">אחוז</div>
                  <div className={`text-3xl font-bold ${getProfitLossColor(percentage || 0)}`}>
                    {percentage ? `${percentage.toFixed(2)}%` : 'טוען...'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Basic Info */}
            <Card className="apple-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>פרטי העסקה</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">גודל פוזיציה:</span>
                    <span className="font-semibold">{trade.position_size.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">מחיר כניסה:</span>
                    <span className="font-semibold">{formatCurrency(trade.entry_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      {isOpen ? 'מחיר נוכחי:' : 'מחיר יציאה:'}
                    </span>
                    <span className="font-semibold">
                      {isOpen 
                        ? (trade.current_price ? formatCurrency(trade.current_price) : 'טוען...')
                        : (trade.exit_price ? formatCurrency(trade.exit_price) : 'לא נסגר')
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">סטופ לוס:</span>
                    <span className="font-semibold">{formatCurrency(trade.planned_stop_loss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">זמן כניסה:</span>
                    <span className="font-semibold">{trade.market_timing}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">רמת סיכון:</span>
                    <span className="font-semibold">{trade.risk_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">אחוז סיכון:</span>
                    <span className="font-semibold">
                      {(() => {
                        const riskPerShare = Math.abs(trade.entry_price - trade.planned_stop_loss)
                        const totalRisk = riskPerShare * trade.position_size
                        // We need to get user capital - for now we'll show the risk amount
                        return `${formatCurrency(totalRisk)} (${((riskPerShare / trade.entry_price) * 100).toFixed(2)}% למניה)`
                      })()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Info */}
            <Card className="apple-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span>ניתוח וסיבות</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">סיבת כניסה:</span>
                    <div className="font-semibold mt-1">{trade.entry_reason}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">מצב רגשי בכניסה:</span>
                    <div className="font-semibold mt-1">{trade.emotional_entry}</div>
                  </div>
                  {trade.emotional_state && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">מצב רגשי בסגירה:</span>
                      <div className="font-semibold mt-1">{trade.emotional_state}</div>
                    </div>
                  )}
                  {trade.followed_plan && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">עמידה בתוכנית:</span>
                      <div className="font-semibold mt-1">{trade.followed_plan}</div>
                    </div>
                  )}
                  {trade.discipline_rating && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">דירוג משמעת:</span>
                      <div className="font-semibold mt-1">
                        {trade.discipline_rating} ⭐ ({trade.discipline_rating}/5)
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Images */}
          {(trade.entry_chart_url || trade.exit_chart_url) && (
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>צילומי גרפים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {trade.entry_chart_url && (
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        גרף כניסה
                      </h4>
                      <ChartImage 
                        url={trade.entry_chart_url} 
                        alt={`גרף כניסה - ${trade.symbol}`}
                      />
                    </div>
                  )}
                  {trade.exit_chart_url && (
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        גרף יציאה
                      </h4>
                      <ChartImage 
                        url={trade.exit_chart_url} 
                        alt={`גרף יציאה - ${trade.symbol}`}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis and Notes */}
          {(trade.what_worked || trade.what_to_improve || trade.notes) && (
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>ניתוח והערות</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {trade.what_worked && (
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">
                        מה עבד טוב:
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">{trade.what_worked}</p>
                    </div>
                  )}
                  {trade.what_to_improve && (
                    <div>
                      <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-2">
                        מה צריך לשפר:
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">{trade.what_to_improve}</p>
                    </div>
                  )}
                  {trade.notes && (
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        הערות נוספות:
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">{trade.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card className="apple-card">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex space-x-4 space-x-reverse">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/edit-trade/?id=${trade.id}`)}
                  >
                    <Edit className="h-4 w-4 ml-2" />
                    עריכה
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDeleteTrade}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    מחק
                  </Button>
                </div>
                {isOpen && (
                  <Button
                    onClick={() => setShowCloseDialog(true)}
                    className="apple-button"
                  >
                    סגור עסקה
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Close Trade Dialog */}
      <CloseTradeDialog
        trade={trade}
        isOpen={showCloseDialog}
        onClose={() => setShowCloseDialog(false)}
        onSave={handleCloseTrade}
      />
    </div>
  )
}
