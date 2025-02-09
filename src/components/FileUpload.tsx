'use client'

import { useState, useRef } from 'react'
import { Upload, File, X, Loader } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void  // 改为同步函数，只处理文件选择
  onClearFile: () => void
  accept?: string
  maxSize?: number
  selectedFile: File | null
}

export function FileUpload({ 
  onFileSelect, 
  onClearFile,
  accept, 
  maxSize = 50 * 1024 * 1024,
  selectedFile 
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件大小
    if (file.size > maxSize) {
      setError(`文件大小不能超过 ${Math.floor(maxSize / 1024 / 1024)}MB`)
      return
    }

    setError(null)
    onFileSelect(file)
  }

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 bg-white border rounded-md hover:bg-gray-50"
      >
        <Upload className="w-4 h-4" />
        <span>选择文件</span>
      </button>

      {selectedFile && (
        <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
          <File className="w-4 h-4" />
          <span>{selectedFile.name}</span>
          <button
            onClick={onClearFile}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  )
} 