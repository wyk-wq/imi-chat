'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient } from '@/lib/pusher'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'
import ClearChatButton from '@/components/ClearChatButton'

interface Message {
  id: number
  content: string
  sender: {
    id: number
    username: string
  }
  createdAt: string
  revoked?: boolean
}

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([])
  const [user, setUser] = useState<{ id: number; username: string } | null>(null)
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      const token = localStorage.getItem('token')
      
      if (!userStr || !token) {
        router.push('/auth/login')
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)

      // 获取 Pusher 客户端实例
      const pusherClient = getPusherClient()
      
      // 订阅公共频道
      const channel = pusherClient.subscribe('chat-public')
      
      // 监听新消息
      channel.bind('new-message', (message: Message) => {
        setMessages(prev => [...prev, message])
        scrollToBottom()
      })

      // 获取历史消息
      fetchMessages()

      // 清理函数
      return () => {
        channel.unbind_all()
        pusherClient.unsubscribe('chat-public')
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      const response = await fetch('/api/messages', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()
      if (data?.messages) {
        setMessages(data.messages)
        scrollToBottom()
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleSend = async (content: string, imageUrl?: string) => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      let messageContent = content
      
      // 如果是图片消息，使用 markdown 格式
      if (imageUrl) {
        messageContent = `![image](${imageUrl})`
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: messageContent,
          isPrivate: false
        })
      })

      if (!response.ok) {
        throw new Error('发送消息失败')
      }

      // 消息会通过 Pusher 自动更新到界面
    } catch (error) {
      console.error('发送消息失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([]) // 清空本地消息
  }

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部标题栏 */}
      <div className="bg-white shadow-sm px-4 py-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">聊天大厅</h1>
        <ClearChatButton onClear={handleClearChat} />
      </div>

      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto p-4" ref={messagesEndRef}>
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[70%] ${message.sender.id === user?.id ? 'bg-blue-500 text-white' : 'bg-gray-100'} rounded-lg p-3`}>
              {!message.sender.id === user?.id && (
                <div className="text-sm text-gray-600 mb-1">{message.sender.username}</div>
              )}
              
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    img: ({ node, ...props }) => (
                      <Image
                        src={props.src || ''}
                        alt={props.alt || ''}
                        width={400}
                        height={300}
                        className="rounded-lg max-w-full h-auto"
                      />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              
              <div className={`text-xs mt-1 ${message.sender.id === user?.id ? 'text-blue-100' : 'text-gray-500'}`}>
                {new Date(message.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 输入区域 */}
      <div className="mt-auto">
        <ChatInput 
          onSend={handleSend}
          placeholder="在此输入消息..."
          isPrivateChat={false}
        />
      </div>
    </div>
  )
} 