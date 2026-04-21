'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Target, DollarSign, Activity, BarChart3 } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { DashboardKPIs } from '@/types'
import { memo } from 'react'

interface KPICardsProps {
  kpis: DashboardKPIs
  isLoading?: boolean
}

const KPICards = memo(function KPICards({ kpis, isLoading = false }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="apple-card animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
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
          <Card key={i} className="apple-card opacity-50">
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
      color: kpis.win_rate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: kpis.win_rate >= 50 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      borderColor: kpis.win_rate >= 50 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800',
      description: `${kpis.winning_trades} מתוך ${kpis.total_trades} עסקאות סגורות`,
      gradient: kpis.win_rate >= 50 ? 'from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10' : 'from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10',
    },
    {
      title: 'שינוי יומי',
      value: `${kpis.daily_change_percent >= 0 ? '+' : ''}${kpis.daily_change_percent.toFixed(2)}%`,
      icon: TrendingUp,
      color: kpis.daily_change_percent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: kpis.daily_change_percent >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      borderColor: kpis.daily_change_percent >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800',
      description: `${kpis.daily_change_dollars >= 0 ? '+' : ''}${formatCurrency(kpis.daily_change_dollars)}`,
      gradient: kpis.daily_change_percent >= 0 ? 'from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10' : 'from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10',
    },
    {
      title: 'שינוי שבועי',
      value: `${kpis.weekly_change_percent >= 0 ? '+' : ''}${kpis.weekly_change_percent.toFixed(2)}%`,
      icon: BarChart3,
      color: kpis.weekly_change_percent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: kpis.weekly_change_percent >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      borderColor: kpis.weekly_change_percent >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800',
      description: `${kpis.weekly_change_dollars >= 0 ? '+' : ''}${formatCurrency(kpis.weekly_change_dollars)}`,
      gradient: kpis.weekly_change_percent >= 0 ? 'from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10' : 'from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10',
    },
    {
      title: 'רווח/הפסד כולל',
      value: formatCurrency(kpis.total_profit_loss_closed + kpis.total_profit_loss_open),
      icon: DollarSign,
      color: (kpis.total_profit_loss_closed + kpis.total_profit_loss_open) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: (kpis.total_profit_loss_closed + kpis.total_profit_loss_open) >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      borderColor: (kpis.total_profit_loss_closed + kpis.total_profit_loss_open) >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800',
      description: `סגור: ${formatCurrency(kpis.total_profit_loss_closed)} | פתוח: ${formatCurrency(kpis.total_profit_loss_open)}`,
      gradient: (kpis.total_profit_loss_closed + kpis.total_profit_loss_open) >= 0 ? 'from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10' : 'from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card 
            key={index} 
            className={`apple-card hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 ${card.borderColor} bg-gradient-to-br ${card.gradient}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {card.title}
              </CardTitle>
              <div className={`p-3 rounded-xl ${card.bgColor} shadow-sm`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`text-3xl font-bold ${card.color} mb-2 transition-all duration-300`}>
                {card.value}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {card.description}
              </p>
              <div className="h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20 rounded-full" />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export { KPICards }
