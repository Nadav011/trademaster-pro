'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileUpload } from '@/components/ui/file-upload'
import { Plus, Calculator, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react'
import { 
  tradesDb, 
  entryReasonsDb, 
  emotionalStatesDb, 
  usersDb,
  calculateTradeMetrics,
  initializeDatabase 
} from '@/lib/database-client'
import { marketDataUtils, finnhubAPI } from '@/lib/finnhub'
import { apiConfig } from '@/lib/api-config'
import { 
  TradeFormData, 
  EntryReason, 
  EmotionalState, 
  User,
  Trade,
  RISK_LEVELS,
  MARKET_TIMING 
} from '@/types'
import { formatCurrency } from '@/lib/utils'

export default function EditTrade() {
  const router = useRouter()
  const params = useParams()
  const tradeId = params.id as string
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entryReasons, setEntryReasons] = useState<EntryReason[]>([])
  const [emotionalStates, setEmotionalStates] = useState<EmotionalState[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalTrade, setOriginalTrade] = useState<Trade | null>(null)

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

        // Load trade data
        const trade = await tradesDb.findById(tradeId)
        if (!trade) {
          setError('עסקה לא נמצאה')
          return
        }

        setOriginalTrade(trade)

        // Set form data from trade
        setFormData({
          symbol: trade.symbol,
          direction: trade.direction,
          market_timing: trade.market_timing,
          entry_price: trade.entry_price,
          planned_stop_loss: trade.planned_stop_loss,
          position_size: trade.position_size,
          entry_reason: trade.entry_reason,
          emotional_entry: trade.emotional_entry,
          risk_level: trade.risk_level,
          notes: trade.notes || '',
          entry_chart_url: trade.entry_chart_url || '',
        })

        // Set trade datetime
        const tradeDate = new Date(trade.datetime)
        const year = tradeDate.getFullYear()
        const month = String(tradeDate.getMonth() + 1).padStart(2, '0')
        const day = String(tradeDate.getDate()).padStart(2, '0')
        const hours = String(tradeDate.getHours()).padStart(2, '0')
        const minutes = String(tradeDate.getMinutes()).padStart(2, '0')
        setTradeDateTime(`${year}-${month}-${day}T${hours}:${minutes}`)

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

    if (tradeId) {
      loadData()
    }
  }, [tradeId])

  const handleInputChange = (field: keyof TradeFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleGetCurrentPrice = async () => {
    if (!formData.symbol.trim()) {
      setError('נא להכניס סמל מניה')
      return
    }

    setIsLoadingPrice(true)
    setError(null)

    try {
      const marketData = await marketDataUtils.getSinglePrice(formData.symbol.trim().toUpperCase())
      if (marketData) {
        setCurrentPrice(marketData.price)
        handleInputChange('entry_price', marketData.price)
      }
    } catch (err) {
      console.error('Failed to get current price:', err)
      setError('שגיאה בטעינת מחיר נוכחי')
    } finally {
      setIsLoadingPrice(false)
    }
  }

  const calculateRiskPercentage = () => {
    if (!user || !formData.entry_price || !formData.planned_stop_loss || !formData.position_size) {
      setError('נא למלא את כל השדות הנדרשים')
      return
    }

    try {
      const riskPerShare = Math.abs(formData.entry_price - formData.planned_stop_loss)
      const totalRisk = riskPerShare * formData.position_size
      const riskPercentage = (totalRisk / user.initial_capital_historical) * 100
      setCalculatedPositionSize(riskPercentage)
    } catch (err) {
      console.error('Failed to calculate risk percentage:', err)
      setError('שגיאה בחישוב אחוז הסיכון')
    }
  }

  const handleCreateCustomEntryReason = async () => {
    if (!customEntryReason.trim()) {
      setError('נא להכניס סיבת כניסה')
      return
    }

    try {
      // Check if reason already exists
      const existingReasons = await entryReasonsDb.findAll()
      const exists = existingReasons.some(r => 
        r.name.toLowerCase() === customEntryReason.trim().toLowerCase()
      )

      if (exists) {
        setError('סיבת כניסה זו כבר קיימת')
        return
      }

      const newReason = await entryReasonsDb.create({
        name: customEntryReason.trim(),
        is_active: true
      })

      setEntryReasons(prev => [...prev, newReason])
      handleInputChange('entry_reason', newReason.id)
      setCustomEntryReason('')
      setShowCustomEntryReason(false)
    } catch (err) {
      console.error('Failed to create entry reason:', err)
      setError('שגיאה ביצירת סיבת כניסה')
    }
  }

  const handleCreateCustomEmotionalState = async () => {
    if (!customEmotionalState.trim()) {
      setError('נא להכניס מצב רגשי')
      return
    }

    try {
      // Check if state already exists
      const existingStates = await emotionalStatesDb.findAll()
      const exists = existingStates.some(s => 
        s.name.toLowerCase() === customEmotionalState.trim().toLowerCase()
      )

      if (exists) {
        setError('מצב רגשי זה כבר קיים')
        return
      }

      const newState = await emotionalStatesDb.create({
        name: customEmotionalState.trim(),
        is_active: true
      })

      setEmotionalStates(prev => [...prev, newState])
      handleInputChange('emotional_entry', newState.id)
      setCustomEmotionalState('')
      setShowCustomEmotionalState(false)
    } catch (err) {
      console.error('Failed to create emotional state:', err)
      setError('שגיאה ביצירת מצב רגשי')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!originalTrade) {
      setError('עסקה לא נמצאה')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Update the trade
      const updatedTrade = {
        ...originalTrade,
        datetime: new Date(tradeDateTime).toISOString(),
        symbol: formData.symbol.trim().toUpperCase(),
        direction: formData.direction,
        market_timing: formData.market_timing,
        position_size: formData.position_size,
        entry_price: formData.entry_price,
        planned_stop_loss: formData.planned_stop_loss,
        entry_reason: formData.entry_reason,
        emotional_entry: formData.emotional_entry,
        risk_level: formData.risk_level,
        notes: formData.notes,
        entry_chart_url: formData.entry_chart_url,
        updated_at: new Date().toISOString()
      }

      await tradesDb.update(tradeId, updatedTrade)
      
      router.push('/trades')
    } catch (err) {
      console.error('Failed to update trade:', err)
      setError('שגיאה בעדכון העסקה')
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
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <div className="text-gray-600">טוען נתונים...</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (error && !originalTrade) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="p-6 lg:mr-64">
          <div className="max-w-4xl mx-auto">
            <Card className="apple-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-red-600 text-lg mb-4">{error}</div>
                  <Button onClick={() => router.push('/trades')} className="apple-button">
                    חזור לרשימת עסקאות
                  </Button>
                </div>
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
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button
                variant="outline"
                onClick={() => router.push('/trades')}
                className="flex items-center space-x-2 space-x-reverse"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>חזור</span>
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  עריכת עסקה
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                  עדכון פרטי העסקה
                </p>
              </div>
            </div>
          </div>

          {error && (
            <Card className="apple-card border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="text-red-600 text-center">{error}</div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Trade Information */}
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>פרטי עסקה בסיסיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Symbol */}
                  <div className="space-y-2">
                    <Label htmlFor="symbol">סמל מניה *</Label>
                    <Input
                      id="symbol"
                      value={formData.symbol}
                      onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                      placeholder="AAPL"
                      required
                    />
                  </div>

                  {/* Direction */}
                  <div className="space-y-2">
                    <Label htmlFor="direction">כיוון *</Label>
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
                            <span>Long</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Short">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span>Short</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Market Timing */}
                  <div className="space-y-2">
                    <Label htmlFor="market_timing">זמן מסחר *</Label>
                    <Select
                      value={formData.market_timing}
                      onValueChange={(value: 'Market' | 'Pre-Market' | 'After-Hours') => handleInputChange('market_timing', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MARKET_TIMING).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trade DateTime */}
                  <div className="space-y-2">
                    <Label htmlFor="datetime">תאריך ושעה *</Label>
                    <Input
                      id="datetime"
                      type="datetime-local"
                      value={tradeDateTime}
                      onChange={(e) => setTradeDateTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Information */}
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>מידע מחירים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Entry Price */}
                  <div className="space-y-2">
                    <Label htmlFor="entry_price">מחיר כניסה *</Label>
                    <div className="flex space-x-2 space-x-reverse">
                      <Input
                        id="entry_price"
                        type="number"
                        step="0.01"
                        value={formData.entry_price || ''}
                        onChange={(e) => handleInputChange('entry_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGetCurrentPrice}
                        disabled={isLoadingPrice}
                        className="px-4"
                      >
                        {isLoadingPrice ? 'טוען...' : 'מחיר נוכחי'}
                      </Button>
                    </div>
                    {currentPrice && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        מחיר נוכחי: {formatCurrency(currentPrice)}
                      </p>
                    )}
                  </div>

                  {/* Stop Loss */}
                  <div className="space-y-2">
                    <Label htmlFor="planned_stop_loss">סטופ לוס מתוכנן *</Label>
                    <Input
                      id="planned_stop_loss"
                      type="number"
                      step="0.01"
                      value={formData.planned_stop_loss || ''}
                      onChange={(e) => handleInputChange('planned_stop_loss', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position Size */}
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>גודל פוזיציה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Position Size */}
                  <div className="space-y-2">
                    <Label htmlFor="position_size">גודל פוזיציה (מניות) *</Label>
                    <div className="flex space-x-2 space-x-reverse">
                      <Input
                        id="position_size"
                        type="number"
                        value={formData.position_size || ''}
                        onChange={(e) => handleInputChange('position_size', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={calculateRiskPercentage}
                        className="px-4"
                      >
                        <Calculator className="h-4 w-4 ml-2" />
                        חישוב סיכון
                      </Button>
                    </div>
                    {calculatedPositionSize > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        אחוז סיכון: {calculatedPositionSize.toFixed(2)}% מהון
                      </p>
                    )}
                  </div>

                  {/* User Info */}
                  {user && (
                    <div className="space-y-2">
                      <Label>מידע משתמש</Label>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">הון כולל:</span>
                          <span className="text-sm font-medium">{formatCurrency(user.initial_capital_historical)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">מרחק סטופ לוס:</span>
                          <span className="text-sm font-medium">
                            {formData.entry_price && formData.planned_stop_loss 
                              ? `${Math.abs(((formData.entry_price - formData.planned_stop_loss) / formData.entry_price) * 100).toFixed(2)}%`
                              : '0%'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Entry Reasons and Emotional State */}
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>סיבות כניסה ומצב רגשי</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Entry Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="entry_reason">סיבת כניסה *</Label>
                    <div className="space-y-2">
                      <Select
                        value={formData.entry_reason}
                        onValueChange={(value) => handleInputChange('entry_reason', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סיבת כניסה" />
                        </SelectTrigger>
                        <SelectContent>
                          {entryReasons.map((reason) => (
                            <SelectItem key={reason.id} value={reason.id}>
                              {reason.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!showCustomEntryReason ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCustomEntryReason(true)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          הוסף חדש
                        </Button>
                      ) : (
                        <div className="flex space-x-2 space-x-reverse">
                          <Input
                            value={customEntryReason}
                            onChange={(e) => setCustomEntryReason(e.target.value)}
                            placeholder="סיבת כניסה חדשה"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={handleCreateCustomEntryReason}
                            size="sm"
                          >
                            שמור
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCustomEntryReason(false)
                              setCustomEntryReason('')
                            }}
                            size="sm"
                          >
                            ביטול
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Emotional State */}
                  <div className="space-y-2">
                    <Label htmlFor="emotional_entry">מצב רגשי *</Label>
                    <div className="space-y-2">
                      <Select
                        value={formData.emotional_entry}
                        onValueChange={(value) => handleInputChange('emotional_entry', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מצב רגשי" />
                        </SelectTrigger>
                        <SelectContent>
                          {emotionalStates.map((state) => (
                            <SelectItem key={state.id} value={state.id}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!showCustomEmotionalState ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCustomEmotionalState(true)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          הוסף חדש
                        </Button>
                      ) : (
                        <div className="flex space-x-2 space-x-reverse">
                          <Input
                            value={customEmotionalState}
                            onChange={(e) => setCustomEmotionalState(e.target.value)}
                            placeholder="מצב רגשי חדש"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={handleCreateCustomEmotionalState}
                            size="sm"
                          >
                            שמור
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCustomEmotionalState(false)
                              setCustomEmotionalState('')
                            }}
                            size="sm"
                          >
                            ביטול
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Level and Notes */}
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>רמת סיכון והערות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Risk Level */}
                  <div className="space-y-2">
                    <Label htmlFor="risk_level">רמת סיכון *</Label>
                    <Select
                      value={formData.risk_level.toString()}
                      onValueChange={(value) => handleInputChange('risk_level', parseInt(value) as 1 | 2 | 3)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RISK_LEVELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Entry Chart URL */}
                  <div className="space-y-2">
                    <Label htmlFor="entry_chart_url">קישור לתרשים כניסה</Label>
                    <Input
                      id="entry_chart_url"
                      type="url"
                      value={formData.entry_chart_url}
                      onChange={(e) => handleInputChange('entry_chart_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">הערות</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="הערות נוספות על העסקה..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/trades')}
                disabled={isSubmitting}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="apple-button"
              >
                {isSubmitting ? 'שומר...' : 'עדכן עסקה'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
