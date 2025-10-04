'use client'

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/layout/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataManager } from '@/lib/data-export'
import { 
  Download, 
  Upload, 
  Trash2, 
  Database, 
  AlertTriangle,
  CheckCircle,
  FileText
} from 'lucide-react'

export default function DataManagement() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [importData, setImportData] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [dataStats, setDataStats] = useState({
    trades: 0,
    capital: 0,
    entryReasons: 0,
    emotionalStates: 0,
    users: 0,
  })

  // Load data stats on component mount
  useEffect(() => {
    setDataStats(DataManager.getDataStats())
  }, [])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await DataManager.downloadData()
      setMessage({ type: 'success', text: 'הנתונים יוצאו בהצלחה!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בייצוא הנתונים' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      setMessage({ type: 'error', text: 'אנא הכנס נתונים לייבוא' })
      return
    }

    try {
      setIsImporting(true)
      await DataManager.importData(importData)
      
      // Trigger immediate sync after importing data
      console.log('🔄 Data imported, triggering immediate sync...')
      try {
        const { performImmediateSync } = await import('@/lib/supabase')
        await performImmediateSync()
        console.log('✅ Immediate sync completed after importing data')
      } catch (syncError) {
        console.error('❌ Immediate sync failed after importing data:', syncError)
      }
      
      setMessage({ type: 'success', text: 'הנתונים יובאו בהצלחה! הדף ירענן כעת.' })
      // Update stats after import
      setDataStats(DataManager.getDataStats())
    } catch (error) {
      setMessage({ type: 'error', text: `שגיאה בייבוא הנתונים: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClearData = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל הנתונים? פעולה זו לא ניתנת לביטול!')) {
      return
    }

    try {
      setIsClearing(true)
      await DataManager.clearAllData()
      
      // Trigger immediate sync after clearing data
      console.log('🔄 Data cleared, triggering immediate sync...')
      try {
        const { performImmediateSync } = await import('@/lib/supabase')
        await performImmediateSync()
        console.log('✅ Immediate sync completed after clearing data')
      } catch (syncError) {
        console.error('❌ Immediate sync failed after clearing data:', syncError)
      }
      
      setMessage({ type: 'success', text: 'כל הנתונים נמחקו בהצלחה! הדף ירענן כעת.' })
      // Update stats after clearing
      setDataStats(DataManager.getDataStats())
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה במחיקת הנתונים' })
    } finally {
      setIsClearing(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="p-6 lg:mr-64">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              ניהול נתונים
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              ייצוא, ייבוא ומחיקת נתוני המסחר שלך
            </p>
          </div>

          {/* API Status */}
          <Card className="apple-card border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 space-x-reverse text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">מחירים מדומים</span>
              </div>
              <p className="text-sm text-yellow-600 mt-1">
                המחירים הנוכחיים הם נתונים מדומים. להפעלת מחירים אמיתיים, הוסף Finnhub API key בהגדרות.
              </p>
            </CardContent>
          </Card>

          {/* Data Statistics */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Database className="h-5 w-5 text-blue-600" />
                <span>סטטיסטיקות נתונים</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{dataStats.trades}</div>
                  <div className="text-sm text-gray-500">עסקאות</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{dataStats.capital}</div>
                  <div className="text-sm text-gray-500">הון</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{dataStats.entryReasons}</div>
                  <div className="text-sm text-gray-500">סיבות כניסה</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{dataStats.emotionalStates}</div>
                  <div className="text-sm text-gray-500">מצבים רגשיים</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{dataStats.users}</div>
                  <div className="text-sm text-gray-500">משתמשים</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Data */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Download className="h-5 w-5 text-green-600" />
                <span>ייצוא נתונים</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                ייצא את כל הנתונים שלך לקובץ JSON. תוכל להשתמש בקובץ זה לגיבוי או להעברה למכשיר אחר.
              </p>
              <Button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 ml-2" />
                {isExporting ? 'מייצא...' : 'ייצא נתונים'}
              </Button>
            </CardContent>
          </Card>

          {/* Import Data */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Upload className="h-5 w-5 text-blue-600" />
                <span>ייבוא נתונים</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                ייבא נתונים מקובץ JSON. זה יחליף את כל הנתונים הקיימים.
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">העלה קובץ JSON</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="import-data">או הדבק נתונים JSON</Label>
                  <textarea
                    id="import-data"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="הדבק כאן את תוכן קובץ ה-JSON..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <Button 
                onClick={handleImport}
                disabled={isImporting || !importData.trim()}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 ml-2" />
                {isImporting ? 'מייבא...' : 'ייבא נתונים'}
              </Button>
            </CardContent>
          </Card>

          {/* Clear Data */}
          <Card className="apple-card border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse text-red-600">
                <Trash2 className="h-5 w-5" />
                <span>מחיקת נתונים</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2 space-x-reverse">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-600 dark:text-gray-400">
                    מחיקת כל הנתונים מהמערכת. פעולה זו לא ניתנת לביטול!
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    מומלץ לייצא גיבוי לפני מחיקת הנתונים.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleClearData}
                disabled={isClearing}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                {isClearing ? 'מוחק...' : 'מחק כל הנתונים'}
              </Button>
            </CardContent>
          </Card>

          {/* Message */}
          {message && (
            <Card className={`apple-card ${message.type === 'success' ? 'border-green-200' : 'border-red-200'}`}>
              <CardContent className="p-4">
                <div className={`flex items-center space-x-2 space-x-reverse ${
                  message.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  <span>{message.text}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
