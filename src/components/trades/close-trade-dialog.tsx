'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/ui/file-upload'
import { X, Calculator } from 'lucide-react'
import { 
  emotionalStatesDb,
  calculateTradeMetrics,
  initializeDatabase 
} from '@/lib/database-client'
import { 
  CloseTradeFormData, 
  EmotionalState, 
  Trade,
  DISCIPLINE_RATINGS 
} from '@/types'
import { formatCurrency, getProfitLossColor } from '@/lib/utils'

interface CloseTradeDialogProps {
  trade: Trade | null
  isOpen: boolean
  onClose: () => void
  onSave: (tradeId: string, closeData: CloseTradeFormData) => Promise<void>
}

export function CloseTradeDialog({ trade, isOpen, onClose, onSave }: CloseTradeDialogProps) {
  const [emotionalStates, setEmotionalStates] = useState<EmotionalState[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CloseTradeFormData>({
    exit_price: 0,
    emotional_state: '',
    followed_plan: 'Yes',
    discipline_rating: 3,
    what_worked: '',
    what_to_improve: '',
    exit_chart_url: '',
    notes: '',
  })

  const [calculatedResults, setCalculatedResults] = useState({
    result_dollars: 0,
    result_r_units: 0,
    result_percentage: 0,
  })

  useEffect(() => {
    if (isOpen) {
      loadEmotionalStates()
      if (trade) {
        setFormData({
          exit_price: trade.entry_price,
          emotional_state: '',
          followed_plan: 'Yes',
          discipline_rating: 3,
          what_worked: '',
          what_to_improve: '',
          exit_chart_url: '',
          notes: '',
        })
      }
    }
  }, [isOpen, trade])

  useEffect(() => {
    if (trade && formData.exit_price > 0) {
      calculateResults()
    }
  }, [formData.exit_price, trade])

  const loadEmotionalStates = async () => {
    try {
      setIsLoading(true)
      await initializeDatabase()
      const states = await emotionalStatesDb.findAll()
      setEmotionalStates(states.filter(s => s.is_active))
    } catch (err) {
      console.error('Failed to load emotional states:', err)
      setError('שגיאה בטעינת מצבים רגשיים')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateResults = () => {
    if (!trade) return

    const resultDollars = calculateTradeMetrics.calculateProfitLoss(
      trade.entry_price,
      formData.exit_price,
      trade.direction,
      trade.position_size
    )

    const resultRUnits = calculateTradeMetrics.calculateRUnits(
      trade.entry_price,
      formData.exit_price,
      trade.direction,
      trade.planned_stop_loss
    )

    const resultPercentage = calculateTradeMetrics.calculatePercentage(
      trade.entry_price,
      formData.exit_price,
      trade.direction
    )

    setCalculatedResults({
      result_dollars: resultDollars,
      result_r_units: resultRUnits,
      result_percentage: resultPercentage,
    })
  }

  const handleInputChange = (field: keyof CloseTradeFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trade) return

    setIsSaving(true)
    setError(null)

    try {
      await onSave(trade.id, formData)
      onClose()
    } catch (err) {
      console.error('Failed to close trade:', err)
      setError('שגיאה בסגירת העסקה')
    } finally {
      setIsSaving(false)
    }
  }

  if (!trade) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>סגור עסקה - {trade.symbol}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trade Summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <h3 className="font-semibold mb-3">סיכום העסקה</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">כיוון:</span>
                <span className="font-medium text-gray-900 dark:text-white mr-2">
                  {trade.direction}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">גודל פוזיציה:</span>
                <span className="font-medium text-gray-900 dark:text-white mr-2">
                  {trade.position_size.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">מחיר כניסה:</span>
                <span className="font-medium text-gray-900 dark:text-white mr-2">
                  {formatCurrency(trade.entry_price)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">סטופ לוס:</span>
                <span className="font-medium text-gray-900 dark:text-white mr-2">
                  {formatCurrency(trade.planned_stop_loss)}
                </span>
              </div>
            </div>
          </div>

          {/* Exit Price */}
          <div className="space-y-2">
            <Label htmlFor="exit_price">מחיר יציאה *</Label>
            <Input
              id="exit_price"
              type="number"
              step="0.01"
              value={formData.exit_price}
              onChange={(e) => handleInputChange('exit_price', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Calculated Results */}
          {calculatedResults.result_dollars !== 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center space-x-2 space-x-reverse mb-3">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  תוצאות מחושבות
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-300">P&L:</span>
                  <div className={`font-bold ${getProfitLossColor(calculatedResults.result_dollars)}`}>
                    {formatCurrency(calculatedResults.result_dollars)}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">R Units:</span>
                  <div className={`font-bold ${getProfitLossColor(calculatedResults.result_r_units)}`}>
                    {calculatedResults.result_r_units.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">אחוז:</span>
                  <div className={`font-bold ${getProfitLossColor(calculatedResults.result_percentage)}`}>
                    {calculatedResults.result_percentage.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Emotional State and Followed Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="emotional_state">מצב רגשי בסגירה</Label>
              <Select 
                value={formData.emotional_state} 
                onValueChange={(value) => handleInputChange('emotional_state', value)}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="followed_plan">האם עמדת בתוכנית?</Label>
              <Select 
                value={formData.followed_plan} 
                onValueChange={(value: 'Yes' | 'No' | 'Partially') => handleInputChange('followed_plan', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">כן - עמדתי בתוכנית</SelectItem>
                  <SelectItem value="No">לא - סטיתי מהתוכנית</SelectItem>
                  <SelectItem value="Partially">חלקית - סטיתי מעט</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Discipline Rating */}
          <div className="space-y-2">
            <Label htmlFor="discipline_rating">דירוג משמעת</Label>
            <Select 
              value={formData.discipline_rating.toString()} 
              onValueChange={(value) => handleInputChange('discipline_rating', parseInt(value) as 1 | 2 | 3 | 4 | 5)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DISCIPLINE_RATINGS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {key} כוכבים - {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* What Worked and What to Improve */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="what_worked">מה עבד טוב?</Label>
              <Textarea
                id="what_worked"
                value={formData.what_worked}
                onChange={(e) => handleInputChange('what_worked', e.target.value)}
                placeholder="תאר מה עבד טוב בעסקה זו..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="what_to_improve">מה צריך לשפר?</Label>
              <Textarea
                id="what_to_improve"
                value={formData.what_to_improve}
                onChange={(e) => handleInputChange('what_to_improve', e.target.value)}
                placeholder="תאר מה צריך לשפר בעסקאות הבאות..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* Exit Chart Upload */}
          <div className="space-y-2">
            <Label>צילום גרף יציאה</Label>
            <FileUpload
              onUpload={(url) => handleInputChange('exit_chart_url', url)}
              onError={(error) => setError(error)}
              placeholder="העלה צילום מסך של הגרף בזמן היציאה"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">הערות נוספות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="הוסף הערות נוספות על העסקה..."
              className="min-h-[80px]"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !formData.exit_price}
              className="apple-button"
            >
              {isSaving ? 'סוגר...' : 'סגור עסקה'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
