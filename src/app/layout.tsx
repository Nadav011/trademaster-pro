import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TradeMaster Pro - יומן מסחר מקצועי',
  description: 'יומן מסחר מקיף ומקצועי לסוחרים - ניתוח ביצועים, מעקב אחר עסקאות וניהול סיכונים',
  keywords: ['מסחר', 'יומן מסחר', 'ניתוח ביצועים', 'ניהול סיכונים', 'פיננסים'],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Assistant:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {children}
        </div>
      </body>
    </html>
  )
}