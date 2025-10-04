'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Download, 
  Upload,
  CheckCircle, 
  AlertCircle, 
  Clock,
  HardDrive
} from 'lucide-react'
import { tradeDatabase, capitalDatabase } from '@/lib/database-client'
import { formatDate } from '@/lib/utils'

interface SyncManagerProps {
  onSyncComplete?: () => void
}

interface LocalDataStatus {
  tradesCount: number
  capitalCount: number
  lastUpdate: Date | null
  isHealthy: boolean
}

export function SyncManagerComponent({ onSyncComplete }: SyncManagerProps) {
  const [dataStatus, setDataStatus] = useState<LocalDataStatus>({
    tradesCount: 0,
    capitalCount: 0,
    lastUpdate: null,
    isHealthy: true
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadDataStatus()
    
    // Update status every 30 seconds
    const interval = setInterval(loadDataStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDataStatus = async () => {
    try {
      const trades = await tradeDatabase.findAll()
      const capital = await capitalDatabase.findAll()
      
      setDataStatus({
        tradesCount: trades.length,
        capitalCount: capital.length,
        lastUpdate: new Date(),
        isHealthy: true
      })
    } catch (error) {
      console.error('Failed to load data status:', error)
      setDataStatus(prev => ({ ...prev, isHealthy: false }))
    }
  }

  const handleExportData = async () => {
    setIsLoading(true)
    try {
      const trades = await tradeDatabase.findAll()
      const capital = await capitalDatabase.findAll()
      
      const exportData = {
        trades,
        capital,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      }
      
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `trademaster-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      onSyncComplete?.()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportData = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setIsLoading(true)
      try {
        const text = await file.text()
        const importData = JSON.parse(text)
        
        if (importData.trades && importData.capital) {
          // Clear existing data
          const existingTrades = await tradeDatabase.findAll()
          const existingCapital = await capitalDatabase.findAll()
          
          // Import new data
          for (const trade of importData.trades) {
            await tradeDatabase.create(trade)
          }
          
          for (const capital of importData.capital) {
            await capitalDatabase.create(capital)
          }
          
          await loadDataStatus()
          onSyncComplete?.()
        } else {
          throw new Error('Invalid backup file format')
        }
      } catch (error) {
        console.error('Import failed:', error)
        alert('שגיאה בייבוא הקובץ. אנא ודא שהקובץ תקין.')
      } finally {
        setIsLoading(false)
      }
    }
    
    input.click()
  }

  const getStatusIcon = () => {
    if (!dataStatus.isHealthy) return <AlertCircle className="h-4 w-4 text-red-500" />
    if (isLoading) return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getStatusText = () => {
    if (!dataStatus.isHealthy) return 'שגיאה בנתונים'
    if (isLoading) return 'טוען...'
    return 'נתונים תקינים'
  }

  const getStatusColor = () => {
    if (!dataStatus.isHealthy) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    if (isLoading) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
  }

  return (
    <Card className="apple-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <HardDrive className="h-5 w-5 text-blue-600" />
            <span>ניהול נתונים מקומיים</span>
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
          {/* Data Statistics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{dataStatus.tradesCount}</div>
              <div className="text-gray-600 dark:text-gray-400">עסקאות</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{dataStatus.capitalCount}</div>
              <div className="text-gray-600 dark:text-gray-400">רשומות הון</div>
            </div>
          </div>

          {/* Last Update */}
          {dataStatus.lastUpdate && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              עודכן לאחרונה: {formatDate(dataStatus.lastUpdate)}
            </div>
          )}

          {/* Export/Import Controls */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleExportData}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 ml-2" />
              ייצא נתונים
            </Button>
            
            <Button 
              onClick={handleImportData}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 ml-2" />
              ייבא נתונים
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center space-x-2 space-x-reverse mb-2">
              <Database className="h-4 w-4" />
              <span className="font-medium">מידע על הנתונים</span>
            </div>
            <p>הנתונים נשמרים באופן מקומי בדפדפן שלך. תוכל לייצא אותם לגיבוי או לייבא נתונים קיימים.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
