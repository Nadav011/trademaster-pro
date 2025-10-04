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
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .single()

    return { data, error }
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
    isOnline: navigator.onLine,
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
      const { tradeDatabase, capitalDatabase } = await import('./database-client')
      
      // Get current data
      const trades = await tradeDatabase.findAll()
      const capital = await capitalDatabase.getCapitalHistory()
      
      // Upload to Supabase
      const { error } = await dataSync.uploadUserData(user.id, trades, capital)
      
      if (error) {
        console.error('Auto-sync failed:', error)
        this.syncStatus.error = error.message
      } else {
        console.log('✅ Auto-sync successful')
        this.syncStatus.lastSync = new Date()
        this.syncStatus.error = null
      }
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
