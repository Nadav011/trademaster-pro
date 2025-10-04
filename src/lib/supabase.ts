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
    return user
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
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
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing) {
      console.log('⚠️ Auto-sync skipped - offline or already syncing')
      return
    }

    try {
      this.syncStatus.isSyncing = true
      this.syncStatus.error = null

      const user = await auth.getCurrentUser()
      if (!user) {
        console.log('⚠️ Auto-sync skipped - user not authenticated')
        this.syncStatus.error = 'User not authenticated'
        return
      }
      
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
        
        // Merge trades
        const cloudTrades = cloudData.trades || []
        const localTradeIds = new Set(localTrades.map(t => t.id))
        
        console.log('🔍 Checking for new trades from cloud...')
        console.log('🔍 Local trade IDs:', Array.from(localTradeIds))
        console.log('🔍 Cloud trade IDs:', cloudTrades.map((t: any) => t.id))
        
        let newTradesAdded = 0
        for (const cloudTrade of cloudTrades) {
          if (!localTradeIds.has(cloudTrade.id)) {
            console.log('➕ Adding new trade from cloud:', cloudTrade.id, cloudTrade.symbol)
            try {
              await tradesDb.create(cloudTrade)
              newTradesAdded++
              console.log('✅ Trade added successfully:', cloudTrade.id)
            } catch (createError) {
              console.error('❌ Failed to add trade:', createError)
            }
          } else {
            console.log('⚠️ Trade already exists locally:', cloudTrade.id)
          }
        }
        
        // Merge capital
        const cloudCapital = cloudData.capital || []
        const localCapitalIds = new Set(localCapital.map(c => c.id))
        
        console.log('🔍 Checking for new capital records from cloud...')
        let newCapitalAdded = 0
        for (const cloudCapitalRecord of cloudCapital) {
          if (!localCapitalIds.has(cloudCapitalRecord.id)) {
            console.log('➕ Adding new capital record from cloud:', cloudCapitalRecord.id)
            await capitalDb.create(cloudCapitalRecord)
            newCapitalAdded++
          }
        }
        
        console.log('✅ Auto-sync completed - merged data:', {
          newTradesAdded,
          newCapitalAdded
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
