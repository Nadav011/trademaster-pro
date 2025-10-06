'use client'

import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'
import { useState, useEffect } from 'react'

export function RealtimeIndicator() {
  const { lastUpdate, isRefreshing, updateCount, refresh } = useRealtimeUpdates({
    refreshInterval: 10000, // 10 seconds
    enableAutoRefresh: true,
    enableRealtimeSync: true
  })

  const [isOnline, setIsOnline] = useState(true)
  const [showToast, setShowToast] = useState(false)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial status
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Show update notification
  useEffect(() => {
    if (updateCount > 0) {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }, [updateCount])

  return (
    <>
      {/* Fixed position indicator for mobile */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 lg:hidden">
        <Badge 
          variant="outline" 
          className={`${isOnline ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'} 
            shadow-lg backdrop-blur-md bg-opacity-90`}
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-3 h-3 text-green-600" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-600" />
            )}
            <span className="text-xs">
              {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: he })}
            </span>
          </div>
        </Badge>
        
        <Button
          size="icon"
          variant="outline"
          onClick={refresh}
          disabled={isRefreshing}
          className="h-8 w-8 shadow-lg backdrop-blur-md bg-opacity-90"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Desktop indicator in navigation */}
      <div className="hidden lg:flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={isOnline ? 'border-green-300' : 'border-red-300'}
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-3 h-3 text-green-600" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-600" />
            )}
            <span className="text-xs">
              עודכן {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: he })}
            </span>
          </div>
        </Badge>
        
        <Button
          size="icon"
          variant="ghost"
          onClick={refresh}
          disabled={isRefreshing}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
          <Badge className="bg-blue-500 text-white shadow-lg">
            <div className="flex items-center gap-2 px-2 py-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>הנתונים עודכנו</span>
            </div>
          </Badge>
        </div>
      )}
    </>
  )
}