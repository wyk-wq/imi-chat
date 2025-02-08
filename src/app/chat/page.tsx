'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import io, { Socket } from 'socket.io-client'
import styles from './chat.module.css'
import { formatMessageTime, getLocalTime } from '@/utils/time'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import copy from 'copy-to-clipboard'

interface User {
  id: number
  username: string
  email?: string
}

interface Contact {
  id: number
  contact: {
    id: number
    username: string
    status: string
  }
}

interface Message {
  id: number
  content: string
  senderId: number
  receiverId?: number
  timestamp: string
  createdAt: string
  sender: User
  isPrivate: boolean
  isRead: boolean
  revoked: boolean
}

export default function Chat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [newContact, setNewContact] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState<{[key: string]: number}>({})
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'busy'>('online')
  const typingTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({})
  const userInitialized = useRef(false)
  const socketInitialized = useRef(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('获取联系人列表失败')
      }

      const data = await response.json()
      setContacts(data)
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    if (!storedUser || !token) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(storedUser)
    console.log('Current user from localStorage:', parsedUser)

    if (!userInitialized.current) {
      setUser(parsedUser)
      userInitialized.current = true
    }

    const initSocket = async () => {
      if (socketInitialized.current) return
      socketInitialized.current = true

      try {
        console.log('Initializing socket connection...')
        socketRef.current = io({
          path: '/api/socketio',
          auth: { token },
          transports: ['websocket', 'polling'],
        })

        socketRef.current.on('connect', () => {
          console.log('Socket connected successfully')
          setIsConnected(true)
          fetchContacts()
        })

        socketRef.current.on('contact-list', (contacts: Contact[]) => {
          console.log('Received contact list:', contacts)
          if (parsedUser?.username) {
            setContacts(prevContacts => {
              console.log('Updating contacts:', {
                previous: prevContacts,
                new: contacts
              })
              return contacts
            })
          }
        })

        socketRef.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error)
          setIsConnected(false)
        })

        socketRef.current.on('receive-message', (newMessage: Message | Message[]) => {
          if (Array.isArray(newMessage)) {
            const messagesWithTimestamp = newMessage.map(msg => ({
              ...msg,
              timestamp: msg.createdAt
            }))
            setMessages(messagesWithTimestamp)
            if (selectedContact) {
              messagesWithTimestamp.forEach(msg => {
                if (msg.isPrivate && 
                    msg.sender.username === selectedContact && 
                    !msg.isRead &&
                    msg.receiverId === user?.id) {
                  socketRef.current?.emit('mark-as-read', msg.id)
                }
              })
            }
          } else {
            setMessages(prev => [...prev, {
              ...newMessage,
              timestamp: newMessage.createdAt
            }])
            
            if (newMessage.isPrivate && 
                newMessage.sender.username === selectedContact &&
                newMessage.receiverId === user?.id) {
              socketRef.current?.emit('mark-as-read', newMessage.id)
            } else if (newMessage.isPrivate && 
                       newMessage.sender.username !== user?.username) {
              setUnreadMessages(prev => ({
                ...prev,
                [newMessage.sender.username]: (prev[newMessage.sender.username] || 0) + 1
              }))
            }
          }

          setTimeout(() => {
            messageListRef.current?.scrollTo({
              top: messageListRef.current.scrollHeight,
              behavior: 'smooth'
            })
          }, 100)
        })

        socketRef.current.on('user-connected', (username: string) => {
          setContacts(prev => 
            prev.map(contact => {
              if (!contact?.contact) return contact
              return contact.contact.username === username 
                ? { ...contact, contact: { ...contact.contact, status: 'online' } }
                : contact
            })
          )
        })

        socketRef.current.on('user-disconnected', (username: string) => {
          setContacts(prev => 
            prev.map(contact => {
              if (!contact?.contact) return contact
              return contact.contact.username === username 
                ? { ...contact, contact: { ...contact.contact, status: 'offline' } }
                : contact
            })
          )
        })

        socketRef.current.on('contact-error', (error: string) => {
          alert(error)
        })

        socketRef.current.on('user-typing', (username: string) => {
          setTypingUsers(prev => [...new Set([...prev, username])])
        })

        socketRef.current.on('user-stop-typing', (username: string) => {
          setTypingUsers(prev => prev.filter(user => user !== username))
        })

        socketRef.current.on('user-status-changed', ({ userId, status }) => {
          setContacts(prev => 
            prev.map(contact => {
              if (!contact?.contact) return contact
              return contact.contact.id === userId
                ? { ...contact, contact: { ...contact.contact, status } }
                : contact
            })
          )
        })

        socketRef.current.on('message-deleted', (messageId: number) => {
          setMessages(prev => prev.filter(msg => msg.id !== messageId))
        })

        socketRef.current.on('message-revoked', ({ id, content }: { id: number, content: string }) => {
          setMessages(prev => prev.map(msg => 
            msg.id === id ? { ...msg, content, revoked: true } : msg
          ))
        })

        socketRef.current.on('message-error', (error: string) => {
          alert(error)
        })

        socketRef.current.on('message-read', (messageId: number) => {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, isRead: true } : msg
          ))
        })

        socketRef.current.on('chat-cleared', (data: { type: 'public' | 'private', contact?: string }) => {
          if (data.type === 'private' && data.contact) {
            setMessages(prev => prev.filter(msg => 
              !(msg.isPrivate && 
                msg.sender.username === data.contact && 
                msg.receiverId === user?.id)
            ))
          } else if (data.type === 'public') {
            setMessages([])
          }
        })

      } catch (error) {
        console.error('Socket initialization error:', error)
        setIsConnected(false)
      }
    }

    if (!socketRef.current) {
      initSocket()
    }

    return () => {
      socketRef.current?.close()
      socketRef.current?.removeAllListeners()
      Object.values(typingTimeoutRef.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [router])

  useEffect(() => {
    console.log('Contacts updated:', contacts)
  }, [contacts])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && socketRef.current) {
      try {
        const currentTime = await getLocalTime()
        
        const messageData = {
          content: message,
          timestamp: currentTime,
          to: selectedContact,
          isPrivate: !!selectedContact
        }

        socketRef.current.emit('send-message', messageData)
        setMessage('')
      } catch (error) {
        console.error('Error sending message:', error)
      }
    }
  }

  const handleAddContact = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token || !newContact.trim()) return

      const response = await fetch('/api/contacts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newContact.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error)
        return
      }

      // 更新联系人列表
      setContacts(prev => [...prev, data])
      setNewContact('')
      setShowAddContact(false)

      // 通知服务器更新双方的联系人列表
      socketRef.current?.emit('contact-added', {
        contactId: data.contact.id,
        username: data.contact.username
      })
    } catch (error) {
      console.error('Error adding contact:', error)
      alert('添加联系人失败')
    }
  }

  const handleDeleteMessage = (messageId: number) => {
    if (!socketRef.current) return
    
    if (confirm('确定要删除这条消息吗？')) {
      console.log('Deleting message:', messageId)
      socketRef.current.emit('delete-message', messageId)
    }
  }

  const handleRevokeMessage = (messageId: number, timestamp: string) => {
    if (!socketRef.current) return

    const messageTime = new Date(timestamp)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    if (messageTime < fiveMinutesAgo) {
      alert('只能撤回5分钟内的消息')
      return
    }
    
    if (confirm('确定要撤回这条消息吗？')) {
      console.log('Revoking message:', messageId)
      socketRef.current.emit('revoke-message', messageId)
    }
  }

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    if (socketRef.current) {
      socketRef.current.emit('typing', selectedContact)
      
      if (typingTimeoutRef.current[selectedContact || 'group']) {
        clearTimeout(typingTimeoutRef.current[selectedContact || 'group'])
      }
      
      typingTimeoutRef.current[selectedContact || 'group'] = setTimeout(() => {
        socketRef.current?.emit('stop-typing', selectedContact)
      }, 1000)
    }
  }

  const handleStatusChange = (status: 'online' | 'away' | 'busy') => {
    if (socketRef.current) {
      socketRef.current.emit('set-status', status)
      setUserStatus(status)
    }
  }

  const clearUnreadCount = (username: string) => {
    setUnreadMessages(prev => ({
      ...prev,
      [username]: 0
    }))
  }

  const handleContactSelect = (contactUsername: string | null) => {
    setSelectedContact(contactUsername)
    if (contactUsername) {
      clearUnreadCount(contactUsername)
      messages
        .filter(msg => 
          msg.isPrivate && 
          msg.sender.username === contactUsername && 
          !msg.isRead &&
          msg.receiverId === user?.id
        )
        .forEach(msg => {
          console.log('Marking message as read:', msg.id)
          socketRef.current?.emit('mark-as-read', msg.id)
        })
    }
    
    // 加载相应的消息历史
    socketRef.current?.emit('load-messages', 
      contactUsername ? 'private' : 'public',
      contactUsername
    )
  }

  const handleCopyMessage = (content: string) => {
    copy(content)
    alert('消息已复制')
  }

  const handleClearChat = async () => {
    if (!window.confirm('确定要清除聊天记录吗？')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const chatType = selectedContact ? 'private' : 'public'
      const url = `/api/messages/clear?type=${chatType}${selectedContact ? `&contact=${selectedContact}` : ''}`

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '清除聊天记录失败')
      }

      // 清除本地消息
      setMessages([])

      // 通知其他用户（通过 socket）
      if (selectedContact) {
        socketRef.current?.emit('chat-cleared', {
          type: 'private',
          contact: selectedContact
        })
      } else {
        socketRef.current?.emit('chat-cleared', {
          type: 'public'
        })
      }
    } catch (error) {
      console.error('Error clearing chat:', error)
      alert(error.message || '清除聊天记录失败')
    }
  }

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  console.log('Rendering contacts:', contacts)
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{user?.username?.[0]?.toUpperCase()}</div>
          <div className={styles.userDetails}>
            <div className={styles.username}>{user?.username}</div>
            <select 
              value={userStatus}
              onChange={(e) => handleStatusChange(e.target.value as 'online' | 'away' | 'busy')}
              className={styles.statusSelect}
            >
              <option value="online">在线</option>
              <option value="away">离开</option>
              <option value="busy">忙碌</option>
            </select>
          </div>
        </div>

        <div className={styles.contactSection}>
          <div className={styles.contactHeader}>
            <h3>聊天列表</h3>
            <button 
              className={styles.addButton}
              onClick={() => setShowAddContact(true)}
            >
              添加
            </button>
          </div>
          
          {showAddContact && (
            <div className={styles.addContactForm}>
              <input
                type="text"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="输入用户名"
                className={styles.contactInput}
              />
              <button 
                onClick={handleAddContact}
                className={styles.submitButton}
              >
                确认
              </button>
              <button 
                onClick={() => setShowAddContact(false)}
                className={styles.cancelButton}
              >
                取消
              </button>
            </div>
          )}

          <div className={styles.contactList}>
            <div 
              className={`${styles.contact} ${!selectedContact ? styles.active : ''}`}
              onClick={() => setSelectedContact(null)}
            >
              <div className={styles.contactInfo}>
                <div className={styles.contactAvatar}>
                  <span role="img" aria-label="public">🌐</span>
                </div>
                <div className={styles.contactDetails}>
                  <span className={styles.contactName}>公共聊天室</span>
                  <span className={styles.contactStatus}>
                    {isConnected ? '在线' : '连接中...'}
                  </span>
                </div>
              </div>
            </div>

            {Array.isArray(contacts) && contacts.length > 0 ? (
              contacts.map(item => {
                if (!item?.contact?.username) return null
                
                const uniqueKey = `contact-${item.id}-${item.contact.id}`
                const isOnline = item.contact.status === 'online'
                
                return (
                  <div
                    key={uniqueKey}
                    className={`${styles.contact} ${
                      selectedContact === item.contact.username ? styles.active : ''
                    }`}
                    onClick={() => {
                      setSelectedContact(item.contact.username)
                      clearUnreadCount(item.contact.username)
                    }}
                  >
                    <div className={styles.contactInfo}>
                      <div className={styles.contactAvatar}>
                        {item.contact.username[0].toUpperCase()}
                      </div>
                      <div className={styles.contactDetails}>
                        <span className={styles.contactName}>
                          {item.contact.username}
                        </span>
                        <div className={styles.contactMeta}>
                          <span className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`} />
                          <span className={styles.contactStatus}>
                            {isOnline ? '在线' : '离线'}
                          </span>
                        </div>
                      </div>
                      {unreadMessages[item.contact.username] > 0 && (
                        <span className={styles.unreadBadge}>
                          {unreadMessages[item.contact.username]}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className={styles.noContacts}>暂无联系人</div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <div className={styles.chatTitle}>
            {selectedContact ? `与 ${selectedContact} 的私聊` : '公共聊天室'}
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={handleClearChat}
              className={styles.headerButton}
              title="清除聊天"
            >
              🗑️ 清除聊天
            </button>
            <button
              onClick={handleLogout}
              className={styles.headerButton}
              title="退出登录"
            >
              🚪 退出登录
            </button>
          </div>
          <div className={styles.status}>
            {isConnected ? '已连接' : '连接中...'}
          </div>
        </div>
        <div className={styles.messageList} ref={messageListRef}>
          {messages
            .filter(msg => {
              if (!msg || !msg.sender || !msg.sender.username) return false
              
              if (selectedContact) {
                return msg.isPrivate && (
                  (msg.sender.username === selectedContact && msg.receiverId === user?.id) ||
                  (msg.sender.username === user?.username && msg.receiverId === contacts.find(c => c.contact.username === selectedContact)?.contact.id)
                )
              } else {
                return !msg.isPrivate
              }
            })
            .map((msg) => {
              console.log('Rendering message:', msg)
              
              return (
                <div
                  key={msg.id}
                  className={`${styles.message} ${
                    msg.sender.username === user?.username ? styles.own : ''
                  }`}
                >
                  <div className={styles.messageHeader}>
                    <strong>{msg.sender.username}</strong>
                    <div className={styles.messageActions}>
                      <button
                        onClick={() => handleCopyMessage(msg.content)}
                        className={styles.actionButton}
                        title="复制消息"
                      >
                        📋
                      </button>
                      {msg.sender.username === user?.username && !msg.revoked && (
                        <>
                          <button
                            onClick={() => handleRevokeMessage(msg.id, msg.timestamp)}
                            className={styles.actionButton}
                            title="撤回消息"
                          >
                            ↩️
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className={styles.actionButton}
                            title="删除消息"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                    <span className={styles.messageTime}>
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageText}>
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.isPrivate && msg.sender.username === user?.username && (
                      <span className={styles.messageStatus}>
                        {msg.isRead ? '已读' : '未读'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
        {typingUsers.length > 0 && (
          <div className={styles.typingIndicator}>
            {typingUsers.join(', ')} 正在输入...
          </div>
        )}
        <form onSubmit={sendMessage} className={styles.inputArea}>
          <textarea
            className={styles.messageInput}
            value={message}
            onChange={handleMessageInputChange}
            placeholder={`发送消息给 ${selectedContact || '所有人'} (支持 Markdown 格式)`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(e)
              }
            }}
          />
          <button 
            type="submit" 
            className={styles.sendButton}
            disabled={!message.trim() || !isConnected}
          >
            发送
          </button>
        </form>
      </div>
    </div>
  )
} 