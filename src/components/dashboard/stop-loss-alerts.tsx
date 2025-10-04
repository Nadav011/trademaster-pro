'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, X, Bell, BellOff, Clock, TrendingDown } from 'lucide-react'
import { stopLossUtils } from '@/lib/stop-loss-monitor'
import { formatCurrency, formatDate } from '@/lib/utils'

interface StopLossAlert {
  tradeId: string;
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  currentPrice: number;
  direction: 'Long' | 'Short';
  positionSize: number;
  timestamp: string;
}

export function StopLossAlerts() {
  const [alerts, setAlerts] = useState<StopLossAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    // Load initial state
    setAlerts(stopLossUtils.getAlerts())
    setIsMonitoring(stopLossUtils.getMonitoringStatus())

    // Check notification permission
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted')
    }

    // Set up interval to refresh alerts
    const interval = setInterval(() => {
      setAlerts(stopLossUtils.getAlerts())
      setIsMonitoring(stopLossUtils.getMonitoringStatus())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleStartMonitoring = async () => {
    try {
      await stopLossUtils.startMonitoring()
      setIsMonitoring(true)
      
      // Request notification permission
      const permission = await stopLossUtils.requestNotificationPermission()
      setHasPermission(permission)
    } catch (error) {
      console.error('Failed to start monitoring:', error)
    }
  }

  const handleStopMonitoring = () => {
    stopLossUtils.stopMonitoring()
    setIsMonitoring(false)
  }

  const handleClearAlerts = () => {
    stopLossUtils.clearAlerts()
    setAlerts([])
  }

  const handleRequestPermission = async () => {
    const permission = await stopLossUtils.requestNotificationPermission()
    setHasPermission(permission)
  }

  if (alerts.length === 0 && !isMonitoring) {
    return null
  }

  return (
    <Card className="apple-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>ניטור סטופ לוס</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            {!hasPermission && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestPermission}
              >
                <Bell className="h-4 w-4 ml-2" />
                הפעל התראות
              </Button>
            )}
            {isMonitoring ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopMonitoring}
                className="text-red-600 hover:text-red-700"
              >
                <BellOff className="h-4 w-4 ml-2" />
                עצור ניטור
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartMonitoring}
                className="text-green-600 hover:text-green-700"
              >
                <Bell className="h-4 w-4 ml-2" />
                התחל ניטור
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Monitoring Status */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">
                ניטור: {isMonitoring ? 'פעיל' : 'לא פעיל'}
              </span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500 dark:text-gray-400">
              <Bell className="h-4 w-4" />
              <span>התראות: {hasPermission ? 'פעילות' : 'לא פעילות'}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            המערכת בודקת כל 30 שניות אם עסקאות פתוחות הגיעו לסטופ לוס
          </p>
        </div>

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                התראות אחרונות ({alerts.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAlerts}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 ml-2" />
                נקה הכל
              </Button>
            </div>

            <div className="space-y-2">
              {alerts.slice(-5).reverse().map((alert, index) => (
                <div key={`${alert.tradeId}-${index}`} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="font-semibold text-red-900 dark:text-red-100">
                        {alert.symbol}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        {alert.direction}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(alert.timestamp)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">מחיר כניסה:</span>
                      <span className="font-medium text-gray-900 dark:text-white mr-2">
                        {formatCurrency(alert.entryPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">סטופ לוס:</span>
                      <span className="font-medium text-red-600 mr-2">
                        {formatCurrency(alert.stopLoss)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">מחיר סגירה:</span>
                      <span className="font-medium text-gray-900 dark:text-white mr-2">
                        {formatCurrency(alert.currentPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">גודל פוזיציה:</span>
                      <span className="font-medium text-gray-900 dark:text-white mr-2">
                        {alert.positionSize.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                    ⚠️ עסקה נסגרה אוטומטית בסטופ לוס
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts.length === 0 && isMonitoring && (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Bell className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ניטור פעיל - אין התראות
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              המערכת בודקת עסקאות פתוחות
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
