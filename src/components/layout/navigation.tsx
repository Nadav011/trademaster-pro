'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  Plus, 
  List, 
  DollarSign, 
  Settings, 
  TrendingUp,
  Menu,
  X,
  Database
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RealtimeIndicator } from './realtime-indicator'

const navigation = [
  { name: 'דאשבורד', href: '/', icon: BarChart3 },
  { name: 'הוסף עסקה', href: '/add-trade', icon: Plus },
  { name: 'רשימת עסקאות', href: '/trades', icon: List },
  { name: 'ניהול הון', href: '/capital', icon: DollarSign },
  { name: 'ניהול נתונים', href: '/data-management', icon: Database },
  { name: 'הגדרות', href: '/settings', icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white/80 backdrop-blur-sm"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 right-0 z-40 h-full w-64 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-l border-gray-200/50 dark:border-gray-700/50 transition-transform duration-300 ease-in-out",
        mobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">TradeMaster</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pro</p>
              </div>
            </div>
            <div className="hidden lg:block">
              <RealtimeIndicator />
            </div>
          </div>

          {/* Navigation links */}
          <div className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* User info */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">ס</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">סוחר מקצועי</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">משתמש פעיל</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content offset */}
      <div className="lg:ml-64" />
    </>
  )
}
