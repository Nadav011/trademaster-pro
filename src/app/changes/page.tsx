'use client'

import { Navigation } from '@/components/layout/navigation'
import { ChangesDashboard } from '@/components/mobile/changes-dashboard'
import { MobileNotifications } from '@/components/mobile/mobile-notifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  Smartphone, 
  Eye, 
  Zap,
  Bell,
  Settings,
  RefreshCw
} from 'lucide-react'
import { useState, useEffect } from 'react'

export default function ChangesPage() {
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Check if notifications are supported and enabled
    if ('Notification' in window) {
      setIsNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setIsNotificationsEnabled(permission === 'granted')
      
      if (permission === 'granted') {
        new Notification('התראות הופעלו!', {
          body: 'עכשיו תקבל התראות על שינויים באתר',
          icon: '/favicon.ico'
        })
      }
    }
  }

  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <Navigation />
      
      {/* Mobile Notifications Overlay */}
      <MobileNotifications />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  מעקב שינויים
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  צפייה מהירה בכל השינויים באתר - מותאם ל-iPad ומובייל
                </p>
              </div>
            </div>
            <Button
              onClick={refreshData}
              variant="outline"
              className="hidden md:flex"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              רענן
            </Button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="apple-card bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">מותאם למובייל</p>
                    <p className="text-2xl font-bold text-green-600">✓</p>
                  </div>
                  <Smartphone className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="apple-card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">עדכונים בזמן אמת</p>
                    <p className="text-2xl font-bold text-blue-600">30s</p>
                  </div>
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="apple-card bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">התראות דפדפן</p>
                    <Badge variant={isNotificationsEnabled ? "default" : "secondary"}>
                      {isNotificationsEnabled ? "פעיל" : "כבוי"}
                    </Badge>
                  </div>
                  <Bell className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notifications Settings */}
        {!isNotificationsEnabled && (
          <Card className="apple-card mb-6 border-2 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse text-yellow-800 dark:text-yellow-200">
                <Bell className="h-5 w-5" />
                <span>הפעל התראות לחוויה מיטבית</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                קבל התראות מיידיות כשמתבצעים שינויים באתר - מושלם לעבודה עם iPad!
              </p>
              <Button 
                onClick={enableNotifications}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Bell className="h-4 w-4 ml-2" />
                הפעל התראות
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iPad Optimization Tips */}
        <Card className="apple-card mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Eye className="h-5 w-5 text-indigo-600" />
              <span>טיפים לצפייה מיטבית ב-iPad</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-100">🎯 צפייה מהירה</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• הדף מתרענן אוטומטית כל 30 שניות</li>
                  <li>• התראות מופיעות בחלק העליון של המסך</li>
                  <li>• סיכום יומי מציג את כל השינויים</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-100">📱 אופטימיזציה למובייל</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• כרטיסים גדולים וברורים</li>
                  <li>• גלילה חלקה ומהירה</li>
                  <li>• מגע ידידותי לטאבלט</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Changes Dashboard */}
        <ChangesDashboard key={refreshKey} />

        {/* Quick Actions */}
        <Card className="apple-card mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Settings className="h-5 w-5" />
              <span>פעולות מהירות</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                דשבורד
              </Button>
              <Button 
                onClick={() => window.location.href = '/trades'}
                variant="outline"
                className="w-full"
              >
                עסקאות
              </Button>
              <Button 
                onClick={() => window.location.href = '/add-trade'}
                variant="outline"
                className="w-full"
              >
                עסקה חדשה
              </Button>
              <Button 
                onClick={refreshData}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                רענן
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}