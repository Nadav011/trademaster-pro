'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Wifi, WifiOff, Monitor, Smartphone, Clock } from 'lucide-react'

interface LivePreviewProps {
  className?: string
}

export function LivePreview({ className }: LivePreviewProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  useEffect(() => {
    // Check connection status
    const checkConnection = () => {
      if (navigator.onLine) {
        setIsConnected(true)
        setConnectionStatus('connected')
        setLastUpdate(new Date())
      } else {
        setIsConnected(false)
        setConnectionStatus('disconnected')
      }
    }

    // Initial check
    checkConnection()

    // Listen for online/offline events
    window.addEventListener('online', checkConnection)
    window.addEventListener('offline', checkConnection)

    // Check every 5 seconds
    const interval = setInterval(checkConnection, 5000)

    return () => {
      window.removeEventListener('online', checkConnection)
      window.removeEventListener('offline', checkConnection)
      clearInterval(interval)
    }
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'disconnected': return 'bg-red-500'
      default: return 'bg-yellow-500'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'מחובר'
      case 'disconnected': return 'מנותק'
      default: return 'בודק...'
    }
  }

  return (
    <Card className={`apple-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Monitor className="h-5 w-5 text-blue-600" />
            <span>מצב פיתוח - iPad</span>
          </div>
          <Badge 
            variant="outline" 
            className={`${getStatusColor()} text-white border-0`}
          >
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-2 space-x-reverse">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              {isConnected ? 'חיבור פעיל' : 'אין חיבור'}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {lastUpdate ? `עודכן: ${lastUpdate.toLocaleTimeString('he-IL')}` : 'לא עודכן'}
          </div>
        </div>

        {/* Hot Reload Status */}
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center space-x-2 space-x-reverse">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Hot Reload</span>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            פעיל
          </Badge>
        </div>

        {/* Device Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
            <Smartphone className="h-6 w-6 mx-auto mb-2 text-gray-600" />
            <div className="text-xs text-gray-500 dark:text-gray-400">מכשיר</div>
            <div className="text-sm font-medium">
              {typeof window !== 'undefined' && /iPad/i.test(navigator.userAgent) ? 'iPad' : 'Mobile'}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-gray-600" />
            <div className="text-xs text-gray-500 dark:text-gray-400">זמן טעינה</div>
            <div className="text-sm font-medium">
              {typeof window !== 'undefined' ? `${performance.now().toFixed(0)}ms` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 space-x-reverse">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן דף
          </Button>
          <Button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(window.location.href, '_blank')
              }
            }}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Monitor className="h-4 w-4 ml-2" />
            חלון חדש
          </Button>
        </div>

        {/* Development Tips */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            💡 טיפים לפיתוח עם iPad:
          </div>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• שינויים בקוד יופיעו אוטומטית</li>
            <li>• השתמש ב-Safari Developer Tools</li>
            <li>• הוסף לדף הבית לחוויה כמו אפליקציה</li>
            <li>• ודא שהמכשיר באותה רשת WiFi</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}