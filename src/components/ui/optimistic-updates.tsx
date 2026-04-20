'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

// Types for optimistic updates
export interface OptimisticUpdate<T = any> {
  id: string
  type: 'create' | 'update' | 'delete'
  data: T
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
  error?: string
  originalData?: T // For rollback on failure
}

interface OptimisticUpdatesContextType {
  updates: OptimisticUpdate[]
  addOptimisticUpdate: <T>(update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp'>) => string
  confirmUpdate: (id: string) => void
  failUpdate: (id: string, error: string) => void
  clearUpdates: () => void
  isOptimistic: (id: string) => boolean
  getOptimisticData: <T>(id: string, originalData: T) => T
}

const OptimisticUpdatesContext = createContext<OptimisticUpdatesContextType | undefined>(undefined)

// Optimistic Updates Provider Component
export function OptimisticUpdatesProvider({ children }: { children: ReactNode }) {
  const [updates, setUpdates] = useState<OptimisticUpdate[]>([])

  const addOptimisticUpdate = useCallback(<T,>(update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp'>) => {
    const id = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimisticUpdate: OptimisticUpdate<T> = {
      ...update,
      id,
      timestamp: Date.now(),
    }

    setUpdates(prev => [...prev, optimisticUpdate])

    // Auto-cleanup after 30 seconds if not confirmed
    setTimeout(() => {
      setUpdates(prev => prev.filter(u => u.id !== id))
    }, 30000)

    return id
  }, [])

  const confirmUpdate = useCallback((id: string) => {
    setUpdates(prev => prev.filter(update => update.id !== id))
  }, [])

  const failUpdate = useCallback((id: string, error: string) => {
    setUpdates(prev => prev.map(update =>
      update.id === id
        ? { ...update, status: 'failed', error }
        : update
    ))

    // Auto-cleanup failed updates after 5 seconds
    setTimeout(() => {
      setUpdates(prev => prev.filter(update => update.id !== id))
    }, 5000)
  }, [])

  const clearUpdates = useCallback(() => {
    setUpdates([])
  }, [])

  const isOptimistic = useCallback((id: string) => {
    return updates.some(update => update.id === id)
  }, [updates])

  const getOptimisticData = useCallback(<T,>(id: string, originalData: T): T => {
    const update = updates.find(u => u.id === id)
    if (update && update.status === 'pending') {
      return update.data as T
    }
    return originalData
  }, [updates])

  const value: OptimisticUpdatesContextType = {
    updates,
    addOptimisticUpdate,
    confirmUpdate,
    failUpdate,
    clearUpdates,
    isOptimistic,
    getOptimisticData,
  }

  return (
    <OptimisticUpdatesContext.Provider value={value}>
      {children}
      <OptimisticUpdatesIndicator />
    </OptimisticUpdatesContext.Provider>
  )
}

// Hook for using optimistic updates
export function useOptimisticUpdates() {
  const context = useContext(OptimisticUpdatesContext)
  if (context === undefined) {
    throw new Error('useOptimisticUpdates must be used within an OptimisticUpdatesProvider')
  }
  return context
}

// Optimistic Updates Indicator Component
function OptimisticUpdatesIndicator() {
  const { updates } = useOptimisticUpdates()

  if (updates.length === 0) return null

  const pendingUpdates = updates.filter(u => u.status === 'pending')
  const failedUpdates = updates.filter(u => u.status === 'failed')

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2">
      {pendingUpdates.map((update) => (
        <Card key={update.id} className="bg-blue-50 border-blue-200 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <div className="text-sm">
                <div className="font-medium text-blue-900">
                  {update.type === 'create' && 'יוצר...'}
                  {update.type === 'update' && 'מעדכן...'}
                  {update.type === 'delete' && 'מוחק...'}
                </div>
                <div className="text-blue-700">
                  פעולה בהמתנה
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {failedUpdates.map((update) => (
        <Card key={update.id} className="bg-red-50 border-red-200 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="text-red-600">⚠️</div>
              <div className="text-sm">
                <div className="font-medium text-red-900">
                  שגיאה בסנכרון
                </div>
                <div className="text-red-700">
                  {update.error || 'פעולה נכשלה'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Hook for wrapping async operations with optimistic updates
export function useOptimisticMutation<TData, TVariables>() {
  const { addOptimisticUpdate, confirmUpdate, failUpdate } = useOptimisticUpdates()

  const mutate = useCallback(async (
    variables: TVariables,
    options: {
      optimisticUpdate?: (variables: TVariables) => { type: 'create' | 'update' | 'delete'; data: TData }
      onSuccess?: (data: TData) => void
      onError?: (error: Error) => void
      mutationFn: (variables: TVariables) => Promise<TData>
    }
  ) => {
    let updateId: string | null = null

    // Apply optimistic update if provided
    if (options.optimisticUpdate) {
      const optimistic = options.optimisticUpdate(variables)
      updateId = addOptimisticUpdate({
        type: optimistic.type,
        data: optimistic.data,
        status: 'pending',
      })
    }

    try {
      // Perform the actual mutation
      const result = await options.mutationFn(variables)

      // Confirm the optimistic update
      if (updateId) {
        confirmUpdate(updateId)
      }

      // Call success callback
      options.onSuccess?.(result)

      return result
    } catch (error) {
      // Fail the optimistic update
      if (updateId) {
        failUpdate(updateId, error instanceof Error ? error.message : 'שגיאה לא ידועה')
      }

      // Call error callback
      options.onError?.(error instanceof Error ? error : new Error('שגיאה לא ידועה'))

      throw error
    }
  }, [addOptimisticUpdate, confirmUpdate, failUpdate])

  return { mutate }
}

// Higher-order component for wrapping components with optimistic updates
export function withOptimisticUpdates<P extends object>(
  Component: React.ComponentType<P>,
  updateConfig?: {
    onCreate?: (props: P) => any
    onUpdate?: (props: P) => any
    onDelete?: (props: P) => any
  }
) {
  return function WrappedComponent(props: P) {
    const { mutate } = useOptimisticMutation()

    const handleOptimisticAction = useCallback(async (
      action: 'create' | 'update' | 'delete',
      actionFn: () => Promise<any>
    ) => {
      let optimisticUpdate: any = null

      switch (action) {
        case 'create':
          if (updateConfig?.onCreate) {
            optimisticUpdate = updateConfig.onCreate(props)
          }
          break
        case 'update':
          if (updateConfig?.onUpdate) {
            optimisticUpdate = updateConfig.onUpdate(props)
          }
          break
        case 'delete':
          if (updateConfig?.onDelete) {
            optimisticUpdate = updateConfig.onDelete(props)
          }
          break
      }

      return mutate({}, {
        optimisticUpdate,
        mutationFn: actionFn,
      })
    }, [mutate, props, updateConfig])

    return (
      <Component
        {...props}
        onOptimisticCreate={updateConfig?.onCreate ? () => handleOptimisticAction('create', () => Promise.resolve()) : undefined}
        onOptimisticUpdate={updateConfig?.onUpdate ? () => handleOptimisticAction('update', () => Promise.resolve()) : undefined}
        onOptimisticDelete={updateConfig?.onDelete ? () => handleOptimisticAction('delete', () => Promise.resolve()) : undefined}
      />
    )
  }
}