'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Eye, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { TradeWithCalculations } from '@/types'
import { formatCurrency, formatDate, getProfitLossColor } from '@/lib/utils'

interface TradeCardProps {
  trade: TradeWithCalculations
  onEdit?: (trade: TradeWithCalculations) => void
  onDelete?: (trade: TradeWithCalculations) => void
}

export function TradeCard({ trade, onEdit, onDelete }: TradeCardProps) {
  const isOpen = !trade.exit_price
  const pnl = isOpen ? trade.unrealized_pnl : trade.result_dollars
  const rUnits = isOpen ? trade.unrealized_r_units : trade.result_r_units
  const percentage = isOpen ? trade.unrealized_percentage : trade.result_percentage

  return (
    <Card className="trade-card hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="font-bold text-lg text-gray-900 dark:text-white">
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
            {isOpen ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                פתוח
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                סגור
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(trade.datetime)}
          </div>
        </div>

        {/* Trade Details */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">מחיר כניסה:</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(trade.entry_price)}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isOpen ? 'מחיר נוכחי:' : 'מחיר יציאה:'}
            </span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {isOpen 
                ? (trade.current_price ? formatCurrency(trade.current_price) : 'טוען...')
                : (trade.exit_price ? formatCurrency(trade.exit_price) : 'לא נסגר')
              }
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">גודל פוזיציה:</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {trade.position_size.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">סטופ לוס:</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(trade.planned_stop_loss)}
            </div>
          </div>
        </div>

        {/* P&L Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">P&L</span>
              <div className={`font-bold text-lg ${getProfitLossColor(pnl || 0)}`}>
                {pnl ? formatCurrency(pnl) : 'טוען...'}
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">R Units</span>
              <div className={`font-bold text-lg ${getProfitLossColor(rUnits || 0)}`}>
                {rUnits ? rUnits.toFixed(2) : 'טוען...'}
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">אחוז</span>
              <div className={`font-bold text-lg ${getProfitLossColor(percentage || 0)}`}>
                {percentage ? `${percentage.toFixed(2)}%` : 'טוען...'}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">סיבת כניסה:</span>
            <span className="text-gray-900 dark:text-white mr-2">{trade.entry_reason}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">מצב רגשי:</span>
            <span className="text-gray-900 dark:text-white mr-2">{trade.emotional_entry}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex space-x-2 space-x-reverse">
            <Link href={`/trades/${trade.id}`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 ml-2" />
                פרטים
              </Button>
            </Link>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(trade)}>
                <Edit className="h-4 w-4 ml-2" />
                עריכה
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDelete(trade)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                מחק
              </Button>
            )}
          </div>
          {isOpen && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {trade.current_price && trade.current_price > trade.entry_price && trade.direction === 'Long' ? '📈' : ''}
              {trade.current_price && trade.current_price < trade.entry_price && trade.direction === 'Short' ? '📈' : ''}
              {trade.current_price && trade.current_price < trade.entry_price && trade.direction === 'Long' ? '📉' : ''}
              {trade.current_price && trade.current_price > trade.entry_price && trade.direction === 'Short' ? '📉' : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
