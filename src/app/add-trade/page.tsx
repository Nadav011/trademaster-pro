'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileUpload } from '@/components/ui/file-upload'
import { Plus, Calculator, TrendingUp, TrendingDown } from 'lucide-react'
import { 
  tradesDb, 
  entryReasonsDb, 
  emotionalStatesDb, 
  usersDb,
  calculateTradeMetrics,
  initializeDatabase 
} from '@/lib/database-client'
import { triggerAutoSync } from '@/lib/supabase'
import { marketDataUtils, finnhubAPI } from '@/lib/finnhub'
import { apiConfig } from '@/lib/api-config'
import { 
  TradeFormData, 
  EntryReason, 
  EmotionalState, 
  User,
  RISK_LEVELS,
  MARKET_TIMING 
} from '@/types'
import { formatCurrency } from '@/lib/utils'

export default function AddTrade() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entryReasons, setEntryReasons] = useState<EntryReason[]>([])
  const [emotionalStates, setEmotionalStates] = useState<EmotionalState[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<TradeFormData>({
    symbol: '',
    direction: 'Long',
    market_timing: 'Market',
    entry_price: 0,
    planned_stop_loss: 0,
    position_size: 0,
    entry_reason: '',
    emotional_entry: '',
    risk_level: 1,
    notes: '',
    entry_chart_url: '',
  })

  const [tradeDateTime, setTradeDateTime] = useState<string>(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  })

  const [calculatedPositionSize, setCalculatedPositionSize] = useState<number>(0)
  const [showCustomEntryReason, setShowCustomEntryReason] = useState(false)
  const [showCustomEmotionalState, setShowCustomEmotionalState] = useState(false)
  const [customEntryReason, setCustomEntryReason] = useState('')
  const [customEmotionalState, setCustomEmotionalState] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        await initializeDatabase()

        // Set up Finnhub API key
        const finnhubApiKey = apiConfig.getFinnhubApiKey()
        if (finnhubApiKey) {
          finnhubAPI.setApiKey(finnhubApiKey)
        }

        const [reasons, states, userData] = await Promise.all([
          entryReasonsDb.findAll(),
          emotionalStatesDb.findAll(),
          usersDb.findAll()
        ])

        // Remove duplicates from entry reasons
        const uniqueReasons = reasons.filter((reason, index, self) => 
          index === self.findIndex(r => r.name.toLowerCase() === reason.name.toLowerCase())
        ).filter(r => r.is_active)

        // Remove duplicates from emotional states
        const uniqueStates = states.filter((state, index, self) => 
          index === self.findIndex(s => s.name.toLowerCase() === state.name.toLowerCase())
        ).filter(s => s.is_active)

        setEntryReasons(uniqueReasons)
        setEmotionalStates(uniqueStates)
        setUser(userData[0] || null)
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('שגיאה בטעינת נתונים')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate risk percentage when position size is entered
  useEffect(() => {
    if (
      formData.entry_price > 0 && 
      formData.planned_stop_loss > 0 && 
      formData.position_size > 0 &&
      user?.initial_capital_historical
    ) {
      const riskPerShare = Math.abs(formData.entry_price - formData.planned_stop_loss)
      const totalRisk = riskPerShare * formData.position_size
      const riskPercentage = (totalRisk / user.initial_capital_historical) * 100
      setCalculatedPositionSize(riskPercentage)
    }
  }, [formData.entry_price, formData.planned_stop_loss, formData.position_size, user])

  const handleInputChange = (field: keyof TradeFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCreateCustomEntryReason = async () => {
    if (!customEntryReason.trim()) return
    
    // Check if reason already exists
    const existingReason = entryReasons.find(r => 
      r.name.toLowerCase() === customEntryReason.trim().toLowerCase()
    )
    
    if (existingReason) {
      setFormData(prev => ({ ...prev, entry_reason: existingReason.name }))
      setShowCustomEntryReason(false)
      setCustomEntryReason('')
      return
    }
    
    try {
      const newReason = await entryReasonsDb.create({
        name: customEntryReason.trim(),
        is_active: true
      })
      
      setEntryReasons(prev => [...prev, newReason])
      setFormData(prev => ({ ...prev, entry_reason: newReason.name }))
      setShowCustomEntryReason(false)
      setCustomEntryReason('')
    } catch (err) {
      console.error('Failed to create entry reason:', err)
      setError('שגיאה ביצירת סיבת כניסה')
    }
  }

  const handleCreateCustomEmotionalState = async () => {
    if (!customEmotionalState.trim()) return
    
    // Check if state already exists
    const existingState = emotionalStates.find(s => 
      s.name.toLowerCase() === customEmotionalState.trim().toLowerCase()
    )
    
    if (existingState) {
      setFormData(prev => ({ ...prev, emotional_entry: existingState.name }))
      setShowCustomEmotionalState(false)
      setCustomEmotionalState('')
      return
    }
    
    try {
      const newState = await emotionalStatesDb.create({
        name: customEmotionalState.trim(),
        is_active: true
      })
      
      setEmotionalStates(prev => [...prev, newState])
      setFormData(prev => ({ ...prev, emotional_entry: newState.name }))
      setShowCustomEmotionalState(false)
      setCustomEmotionalState('')
    } catch (err) {
      console.error('Failed to create emotional state:', err)
      setError('שגיאה ביצירת מצב רגשי')
    }
  }

  const fetchCurrentPrice = async () => {
    if (!formData.symbol) return

    setIsLoadingPrice(true)
    try {
      const marketData = await marketDataUtils.getSinglePrice(formData.symbol)
      if (marketData) {
        setCurrentPrice(marketData.price)
        setFormData(prev => ({
          ...prev,
          entry_price: marketData.price
        }))
      }
    } catch (err) {
      console.error('Failed to fetch price:', err)
    } finally {
      setIsLoadingPrice(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!user) {
        throw new Error('משתמש לא נמצא')
      }

      const tradeData = {
        datetime: new Date(tradeDateTime).toISOString(),
        symbol: formData.symbol,
        direction: formData.direction,
        market_timing: formData.market_timing,
        position_size: formData.position_size,
        entry_price: formData.entry_price,
        planned_stop_loss: formData.planned_stop_loss,
        risk_level: formData.risk_level,
        entry_reason: formData.entry_reason,
        emotional_entry: formData.emotional_entry,
        notes: formData.notes,
        entry_chart_url: formData.entry_chart_url,
      }

      await tradesDb.create(tradeData)
      
      // Trigger auto-sync after creating trade
      console.log('🔄 Trade created, triggering auto-sync...')
      await triggerAutoSync()
      
      router.push('/')
    } catch (err) {
      console.error('Failed to create trade:', err)
      setError('שגיאה בשמירת העסקה')
    } finally {
      setIsSubmitting(false)
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
                <div className="text-center">טוען...</div>
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
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                הוסף עסקה חדשה
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                תיעוד עסקה חדשה עם כל הפרטים הנדרשים
              </p>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                onClick={() => router.push('/trades')}
                className="flex items-center space-x-2 space-x-reverse"
                size="sm"
              >
                <span className="text-sm">צפה בעסקאות</span>
              </Button>
            </div>
          </div>

          {/* User Info Card */}
          {user && (
            <Card className="apple-card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(user.initial_capital_historical)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">הון כולל</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {user.risk_per_trade_percent}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">סיכון לעסקה</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formData.entry_price > 0 && formData.planned_stop_loss > 0 
                        ? `${Math.abs(((formData.entry_price - formData.planned_stop_loss) / formData.entry_price) * 100).toFixed(2)}%`
                        : '0%'
                      }
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">מרחק סטופ לוס</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {user.full_name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">משתמש</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Plus className="h-5 w-5 text-blue-600" />
                <span>פרטי העסקה</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date and Time */}
                <div className="space-y-2">
                  <Label htmlFor="trade_datetime">תאריך ושעת העסקה *</Label>
                  <Input
                    id="trade_datetime"
                    type="datetime-local"
                    value={tradeDateTime}
                    onChange={(e) => setTradeDateTime(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                {/* Symbol and Direction */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">סמל הנכס *</Label>
                    <Input
                      id="symbol"
                      value={formData.symbol}
                      onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                      placeholder="AAPL, BTC/USD"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="direction">כיוון העסקה *</Label>
                    <Select 
                      value={formData.direction} 
                      onValueChange={(value: 'Long' | 'Short') => handleInputChange('direction', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Long">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span>Long (קנייה)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Short">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span>Short (מכירה)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Entry Price, Stop Loss and Position Size */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="entry_price">מחיר כניסה *</Label>
                    <div className="flex space-x-2 space-x-reverse">
                      <Input
                        id="entry_price"
                        type="number"
                        step="0.01"
                        value={formData.entry_price}
                        onChange={(e) => handleInputChange('entry_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchCurrentPrice}
                        disabled={!formData.symbol || isLoadingPrice}
                        className="whitespace-nowrap"
                      >
                        {isLoadingPrice ? 'טוען...' : 'מחיר נוכחי'}
                      </Button>
                    </div>
                    {currentPrice && (
                      <p className="text-sm text-green-600">
                        מחיר נוכחי: {formatCurrency(currentPrice)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="planned_stop_loss">סטופ לוס מתוכנן *</Label>
                    <Input
                      id="planned_stop_loss"
                      type="number"
                      step="0.01"
                      value={formData.planned_stop_loss}
                      onChange={(e) => handleInputChange('planned_stop_loss', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position_size">כמות מניות *</Label>
                    <Input
                      id="position_size"
                      type="number"
                      step="1"
                      value={formData.position_size}
                      onChange={(e) => handleInputChange('position_size', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                {/* Risk Calculation */}
                {calculatedPositionSize > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      <div>
                        <span className="font-semibold text-blue-900 dark:text-blue-100">
                          חישוב סיכון: {calculatedPositionSize.toFixed(2)}% מהון
                        </span>
                        <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                          <p>גודל פוזיציה: {formData.position_size.toLocaleString()} מניות</p>
                          <p>הפסד מקסימלי למניה: {formatCurrency(Math.abs(formData.entry_price - formData.planned_stop_loss))}</p>
                          <p>סיכון כולל: {formatCurrency(Math.abs(formData.entry_price - formData.planned_stop_loss) * formData.position_size)}</p>
                          <p>הון כולל: {formatCurrency(user?.initial_capital_historical || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Market Timing and Risk Level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="market_timing">זמן כניסה</Label>
                    <Select 
                      value={formData.market_timing} 
                      onValueChange={(value: 'Market' | 'Pre-Market' | 'After-Hours') => handleInputChange('market_timing', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MARKET_TIMING).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="risk_level">רמת סיכון</Label>
                    <Select 
                      value={formData.risk_level.toString()} 
                      onValueChange={(value) => handleInputChange('risk_level', parseInt(value) as 1 | 2 | 3)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RISK_LEVELS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Entry Reason and Emotional State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="entry_reason">סיבת כניסה</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCustomEntryReason(!showCustomEntryReason)}
                        className="text-xs"
                      >
                        {showCustomEntryReason ? 'בטל' : 'הוסף חדש'}
                      </Button>
                    </div>
                    
                    {!showCustomEntryReason ? (
                      <Select 
                        value={formData.entry_reason} 
                        onValueChange={(value) => handleInputChange('entry_reason', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סיבת כניסה" />
                        </SelectTrigger>
                        <SelectContent>
                          {entryReasons.map((reason) => (
                            <SelectItem key={reason.id} value={reason.name}>{reason.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex space-x-2 space-x-reverse">
                        <Input
                          placeholder="הכנס סיבת כניסה חדשה"
                          value={customEntryReason}
                          onChange={(e) => setCustomEntryReason(e.target.value)}
                        />
                        <Button
                          type="button"
                          onClick={handleCreateCustomEntryReason}
                          disabled={!customEntryReason.trim()}
                          size="sm"
                        >
                          שמור
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="emotional_entry">מצב רגשי בכניסה</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCustomEmotionalState(!showCustomEmotionalState)}
                        className="text-xs"
                      >
                        {showCustomEmotionalState ? 'בטל' : 'הוסף חדש'}
                      </Button>
                    </div>
                    
                    {!showCustomEmotionalState ? (
                      <Select 
                        value={formData.emotional_entry} 
                        onValueChange={(value) => handleInputChange('emotional_entry', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מצב רגשי" />
                        </SelectTrigger>
                        <SelectContent>
                          {emotionalStates.map((state) => (
                            <SelectItem key={state.id} value={state.name}>{state.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex space-x-2 space-x-reverse">
                        <Input
                          placeholder="הכנס מצב רגשי חדש"
                          value={customEmotionalState}
                          onChange={(e) => setCustomEmotionalState(e.target.value)}
                        />
                        <Button
                          type="button"
                          onClick={handleCreateCustomEmotionalState}
                          disabled={!customEmotionalState.trim()}
                          size="sm"
                        >
                          שמור
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart Upload */}
                <div className="space-y-2">
                  <Label>צילום גרף כניסה</Label>
                  <FileUpload
                    onUpload={(url) => handleInputChange('entry_chart_url', url)}
                    onError={(error) => setError(error)}
                    placeholder="העלה צילום מסך של הגרף בזמן הכניסה"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">הערות</Label>
                  <textarea
                    id="notes"
                    className="w-full min-h-[100px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="הוסף הערות על העסקה..."
                  />
                </div>

                {/* Trade Summary */}
                {formData.symbol && formData.entry_price > 0 && formData.position_size > 0 && (
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">סיכום העסקה</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-green-700 dark:text-green-300">סמל:</span>
                          <span className="font-semibold mr-2">{formData.symbol}</span>
                        </div>
                        <div>
                          <span className="text-green-700 dark:text-green-300">כיוון:</span>
                          <span className="font-semibold mr-2">{formData.direction === 'Long' ? 'קנייה' : 'מכירה'}</span>
                        </div>
                        <div>
                          <span className="text-green-700 dark:text-green-300">ערך כולל:</span>
                          <span className="font-semibold mr-2">{formatCurrency(formData.entry_price * formData.position_size)}</span>
                        </div>
                        <div>
                          <span className="text-green-700 dark:text-green-300">סיכון מקסימלי:</span>
                          <span className="font-semibold mr-2">
                            {formatCurrency(Math.abs(formData.entry_price - formData.planned_stop_loss) * formData.position_size)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 space-x-reverse">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    ביטול
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.symbol || !formData.entry_price || !formData.planned_stop_loss || !formData.position_size}
                    className="apple-button"
                  >
                    {isSubmitting ? 'שומר...' : 'שמור עסקה'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
