import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TradeMaster Pro - יומן מסחר מקצועי',
  description: 'יומן מסחר מקיף ומקצועי לסוחרים - ניתוח ביצועים, מעקב אחר עסקאות וניהול סיכונים',
  keywords: ['מסחר', 'יומן מסחר', 'ניתוח ביצועים', 'ניהול סיכונים', 'פיננסים'],
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
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {children}
      </body>
    </html>
  )
}