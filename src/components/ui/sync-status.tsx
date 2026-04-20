'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Wifi, WifiOff, Cloud, CloudOff, AlertTriangle } from 'lucide-react'

// Sync status types
export interface SyncStatus {
  isOnline: boolean
  lastSync: Date | null
  isSyncing: boolean
  error: string | null
  pendingChanges: number
}

// Connection status indicator component
export function ConnectionStatus({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSync: null,
    isSyncing: false,
    error: null,
    pendingChanges: 0,
  })

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus(prev => ({ ...prev, isOnline: true, error: null }))
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for custom sync events
    const handleSyncComplete = () => {
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        isSyncing: false,
        error: null,
      }))
    }

    const handleConnectionChange = (event: CustomEvent) => {
      setSyncStatus(prev => ({
        ...prev,
        isOnline: event.detail.isOnline
      }))
      setIsOnline(event.detail.isOnline)
    }

    window.addEventListener('trademaster-sync-complete', handleSyncComplete)
    window.addEventListener('trademaster-connection-change', handleConnectionChange as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('trademaster-sync-complete', handleSyncComplete)
      window.removeEventListener('trademaster-connection-change', handleConnectionChange as EventListener)
    }
  }, [])

  const handleManualSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }))

      // Import and trigger sync
      const { triggerAutoSync } = await import('@/lib/supabase')
      await triggerAutoSync()

      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        isSyncing: false,
      }))
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'שגיאה בסנכרון',
      }))
    }
  }

  const getStatusColor = () => {
    if (!isOnline) return 'destructive'
    if (syncStatus.error) return 'destructive'
    if (syncStatus.isSyncing) return 'default'
    return 'secondary'
  }

  const getStatusText = () => {
    if (!isOnline) return 'לא מחובר'
    if (syncStatus.error) return 'שגיאה'
    if (syncStatus.isSyncing) return 'מסנכרן...'
    if (syncStatus.pendingChanges > 0) return `${syncStatus.pendingChanges} שינויים ממתינים`
    return 'מחובר'
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />
    if (syncStatus.error) return <AlertTriangle className="h-4 w-4" />
    if (syncStatus.isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />
    return <Wifi className="h-4 w-4" />
  }

  return (
    <div className={`flex items-center space-x-2 space-x-reverse ${className}`}>
      <Badge variant={getStatusColor()} className="flex items-center space-x-1 space-x-reverse">
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>

      {isOnline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualSync}
          disabled={syncStatus.isSyncing}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className={`h-3 w-3 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
        </Button>
      )}

      {syncStatus.lastSync && (
        <span className="text-xs text-muted-foreground">
          {syncStatus.lastSync.toLocaleTimeString('he-IL')}
        </span>
      )}
    </div>
  )
}

// Full sync status card component
export function SyncStatusCard({ className }: { className?: string }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    isSyncing: false,
    error: null,
    pendingChanges: 0,
  })

  useEffect(() => {
    // Load last sync time from localStorage
    const lastSync = localStorage.getItem('trademaster_last_sync')
    if (lastSync) {
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(parseInt(lastSync))
      }))
    }

    // Listen for sync events
    const handleSyncComplete = () => {
      const now = new Date()
      setSyncStatus(prev => ({
        ...prev,
        lastSync: now,
        isSyncing: false,
        error: null,
      }))
      localStorage.setItem('trademaster_last_sync', now.getTime().toString())
    }

    const handleConnectionChange = (event: CustomEvent) => {
      setSyncStatus(prev => ({
        ...prev,
        isOnline: event.detail.isOnline
      }))
    }

    window.addEventListener('trademaster-sync-complete', handleSyncComplete)
    window.addEventListener('trademaster-connection-change', handleConnectionChange as EventListener)

    return () => {
      window.removeEventListener('trademaster-sync-complete', handleSyncComplete)
      window.removeEventListener('trademaster-connection-change', handleConnectionChange as EventListener)
    }
  }, [])

  const handleManualSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }))

      const { triggerAutoSync } = await import('@/lib/supabase')
      await triggerAutoSync()

      const now = new Date()
      setSyncStatus(prev => ({
        ...prev,
        lastSync: now,
        isSyncing: false,
      }))
      localStorage.setItem('trademaster_last_sync', now.getTime().toString())
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'שגיאה בסנכרון',
      }))
    }
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">סטטוס סנכרון</h3>
          <ConnectionStatus />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">מצב חיבור:</span>
            <div className="flex items-center space-x-2 space-x-reverse">
              {syncStatus.isOnline ? (
                <>
                  <Cloud className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">מחובר</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">לא מחובר</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">סנכרון אחרון:</span>
            <span className="text-sm">
              {syncStatus.lastSync
                ? syncStatus.lastSync.toLocaleString('he-IL')
                : 'אין'
              }
            </span>
          </div>

          {syncStatus.pendingChanges > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">שינויים ממתינים:</span>
              <span className="text-orange-600 font-medium">
                {syncStatus.pendingChanges}
              </span>
            </div>
          )}

          {syncStatus.error && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">שגיאה:</span>
              <span className="text-red-600 text-xs">
                {syncStatus.error}
              </span>
            </div>
          )}

          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={syncStatus.isSyncing || !syncStatus.isOnline}
              className="w-full"
            >
              {syncStatus.isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                  מסנכרן...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  סנכרן עכשיו
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}