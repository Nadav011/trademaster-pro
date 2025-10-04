'use client'

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/layout/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings } from 'lucide-react'
import { apiConfig } from '@/lib/api-config'

export default function SimpleSettings() {
  const [finnhubApiKey, setFinnhubApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    // Simple loading without complex dependencies
    try {
      const currentApiKey = apiConfig.getFinnhubApiKey()
      setFinnhubApiKey(currentApiKey)
      setIsLoading(false)
    } catch (err) {
      console.error('Error loading API config:', err)
      setError(`שגיאה בטעינת הגדרות: ${err}`)
      setIsLoading(false)
    }
  }, [])

  const saveApiSettings = async () => {
    try {
      apiConfig.setFinnhubApiKey(finnhubApiKey)
      setSuccess('הגדרות API נשמרו בהצלחה')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Failed to save API settings:', err)
      setError(`שגיאה בשמירת הגדרות API: ${err}`)
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                הגדרות API - גרסה פשוטה
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                הגדרות API ללא בעיות
              </p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <Card className="apple-card border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="text-red-600">{error}</div>
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
                    className="apple-button"
                  >
                    שמור הגדרות API
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

