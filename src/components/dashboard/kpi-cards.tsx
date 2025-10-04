'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { DashboardKPIs } from '@/types'

interface KPICardsProps {
  kpis: DashboardKPIs
  isLoading?: boolean
}

export function KPICards({ kpis, isLoading = false }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="apple-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'אחוז הצלחה',
      value: `${kpis.win_rate.toFixed(1)}%`,
      icon: Target,
      color: kpis.win_rate >= 50 ? 'text-green-600' : 'text-red-600',
      bgColor: kpis.win_rate >= 50 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      description: `${kpis.winning_trades} מתוך ${kpis.total_trades} עסקאות`,
    },
    {
      title: 'ממוצע R',
      value: kpis.average_r.toFixed(2),
      icon: TrendingUp,
      color: kpis.average_r >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: kpis.average_r >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      description: 'רווח ממוצע ליחידת סיכון',
    },
    {
      title: 'סך R מצטבר',
      value: kpis.total_r.toFixed(2),
      icon: TrendingUp,
      color: kpis.total_r >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: kpis.total_r >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      description: 'סך יחידות R מכל העסקאות',
    },
    {
      title: 'רווח/הפסד מצטבר',
      value: formatCurrency(kpis.total_profit_loss),
      icon: DollarSign,
      color: kpis.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: kpis.total_profit_loss >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      description: 'רווח או הפסד כספי כולל',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="apple-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color} mb-1`}>
                {card.value}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
