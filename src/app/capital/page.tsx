'use client'

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/layout/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  RefreshCw,
  History,
  BarChart3,
  AlertCircle
} from 'lucide-react'
import { CapitalChart } from '@/components/capital/capital-chart'
import { 
  capitalDb, 
  tradeDatabase,
  capitalDatabase,
  marketDataUtils,
  initializeDatabase 
} from '@/lib/database-client'
import { triggerAutoSync } from '@/lib/supabase'
import { 
  Capital, 
  CapitalSummary,
  CapitalFormData,
  CAPITAL_TYPES 
} from '@/types'
import { 
  formatCurrency, 
  formatDate,
  getProfitLossColor 
} from '@/lib/utils'

export default function CapitalManagement() {
  const [capitalHistory, setCapitalHistory] = useState<Capital[]>([])
  const [capitalSummary, setCapitalSummary] = useState<CapitalSummary>({
    base_capital: 0,
    realized_pnl: 0,
    unrealized_pnl: 0,
    total_equity: 0,
  })
  const [openTrades, setOpenTrades] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CapitalFormData>({
    amount: 0,
    type: 'Deposit',
    notes: '',
  })

  useEffect(() => {
    loadCapitalData()
    
    // Auto-refresh capital data every 5 minutes
    const interval = setInterval(loadCapitalData, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const loadCapitalData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await initializeDatabase()

      const [history, trades] = await Promise.all([
        capitalDatabase.getCapitalHistory(),
        tradeDatabase.getOpenTrades()
      ])

      setCapitalHistory(history)
      setOpenTrades(trades)

      // Calculate capital summary
      const lastReconciliation = await capitalDatabase.getLastReconciliation()
      const baseCapital = lastReconciliation ? lastReconciliation.amount : 0
      
      // Calculate realized P&L from closed trades after last reconciliation
      const lastReconciliationDate = lastReconciliation ? new Date(lastReconciliation.actual_datetime) : new Date(0)
      const allTrades = await tradeDatabase.getClosedTrades()
      const tradesAfterReconciliation = allTrades.filter(trade => 
        new Date(trade.datetime) > lastReconciliationDate
      )
      
      const realizedPnl = tradesAfterReconciliation.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      )

      // Calculate unrealized P&L from open trades AFTER last reconciliation
      let unrealizedPnl = 0
      if (trades.length > 0) {
        // Filter open trades to only those opened AFTER last reconciliation
        const openTradesAfterReconciliation = trades.filter(trade => 
          new Date(trade.datetime) > lastReconciliationDate
        )
        
        if (openTradesAfterReconciliation.length > 0) {
          const symbols = [...new Set(openTradesAfterReconciliation.map(trade => trade.symbol))]
          const marketData = await marketDataUtils.getCurrentPrices(symbols)
          
          unrealizedPnl = openTradesAfterReconciliation.reduce((sum, trade) => {
            const currentData = marketData[trade.symbol]
            if (!currentData) return sum
            
            const currentPrice = currentData.price
            const unrealizedPnl = trade.direction === 'Long' 
              ? (currentPrice - trade.entry_price) * trade.position_size
              : (trade.entry_price - currentPrice) * trade.position_size
            
            return sum + unrealizedPnl
          }, 0)
        }
      }

      const summary: CapitalSummary = {
        base_capital: baseCapital,
        realized_pnl: realizedPnl,
        unrealized_pnl: unrealizedPnl,
        total_equity: baseCapital + realizedPnl + unrealizedPnl,
        last_reconciliation_date: lastReconciliation?.actual_datetime,
      }

      setCapitalSummary(summary)
    } catch (err) {
      console.error('Failed to load capital data:', err)
      setError('שגיאה בטעינת נתוני הון')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshPrices = async () => {
    setIsRefreshingPrices(true)
    try {
      await loadCapitalData()
    } catch (err) {
      console.error('Failed to refresh prices:', err)
    } finally {
      setIsRefreshingPrices(false)
    }
  }

  const handleInputChange = (field: keyof CapitalFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const capitalData = {
        date: new Date().toISOString().split('T')[0],
        actual_datetime: new Date().toISOString(),
        amount: formData.amount,
        type: formData.type,
        notes: formData.notes,
      }

      await capitalDb.create(capitalData)
      
      // Trigger auto-sync after creating capital record
      console.log('🔄 Capital record created, triggering auto-sync...')
      await triggerAutoSync()
      
      // Reset form
      setFormData({
        amount: 0,
        type: 'Deposit',
        notes: '',
      })
      setShowAddForm(false)
      
      // Reload data
      await loadCapitalData()
    } catch (err) {
      console.error('Failed to add capital record:', err)
      setError('שגיאה בהוספת רשומת הון')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="p-6 lg:mr-64">
          <div className="max-w-7xl mx-auto">
            <Card className="apple-card">
              <CardContent className="p-6">
                <div className="text-center">טוען נתוני הון...</div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="p-6 lg:mr-64">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                ניהול הון
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                מעקב אחר הון, הפקדות, משיכות והתאמות
              </p>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                onClick={refreshPrices}
                disabled={isRefreshingPrices}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshingPrices ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">רענן מחירים</span>
                <span className="sm:hidden">רענן</span>
              </Button>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="apple-button"
                size="sm"
              >
                <Plus className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">הוסף רשומה</span>
                <span className="sm:hidden">הוסף</span>
              </Button>
            </div>
          </div>

          {error && (
            <Card className="apple-card border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 space-x-reverse text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Capital Summary */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="apple-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <DollarSign className="h-4 w-4 ml-2" />
                  הון בסיס
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(capitalSummary.base_capital)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {capitalSummary.last_reconciliation_date 
                    ? `התאמה אחרונה: ${formatDate(capitalSummary.last_reconciliation_date)}`
                    : 'אין התאמה אחרונה - כל העסקאות נחשבות'
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <TrendingUp className="h-4 w-4 ml-2" />
                  P&L סגור
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getProfitLossColor(capitalSummary.realized_pnl)}`}>
                  {formatCurrency(capitalSummary.realized_pnl)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  מעסקאות סגורות
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {capitalSummary.last_reconciliation_date 
                    ? 'רק עסקאות שנסגרו אחרי ההתאמה האחרונה'
                    : 'כל העסקאות הסגורות'
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <TrendingDown className="h-4 w-4 ml-2" />
                  P&L צף
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getProfitLossColor(capitalSummary.unrealized_pnl)}`}>
                  {formatCurrency(capitalSummary.unrealized_pnl)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {openTrades.length > 0 ? 
                    openTrades.filter(trade => 
                      !capitalSummary.last_reconciliation_date || 
                      new Date(trade.datetime) > new Date(capitalSummary.last_reconciliation_date)
                    ).length + 
                    ' מתוך ' + openTrades.length + ' עסקאות פתוחות' : 
                    'אין עסקאות פתוחות'
                  }
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {capitalSummary.last_reconciliation_date 
                    ? 'רק עסקאות שנפתחו אחרי ההתאמה האחרונה'
                    : 'כל העסקאות הפתוחות'
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="apple-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <BarChart3 className="h-4 w-4 ml-2" />
                  הון כולל
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getProfitLossColor(capitalSummary.total_equity)}`}>
                  {formatCurrency(capitalSummary.total_equity)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  הון בסיס + P&L
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Add Capital Form */}
          {showAddForm && (
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>הוסף רשומת הון</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="amount">סכום *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">סוג *</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value: 'Initial' | 'Deposit' | 'Withdrawal' | 'Reconciliation') => handleInputChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CAPITAL_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">הערות</Label>
                      <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="הערות נוספות..."
                      />
                    </div>
                  </div>

                  {formData.type === 'Reconciliation' && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                          התאמת הון
                        </span>
                      </div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                        התאמת הון מגדירה נקודת ייחוס חדשה לחישובי P&L. כל הרווחים וההפסדים יחושבו מחדש מהתאריך הזה ואילך.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-4 space-x-reverse">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      ביטול
                    </Button>
                    <Button
                      type="submit"
                      className="apple-button"
                    >
                      שמור רשומה
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Capital History */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <History className="h-5 w-5 text-blue-600" />
                <span>היסטוריית הון</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capitalHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    אין היסטוריית הון
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    התחל לרשום הפקדות, משיכות והתאמות
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {capitalHistory.map((capital) => (
                    <div key={capital.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          capital.type === 'Initial' ? 'bg-blue-100 text-blue-600' :
                          capital.type === 'Deposit' ? 'bg-green-100 text-green-600' :
                          capital.type === 'Withdrawal' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {CAPITAL_TYPES[capital.type]}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(capital.actual_datetime)}
                          </div>
                          {capital.notes && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {capital.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`text-xl font-bold ${getProfitLossColor(capital.amount)}`}>
                        {formatCurrency(capital.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Capital Growth Chart */}
          <CapitalChart capitalHistory={capitalHistory} />
        </div>
      </main>
    </div>
  )
}
