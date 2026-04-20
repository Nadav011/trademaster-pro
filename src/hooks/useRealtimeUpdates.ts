import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface RealtimeConfig {
  refreshInterval?: number // in milliseconds
  enableAutoRefresh?: boolean
  enableRealtimeSync?: boolean
}

export function useRealtimeUpdates(config: RealtimeConfig = {}) {
  const {
    refreshInterval = 5000, // 5 seconds default
    enableAutoRefresh = true,
    enableRealtimeSync = true
  } = config

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updateCount, setUpdateCount] = useState(0)

  // Manual refresh function
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Force refresh by updating timestamp
      setLastUpdate(new Date())
      setUpdateCount(prev => prev + 1)
      
      // If you have specific data to refresh, do it here
      window.location.reload() // Simple reload for now
    } catch (error) {
      console.error('Refresh error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // Auto-refresh setup
  useEffect(() => {
    if (!enableAutoRefresh) return

    const interval = setInterval(() => {
      setLastUpdate(new Date())
      setUpdateCount(prev => prev + 1)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [enableAutoRefresh, refreshInterval])

  // Realtime subscription setup
  useEffect(() => {
    if (!enableRealtimeSync) return

    // Subscribe to all table changes
    const subscription = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Realtime update received:', payload)
          setLastUpdate(new Date())
          setUpdateCount(prev => prev + 1)
          
          // Optionally trigger specific updates based on table
          if (payload.table === 'trades') {
            // Handle trade updates
            window.dispatchEvent(new CustomEvent('trades-updated', { detail: payload }))
          } else if (payload.table === 'capital') {
            // Handle capital updates
            window.dispatchEvent(new CustomEvent('capital-updated', { detail: payload }))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [enableRealtimeSync])

  return {
    lastUpdate,
    isRefreshing,
    updateCount,
    refresh
  }
}