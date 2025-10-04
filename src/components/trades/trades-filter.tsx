'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Filter, X, Search } from 'lucide-react'
import { TradeFilters } from '@/types'
import { useState } from 'react'

interface TradesFilterProps {
  filters: TradeFilters
  onFiltersChange: (filters: TradeFilters) => void
  onClearFilters: () => void
}

export function TradesFilter({ filters, onFiltersChange, onClearFilters }: TradesFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleFilterChange = (field: keyof TradeFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value || undefined
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined)

  return (
    <Card className="apple-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Filter className="h-5 w-5 text-blue-600" />
            <span>פילטרים</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 ml-2" />
                נקה הכל
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'הסתר' : 'הראה'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Symbol Filter */}
            <div className="space-y-2">
              <Label htmlFor="symbol-filter">סמל הנכס</Label>
              <div className="relative">
                <Input
                  id="symbol-filter"
                  value={filters.symbol || ''}
                  onChange={(e) => handleFilterChange('symbol', e.target.value)}
                  placeholder="AAPL, BTC/USD..."
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Direction Filter */}
            <div className="space-y-2">
              <Label htmlFor="direction-filter">כיוון</Label>
              <Select 
                value={filters.direction || ''} 
                onValueChange={(value) => handleFilterChange('direction', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="כל הכיוונים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">כל הכיוונים</SelectItem>
                  <SelectItem value="Long">Long (קנייה)</SelectItem>
                  <SelectItem value="Short">Short (מכירה)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status-filter">סטטוס</Label>
              <Select 
                value={filters.status || ''} 
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="כל הסטטוסים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">כל הסטטוסים</SelectItem>
                  <SelectItem value="all">כל העסקאות</SelectItem>
                  <SelectItem value="open">פתוחות</SelectItem>
                  <SelectItem value="closed">סגורות</SelectItem>
                  <SelectItem value="profit">מרוויחות</SelectItem>
                  <SelectItem value="loss">מפסידות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>תאריך מ</Label>
              <Input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>
          </div>

          {/* Additional filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>תאריך עד</Label>
              <Input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>

            {/* Quick filter buttons */}
            <div className="flex flex-col sm:flex-row items-end space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFiltersChange({ status: 'open' })}
                className={filters.status === 'open' ? 'bg-blue-50 text-blue-700' : ''}
              >
                עסקאות פתוחות
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFiltersChange({ status: 'profit' })}
                className={filters.status === 'profit' ? 'bg-green-50 text-green-700' : ''}
              >
                מרוויחות
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFiltersChange({ status: 'loss' })}
                className={filters.status === 'loss' ? 'bg-red-50 text-red-700' : ''}
              >
                מפסידות
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
