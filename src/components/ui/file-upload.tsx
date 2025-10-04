'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Image, FileImage } from 'lucide-react'
import { fileUploadService, FileUploadOptions } from '@/lib/file-upload'

interface FileUploadProps {
  onUpload: (url: string) => void
  onError?: (error: string) => void
  options?: Partial<FileUploadOptions>
  placeholder?: string
  className?: string
}

export function FileUpload({ 
  onUpload, 
  onError, 
  options = {}, 
  placeholder = "לחץ לבחירת קובץ או גרור לכאן",
  className = ""
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    setIsUploading(true)
    setPreview(null)
    setFileInfo(null)

    try {
      // Get file info
      const info = fileUploadService.getFileInfo(file)
      setFileInfo(info)

      // Preview image
      if (file.type.startsWith('image/')) {
        const previewUrl = await fileUploadService.previewImage(file)
        setPreview(previewUrl)
      }

      // Upload file
      const result = await fileUploadService.uploadFile(file, options)
      
      if (result.success && result.url) {
        onUpload(result.url)
      } else {
        onError?.(result.error || 'שגיאה בהעלאת הקובץ')
      }
    } catch (error) {
      console.error('Upload error:', error)
      onError?.('שגיאה בהעלאת הקובץ')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleClear = () => {
    setPreview(null)
    setFileInfo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6">
          {preview ? (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-32 sm:h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {fileInfo && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <FileImage className="h-4 w-4" />
                    <span>{fileInfo.name}</span>
                    <span>({fileInfo.size})</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                isDragging 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}>
                {isUploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {isUploading ? 'מעלה קובץ...' : 'העלאת תמונה'}
              </h3>
              
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {placeholder}
              </p>
              
              <div className="text-sm text-gray-400 dark:text-gray-500">
                <p>קבצים נתמכים: JPG, PNG, WebP</p>
                <p>גודל מקסימלי: 5MB</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
