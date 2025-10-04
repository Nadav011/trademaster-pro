import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qhbnlyiupbamhmbtqruz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

// Debug logging
console.log('🔧 Supabase URL:', supabaseUrl)
console.log('🔑 Supabase Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT FOUND')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface UserData {
  id: string
  user_id: string
  trades: any[]
  capital: any[]
  settings: any
  last_sync: string
  created_at: string
  updated_at: string
}

export interface SyncStatus {
  isOnline: boolean
  lastSync: Date | null
  isSyncing: boolean
  error: string | null
}

// Auth helpers
export const auth = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    // Save auth state on successful signup
    if (data.user && !error) {
      localStorage.setItem('trademaster_auth_state', 'authenticated')
      localStorage.setItem('trademaster_user_email', email)
    }
    
    return { data, error }
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // Save auth state on successful signin
    if (data.user && !error) {
      localStorage.setItem('trademaster_auth_state', 'authenticated')
      localStorage.setItem('trademaster_user_email', email)
      console.log('✅ Auth state saved to localStorage')
    }
    
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    
    // Clear auth state on signout
    localStorage.removeItem('trademaster_auth_state')
    localStorage.removeItem('trademaster_user_email')
    console.log('✅ Auth state cleared from localStorage')
    
    return { error }
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Save auth state to localStorage if user is authenticated
    if (user && typeof window !== 'undefined') {
      localStorage.setItem('trademaster_auth_state', 'authenticated')
      localStorage.setItem('trademaster_user_email', user.email || '')
      localStorage.setItem('trademaster_user_id', user.id)
      console.log('💾 Auth state saved to localStorage for user:', user.email)
    }
    
    return user
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    
    // Save auth state to localStorage if session exists
    if (session?.user && typeof window !== 'undefined') {
      localStorage.setItem('trademaster_auth_state', 'authenticated')
      localStorage.setItem('trademaster_user_email', session.user.email || '')
      localStorage.setItem('trademaster_user_id', session.user.id)
      console.log('💾 Session saved to localStorage for user:', session.user.email)
    }
    
    return session
  },

  // Check if user should be authenticated based on localStorage
  isAuthStateSaved(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('trademaster_auth_state') === 'authenticated'
  },

  // Get saved user email
  getSavedUserEmail(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('trademaster_user_email')
  },

  // Clear auth state from localStorage
  clearAuthState(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('trademaster_auth_state')
    localStorage.removeItem('trademaster_user_email')
    localStorage.removeItem('trademaster_user_id')
    console.log('🗑️ Auth state cleared from localStorage')
  }
}

// Data sync helpers
export const dataSync = {
  async uploadUserData(userId: string, trades: any[], capital: any[], settings: any = {}) {
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        trades,
        capital,
        settings,
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    return { data, error }
  },

  async downloadUserData(userId: string) {
    console.log('🔍 Downloading data for user:', userId)
    
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('❌ User not authenticated:', authError)
        return { data: null, error: new Error('User not authenticated') }
      }
      
      console.log('✅ User authenticated:', user.id)
      
      // Try to get user data
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      console.log('📥 Download result:', { data, error, count: data?.length })
      
      if (error) {
        console.error('❌ Download failed:', error)
        // Check if it's a table not found error
        if (error.message?.includes('relation "user_data" does not exist')) {
          return { data: null, error: new Error('Database table not set up. Please contact support.') }
        }
        return { data: null, error }
      }
      
      // If we have data, return the most recent record
      if (data && data.length > 0) {
        const mostRecentData = data[0]
        console.log('✅ Found user data:', mostRecentData)
        return { data: mostRecentData, error: null }
      } else {
        console.log('⚠️ No data found for user')
        return { data: null, error: null }
      }
    } catch (error) {
      console.error('❌ Download error:', error)
      return { data: null, error: error instanceof Error ? error : new Error('Download failed') }
    }
  },

  async deleteUserData(userId: string) {
    const { error } = await supabase
      .from('user_data')
      .delete()
      .eq('user_id', userId)

    return { error }
  },

  // Force clean sync - download from cloud and replace all local data
  async forceCleanDownload(userId: string) {
    console.log('🧹 Starting force clean download...')
    
    try {
      // Get cloud data
      const { data: cloudData, error } = await this.downloadUserData(userId)
      
      if (error) {
        console.error('❌ Failed to download cloud data:', error)
        return { error }
      }
      
      if (!cloudData) {
        console.log('⚠️ No cloud data found')
        return { data: null, error: null }
      }
      
      // Import database client
      const { tradesDb, capitalDb, calculateTradeMetrics, capitalDatabase } = await import('./database-client')
      
      // Clear all local data first
      console.log('🗑️ Clearing all local data...')
      await calculateTradeMetrics.clearAll()
      await capitalDatabase.clearAll()
      
      // Import cloud data
      let importedTrades = 0
      let importedCapital = 0
      
      console.log('📥 Importing cloud data...')
      
      // Import trades
      for (const trade of cloudData.trades || []) {
        try {
          await tradesDb.create(trade)
          importedTrades++
        } catch (error) {
          console.error('❌ Failed to import trade:', error)
        }
      }
      
      // Import capital
      for (const capital of cloudData.capital || []) {
        try {
          await capitalDb.create(capital)
          importedCapital++
        } catch (error) {
          console.error('❌ Failed to import capital record:', error)
        }
      }
      
      console.log(`✅ Force clean download completed - ${importedTrades} trades, ${importedCapital} capital records`)
      
      return { 
        data: { 
          tradesImported: importedTrades, 
          capitalImported: importedCapital 
        }, 
        error: null 
      }
      
    } catch (error) {
      console.error('❌ Force clean download failed:', error)
      return { data: null, error: error instanceof Error ? error : new Error('Force clean download failed') }
    }
  }
}

// Sync status management
export class SyncManager {
  private static instance: SyncManager
  private syncStatus: SyncStatus = {
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    lastSync: null,
    isSyncing: false,
    error: null
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager()
    }
    return SyncManager.instance
  }

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncStatus.isOnline = true
        this.autoSync()
      })

      window.addEventListener('offline', () => {
        this.syncStatus.isOnline = false
      })
    }
  }

  getStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  async autoSync() {
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing) {
      console.log('⚠️ Auto-sync skipped - offline or already syncing')
      return
    }

    let syncTimeout: NodeJS.Timeout | null = null
    
    try {
      this.syncStatus.isSyncing = true
      this.syncStatus.error = null

      const user = await auth.getCurrentUser()
      if (!user) {
        console.log('⚠️ Auto-sync skipped - user not authenticated')
        this.syncStatus.error = 'User not authenticated'
        return
      }
      
      // Add timeout to prevent hanging
      syncTimeout = setTimeout(() => {
        console.log('⏰ Auto-sync timeout, stopping sync')
        this.syncStatus.isSyncing = false
        this.syncStatus.error = 'Sync timeout'
      }, 30000) // 30 second timeout
      
      console.log('✅ User authenticated for auto-sync:', user.id)
      console.log('🔍 User email:', user.email)

      console.log('🔄 Auto-syncing data...')
      
      // Import the database client
      const { tradeDatabase, capitalDatabase, tradesDb, capitalDb } = await import('./database-client')
      
      // Get current local data
      const localTrades = await tradeDatabase.findAll()
      const localCapital = await capitalDatabase.getCapitalHistory()
      
      console.log('📊 Local data before sync:', {
        trades: localTrades.length,
        capital: localCapital.length
      })
      
      // Upload local data to Supabase
      console.log('📤 Uploading local data...')
      const { data: uploadResult, error: uploadError } = await dataSync.uploadUserData(user.id, localTrades, localCapital)
      
      if (uploadError) {
        console.error('❌ Upload failed:', uploadError)
        this.syncStatus.error = uploadError.message
        return
      }
      
      console.log('✅ Upload successful:', uploadResult)
      
      // Download data from Supabase
      console.log('📥 Downloading data from cloud...')
      const { data: cloudData, error: downloadError } = await dataSync.downloadUserData(user.id)
      
      if (downloadError) {
        console.error('❌ Download failed:', downloadError)
        this.syncStatus.error = downloadError.message
        return
      }
      
      console.log('📥 Download result:', {
        hasData: !!cloudData,
        tradesCount: cloudData?.trades?.length || 0,
        capitalCount: cloudData?.capital?.length || 0
      })
      
      if (cloudData) {
        console.log('🔄 Merging cloud data with local data...')
        console.log('📊 Cloud data summary:', {
          trades: cloudData.trades?.length || 0,
          capital: cloudData.capital?.length || 0
        })
        console.log('📊 Local data summary:', {
          trades: localTrades.length,
          capital: localCapital.length
        })
        
        // Merge trades - use smart merge to prevent duplicates
        const cloudTrades = cloudData.trades || []
        const localTradesMap = new Map(localTrades.map(t => [t.id, t]))
        
        console.log('🔍 Smart merging trades from cloud...')
        console.log('🔍 Local trades count:', localTrades.length)
        console.log('🔍 Cloud trades count:', cloudTrades.length)
        
        let newTradesAdded = 0
        let tradesUpdated = 0
        
        for (const cloudTrade of cloudTrades) {
          const localTrade = localTradesMap.get(cloudTrade.id)
          
          if (!localTrade) {
            // Trade doesn't exist locally - add it
            console.log('➕ Adding new trade from cloud:', cloudTrade.id, cloudTrade.symbol)
            try {
              await tradesDb.create(cloudTrade)
              newTradesAdded++
              console.log('✅ Trade added successfully:', cloudTrade.id)
            } catch (createError) {
              console.error('❌ Failed to add trade:', createError)
            }
          } else {
            // Trade exists - check if cloud version is newer
            const cloudUpdated = new Date(cloudTrade.updated_at || cloudTrade.created_at)
            const localUpdated = new Date(localTrade.updated_at || localTrade.created_at)
            
            if (cloudUpdated > localUpdated) {
              console.log('🔄 Updating existing trade with newer cloud version:', cloudTrade.id)
              try {
                await tradesDb.update(cloudTrade.id, cloudTrade)
                tradesUpdated++
                console.log('✅ Trade updated successfully:', cloudTrade.id)
              } catch (updateError) {
                console.error('❌ Failed to update trade:', updateError)
              }
            } else {
              console.log('✅ Trade is up to date locally:', cloudTrade.id)
            }
          }
        }
        
        // Merge capital - use smart merge to prevent duplicates
        const cloudCapital = cloudData.capital || []
        const localCapitalMap = new Map(localCapital.map(c => [c.id, c]))
        
        console.log('🔍 Smart merging capital records from cloud...')
        console.log('🔍 Local capital count:', localCapital.length)
        console.log('🔍 Cloud capital count:', cloudCapital.length)
        
        let newCapitalAdded = 0
        let capitalUpdated = 0
        
        for (const cloudCapitalRecord of cloudCapital) {
          const localCapitalRecord = localCapitalMap.get(cloudCapitalRecord.id)
          
          if (!localCapitalRecord) {
            // Capital record doesn't exist locally - add it
            console.log('➕ Adding new capital record from cloud:', cloudCapitalRecord.id)
            try {
              await capitalDb.create(cloudCapitalRecord)
              newCapitalAdded++
              console.log('✅ Capital record added successfully:', cloudCapitalRecord.id)
            } catch (createError) {
              console.error('❌ Failed to add capital record:', createError)
            }
          } else {
            // Capital record exists - check if cloud version is newer
            const cloudUpdated = new Date(cloudCapitalRecord.updated_at || cloudCapitalRecord.created_at)
            const localUpdated = new Date(localCapitalRecord.updated_at || localCapitalRecord.created_at)
            
            if (cloudUpdated > localUpdated) {
              console.log('🔄 Updating existing capital record with newer cloud version:', cloudCapitalRecord.id)
              try {
                await capitalDb.update(cloudCapitalRecord.id, cloudCapitalRecord)
                capitalUpdated++
                console.log('✅ Capital record updated successfully:', cloudCapitalRecord.id)
              } catch (updateError) {
                console.error('❌ Failed to update capital record:', updateError)
              }
            } else {
              console.log('✅ Capital record is up to date locally:', cloudCapitalRecord.id)
            }
          }
        }
        
        console.log('✅ Auto-sync completed - smart merge results:', {
          newTradesAdded,
          tradesUpdated,
          newCapitalAdded,
          capitalUpdated
        })
      } else {
        console.log('✅ Auto-sync completed - no cloud data to merge')
      }
      
      // Verify sync by checking local data again
      const finalTrades = await tradeDatabase.findAll()
      const finalCapital = await capitalDatabase.getCapitalHistory()
      
      console.log('📊 Local data after sync:', {
        trades: finalTrades.length,
        capital: finalCapital.length
      })
      
      // Check if data actually changed
      const tradesChanged = finalTrades.length !== localTrades.length
      const capitalChanged = finalCapital.length !== localCapital.length
      
      console.log('🔄 Data changes detected:', {
        tradesChanged,
        capitalChanged,
        tradesBefore: localTrades.length,
        tradesAfter: finalTrades.length,
        capitalBefore: localCapital.length,
        capitalAfter: finalCapital.length
      })
      
      if (tradesChanged || capitalChanged) {
        console.log('✅ Sync successful - data was updated')
      } else {
        console.log('⚠️ Sync completed but no data changes detected')
      }
      
      this.syncStatus.lastSync = new Date()
      this.syncStatus.error = null
      
      // Clear timeout on success
      if (syncTimeout) clearTimeout(syncTimeout)
      
    } catch (error) {
      console.error('Auto-sync failed:', error)
      this.syncStatus.error = error instanceof Error ? error.message : 'Sync failed'
      if (syncTimeout) clearTimeout(syncTimeout)
    } finally {
      this.syncStatus.isSyncing = false
    }
  }

  async forceSync() {
    await this.autoSync()
  }
}

export const syncManager = SyncManager.getInstance()

// Auto-sync function to be called after data changes
export const triggerAutoSync = async () => {
  try {
    console.log('🔄 Triggering auto-sync...')
    await syncManager.autoSync()
  } catch (error) {
    console.error('Auto-sync trigger failed:', error)
  }
}

// Advanced auto-sync system for multi-device synchronization
class AutoSyncService {
  private static instance: AutoSyncService
  private intervalId: NodeJS.Timeout | null = null
  private lastSyncTime: string | null = null
  private isRunning = false

  static getInstance(): AutoSyncService {
    if (!AutoSyncService.instance) {
      AutoSyncService.instance = new AutoSyncService()
    }
    return AutoSyncService.instance
  }

  async startPeriodicSync(intervalMs: number = 24 * 60 * 60 * 1000) { // Default: 24 hours
    if (this.isRunning) {
      console.log('⚠️ Auto-sync service already running')
      return
    }

    console.log('🚀 Starting daily auto-sync service (every', intervalMs / (1000 * 60 * 60), 'hours)')
    this.isRunning = true

    // Check authentication first
    const user = await auth.getCurrentUser()
    if (!user) {
      console.log('⚠️ No authenticated user, skipping auto-sync service')
      this.isRunning = false
      return
    }

    // Initial sync only if needed
    const lastSync = localStorage.getItem('trademaster_last_daily_sync')
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    
    if (!lastSync || parseInt(lastSync) < oneDayAgo) {
      console.log('📅 Performing initial daily sync...')
      await this.performSync()
      localStorage.setItem('trademaster_last_daily_sync', now.toString())
    } else {
      console.log('✅ Daily sync already performed today, skipping initial sync')
    }

    // Set up daily sync
    this.intervalId = setInterval(async () => {
      await this.performSync()
      localStorage.setItem('trademaster_last_daily_sync', Date.now().toString())
    }, intervalMs)
  }

  stopPeriodicSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('🛑 Stopped periodic auto-sync service')
  }

  private async performSync() {
    try {
      const user = await auth.getCurrentUser()
      if (!user) {
        console.log('⚠️ No authenticated user for periodic sync')
        return
      }

      console.log('🔄 Performing periodic sync check...')

      // Check if there are changes in the cloud
      const { data: cloudData, error } = await dataSync.downloadUserData(user.id)
      
      if (error) {
        console.error('❌ Failed to check cloud data:', error)
        return
      }

      if (!cloudData) {
        console.log('📭 No cloud data found')
        return
      }

      // Check if cloud data is newer than last sync
      const cloudLastSync = cloudData.last_sync
      if (this.lastSyncTime && cloudLastSync <= this.lastSyncTime) {
        console.log('📊 Cloud data is up to date, no sync needed')
        return
      }

      console.log('📥 Cloud data is newer, performing smart sync...')
      
      // Import the database client
      const { tradesDb, capitalDb } = await import('./database-client')
      
      // Get existing data for smart merge
      const existingTrades = await tradesDb.findAll()
      const existingCapital = await capitalDb.findAll()
      
      console.log('🔍 Smart merging cloud data - existing trades:', existingTrades.length, 'existing capital:', existingCapital.length)
      
      // Smart merge trades
      const existingTradesMap = new Map(existingTrades.map(t => [t.id, t]))
      let importedTrades = 0
      let updatedTrades = 0
      
      for (const cloudTrade of cloudData.trades || []) {
        const existingTrade = existingTradesMap.get(cloudTrade.id)
        
        if (!existingTrade) {
          // New trade - add it
          await tradesDb.create(cloudTrade)
          importedTrades++
        } else {
          // Existing trade - check if cloud version is newer
          const cloudUpdated = new Date(cloudTrade.updated_at || cloudTrade.created_at)
          const localUpdated = new Date(existingTrade.updated_at || existingTrade.created_at)
          
          if (cloudUpdated > localUpdated) {
            await tradesDb.update(cloudTrade.id, cloudTrade)
            updatedTrades++
          }
        }
      }
      
      // Smart merge capital
      const existingCapitalMap = new Map(existingCapital.map(c => [c.id, c]))
      let importedCapital = 0
      let updatedCapital = 0
      
      for (const cloudCapital of cloudData.capital || []) {
        const existingCapitalRecord = existingCapitalMap.get(cloudCapital.id)
        
        if (!existingCapitalRecord) {
          // New capital record - add it
          await capitalDb.create(cloudCapital)
          importedCapital++
        } else {
          // Existing capital record - check if cloud version is newer
          const cloudUpdated = new Date(cloudCapital.updated_at || cloudCapital.created_at)
          const localUpdated = new Date(existingCapitalRecord.updated_at || existingCapitalRecord.created_at)
          
          if (cloudUpdated > localUpdated) {
            await capitalDb.update(cloudCapital.id, cloudCapital)
            updatedCapital++
          }
        }
      }
      
      this.lastSyncTime = cloudLastSync
      
      console.log('✅ Periodic sync completed - smart merge results:', {
        importedTrades,
        updatedTrades,
        importedCapital,
        updatedCapital
      })
      
      // Show notification if data changed
      if (importedTrades > 0 || updatedTrades > 0 || importedCapital > 0 || updatedCapital > 0) {
        const changes = []
        if (importedTrades > 0) changes.push(`${importedTrades} עסקאות חדשות`)
        if (updatedTrades > 0) changes.push(`${updatedTrades} עסקאות עודכנו`)
        if (importedCapital > 0) changes.push(`${importedCapital} רשומות הון חדשות`)
        if (updatedCapital > 0) changes.push(`${updatedCapital} רשומות הון עודכנו`)
        
        this.showSyncNotification(`נתונים מסונכרנים: ${changes.join(', ')}`)
        
        // Trigger page refresh for all open tabs
        this.notifyOtherTabs()
      }

    } catch (error) {
      console.error('❌ Periodic sync failed:', error)
    }
  }

  public showSyncNotification(message: string) {
    // Create notification element
    const notification = document.createElement('div')
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: 'Assistant', Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
    `
    
    // Add animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `
    document.head.appendChild(style)
    
    document.body.appendChild(notification)
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }, 4000)
  }

  public notifyOtherTabs() {
    // Use localStorage to notify other tabs
    const event = {
      type: 'DATA_SYNCED',
      timestamp: Date.now(),
      message: 'Data has been synced from another device'
    }
    
    localStorage.setItem('trademaster_sync_event', JSON.stringify(event))
    
    // Remove the event after a short delay
    setTimeout(() => {
      localStorage.removeItem('trademaster_sync_event')
    }, 1000)
  }

  isServiceRunning(): boolean {
    return this.isRunning
  }
}

export const autoSyncService = AutoSyncService.getInstance()

// Function to start auto-sync service
export const startAutoSyncService = async (intervalMs?: number) => {
  await autoSyncService.startPeriodicSync(intervalMs)
}

// Function to stop auto-sync service
export const stopAutoSyncService = () => {
  autoSyncService.stopPeriodicSync()
}

// Function to check if auto-sync is running
export const isAutoSyncRunning = () => {
  return autoSyncService.isServiceRunning()
}

// Function for immediate sync after operations (add, edit, delete)
export const performImmediateSync = async () => {
  try {
    console.log('🔄 Performing immediate sync after operation...')
    
    const user = await auth.getCurrentUser()
    if (!user) {
      console.log('⚠️ No authenticated user for immediate sync')
      return
    }

    // Use the existing sync manager for immediate sync
    await syncManager.autoSync()
    
    // Show notification
    autoSyncService.showSyncNotification('נתונים מסונכרנים בהצלחה!')
    
    // Notify other tabs
    autoSyncService.notifyOtherTabs()
    
    console.log('✅ Immediate sync completed')
  } catch (error) {
    console.error('❌ Immediate sync failed:', error)
  }
}

// Initialize auth state listener for better localStorage management
export const initializeAuthListener = () => {
  if (typeof window === 'undefined') return

  console.log('🔧 Initializing auth state listener...')
  
  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state changed:', event, session?.user?.email)
    
    if (session?.user) {
      // User signed in - save to localStorage
      localStorage.setItem('trademaster_auth_state', 'authenticated')
      localStorage.setItem('trademaster_user_email', session.user.email || '')
      localStorage.setItem('trademaster_user_id', session.user.id)
      console.log('💾 Auth state saved to localStorage for user:', session.user.email)
      
      // Start auto-sync service if not already running
      if (!autoSyncService.isServiceRunning()) {
        console.log('🚀 Starting auto-sync service due to auth state change')
        autoSyncService.startPeriodicSync(15000)
      }
    } else {
      // User signed out - clear localStorage
      localStorage.removeItem('trademaster_auth_state')
      localStorage.removeItem('trademaster_user_email')
      localStorage.removeItem('trademaster_user_id')
      console.log('🗑️ Auth state cleared from localStorage')
      
      // Stop auto-sync service
      if (autoSyncService.isServiceRunning()) {
        console.log('🛑 Stopping auto-sync service due to auth state change')
        autoSyncService.stopPeriodicSync()
      }
    }
  })
}