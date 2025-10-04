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

  // Check if we have meaningful data to show
  const hasData = kpis.total_trades > 0 || kpis.total_profit_loss_closed !== 0 || kpis.total_profit_loss_open !== 0
  if (!hasData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="apple-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-4 w-4 bg-gray-100 dark:bg-gray-800 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
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
      description: `${kpis.winning_trades} מתוך ${kpis.total_trades} עסקאות סגורות`,
    },
    {
      title: 'שינוי יומי',
      value: `${kpis.daily_change_percent >= 0 ? '+' : ''}${kpis.daily_change_percent.toFixed(2)}%`,
      icon: TrendingUp,
      color: kpis.daily_change_percent >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: kpis.daily_change_percent >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      description: `${kpis.daily_change_dollars >= 0 ? '+' : ''}${formatCurrency(kpis.daily_change_dollars)}`,
    },
    {
      title: 'שינוי שבועי',
      value: `${kpis.weekly_change_percent >= 0 ? '+' : ''}${kpis.weekly_change_percent.toFixed(2)}%`,
      icon: TrendingUp,
      color: kpis.weekly_change_percent >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: kpis.weekly_change_percent >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      description: `${kpis.weekly_change_dollars >= 0 ? '+' : ''}${formatCurrency(kpis.weekly_change_dollars)}`,
    },
    {
      title: 'רווח/הפסד כולל',
      value: formatCurrency(kpis.total_profit_loss_closed + kpis.total_profit_loss_open),
      icon: DollarSign,
      color: (kpis.total_profit_loss_closed + kpis.total_profit_loss_open) >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: (kpis.total_profit_loss_closed + kpis.total_profit_loss_open) >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      description: `סגור: ${formatCurrency(kpis.total_profit_loss_closed)} | פתוח: ${formatCurrency(kpis.total_profit_loss_open)}`,
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
