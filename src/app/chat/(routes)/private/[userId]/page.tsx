'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient } from '@/lib/pusher'
import ReactMarkdown from 'react-markdown'
import { Clipboard, Smile } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import EmojiPicker from '@/app/components/EmojiPicker'
import { ErrorAlert } from '@/app/components/ErrorAlert'

interface Message {
  id: number
  content: string
  sender: {
    id: number
    username: string
  }
  receiver: {
    id: number
    username: string
  }
  createdAt: string
  revoked?: boolean
  isPrivate: boolean
}

interface User {
  id: number
  username: string
  status: string
}

export default function PrivateChat({ params }: { params: { userId: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [receiver, setReceiver] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (!userStr || !token) {
      console.log('No user data or token found')
      router.push('/auth/login')
      return
    }

    try {
      const userData = JSON.parse(userStr)
      setUser(userData)

      // 创建一个异步函数来处理初始化
      const initialize = async () => {
        try {
          // 并行执行这些请求
          await Promise.all([
            fetchReceiver(),
            fetchMessages()
          ])

          // 获取 Pusher 客户端实例
          const pusherClient = getPusherClient()
          
          // 订阅私聊频道
          const channelName = `private-chat-${userData.id}-${params.userId}`
          console.log('Subscribing to channel:', channelName)
          
          const channel = pusherClient.subscribe(channelName)
          
          channel.bind('new-message', (message: Message) => {
            console.log('Received new message:', message)
            setMessages(prev => [...prev, message])
            scrollToBottom()
          })

          channel.bind('message-revoked', (data: { messageId: number }) => {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === data.messageId 
                  ? { ...msg, revoked: true }
                  : msg
              )
            )
          })

          channel.bind('message-deleted', (data: { messageId: number }) => {
            setMessages(prev => prev.filter(msg => msg.id !== data.messageId))
          })

          // 清理函数
          return () => {
            channel.unbind_all()
            pusherClient.unsubscribe(channelName)
          }
        } catch (error) {
          console.error('Failed to initialize:', error)
          if (error instanceof Error && error.message.includes('Unauthorized')) {
            router.push('/auth/login')
          }
        }
      }

      initialize()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router, params.userId])

  const fetchReceiver = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${params.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch receiver')
      }
      const data = await response.json()
      setReceiver(data)
    } catch (error) {
      console.error('Failed to fetch receiver:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      // 使用正确的API路径
      const response = await fetch(`/api/messages/private/${params.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error(errorData.error || 'Failed to fetch messages')
      }

      const data = await response.json()
      console.log('Received messages data:', data)

      if (data?.messages && Array.isArray(data.messages)) {
        // 消息已经按正确顺序排序，不需要reverse
        setMessages(data.messages)
        scrollToBottom()
      } else {
        console.error('Invalid messages data:', data)
        throw new Error('Invalid messages format')
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        router.push('/auth/login')
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim() || isLoading) return

    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      console.log('Sending message to userId:', params.userId)
      const response = await fetch(`/api/messages/private/${params.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage,
          isPrivate: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      console.log('Message sent:', data)
      setNewMessage('')
      
      // 可选：立即添加新消息到列表
      setMessages(prev => [...prev, data])
      scrollToBottom()
    } catch (error) {
      console.error('Failed to send message:', error)
      // 可以添加错误提示 UI
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native)
    setShowEmojiPicker(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      if (data?.[0]?.src) {
        const imageUrl = `https://images.seanbow.me${data[0].src}`
        setImagePreview(imageUrl)
        setNewMessage(prev => prev + `\n![image](${imageUrl})\n`)
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
    }
  }

  // ... 其他处理函数（复制、撤回、删除等保持不变）

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部标题栏 */}
      <div className="bg-white shadow-sm px-4 py-2 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-gray-900">
            与 {receiver?.username} 的私聊
          </h1>
          <span className={`ml-2 w-2 h-2 rounded-full ${
            receiver?.status === 'online' ? 'bg-green-500' : 
            receiver?.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
          }`}></span>
        </div>
        <Link
          href="/chat/contacts"
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          返回好友列表
        </Link>
      </div>

      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender.id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-[70%] ${
                message.sender.id === user?.id ? 'bg-blue-500 text-white' : 'bg-gray-100'
              } rounded-lg px-4 py-2`}>
                {message.revoked ? (
                  <span className="text-gray-500 italic">消息已撤回</span>
                ) : (
                  <ReactMarkdown
                    className="prose prose-sm max-w-none break-words"
                    components={{
                      img: ({ node, ...props }) => (
                        <img {...props} className="max-w-full rounded-lg" />
                      )
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
                <div className={`text-xs mt-1 ${
                  message.sender.id === user?.id ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
      
      {/* 底部输入区域 */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
          {imagePreview && (
            <div className="relative w-32 h-32 group">
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                sizes="128px"
                className="object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-start space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息... (Enter 发送，Shift + Enter 换行)"
                className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none"
                style={{ 
                  minHeight: '42px',
                  maxHeight: '150px'
                }}
                rows={Math.min(5, newMessage.split('\n').length || 1)}
                disabled={isLoading}
              />
              {showEmojiPicker && (
                <EmojiPicker
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 h-[42px] flex items-center"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 h-[42px] flex items-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={isLoading || !newMessage.trim()}
                className={`px-6 py-2 rounded-lg text-sm font-medium text-white h-[42px] ${
                  isLoading || !newMessage.trim()
                    ? 'bg-gray-400'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isLoading ? '发送中...' : '发送'}
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </form>
        <div className="mt-1 text-xs text-gray-500">
          提示：Enter 发送消息，Shift + Enter 换行
        </div>
      </div>
    </div>
  )
} 