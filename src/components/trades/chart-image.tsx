'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Image, X, ZoomIn } from 'lucide-react'

interface ChartImageProps {
  url?: string
  alt?: string
  className?: string
}

export function ChartImage({ url, alt = "Chart", className = "" }: ChartImageProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-center py-8">
          <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">אין תמונה</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`relative group cursor-pointer ${className}`} onClick={() => setIsOpen(true)}>
        <img
          src={url}
          alt={alt}
          className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{alt}</span>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center">
            <img
              src={url}
              alt={alt}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
