'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

interface UpdateItem {
  id: string
  type: 'trade' | 'capital' | 'alert'
  title: string
  description: string
  timestamp: Date
  value?: number
  change?: number
}

export function LiveUpdatesPanel() {
  const [updates, setUpdates] = useState<UpdateItem[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Listen for realtime updates
  useEffect(() => {
    const handleTradesUpdate = (event: CustomEvent) => {
      const update: UpdateItem = {
        id: Date.now().toString(),
        type: 'trade',
        title: 'עסקה עודכנה',
        description: event.detail.new ? 'עסקה חדשה נוספה' : 'עסקה קיימת עודכנה',
        timestamp: new Date(),
        value: event.detail.new?.profit
      }
      setUpdates(prev => [update, ...prev].slice(0, 10))
    }

    const handleCapitalUpdate = (event: CustomEvent) => {
      const update: UpdateItem = {
        id: Date.now().toString(),
        type: 'capital',
        title: 'הון עודכן',
        description: 'שינוי בהון הכולל',
        timestamp: new Date(),
        value: event.detail.new?.total,
        change: event.detail.new?.change
      }
      setUpdates(prev => [update, ...prev].slice(0, 10))
    }

    window.addEventListener('trades-updated', handleTradesUpdate as EventListener)
    window.addEventListener('capital-updated', handleCapitalUpdate as EventListener)

    return () => {
      window.removeEventListener('trades-updated', handleTradesUpdate as EventListener)
      window.removeEventListener('capital-updated', handleCapitalUpdate as EventListener)
    }
  }, [])

  // Add demo updates for testing
  useEffect(() => {
    const demoUpdates: UpdateItem[] = [
      {
        id: '1',
        type: 'trade',
        title: 'עסקה חדשה - AAPL',
        description: 'רווח של 2.5%',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        value: 250,
        change: 2.5
      },
      {
        id: '2',
        type: 'capital',
        title: 'עדכון הון',
        description: 'הון כולל: $10,250',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        value: 10250,
        change: 1.2
      },
      {
        id: '3',
        type: 'alert',
        title: 'התראת סטופ לוס',
        description: 'TSLA מתקרב לסטופ לוס',
        timestamp: new Date(Date.now() - 30 * 60 * 1000)
      }
    ]
    setUpdates(demoUpdates)
  }, [])

  const getUpdateIcon = (type: UpdateItem['type'], change?: number) => {
    switch (type) {
      case 'trade':
        return change && change > 0 ? 
          <TrendingUp className="w-4 h-4 text-green-500" /> : 
          <TrendingDown className="w-4 h-4 text-red-500" />
      case 'capital':
        return <DollarSign className="w-4 h-4 text-blue-500" />
      case 'alert':
        return <Activity className="w-4 h-4 text-yellow-500" />
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            עדכונים חיים
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {updates.length} עדכונים
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`space-y-3 transition-all ${isExpanded ? 'max-h-96' : 'max-h-40'} overflow-y-auto`}>
          {updates.map((update) => (
            <div key={update.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="mt-1">
                {getUpdateIcon(update.type, update.change)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {update.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {update.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(update.timestamp, { addSuffix: true, locale: he })}
                  </span>
                </div>
              </div>
              {update.value && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ${update.value.toLocaleString()}
                  </p>
                  {update.change && (
                    <p className={`text-xs ${update.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {update.change > 0 ? '+' : ''}{update.change.toFixed(2)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {updates.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'הצג פחות' : 'הצג עוד'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}