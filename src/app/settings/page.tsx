'use client'

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/layout/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Settings, 
  User, 
  Target, 
  Heart, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  X
} from 'lucide-react'
import { 
  usersDb,
  entryReasonsDb,
  emotionalStatesDb,
  initializeDatabase 
} from '@/lib/database-client'
import { SyncManagerComponent } from '@/components/sync/sync-manager'
import { 
  User as UserType,
  EntryReason, 
  EmotionalState 
} from '@/types'
import { formatCurrency } from '@/lib/utils'
import { apiConfig } from '@/lib/api-config'

export default function SettingsPage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [entryReasons, setEntryReasons] = useState<EntryReason[]>([])
  const [emotionalStates, setEmotionalStates] = useState<EmotionalState[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [newEntryReason, setNewEntryReason] = useState('')
  const [newEmotionalState, setNewEmotionalState] = useState('')
  const [editingEntryReason, setEditingEntryReason] = useState<string | null>(null)
  const [editingEmotionalState, setEditingEmotionalState] = useState<string | null>(null)
  const [finnhubApiKey, setFinnhubApiKey] = useState('')

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await initializeDatabase()

      const [users, reasons, states] = await Promise.all([
        usersDb.findAll(),
        entryReasonsDb.findAll(),
        emotionalStatesDb.findAll()
      ])
      
      setUser(users[0] || null)
      setEntryReasons(reasons)
      setEmotionalStates(states)
      
      // Load API configuration
      const currentApiKey = apiConfig.getFinnhubApiKey()
      setFinnhubApiKey(currentApiKey)
    } catch (err) {
      console.error('Failed to load settings data:', err)
      setError('שגיאה בטעינת הגדרות')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const saveUserSettings = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      await usersDb.update(user.id, {
        risk_per_trade_percent: user.risk_per_trade_percent,
        initial_capital_historical: user.initial_capital_historical,
      })
      setSuccess('הגדרות המשתמש נשמרו בהצלחה')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Failed to save user settings:', err)
      setError('שגיאה בשמירת הגדרות המשתמש')
    } finally {
      setIsSaving(false)
    }
  }

  const saveApiSettings = async () => {
    setIsSaving(true)
    setError(null)
    try {
      console.log('Saving API settings...', finnhubApiKey ? 'API key provided' : 'No API key')
      apiConfig.setFinnhubApiKey(finnhubApiKey)
      setSuccess('הגדרות API נשמרו בהצלחה')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Failed to save API settings:', err)
      setError(`שגיאה בשמירת הגדרות API: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const addEntryReason = async () => {
    if (!newEntryReason.trim()) return

    try {
      await entryReasonsDb.create({
        name: newEntryReason.trim(),
        is_active: true,
      })
      setNewEntryReason('')
      await loadData()
      setSuccess('סיבת כניסה נוספה בהצלחה')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Failed to add entry reason:', err)
      setError('שגיאה בהוספת סיבת כניסה')
    }
  }

  const addEmotionalState = async () => {
    if (!newEmotionalState.trim()) return

    try {
      await emotionalStatesDb.create({
        name: newEmotionalState.trim(),
        is_active: true,
      })
      setNewEmotionalState('')
      await loadData()
      setSuccess('מצב רגשי נוסף בהצלחה')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Failed to add emotional state:', err)
      setError('שגיאה בהוספת מצב רגשי')
    }
  }

  const toggleEntryReasonActive = async (id: string, isActive: boolean) => {
    try {
      await entryReasonsDb.update(id, { is_active: !isActive })
      await loadData()
    } catch (err) {
      console.error('Failed to toggle entry reason:', err)
      setError('שגיאה בעדכון סיבת כניסה')
    }
  }

  const toggleEmotionalStateActive = async (id: string, isActive: boolean) => {
    try {
      await emotionalStatesDb.update(id, { is_active: !isActive })
      await loadData()
    } catch (err) {
      console.error('Failed to toggle emotional state:', err)
      setError('שגיאה בעדכון מצב רגשי')
    }
  }

  const deleteEntryReason = async (id: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את סיבת הכניסה?')) return

    try {
      await entryReasonsDb.delete(id)
      await loadData()
      setSuccess('סיבת כניסה נמחקה בהצלחה')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Failed to delete entry reason:', err)
      setError('שגיאה במחיקת סיבת כניסה')
    }
  }

  const deleteEmotionalState = async (id: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את המצב הרגשי?')) return

    try {
      await emotionalStatesDb.delete(id)
      await loadData()
      setSuccess('מצב רגשי נמחק בהצלחה')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Failed to delete emotional state:', err)
      setError('שגיאה במחיקת מצב רגשי')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="p-6 lg:mr-64">
          <div className="max-w-4xl mx-auto">
            <Card className="apple-card">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <div>טוען הגדרות...</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="p-6 lg:mr-64">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                הגדרות
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                ניהול הגדרות המשתמש, סיבות כניסה ומצבים רגשיים
              </p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <Card className="apple-card border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-red-600">{error}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null)
                      loadData()
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    רענן
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {success && (
            <Card className="apple-card border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="text-green-600">{success}</div>
              </CardContent>
            </Card>
          )}

          {/* API Settings */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Settings className="h-5 w-5 text-blue-600" />
                <span>הגדרות API</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="finnhub_api_key">מפתח Finnhub API</Label>
                  <Input
                    id="finnhub_api_key"
                    type="password"
                    value={finnhubApiKey}
                    onChange={(e) => setFinnhubApiKey(e.target.value)}
                    placeholder="הכנס את מפתח ה-API שלך"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    מפתח זה נדרש לקבלת מחירי שוק חיים. ניתן לקבל מפתח חינמי מ-
                    <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Finnhub.io
                    </a>
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={saveApiSettings}
                    disabled={isSaving}
                    className="apple-button"
                  >
                    <Save className="h-4 w-4 ml-2" />
                    {isSaving ? 'שומר...' : 'שמור הגדרות API'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Settings */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <User className="h-5 w-5 text-blue-600" />
                <span>הגדרות משתמש</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="risk_per_trade">אחוז סיכון לכל עסקה (%)</Label>
                      <Input
                        id="risk_per_trade"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={user.risk_per_trade_percent}
                        onChange={(e) => setUser({
                          ...user,
                          risk_per_trade_percent: parseFloat(e.target.value) || 1.0
                        })}
                        placeholder="1.0"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        אחוז ההון שתהיה מוכן להפסיד בכל עסקה
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="initial_capital">הון התחלתי היסטורי</Label>
                      <Input
                        id="initial_capital"
                        type="number"
                        step="0.01"
                        value={user.initial_capital_historical}
                        onChange={(e) => setUser({
                          ...user,
                          initial_capital_historical: parseFloat(e.target.value) || 0
                        })}
                        placeholder="10000"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ההון הבסיסי לחישוב גודל פוזיציה
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={saveUserSettings}
                      disabled={isSaving}
                      className="apple-button"
                    >
                      <Save className="h-4 w-4 ml-2" />
                      {isSaving ? 'שומר...' : 'שמור הגדרות'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">משתמש לא נמצא</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entry Reasons Management */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Target className="h-5 w-5 text-blue-600" />
                <span>ניהול סיבות כניסה</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add New Entry Reason */}
              <div className="flex space-x-2 space-x-reverse mb-6">
                <Input
                  value={newEntryReason}
                  onChange={(e) => setNewEntryReason(e.target.value)}
                  placeholder="הוסף סיבת כניסה חדשה..."
                  onKeyPress={(e) => e.key === 'Enter' && addEntryReason()}
                />
                <Button onClick={addEntryReason} disabled={!newEntryReason.trim()}>
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף
                </Button>
              </div>

              {/* Entry Reasons List */}
              <div className="space-y-3">
                {entryReasons.map((reason) => (
                  <div key={reason.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <Switch
                        checked={reason.is_active}
                        onCheckedChange={() => toggleEntryReasonActive(reason.id, reason.is_active)}
                      />
                      <span className={`font-medium ${reason.is_active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {reason.name}
                      </span>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteEntryReason(reason.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {entryReasons.length === 0 && (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">אין סיבות כניסה</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emotional States Management */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Heart className="h-5 w-5 text-blue-600" />
                <span>ניהול מצבים רגשיים</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add New Emotional State */}
              <div className="flex space-x-2 space-x-reverse mb-6">
                <Input
                  value={newEmotionalState}
                  onChange={(e) => setNewEmotionalState(e.target.value)}
                  placeholder="הוסף מצב רגשי חדש..."
                  onKeyPress={(e) => e.key === 'Enter' && addEmotionalState()}
                />
                <Button onClick={addEmotionalState} disabled={!newEmotionalState.trim()}>
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף
                </Button>
              </div>

              {/* Emotional States List */}
              <div className="space-y-3">
                {emotionalStates.map((state) => (
                  <div key={state.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <Switch
                        checked={state.is_active}
                        onCheckedChange={() => toggleEmotionalStateActive(state.id, state.is_active)}
                      />
                      <span className={`font-medium ${state.is_active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {state.name}
                      </span>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteEmotionalState(state.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {emotionalStates.length === 0 && (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">אין מצבים רגשיים</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cloud Sync */}
          <SyncManagerComponent 
            onSyncComplete={() => {
              // Refresh data after sync
              loadData()
            }}
          />
        </div>
      </main>
    </div>
  )
}
