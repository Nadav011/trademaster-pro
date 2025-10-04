// TradeMaster Pro - File Upload Service
// Handles image uploads for trade charts

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  quality?: number; // for image compression
}

class FileUploadService {
  private defaultOptions: FileUploadOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    quality: 0.8,
  };

  async uploadFile(file: File, options: Partial<FileUploadOptions> = {}): Promise<UploadResult> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Validate file
      const validation = this.validateFile(file, opts);
      if (!validation.success) {
        return validation;
      }

      // Compress image if needed
      const processedFile = await this.processImage(file, opts);

      // Convert to base64 for storage
      const base64Url = await this.fileToBase64(processedFile);

      return {
        success: true,
        url: base64Url,
      };
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: 'שגיאה בהעלאת הקובץ',
      };
    }
  }

  private validateFile(file: File, options: FileUploadOptions): UploadResult {
    // Check file size
    if (file.size > options.maxSize!) {
      return {
        success: false,
        error: `הקובץ גדול מדי. גודל מקסימלי: ${this.formatFileSize(options.maxSize!)}`,
      };
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `סוג קובץ לא נתמך. סוגים נתמכים: ${options.allowedTypes.join(', ')}`,
      };
    }

    return { success: true };
  }

  private async processImage(file: File, options: FileUploadOptions): Promise<File> {
    // If it's not an image or quality is 1, return original file
    if (!file.type.startsWith('image/') || options.quality === 1) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1200px width)
        const maxWidth = 1200;
        const maxHeight = 800;
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          options.quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Utility function to preview uploaded image
  previewImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Utility function to get file info
  getFileInfo(file: File): { name: string; size: string; type: string } {
    return {
      name: file.name,
      size: this.formatFileSize(file.size),
      type: file.type,
    };
  }
}

// Singleton instance
export const fileUploadService = new FileUploadService();

// React hook for file uploads
export const useFileUpload = () => {
  const uploadFile = async (file: File, options?: Partial<FileUploadOptions>): Promise<UploadResult> => {
    return fileUploadService.uploadFile(file, options);
  };

  const previewImage = async (file: File): Promise<string> => {
    return fileUploadService.previewImage(file);
  };

  const getFileInfo = (file: File) => {
    return fileUploadService.getFileInfo(file);
  };

  return {
    uploadFile,
    previewImage,
    getFileInfo,
  };
};

export default fileUploadService;
