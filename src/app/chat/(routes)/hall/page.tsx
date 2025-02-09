'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient } from '@/lib/pusher'
import ReactMarkdown from 'react-markdown'
import { Clipboard, File, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ErrorAlert } from '@/app/components/ErrorAlert'
import { FriendRequest } from '@/app/components/FriendRequest'
import { FileUpload } from '@/components/FileUpload'
import { FileMessage } from '@/components/FileMessage'
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
  fileUrl?: string
  fileName?: string
  fileType?: string
  fileSize?: number
}

interface User {
  id: number
  username: string
  status: string
}

// 添加状态类型
type UserStatus = 'online' | 'offline' | 'busy'

interface OnlineUsersResponse {
  users: (User & { isContact: boolean })[]
  onlineCount: number
}

// 添加好友关系状态接口
interface Contact {
  id: number
  userId: number
  contactId: number
}

interface FriendRequest {
  id: number
  from: {
    id: number
    username: string
  }
  createdAt: string
}

const ALLOWED_FILE_TYPES = {
  // 文档
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  // 压缩包
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  // 文本
  'text/plain': '.txt',
  // 图片
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif'
}

export default function ChatHall() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<(User & { isContact: boolean })[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [onlineCount, setOnlineCount] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [message, setMessage] = useState<string>('')
  const [showMessage, setShowMessage] = useState(false)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const USERS_PER_PAGE = 10
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      })
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchOnlineUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      const response = await fetch('/api/users/online', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error('Failed to fetch online users')
      }

      const data: OnlineUsersResponse = await response.json()
      setOnlineUsers(data.users)
      setOnlineCount(data.onlineCount)
    } catch (error) {
      console.error('Failed to fetch online users:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token || !user?.id) return

      const response = await fetch(`/api/contacts?userId=${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch contacts')
      }

      const data = await response.json()
      if (Array.isArray(data)) {
        setContacts(data)
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    }
  }

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
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch messages')
      }

      const data = await response.json()
      if (data?.messages) {
        setMessages(data.messages)
        scrollToBottom()
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      throw error
    }
  }

  const fetchFriendRequests = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/friend-requests', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setFriendRequests(data)
      }
    } catch (error) {
      console.error('获取好友请求失败:', error)
    }
  }

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const userStr = localStorage.getItem('user')
        const token = localStorage.getItem('token')
        
        if (!userStr || !token) {
          setIsInitializing(false)
          router.push('/auth/login')
          return
        }

        const userData = JSON.parse(userStr)
        let currentUserData = userData // 声明一个变量来存储最新的用户数据
        
        try {
          // 获取最新的用户信息
          const userResponse = await fetch('/api/users/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
          
          if (userResponse.ok) {
            const latestUserData = await userResponse.json()
            setUser(latestUserData)
            // 更新本地存储的用户信息
            localStorage.setItem('user', JSON.stringify(latestUserData))
            currentUserData = latestUserData // 更新当前用户数据
          } else {
            setUser(userData)
            currentUserData = userData
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error)
          setUser(userData)
          currentUserData = userData
        }

        // 获取新的 Pusher 客户端实例
        const client = getPusherClient()
        
        // 订阅公共频道
        const channel = client.subscribe('chat-public')
        
        // 监听新消息
        channel.bind('new-message', (message: Message) => {
          setMessages(prev => {
            const messageExists = prev.some(m => m.id === message.id)
            if (messageExists) {
              return prev
            }
            return [...prev, message]
          })
          scrollToBottom()
        })

        // 监听消息撤回和删除
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

        // 获取初始数据
        try {
          const [messagesData, onlineUsersData] = await Promise.all([
            fetchMessages(),
            fetchOnlineUsers(),
            fetchContacts(),
            fetchFriendRequests()
          ])

          // 添加调试日志
          console.log('Initial user data:', currentUserData)
          console.log('Online users data:', onlineUsersData)
        } catch (error) {
          console.error('Failed to fetch data:', error)
        }

        setIsInitializing(false)

        // 清理函数
        return () => {
          client.unsubscribe('chat-public')
          client.disconnect()
        }
      } catch (error) {
        console.error('Failed to initialize:', error)
        setIsInitializing(false)
      }
    }

    initializeUser()
  }, [])

  // 使用单独的 useEffect 处理重定向
  useEffect(() => {
    if (!isInitializing && !user) {
      router.push('/auth/login')
    }
  }, [isInitializing, user, router])

  // 使用单独的 useEffect 处理私人频道订阅
  useEffect(() => {
    if (!user?.id) return;

    const client = getPusherClient();
    const privateChannel = client.subscribe(`private-user-${user.id}`);
    
    privateChannel.bind('friend-request', (data: {
      type: string;
      request: {
        id: number;
        from: {
          id: number;
          username: string;
        };
        createdAt: string;
      };
    }) => {
      setMessage(`收到来自 ${data.request.from.username} 的好友请求`);
      setShowMessage(true);
    });

    privateChannel.bind('friend-request-accepted', (data: {
      type: string;
      message: string;
      contact: User;
    }) => {
      setMessage(data.message);
      setShowMessage(true);
      fetchContacts();
    });

    privateChannel.bind('friend-request-rejected', (data: {
      type: string;
      message: string;
    }) => {
      setMessage(data.message);
      setShowMessage(true);
    });

    return () => {
      if (user?.id) {
        client.unsubscribe(`private-user-${user.id}`);
      }
    };
  }, [user?.id]); // 只在 user.id 改变时重新订阅

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      if (selectedFile) {
        // 上传文件
        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (!uploadResponse.ok) {
          throw new Error('文件上传失败')
        }

        const fileData = await uploadResponse.json()

        // 发送文件消息
        const messageResponse = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: `📎 **${fileData.name}**\n\n[点击下载](${fileData.url})`,
            fileUrl: fileData.url,
            fileName: fileData.name,
            fileType: fileData.type,
            fileSize: fileData.size,
            isFile: true
          })
        })

        if (!messageResponse.ok) {
          throw new Error('发送消息失败')
        }

        // 清除选择的文件
        setSelectedFile(null)
      } else if (newMessage.trim()) {
        // 发送文本消息
        const messageResponse = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: newMessage })
        })

        if (!messageResponse.ok) {
          throw new Error('发送消息失败')
        }
      }

      setNewMessage('')
    } catch (error) {
      console.error('Send error:', error)
      setError(error instanceof Error ? error.message : '发送失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeMessage = async (messageId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to revoke message')
      }
    } catch (error) {
      console.error('Failed to revoke message:', error)
      setError(error instanceof Error ? error.message : 'Failed to revoke message')
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  // 添加状态处理函数
  const handleStatusChange = async (newStatus: UserStatus) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/status', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // 更新本地用户状态
        setUser(prev => prev ? { ...prev, status: newStatus } : null)
        
        // 更新在线用户列表中的状态
        setOnlineUsers(prev => 
          prev.map(u => 
            u.id === user?.id 
              ? { ...u, status: newStatus }
              : u
          )
        )

        // 可以添加一个成功提示
        setMessage(`状态已更新为${
          newStatus === 'online' ? '在线' :
          newStatus === 'busy' ? '忙碌' : '离线'
        }`)
        setShowMessage(true)
        setTimeout(() => setShowMessage(false), 3000)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      setError('更新状态失败')
    }
  }

  // 添加删除消息处理函数
  const handleDeleteMessage = async (messageId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const response = await fetch(`/api/messages/${messageId}?action=delete`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete message')
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete message')
    }
  }

  // 添加键盘事件处理
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // 添加图片上传处理函数
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      // 使用我们的代理 API 而不是直接请求图片服务器
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

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

  // 修改添加好友处理函数
  const handleAddContact = async (contactId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '发送好友请求失败')
      }

      const data = await response.json()
      setMessage(data.message)
      setShowMessage(true)

      // 更新在线用户列表中的好友状态
      setOnlineUsers(prev =>
        prev.map(user =>
          user.id === contactId
            ? { ...user, isContact: true }
            : user
        )
      )
    } catch (error) {
      console.error('Failed to add contact:', error)
      setError(error instanceof Error ? error.message : '发送好友请求失败')
      setShowMessage(true)
    }
  }

  // 添加检查是否是好友的函数
  const isContact = (userId: number) => {
    if (!Array.isArray(contacts)) return false;
    return contacts.some(contact => contact.contactId === userId);
  }

  // 修改 useEffect 中的调用时机
  useEffect(() => {
    if (user) {
      fetchContacts()
    }
  }, [user]) // 依赖于 user

  // 在组件中添加过滤函数
  const filteredUsers = onlineUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 添加私聊处理函数
  const handlePrivateChat = (targetUser: User) => {
    router.push(`/chat/private/${targetUser.id}`)
  }

  // 处理文件选择
  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  // 清除选择的文件
  const handleClearFile = () => {
    setSelectedFile(null)
  }

  // 修改消息渲染部分
  const renderMessage = (message: Message) => {
    const isSelf = message.sender.id === user?.id

    return (
      <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isSelf ? 'bg-blue-500 text-white' : 'bg-white'
        }`}>
          <div className={`text-xs mb-1 ${isSelf ? 'text-right' : 'text-left'} ${
            isSelf ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {message.sender.username}
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a 
                    {...props} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`${
                      isSelf ? 'text-blue-100' : 'text-blue-500'
                    } hover:underline`}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p {...props} className="mb-1" />
                ),
                strong: ({ node, ...props }) => (
                  <strong {...props} className={
                    isSelf ? 'text-blue-100' : 'text-gray-700'
                  } />
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          <div className={`text-xs mt-1 ${isSelf ? 'text-right' : 'text-left'} ${
            isSelf ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {new Date(message.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    )
  }

  const handleClearChat = () => {
    setMessages([]) // 清空本地消息
  }

  // 显示加载状态
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载...</p>
        </div>
      </div>
    )
  }

  // 不在这里调用 router.push，而是通过 useEffect 处理
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => setError(null)}
        />
      )}
      {/* 添加消息提示 */}
      {showMessage && (
        <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {message}
        </div>
      )}

      {/* 左侧用户面板 */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white border-r flex flex-col transition-all duration-300`}>
        {/* 用户信息 */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{user?.username}</h2>
              <div className="flex items-center mt-1">
                <select
                  value={user?.status}
                  onChange={(e) => handleStatusChange(e.target.value as UserStatus)}
                  className={`text-sm bg-transparent border-none focus:ring-0 ${
                    user?.status === 'online' 
                      ? 'text-green-500' 
                      : user?.status === 'busy'
                      ? 'text-yellow-500'
                      : 'text-gray-500'
                  }`}
                >
                  <option value="online" className="text-green-500">在线</option>
                  <option value="busy" className="text-yellow-500">忙碌</option>
                  <option value="offline" className="text-gray-500">离线</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-red-500"
            >
              退出
            </button>
          </div>
        </div>

        {/* 折叠按钮 */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 ml-64 top-4 bg-white rounded-r-md p-1 shadow-md hover:bg-gray-100 transition-transform duration-300"
          style={{
            transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-248px)',
          }}
        >
          <svg
            className={`w-4 h-4 transform ${isSidebarOpen ? 'rotate-0' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 在线用户列表 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              在线用户
            </h3>
            <Link
              href="/chat/contacts"
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              我的好友
            </Link>
          </div>

          {/* 搜索框 */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
            {filteredUsers
              .slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE)
              .map((onlineUser) => (
                <div
                  key={onlineUser.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group cursor-pointer"
                  onClick={() => handlePrivateChat(onlineUser)}
                >
                  <div className="flex items-center">
                    <div className="relative">
                      <span 
                        className={`block w-2.5 h-2.5 rounded-full ${
                          onlineUser.status === 'online' 
                            ? 'bg-green-500 ring-4 ring-green-100' 
                            : onlineUser.status === 'busy'
                            ? 'bg-yellow-500 ring-4 ring-yellow-100'
                            : 'bg-gray-400 ring-4 ring-gray-100'
                        }`}
                      />
                      <span className="absolute left-0 -bottom-1 w-2 h-2 bg-current rounded-full opacity-75 animate-ping hidden group-hover:block" />
                    </div>
                    <span className="text-sm ml-3">{onlineUser.username}</span>
                    <span className="text-xs text-gray-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onlineUser.status === 'online' 
                        ? '在线' 
                        : onlineUser.status === 'busy'
                        ? '忙碌'
                        : '离线'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePrivateChat(onlineUser)
                      }}
                      className="text-xs text-blue-500 hover:text-blue-600 px-2 py-1 rounded"
                    >
                      私聊
                    </button>
                    {!onlineUser.isContact && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddContact(onlineUser.id)
                        }}
                        className="text-xs text-blue-500 hover:text-blue-600"
                      >
                        添加好友
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* 分页控制 */}
          {filteredUsers.length > USERS_PER_PAGE && (
            <div className="flex justify-center mt-4 space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm bg-gray-100 rounded-lg disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1 text-sm">
                {page} / {Math.ceil(filteredUsers.length / USERS_PER_PAGE)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(filteredUsers.length / USERS_PER_PAGE)}
                className="px-3 py-1 text-sm bg-gray-100 rounded-lg disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </div>

        {/* 好友请求列表 */}
        {friendRequests.length > 0 && (
          <div className="mt-6 pb-4">
            <div className="px-4 mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                好友请求
                <span className="ml-2 text-xs text-gray-500">
                  ({friendRequests.length})
                </span>
              </h3>
            </div>
            <div className="space-y-2">
              {friendRequests.map((request) => (
                <FriendRequest
                  key={request.id}
                  request={request}
                  onAccept={() => {
                    fetchFriendRequests()
                    fetchContacts()
                  }}
                  onReject={() => {
                    fetchFriendRequests()
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天室标题 */}
        <div className="bg-white shadow-sm px-4 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-900">聊天大厅</h1>
            <span className="ml-2 text-sm text-gray-500">({onlineCount} 人在线)</span>
          </div>
          <ClearChatButton onClear={handleClearChat} />
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 space-y-2">
            {messages.map((message) => (
              <div
                key={`${message.id}-${message.sender.id}-${Date.parse(message.createdAt)}`}
                className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'} group mb-4`}
              >
                {message.sender.id !== user?.id && (
                  <div className="flex-shrink-0 mr-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                      {message.sender.username[0]}
                    </div>
                  </div>
                )}
                <div className="flex flex-col max-w-[70%]">
                  {message.sender.id !== user?.id && (
                    <div className="text-xs text-gray-500 mb-1 ml-1">
                      {message.sender.username}
                    </div>
                  )}
                  <div
                    className={`relative rounded-lg px-4 py-2 text-sm ${
                      message.sender.id === user?.id
                        ? 'bg-blue-500 text-white rounded-tr-none'
                        : 'bg-white text-gray-900 rounded-tl-none'
                    } shadow-sm`}
                  >
                    {message.revoked ? (
                      <div className="italic text-gray-500">此消息已撤回</div>
                    ) : (
                      <div className="prose prose-sm max-w-none break-words">
                        <ReactMarkdown
                          components={{
                            img: ({ node, ...props }) => {
                              const isFirstImage = messages.findIndex(m => 
                                m.content.includes(props.src || '') && m.content.includes('![')
                              ) === messages.length - 1;

                              return (
                                <span className="block relative w-full max-w-md my-2">
                                  <Image
                                    {...props}
                                    alt={props.alt || ''}
                                    width={400}
                                    height={300}
                                    sizes="(max-width: 768px) 100vw, 400px"
                                    className="rounded-lg object-contain"
                                    priority={isFirstImage}
                                    loading={isFirstImage ? 'eager' : 'lazy'}
                                  />
                                </span>
                              );
                            },
                            p: ({ children }) => <span className="block mb-4">{children}</span>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    <div className={`text-xs mt-1 ${
                      message.sender.id === user?.id ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className={`mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex justify-${
                    message.sender.id === user?.id ? 'end' : 'start'
                  } space-x-1`}>
                    <button
                      onClick={() => handleCopyMessage(message.content)}
                      className="p-1 rounded bg-white shadow-sm hover:bg-gray-100 text-gray-500 text-xs flex items-center"
                      title="复制"
                    >
                      <Clipboard className="w-3 h-3 mr-1" />
                      复制
                    </button>
                    {message.sender.id === user?.id && !message.revoked && (
                      <button
                        onClick={() => handleRevokeMessage(message.id)}
                        className="p-1 rounded bg-white shadow-sm hover:bg-gray-100 text-gray-500 text-xs flex items-center"
                        title="撤回"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        撤回
                      </button>
                    )}
                    {message.sender.id === user?.id && (
                      <>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 rounded bg-white shadow-sm hover:bg-gray-100 text-red-500 text-xs flex items-center"
                          title="删除"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {message.sender.id === user?.id && (
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                      {user.username[0]}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 消息输入框 */}
        <div className="bg-white border-t px-4 py-3">
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
              </div>
              <div className="flex space-x-2">
                <FileUpload 
                  onFileSelect={handleFileSelect}
                  onClearFile={handleClearFile}
                  accept={Object.keys(ALLOWED_FILE_TYPES).join(',')}
                  maxSize={50 * 1024 * 1024}
                  selectedFile={selectedFile}
                />
                <button
                  type="submit"
                  disabled={isLoading || (!newMessage.trim() && !selectedFile)}
                  className={`px-6 py-2 rounded-lg text-sm font-medium text-white ${
                    isLoading || (!newMessage.trim() && !selectedFile)
                      ? 'bg-gray-400'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isLoading ? '发送中...' : '发送'}
                </button>
              </div>
            </div>
          </form>
          <div className="mt-1 text-xs text-gray-500">
            提示：Enter 发送消息，Shift + Enter 换行
          </div>
        </div>
      </div>
    </div>
  )
} 