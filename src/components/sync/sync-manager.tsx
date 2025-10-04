'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Cloud,
  CloudOff
} from 'lucide-react'
import { syncManager, auth, dataSync } from '@/lib/supabase'
import { SyncStatus } from '@/lib/supabase'
import { tradeDatabase, capitalDatabase, tradesDb, capitalDb } from '@/lib/database-client'
import { formatDate } from '@/lib/utils'

interface SyncManagerProps {
  onSyncComplete?: () => void
}

export function SyncManagerComponent({ onSyncComplete }: SyncManagerProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isManualSync, setIsManualSync] = useState(false)

  useEffect(() => {
    // Check authentication status
    checkAuthStatus()
    
    // Set up sync status updates
    const interval = setInterval(() => {
      setSyncStatus(syncManager.getStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const checkAuthStatus = async () => {
    try {
      const currentUser = await auth.getCurrentUser()
      const session = await auth.getSession()
      
      setIsAuthenticated(!!currentUser && !!session)
      setUser(currentUser)
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
    }
  }

  const handleSignIn = async () => {
    // For now, we'll use a simple demo user
    // In production, you'd have a proper login form
    const email = prompt('Enter email:') || 'demo@example.com'
    const password = prompt('Enter password:') || 'demo123'
    
    try {
      const { data, error } = await auth.signIn(email, password)
      if (error) {
        // If sign in fails, try sign up
        const { data: signUpData, error: signUpError } = await auth.signUp(email, password)
        if (signUpError) {
          console.error('Sign up failed:', signUpError)
          return
        }
      }
      
      await checkAuthStatus()
    } catch (error) {
      console.error('Auth error:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      await checkAuthStatus()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleUpload = async () => {
    if (!user) return
    
    setIsManualSync(true)
    try {
      const trades = await tradeDatabase.findAll()
      const capital = await capitalDatabase.getCapitalHistory()
      
      const { error } = await dataSync.uploadUserData(user.id, trades, capital)
      
      if (error) {
        console.error('Upload failed:', error)
      } else {
        console.log('✅ Data uploaded successfully')
        setSyncStatus(prev => ({ ...prev, lastSync: new Date(), error: null }))
        onSyncComplete?.()
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsManualSync(false)
    }
  }

  const handleDownload = async () => {
    if (!user) return
    
    setIsManualSync(true)
    try {
      const { data, error } = await dataSync.downloadUserData(user.id)
      
      if (error) {
        console.error('Download failed:', error)
      } else if (data) {
        // Import the data
        for (const trade of data.trades || []) {
          await tradesDb.create(trade)
        }
        
        for (const capital of data.capital || []) {
          await capitalDb.create(capital)
        }
        
        console.log('✅ Data downloaded successfully')
        setSyncStatus(prev => ({ ...prev, lastSync: new Date(), error: null }))
        onSyncComplete?.()
      }
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setIsManualSync(false)
    }
  }

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return <WifiOff className="h-4 w-4 text-red-500" />
    if (syncStatus.isSyncing || isManualSync) return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
    if (syncStatus.error) return <AlertCircle className="h-4 w-4 text-red-500" />
    if (syncStatus.lastSync) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <Clock className="h-4 w-4 text-gray-500" />
  }

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'מצב אופליין'
    if (syncStatus.isSyncing || isManualSync) return 'מסנכרן...'
    if (syncStatus.error) return `שגיאה: ${syncStatus.error}`
    if (syncStatus.lastSync) return `סונכרן: ${formatDate(syncStatus.lastSync)}`
    return 'לא סונכרן'
  }

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    if (syncStatus.isSyncing || isManualSync) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    if (syncStatus.error) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    if (syncStatus.lastSync) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }

  if (!isAuthenticated) {
    return (
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <CloudOff className="h-5 w-5 text-gray-500" />
            <span>סינכרון בענן</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CloudOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              התחבר כדי לסנכרן את הנתונים שלך בענן
            </p>
            <Button onClick={handleSignIn} className="w-full">
              התחברות / הרשמה
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="apple-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Cloud className="h-5 w-5 text-blue-600" />
            <span>סינכרון בענן</span>
          </div>
          <Badge className={getStatusColor()}>
            <div className="flex items-center space-x-1 space-x-reverse">
              {getStatusIcon()}
              <span className="text-xs">{getStatusText()}</span>
            </div>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* User Info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            מחובר כ: <span className="font-medium">{user?.email}</span>
          </div>

          {/* Sync Controls */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleUpload}
              disabled={!syncStatus.isOnline || isManualSync}
              variant="outline"
              className="w-full"
            >
              <Cloud className="h-4 w-4 ml-2" />
              העלה נתונים
            </Button>
            
            <Button 
              onClick={handleDownload}
              disabled={!syncStatus.isOnline || isManualSync}
              variant="outline"
              className="w-full"
            >
              <CloudOff className="h-4 w-4 ml-2" />
              הורד נתונים
            </Button>
          </div>

          {/* Sign Out */}
          <Button 
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="w-full text-gray-500 hover:text-gray-700"
          >
            התנתק
          </Button>

          {/* Status Info */}
          {syncStatus.error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {syncStatus.error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
