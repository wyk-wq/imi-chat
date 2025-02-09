'use client'
import { useState, useRef, useEffect } from 'react'
import { Image, Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string, imageUrl?: string) => void
  placeholder?: string
  isPrivateChat?: boolean
}

export default function ChatInput({ onSend, placeholder = '输入消息...', isPrivateChat = false }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 处理粘贴事件
  const handlePaste = async (e: ClipboardEvent) => {
    // 获取剪贴板内容
    const items = e.clipboardData?.items
    if (!items) return

    // 检查是否有图片
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        // 处理图片
        const file = item.getAsFile()
        if (file) {
          await handleFileUpload(file)
          return
        }
      }
    }

    // 如果没有图片，让默认粘贴行为处理文本
  }

  // 统一的文件上传处理
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
      const uploadUrl = isPrivateChat ? 'https://images.seanbow.me/upload' : '/api/upload'

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: isPrivateChat ? {} : {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('图片上传失败')
      }

      const data = await response.json()
      
      let imageUrl = ''
      if (isPrivateChat) {
        // 私聊使用 images.seanbow.me
        if (data?.[0]?.src) {
          imageUrl = `https://images.seanbow.me/file/${data[0].src.split('/').pop()}`
        }
      } else {
        // 大厅使用 Cloudflare R2
        if (data?.url) {
          imageUrl = data.url
        }
      }

      if (imageUrl) {
        onSend('', imageUrl)
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      alert('图片上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleFileUpload(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 添加事件监听器
  useEffect(() => {
    const input = inputRef.current
    if (input) {
      input.addEventListener('paste', handlePaste)

      return () => {
        input.removeEventListener('paste', handlePaste)
      }
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSend(message)
      setMessage('')
    }
  }

  return (
    <div className="border-t bg-white">
      <div className="max-w-screen-xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
          {/* 文件上传按钮 */}
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="上传图片"
            >
              <Image 
                className="w-6 h-6 text-blue-500" 
                strokeWidth={2.5}
              />
            </button>
          </div>

          {/* 消息输入框 */}
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={uploading ? '图片上传中...' : placeholder}
              disabled={uploading}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          {/* 发送按钮 */}
          <button
            type="submit"
            disabled={!message.trim() || uploading}
            className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:bg-blue-300 transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </form>

        {/* 上传提示 */}
        {uploading && (
          <div className="px-4 pb-2">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
              正在上传图片...
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 