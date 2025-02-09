import { useState, useCallback, useRef } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'
import { 
  InitMultipartUploadResponse, 
  PartUploadResponse, 
  CompleteMultipartUploadResponse,
  UploadPart 
} from '@/types/upload'

interface MultipartUploadProps {
  onUploadComplete: (fileData: CompleteMultipartUploadResponse) => void
  onUploadError: (error: string) => void
  maxConcurrent?: number
  chunkSize?: number
  maxRetries?: number
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_MAX_CONCURRENT = 3
const DEFAULT_MAX_RETRIES = 3

export function MultipartUpload({
  onUploadComplete,
  onUploadError,
  maxConcurrent = DEFAULT_MAX_CONCURRENT,
  chunkSize = DEFAULT_CHUNK_SIZE,
  maxRetries = DEFAULT_MAX_RETRIES
}: MultipartUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 用于存储上传状态的 refs
  const uploadStateRef = useRef<{
    uploadId?: string
    key?: string
    parts: UploadPart[]
    chunks: Blob[]
    uploadedChunks: Set<number>
    failedChunks: Map<number, number> // chunk number -> retry count
  }>({
    parts: [],
    chunks: [],
    uploadedChunks: new Set(),
    failedChunks: new Map()
  })

  // 初始化分片上传
  const initUpload = async (file: File) => {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/upload/multipart/init', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type
      })
    })

    if (!response.ok) {
      throw new Error('初始化上传失败')
    }

    const data: InitMultipartUploadResponse = await response.json()
    return data
  }

  // 上传单个分片
  const uploadPart = async (
    chunk: Blob,
    partNumber: number,
    uploadId: string,
    key: string,
    retryCount = 0
  ): Promise<UploadPart> => {
    try {
      const token = localStorage.getItem('token')
      const arrayBuffer = await chunk.arrayBuffer()
      
      const response = await fetch(`/api/upload/multipart/${uploadId}/${partNumber}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key,
          body: Array.from(new Uint8Array(arrayBuffer))
        })
      })

      if (!response.ok) {
        throw new Error('上传分片失败')
      }

      const data: PartUploadResponse = await response.json()
      return {
        partNumber: data.partNumber,
        etag: data.etag
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        // 递归重试
        return uploadPart(chunk, partNumber, uploadId, key, retryCount + 1)
      }
      throw error
    }
  }

  // 完成分片上传
  const completeUpload = async (
    uploadId: string,
    key: string,
    parts: UploadPart[],
    file: File
  ) => {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/upload/multipart/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uploadId,
        key,
        parts,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })
    })

    if (!response.ok) {
      throw new Error('完成上传失败')
    }

    return await response.json()
  }

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
      // 将文件分片并存储
      const chunks: Blob[] = []
      let offset = 0
      while (offset < file.size) {
        chunks.push(file.slice(offset, offset + chunkSize))
        offset += chunkSize
      }
      uploadStateRef.current.chunks = chunks
    }
  }

  // 开始上传
  const startUpload = useCallback(async () => {
    if (!selectedFile) return

    try {
      setIsUploading(true)
      setError(null)
      setUploadProgress(0)

      // 初始化上传
      const { uploadId, key } = await initUpload(selectedFile)
      uploadStateRef.current.uploadId = uploadId
      uploadStateRef.current.key = key

      // 并发上传分片
      const uploadPromises: Promise<void>[] = []
      const totalChunks = uploadStateRef.current.chunks.length

      const uploadNextChunk = async () => {
        while (uploadStateRef.current.uploadedChunks.size < totalChunks) {
          // 找到下一个未上传的分片
          const nextChunkIndex = uploadStateRef.current.chunks.findIndex(
            (_, index) => !uploadStateRef.current.uploadedChunks.has(index)
          )

          if (nextChunkIndex === -1) break

          try {
            const part = await uploadPart(
              uploadStateRef.current.chunks[nextChunkIndex],
              nextChunkIndex + 1,
              uploadId,
              key
            )

            uploadStateRef.current.parts[nextChunkIndex] = part
            uploadStateRef.current.uploadedChunks.add(nextChunkIndex)
            
            // 更新进度
            setUploadProgress(
              (uploadStateRef.current.uploadedChunks.size / totalChunks) * 100
            )
          } catch (error) {
            uploadStateRef.current.failedChunks.set(
              nextChunkIndex,
              (uploadStateRef.current.failedChunks.get(nextChunkIndex) || 0) + 1
            )
            throw error
          }
        }
      }

      // 启动并发上传
      for (let i = 0; i < maxConcurrent; i++) {
        uploadPromises.push(uploadNextChunk())
      }

      // 等待所有分片上传完成
      await Promise.all(uploadPromises)

      // 完成上传
      const result = await completeUpload(
        uploadId,
        key,
        uploadStateRef.current.parts,
        selectedFile
      )

      onUploadComplete(result)
      setSelectedFile(null)
      setUploadProgress(0)
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : '上传失败')
      onUploadError(error instanceof Error ? error.message : '上传失败')
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, maxConcurrent, onUploadComplete, onUploadError])

  // 取消上传
  const cancelUpload = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    setError(null)
    uploadStateRef.current = {
      parts: [],
      chunks: [],
      uploadedChunks: new Set(),
      failedChunks: new Map()
    }
  }

  return (
    <div className="w-full">
      {/* 文件选择区域 */}
      <div className="mb-4">
        <input
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${
            isUploading ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
          }`}
        >
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              {selectedFile ? selectedFile.name : '点击选择文件'}
            </p>
          </div>
        </label>
      </div>

      {/* 上传进度 */}
      {isUploading && (
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-600">上传进度</span>
            <span className="text-sm text-gray-600">
              {Math.round(uploadProgress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex space-x-2">
        {selectedFile && !isUploading && (
          <button
            onClick={startUpload}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            开始上传
          </button>
        )}
        {(selectedFile || isUploading) && (
          <button
            onClick={cancelUpload}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            disabled={isUploading}
          >
            取消
          </button>
        )}
      </div>
    </div>
  )
} 