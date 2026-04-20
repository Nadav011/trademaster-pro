import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TradeMaster Pro - יומן מסחר מקצועי',
  description: 'יומן מסחר מקיף ומקצועי לסוחרים - ניתוח ביצועים, מעקב אחר עסקאות וניהול סיכונים',
  keywords: ['מסחר', 'יומן מסחר', 'ניתוח ביצועים', 'ניהול סיכונים', 'פיננסים'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TradeMaster Pro',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'TradeMaster Pro',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TradeMaster Pro" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}

// Service Worker Registration Component
function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration)

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker installed, prompt for reload
                  if (confirm('זמין עדכון חדש לאפליקציה. האם ברצונך לרענן את הדף?')) {
                    window.location.reload()
                  }
                }
              })
            }
          })

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SYNC_COMPLETE') {
              console.log('📡 Background sync completed')
              // Trigger a custom event to notify the app
              window.dispatchEvent(new CustomEvent('trademaster-sync-complete'))
            }
          })

          // Handle push notifications
          if ('PushManager' in window) {
            registration.pushManager.getSubscription()
              .then((subscription) => {
                if (!subscription) {
                  console.log('📱 No push subscription found')
                } else {
                  console.log('📱 Push subscription active')
                }
              })
          }
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error)
        })

      // Listen for online/offline events
      const handleOnlineStatus = () => {
        const isOnline = navigator.onLine
        console.log(isOnline ? '🌐 Back online' : '📴 Gone offline')

        // Dispatch custom event for the app to handle
        window.dispatchEvent(new CustomEvent('trademaster-connection-change', {
          detail: { isOnline }
        }))
      }

      window.addEventListener('online', handleOnlineStatus)
      window.addEventListener('offline', handleOnlineStatus)

      // Cleanup
      return () => {
        window.removeEventListener('online', handleOnlineStatus)
        window.removeEventListener('offline', handleOnlineStatus)
      }
    }
  }, [])

  return null
}