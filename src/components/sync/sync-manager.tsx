'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const checkAuthStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking auth status...')
      
      // First check if auth state is saved in localStorage
      const isAuthStateSaved = auth.isAuthStateSaved()
      const savedEmail = auth.getSavedUserEmail()
      
      console.log('💾 Auth state saved:', isAuthStateSaved)
      console.log('📧 Saved email:', savedEmail)
      
      if (isAuthStateSaved && savedEmail) {
        console.log('🔄 Auth state found in localStorage, checking Supabase session...')
        
        // Try to get current session
        const currentUser = await auth.getCurrentUser()
        const session = await auth.getSession()
        
        console.log('👤 Current user:', currentUser)
        console.log('🔐 Session:', session)
        
        if (currentUser && session) {
          console.log('✅ Supabase session is valid')
          setIsAuthenticated(true)
          setUser(currentUser)
        } else {
          console.log('⚠️ Supabase session expired, but auth state is saved')
          // Keep user as authenticated based on localStorage
          setIsAuthenticated(true)
          setUser({ email: savedEmail, id: 'saved-user' })
        }
      } else {
        console.log('❌ No auth state found in localStorage')
        const currentUser = await auth.getCurrentUser()
        const session = await auth.getSession()
        
        const isAuth = !!currentUser && !!session
        console.log('✅ Is authenticated:', isAuth)
        
        setIsAuthenticated(isAuth)
        setUser(currentUser)
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error)
      setIsAuthenticated(false)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    console.log('🔄 SyncManagerComponent mounted')
    
    // Check authentication status
    checkAuthStatus()
    
    // Set up sync status updates
    const interval = setInterval(() => {
      setSyncStatus(syncManager.getStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [checkAuthStatus])

  const handleSignIn = async () => {
    console.log('🔐 Starting sign in process...')
    
    // For now, we'll use a simple demo user
    // In production, you'd have a proper login form
    const email = prompt('Enter email:') || 'demo@example.com'
    const password = prompt('Enter password:') || 'demo123'
    
    console.log('📧 Email:', email)
    console.log('🔑 Password:', password ? '***' : 'empty')
    
    try {
      console.log('🔄 Attempting sign in...')
      const { data, error } = await auth.signIn(email, password)
      
      if (error) {
        console.log('❌ Sign in failed, trying sign up...', error)
        // If sign in fails, try sign up
        const { data: signUpData, error: signUpError } = await auth.signUp(email, password)
        if (signUpError) {
          console.error('❌ Sign up failed:', signUpError)
          alert(`שגיאה בהרשמה: ${signUpError.message}`)
          return
        }
        console.log('✅ Sign up successful:', signUpData)
      } else {
        console.log('✅ Sign in successful:', data)
      }
      
      console.log('🔄 Checking auth status...')
      await checkAuthStatus()
    } catch (error) {
      console.error('❌ Auth error:', error)
      alert(`שגיאה בהתחברות: ${error}`)
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
    if (!user) {
      alert('אין משתמש מחובר. אנא התחבר תחילה.')
      return
    }
    
    setIsManualSync(true)
    try {
      console.log('🔄 Starting upload for user:', user.id)
      const trades = await tradeDatabase.findAll()
      const capital = await capitalDatabase.getCapitalHistory()
      
      console.log('📤 Uploading data - trades:', trades.length, 'capital:', capital.length)
      
      const { data, error } = await dataSync.uploadUserData(user.id, trades, capital)
      
      if (error) {
        console.error('❌ Upload failed:', error)
        alert(`שגיאה בהעלאת נתונים: ${error.message}`)
        setSyncStatus(prev => ({ ...prev, error: error.message }))
      } else {
        console.log('✅ Data uploaded successfully:', data)
        alert(`נתונים הועלו בהצלחה! ${trades.length} עסקאות ו-${capital.length} רשומות הון`)
        setSyncStatus(prev => ({ ...prev, lastSync: new Date(), error: null }))
        onSyncComplete?.()
      }
    } catch (error) {
      console.error('❌ Upload error:', error)
      alert(`שגיאה בהעלאת נתונים: ${error}`)
      setSyncStatus(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Upload failed' }))
    } finally {
      setIsManualSync(false)
    }
  }

  const handleDownload = async () => {
    if (!user) {
      alert('אין משתמש מחובר. אנא התחבר תחילה.')
      return
    }
    
    setIsManualSync(true)
    try {
      console.log('🔄 Starting download for user:', user.id)
      const { data, error } = await dataSync.downloadUserData(user.id)
      
      if (error) {
        console.error('❌ Download failed:', error)
        alert(`שגיאה בהורדת נתונים: ${error.message || error}`)
        setSyncStatus(prev => ({ ...prev, error: error.message || 'Download failed' }))
      } else if (data) {
        console.log('📥 Downloaded data:', data)
        
        // Clear existing data first
        const existingTrades = await tradesDb.findAll()
        const existingCapital = await capitalDb.findAll()
        
        console.log('🗑️ Clearing existing data - trades:', existingTrades.length, 'capital:', existingCapital.length)
        
        // Clear existing data
        for (const trade of existingTrades) {
          await tradesDb.delete(trade.id)
        }
        for (const capital of existingCapital) {
          await capitalDb.delete(capital.id)
        }
        
        // Import the new data
        let importedTrades = 0
        let importedCapital = 0
        
        for (const trade of data.trades || []) {
          await tradesDb.create(trade)
          importedTrades++
        }
        
        for (const capital of data.capital || []) {
          await capitalDb.create(capital)
          importedCapital++
        }
        
        console.log('✅ Data downloaded successfully - trades:', importedTrades, 'capital:', importedCapital)
        alert(`נתונים הורדו בהצלחה! ${importedTrades} עסקאות ו-${importedCapital} רשומות הון`)
        setSyncStatus(prev => ({ ...prev, lastSync: new Date(), error: null }))
        onSyncComplete?.()
      } else {
        console.log('⚠️ No data found for user')
        alert('לא נמצאו נתונים להורדה עבור המשתמש הזה')
      }
    } catch (error) {
      console.error('❌ Download error:', error)
      alert(`שגיאה בהורדת נתונים: ${error}`)
      setSyncStatus(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Download failed' }))
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

  console.log('🎨 Rendering SyncManager - isAuthenticated:', isAuthenticated)
  console.log('🎨 Rendering SyncManager - user:', user)

  if (!isAuthenticated) {
    console.log('🚫 Rendering not authenticated view')
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
