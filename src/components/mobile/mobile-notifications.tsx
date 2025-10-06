'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  DollarSign,
  Bell,
  CheckCircle
} from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/utils'

interface MobileNotification {
  id: string
  type: 'trade_added' | 'trade_closed' | 'capital_change' | 'sync_update'
  title: string
  message: string
  amount?: number
  timestamp: Date
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
}

interface MobileNotificationsProps {
  className?: string
}

export function MobileNotifications({ className }: MobileNotificationsProps) {
  const [notifications, setNotifications] = useState<MobileNotification[]>([])
  const [isVisible, setIsVisible] = useState(false)

  // Function to add a new notification
  const addNotification = (notification: Omit<MobileNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: MobileNotification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      isRead: false
    }
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]) // Keep only 10 notifications
    setIsVisible(true)
    
    // Auto-hide after 5 seconds for low priority
    if (notification.priority === 'low') {
      setTimeout(() => {
        markAsRead(newNotification.id)
      }, 5000)
    }
    
    // Show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.type
      })
    }
  }

  // Function to mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ))
  }

  // Function to remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Function to clear all notifications
  const clearAll = () => {
    setNotifications([])
    setIsVisible(false)
  }

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Listen for localStorage changes to detect new trades/changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key?.startsWith('trademaster_')) return
      
      try {
        if (e.key === 'trademaster_trades') {
          const oldTrades = e.oldValue ? JSON.parse(e.oldValue) : []
          const newTrades = e.newValue ? JSON.parse(e.newValue) : []
          
          // Check for new trades
          const addedTrades = newTrades.filter((newTrade: any) => 
            !oldTrades.find((oldTrade: any) => oldTrade.id === newTrade.id)
          )
          
          addedTrades.forEach((trade: any) => {
            addNotification({
              type: 'trade_added',
              title: 'עסקה חדשה נוספה',
              message: `${trade.symbol} - ${trade.direction} ב-${formatCurrency(trade.entry_price)}`,
              priority: 'medium'
            })
          })
          
          // Check for closed trades
          const closedTrades = newTrades.filter((newTrade: any) => {
            const oldTrade = oldTrades.find((old: any) => old.id === newTrade.id)
            return oldTrade && !oldTrade.exit_price && newTrade.exit_price
          })
          
          closedTrades.forEach((trade: any) => {
            const pnl = trade.result_dollars || 0
            addNotification({
              type: 'trade_closed',
              title: 'עסקה נסגרה',
              message: `${trade.symbol} - ${pnl >= 0 ? 'רווח' : 'הפסד'}: ${formatCurrency(Math.abs(pnl))}`,
              amount: pnl,
              priority: 'high'
            })
          })
        }
        
        if (e.key === 'trademaster_capital') {
          const oldCapital = e.oldValue ? JSON.parse(e.oldValue) : []
          const newCapital = e.newValue ? JSON.parse(e.newValue) : []
          
          const addedCapital = newCapital.filter((newCap: any) => 
            !oldCapital.find((oldCap: any) => oldCap.id === newCap.id)
          )
          
          addedCapital.forEach((capital: any) => {
            addNotification({
              type: 'capital_change',
              title: 'שינוי הון',
              message: `${capital.type}: ${formatCurrency(capital.amount)}`,
              amount: capital.amount,
              priority: 'medium'
            })
          })
        }
      } catch (error) {
        console.error('Error processing storage change:', error)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Listen for custom events from sync manager
  useEffect(() => {
    const handleSyncUpdate = (event: CustomEvent) => {
      const { tradesUpdated, capitalUpdated } = event.detail
      
      if (tradesUpdated > 0 || capitalUpdated > 0) {
        addNotification({
          type: 'sync_update',
          title: 'סינכרון הושלם',
          message: `${tradesUpdated} עסקאות ו-${capitalUpdated} רשומות הון עודכנו`,
          priority: 'low'
        })
      }
    }

    window.addEventListener('syncUpdate', handleSyncUpdate as EventListener)
    return () => window.removeEventListener('syncUpdate', handleSyncUpdate as EventListener)
  }, [])

  const getNotificationIcon = (type: MobileNotification['type']) => {
    switch (type) {
      case 'trade_added':
        return <Plus className="h-5 w-5 text-green-600" />
      case 'trade_closed':
        return <TrendingUp className="h-5 w-5 text-blue-600" />
      case 'capital_change':
        return <DollarSign className="h-5 w-5 text-purple-600" />
      case 'sync_update':
        return <CheckCircle className="h-5 w-5 text-gray-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: MobileNotification['type'], priority: string) => {
    const baseColors = {
      trade_added: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
      trade_closed: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
      capital_change: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20',
      sync_update: 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20'
    }
    
    if (priority === 'high') {
      return `${baseColors[type]} ring-2 ring-yellow-300 dark:ring-yellow-600`
    }
    
    return baseColors[type]
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (notifications.length === 0) return null

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 ${className}`}>
      {/* Notification Badge */}
      {unreadCount > 0 && (
        <div className="fixed top-4 right-4 z-60">
          <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        </div>
      )}

      {/* Notifications List */}
      {isVisible && (
        <div className="space-y-2 max-h-screen overflow-y-auto">
          {notifications.slice(0, 5).map((notification) => (
            <Card
              key={notification.id}
              className={`apple-card border-2 ${getNotificationColor(notification.type, notification.priority)} ${
                notification.isRead ? 'opacity-70' : 'shadow-lg'
              } transition-all duration-300 transform hover:scale-[1.02]`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 space-x-reverse flex-1">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${notification.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {notification.amount !== undefined && (
                      <div className={`text-lg font-bold ${notification.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {notification.amount >= 0 ? '+' : ''}{formatCurrency(notification.amount)}
                      </div>
                    )}
                    <Button
                      onClick={() => removeNotification(notification.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {notifications.length > 5 && (
            <Card className="apple-card bg-gray-50 dark:bg-gray-900/50">
              <CardContent className="p-3 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ועוד {notifications.length - 5} הודעות...
                </p>
                <Button
                  onClick={clearAll}
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                >
                  נקה הכל
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// Export function to add notifications from other components
export const addMobileNotification = (notification: Omit<MobileNotification, 'id' | 'timestamp' | 'isRead'>) => {
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('addMobileNotification', { detail: notification }))
}