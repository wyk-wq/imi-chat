import { useState } from 'react'
import { File, Download, FileText, FileImage, FileArchive, Loader } from 'lucide-react'

interface FileMessageProps {
  file: {
    name: string
    url: string
    type: string
    size: number
  }
  sender: {
    id: number
    username: string
  }
  timestamp: string
  isSelf: boolean
}

export function FileMessage({ file, sender, timestamp, isSelf }: FileMessageProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrl, setShowUrl] = useState(false)

  // 添加调试日志
  console.log('FileMessage props:', { file, sender, timestamp, isSelf })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  // 根据文件类型选择图标
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return FileImage
    if (type.includes('pdf') || type.includes('doc') || type.includes('txt')) return FileText
    if (type.includes('zip') || type.includes('rar')) return FileArchive
    return File
  }

  const FileIcon = getFileIcon(file.type)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      setError(null)
      
      // 直接使用文件 URL 下载
      const response = await fetch(file.url)
      if (!response.ok) {
        throw new Error('下载失败')
      }
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      setError(error instanceof Error ? error.message : '下载失败')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${
        isSelf ? 'bg-blue-500 text-white' : 'bg-white'
      }`}>
        {/* 发送者名称 */}
        <div className={`text-xs mb-1 ${isSelf ? 'text-right' : 'text-left'} ${
          isSelf ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {sender.username}
        </div>

        {/* 文件卡片 */}
        <div className={`flex flex-col p-3 rounded-lg border ${
          isSelf ? 'border-blue-400 bg-blue-500' : 'border-gray-200 bg-white'
        } hover:shadow-md transition-shadow`}>
          {/* 文件信息行 */}
          <div className="flex items-center">
            <div className="mr-3">
              <FileIcon className={`w-10 h-10 ${isSelf ? 'text-blue-100' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium mb-1 hover:text-blue-500">
                {file.name}
              </div>
              <div className={`flex items-center text-xs space-x-2 ${
                isSelf ? 'text-blue-100' : 'text-gray-500'
              }`}>
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{file.type.split('/')[1].toUpperCase()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* 下载按钮 */}
              <a
                href={file.url}
                download={file.name}
                className={`p-2 rounded-full hover:bg-opacity-10 transition-all ${
                  isSelf ? 'hover:bg-white text-blue-100' : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="下载文件"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-5 h-5" />
              </a>
              {/* 显示/隐藏 URL 按钮 */}
              <button
                onClick={() => setShowUrl(!showUrl)}
                className={`p-2 rounded-full hover:bg-opacity-10 transition-all ${
                  isSelf ? 'hover:bg-white text-blue-100' : 'hover:bg-gray-100 text-gray-500'
                }`}
                title={showUrl ? '隐藏链接' : '显示链接'}
              >
                {showUrl ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.102 1.101" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 文件 URL */}
          {showUrl && (
            <div className={`mt-2 text-xs break-all ${
              isSelf ? 'text-blue-100' : 'text-gray-500'
            }`}>
              <div className="font-medium mb-1">文件链接：</div>
              <a 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {file.url}
              </a>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="text-xs text-red-500 mt-1">
              {error}
            </div>
          )}
        </div>

        {/* 时间戳 */}
        <div className={`text-xs mt-1 ${isSelf ? 'text-right' : 'text-left'} ${
          isSelf ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {new Date(timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  )
} 