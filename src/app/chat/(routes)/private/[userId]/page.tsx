'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient } from '@/lib/pusher'
import ReactMarkdown from 'react-markdown'
import { Clipboard, Smile } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import EmojiPicker from '@/components/EmojiPicker'
import { ErrorAlert } from '@/components/ErrorAlert'
import ChatInput from '@/components/ChatInput'
import ChatMessage from '@/components/ChatMessage'
import ClearChatButton from '@/components/ClearChatButton'

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

  const handleSend = async (content: string, imageUrl?: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      let messageContent = content
      
      // 如果是图片消息
      if (imageUrl) {
        messageContent = `![image](${imageUrl})`
      }

      const response = await fetch(`/api/messages/private/${params.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: messageContent,
          isPrivate: true,
          receiverId: Number(params.userId)
        })
      })

      if (!response.ok) {
        throw new Error('发送消息失败')
      }

      const data = await response.json()
      console.log('Message sent:', data)
      
      // 可选：立即添加新消息到列表
      setMessages(prev => [...prev, data])
      scrollToBottom()
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }

  const handleClearChat = () => {
    setMessages([]) // 清空本地消息
  }

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
        <div className="flex items-center gap-2">
          <ClearChatButton 
            isPrivate={true}
            targetUserId={Number(params.userId)}
            onClear={handleClearChat}
          />
          <Link
            href="/chat/contacts"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            返回好友列表
          </Link>
        </div>
      </div>

      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto p-4" ref={messagesEndRef}>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isOwnMessage={message.sender.id === user?.id}
          />
        ))}
      </div>

      {/* 输入区域 */}
      <div className="mt-auto">
        <ChatInput 
          onSend={handleSend}
          placeholder="输入消息..."
          isPrivateChat={true}
        />
      </div>
    </div>
  )
} 