import { useEffect, useState } from 'react'
import { clientPusher } from '@/utils/pusher'
import type { Message, User } from '@prisma/client'

interface ChatProps {
  userId: number
  receiverId?: number
  isPrivate?: boolean
}

export default function Chat({ userId, receiverId, isPrivate }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    // 订阅公共或私人聊天频道
    const channel = isPrivate 
      ? `private-chat-${userId}-${receiverId}`
      : 'public-chat'
    
    const pusherChannel = clientPusher.subscribe(channel)
    
    // 监听新消息
    pusherChannel.bind('new-message', (message: Message) => {
      setMessages(prev => [...prev, message])
      // 如果是私聊消息且接收者是当前用户，标记为已读
      if (message.isPrivate && message.receiverId === userId) {
        markAsRead(message.id)
      }
    })

    // 监听消息撤回
    pusherChannel.bind('message-revoked', ({ messageId, content }: { messageId: number, content: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content, revoked: true }
          : msg
      ))
    })

    // 监听消息已读状态
    pusherChannel.bind('message-read', ({ messageId }: { messageId: number }) => {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, isRead: true }
          : msg
      ))
    })

    // 加载历史消息
    fetchMessages()

    return () => {
      pusherChannel.unbind_all()
      pusherChannel.unsubscribe()
    }
  }, [userId, receiverId, isPrivate])

  // 发送消息函数
  const sendMessage = async (content: string) => {
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          senderId: userId,
          receiverId,
          isPrivate: !!receiverId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // 获取历史消息
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages?${new URLSearchParams({
        isPrivate: String(!!receiverId),
        ...(receiverId && { receiverId: String(receiverId) })
      })}`)
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  // 撤回消息
  const revokeMessage = async (messageId: number) => {
    try {
      const response = await fetch('/api/chat/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          senderId: userId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Error revoking message:', error)
    }
  }

  // 标记消息为已读
  const markAsRead = async (messageId: number) => {
    try {
      await fetch('/api/chat/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          userId
        })
      })
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  return (
    // 聊天界面组件
    <div>
      {/* 消息列表 */}
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.senderId === userId ? 'sent' : 'received'}`}>
            <div className="message-content">
              {message.revoked ? (
                <span className="revoked">{message.content}</span>
              ) : (
                <>
                  <p>{message.content}</p>
                  {message.senderId === userId && !message.revoked && (
                    <button onClick={() => revokeMessage(message.id)}>撤回</button>
                  )}
                  {message.isPrivate && message.senderId === userId && (
                    <span className="read-status">
                      {message.isRead ? '已读' : '未读'}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* 发送消息表单 */}
      <form onSubmit={/* 处理发送消息 */}>
        {/* 表单内容 */}
      </form>
    </div>
  )
} 