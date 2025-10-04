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
    return { data, error }
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
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
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing) return

    try {
      this.syncStatus.isSyncing = true
      this.syncStatus.error = null

      const user = await auth.getCurrentUser()
      if (!user) {
        this.syncStatus.error = 'User not authenticated'
        return
      }

      console.log('🔄 Auto-syncing data...')
      
      // Import the database client
      const { tradeDatabase, capitalDatabase, tradesDb, capitalDb } = await import('./database-client')
      
      // Get current local data
      const localTrades = await tradeDatabase.findAll()
      const localCapital = await capitalDatabase.getCapitalHistory()
      
      // Upload local data to Supabase
      console.log('📤 Uploading local data...')
      const { error: uploadError } = await dataSync.uploadUserData(user.id, localTrades, localCapital)
      
      if (uploadError) {
        console.error('Upload failed:', uploadError)
        this.syncStatus.error = uploadError.message
        return
      }
      
      // Download data from Supabase
      console.log('📥 Downloading data from cloud...')
      const { data: cloudData, error: downloadError } = await dataSync.downloadUserData(user.id)
      
      if (downloadError) {
        console.error('Download failed:', downloadError)
        this.syncStatus.error = downloadError.message
        return
      }
      
      if (cloudData) {
        console.log('🔄 Merging cloud data with local data...')
        
        // Merge trades
        const cloudTrades = cloudData.trades || []
        const localTradeIds = new Set(localTrades.map(t => t.id))
        
        for (const cloudTrade of cloudTrades) {
          if (!localTradeIds.has(cloudTrade.id)) {
            console.log('➕ Adding new trade from cloud:', cloudTrade.id)
            await tradesDb.create(cloudTrade)
          }
        }
        
        // Merge capital
        const cloudCapital = cloudData.capital || []
        const localCapitalIds = new Set(localCapital.map(c => c.id))
        
        for (const cloudCapitalRecord of cloudCapital) {
          if (!localCapitalIds.has(cloudCapitalRecord.id)) {
            console.log('➕ Adding new capital record from cloud:', cloudCapitalRecord.id)
            await capitalDb.create(cloudCapitalRecord)
          }
        }
        
        console.log('✅ Auto-sync completed - merged data')
      } else {
        console.log('✅ Auto-sync completed - no cloud data to merge')
      }
      
      this.syncStatus.lastSync = new Date()
      this.syncStatus.error = null
      
    } catch (error) {
      console.error('Auto-sync failed:', error)
      this.syncStatus.error = error instanceof Error ? error.message : 'Sync failed'
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
