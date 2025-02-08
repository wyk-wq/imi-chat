import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server, Socket } from 'socket.io'
import type { DefaultEventsMap } from '@socket.io/component-emitter'
import { PrismaClient } from '@prisma/client'
import { getLocalTime } from './src/utils/time'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

interface AuthenticatedSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap> {
  user?: {
    id: number;
    username: string;
  }
}

// 在应用启动前确保数据库连接
app.prepare().then(async () => {
  try {
    await prisma.$connect()
    console.log('Database connected successfully')

    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      path: '/api/socketio',
    })

    // Socket 认证中间件
    io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          return next(new Error('Authentication error'))
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string }
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        })

        if (!user) {
          return next(new Error('User not found'))
        }

        ;(socket as AuthenticatedSocket).user = { id: user.id, username: user.username }
        next()
      } catch (error) {
        next(new Error('Authentication error'))
      }
    })

    io.on('connection', async (socket: AuthenticatedSocket) => {
      if (!socket.user) return

      console.log(`User connected: ${socket.user.username}, ID: ${socket.user.id}`)
      
      try {
        // 更新用户的 socketId 和状态
        await prisma.user.update({
          where: { id: socket.user.id },
          data: { 
            socketId: socket.id,
            status: 'online'
          }
        })

        // 获取联系人列表
        const contacts = await getContactList(socket.user.id)
        console.log('Initial contacts for user:', {
          userId: socket.user.id,
          username: socket.user.username,
          contacts
        })

        // 发送联系人列表
        socket.emit('contact-list', contacts)  // 使用新的事件名称

        // 通知所有联系人该用户已上线
        contacts.forEach(async (contact) => {
          const targetSocket = Array.from(io.sockets.sockets.values())
            .find((s: any) => s.user?.id === contact.contact.id) as AuthenticatedSocket
          
          if (targetSocket) {
            const targetContacts = await getContactList(contact.contact.id)
            targetSocket.emit('contact-list', targetContacts)  // 使用新的事件名称
          }
        })

        // 加载历史消息
        socket.on('load-messages', async (chatType: 'public' | 'private', contactUsername?: string) => {
          try {
            let messages
            if (chatType === 'private' && contactUsername) {
              const contact = await prisma.user.findUnique({
                where: { username: contactUsername }
              })

              if (!contact) {
                socket.emit('message-error', '找不到联系人')
                return
              }

              // 加载私聊消息
              messages = await prisma.message.findMany({
                where: {
                  isPrivate: true,
                  OR: [
                    {
                      AND: [
                        { senderId: socket.user!.id },
                        { receiverId: contact.id }
                      ]
                    },
                    {
                      AND: [
                        { senderId: contact.id },
                        { receiverId: socket.user!.id }
                      ]
                    }
                  ]
                },
                include: {
                  sender: true,
                  receiver: true
                },
                orderBy: { createdAt: 'asc' },
                take: 50
              })
            } else {
              // 加载公共消息
              messages = await prisma.message.findMany({
                where: {
                  isPrivate: false
                },
                include: {
                  sender: true
                },
                orderBy: { createdAt: 'asc' },
                take: 50
              })
            }

            // 确保每条消息都有时间戳
            const messagesWithTimestamp = messages.map(msg => ({
              ...msg,
              timestamp: msg.createdAt.toISOString()
            }))

            socket.emit('receive-message', messagesWithTimestamp)
          } catch (error) {
            console.error('Error loading messages:', error)
            socket.emit('message-error', '加载消息失败')
          }
        })

        socket.on('send-message', async (message: any) => {
          try {
            const currentTime = await getServerTime()
            
            if (!message.content.trim()) {
              return
            }

            let savedMessage
            if (message.isPrivate && message.to) {
              // 私聊消息
              const receiver = await prisma.user.findFirst({
                where: { username: message.to }
              })

              if (!receiver) {
                socket.emit('message-error', '接收者不存在')
                return
              }

              savedMessage = await prisma.message.create({
                data: {
                  content: message.content,
                  senderId: socket.user!.id,
                  receiverId: receiver.id,
                  isPrivate: true,
                  isRead: false,
                  revoked: false,
                  createdAt: new Date(currentTime.replace('+08:00', 'Z'))
                },
                include: {
                  sender: true,
                  receiver: true
                }
              })

              const messageToSend = {
                ...savedMessage,
                timestamp: savedMessage.createdAt.toISOString()
              }

              // 发送给接收者
              if (receiver.socketId) {
                io.to(receiver.socketId).emit('receive-message', messageToSend)
              }
              // 发送给发送者
              socket.emit('receive-message', messageToSend)
            } else {
              // 群聊消息
              savedMessage = await prisma.message.create({
                data: {
                  content: message.content,
                  senderId: socket.user!.id,
                  isPrivate: false,
                  isRead: true, // 群聊消息默认已读
                  revoked: false,
                  createdAt: new Date(currentTime) // 使用标准格式的时间
                },
                include: {
                  sender: true
                }
              })

              const messageToSend = {
                ...savedMessage,
                timestamp: savedMessage.createdAt.toISOString()
              }

              io.emit('receive-message', messageToSend)
            }
          } catch (error) {
            console.error('Error sending message:', error)
            socket.emit('message-error', '消息发送失败')
          }
        })

        socket.on('delete-message', async (messageId: number) => {
          try {
            const message = await prisma.message.findUnique({
              where: { id: messageId }
            })

            if (!message || message.senderId !== socket.user!.id) {
              socket.emit('message-error', '无权删除此消息')
              return
            }

            await prisma.message.delete({
              where: { id: messageId }
            })

            // 如果是私聊消息，只通知相关用户
            if (message.isPrivate && message.receiverId) {
              const receiver = await prisma.user.findUnique({
                where: { id: message.receiverId }
              })
              
              if (receiver?.socketId) {
                io.to(receiver.socketId).emit('message-deleted', messageId)
              }
              socket.emit('message-deleted', messageId)
            } else {
              // 群聊消息广播给所有人
              io.emit('message-deleted', messageId)
            }
          } catch (error) {
            console.error('Error deleting message:', error)
            socket.emit('message-error', '删除消息失败')
          }
        })

        socket.on('revoke-message', async (messageId: number) => {
          try {
            const message = await prisma.message.findUnique({
              where: { id: messageId }
            })

            if (!message || message.senderId !== socket.user!.id) {
              socket.emit('message-error', '无权撤回此消息')
              return
            }

            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
            if (message.createdAt <= fiveMinutesAgo) {
              socket.emit('message-error', '只能撤回5分钟内的消息')
              return
            }

            const updatedMessage = await prisma.message.update({
              where: { id: messageId },
              data: { 
                content: '此消息已被撤回',
                revoked: true
              }
            })

            // 如果是私聊消息，只通知相关用户
            if (message.isPrivate && message.receiverId) {
              const receiver = await prisma.user.findUnique({
                where: { id: message.receiverId }
              })
              
              if (receiver?.socketId) {
                io.to(receiver.socketId).emit('message-revoked', {
                  id: messageId,
                  content: updatedMessage.content
                })
              }
              socket.emit('message-revoked', {
                id: messageId,
                content: updatedMessage.content
              })
            } else {
              // 群聊消息广播给所有人
              io.emit('message-revoked', {
                id: messageId,
                content: updatedMessage.content
              })
            }
          } catch (error) {
            console.error('Error revoking message:', error)
            socket.emit('message-error', '撤回消息失败')
          }
        })

        socket.on('add-contact', async (username: string) => {
          console.log(`Add contact request from ${socket.user?.username} to add ${username}`)
          try {
            const contact = await prisma.user.findUnique({
              where: { username }
            })

            if (!contact) {
              socket.emit('contact-error', '用户不存在')
              return
            }

            // 检查是否已经是联系人
            const existingContact = await prisma.contact.findFirst({
              where: {
                OR: [
                  { userId: socket.user!.id, contactId: contact.id },
                  { userId: contact.id, contactId: socket.user!.id }
                ]
              }
            })

            if (existingContact) {
              socket.emit('contact-error', '该用户已经是你的联系人')
              return
            }

            // 创建联系人关系
            await prisma.contact.create({
              data: {
                userId: socket.user!.id,
                contactId: contact.id
              }
            })

            // 获取更新后的联系人列表
            const updatedContacts = await getContactList(socket.user!.id)
            socket.emit('contact-list', updatedContacts)

            // 如果对方在线，也更新对方的联系人列表
            const targetSocket = Array.from(io.sockets.sockets.values())
              .find((s: any) => s.user?.id === contact.id) as AuthenticatedSocket
            
            if (targetSocket) {
              const targetContacts = await getContactList(contact.id)
              targetSocket.emit('contact-list', targetContacts)
            }
          } catch (error) {
            console.error('Error adding contact:', error)
            socket.emit('contact-error', '添加联系人失败')
          }
        })

        socket.on('mark-as-read', async (messageId: number) => {
          try {
            const message = await prisma.message.findUnique({
              where: { id: messageId }
            })

            if (!message || message.receiverId !== socket.user!.id) {
              console.log('Cannot mark message as read:', {
                messageId,
                userId: socket.user!.id,
                receiverId: message?.receiverId
              })
              return
            }

            console.log('Marking message as read:', messageId)

            const updatedMessage = await prisma.message.update({
              where: { id: messageId },
              data: { isRead: true }
            })

            // 通知发送者消息已读
            const sender = await prisma.user.findUnique({
              where: { id: message.senderId }
            })

            if (sender?.socketId) {
              io.to(sender.socketId).emit('message-read', messageId)
              console.log('Notified sender about read message:', {
                messageId,
                senderId: sender.id
              })
            }

            // 通知接收者（当前用户）消息已读状态更新
            socket.emit('message-read', messageId)
          } catch (error) {
            console.error('Error marking message as read:', error)
          }
        })

        socket.on('set-status', async (status: 'online' | 'away' | 'busy') => {
          try {
            await prisma.user.update({
              where: { id: socket.user!.id },
              data: { status }
            })

            io.emit('user-status-changed', {
              userId: socket.user!.id,
              status
            })
          } catch (error) {
            console.error('Error updating status:', error)
          }
        })

        socket.on('disconnect', async () => {
          if (!socket.user) return
          
          console.log(`User disconnected: ${socket.user.username}`)
          
          try {
            // 更新用户状态
            await prisma.user.update({
              where: { id: socket.user.id },
              data: { 
                socketId: null,
                status: 'offline'
              }
            })

            // 获取用户的联系人并通知他们
            const contacts = await getContactList(socket.user.id)
            contacts.forEach(async (contact) => {
              const targetSocket = Array.from(io.sockets.sockets.values())
                .find((s: any) => s.user?.id === contact.contact.id) as AuthenticatedSocket
              
              if (targetSocket) {
                const targetContacts = await getContactList(contact.contact.id)
                targetSocket.emit('contact-list', targetContacts)
              }
            })
          } catch (error) {
            console.error('Error handling disconnect:', error)
          }
        })

        socket.on('typing', (to: string | null) => {
          if (to) {
            const receiver = Array.from(io.sockets.sockets.values())
              .find(u => u.user?.username === to)
            if (receiver) {
              io.to(receiver.socketId).emit('user-typing', socket.user!.username)
            }
          } else {
            socket.broadcast.emit('user-typing', socket.user!.username)
          }
        })

        socket.on('stop-typing', (to: string | null) => {
          if (to) {
            const receiver = Array.from(io.sockets.sockets.values())
              .find(u => u.user?.username === to)
            if (receiver) {
              io.to(receiver.socketId).emit('user-stop-typing', socket.user!.username)
            }
          } else {
            socket.broadcast.emit('user-stop-typing', socket.user!.username)
          }
        })

        socket.on('contact-added', async (data: { contactId: number, username: string }) => {
          try {
            // 获取新的联系人列表
            const contacts = await getContactList(socket.user!.id)
            socket.emit('contact-list', contacts)

            // 通知被添加的用户
            const targetSocket = Array.from(io.sockets.sockets.values())
              .find((s: any) => s.user?.id === data.contactId) as AuthenticatedSocket

            if (targetSocket) {
              const targetContacts = await getContactList(data.contactId)
              targetSocket.emit('contact-list', targetContacts)
              targetSocket.emit('contact-notification', `${socket.user!.username} 已将你添加为联系人`)
            }
          } catch (error) {
            console.error('Error handling contact added:', error)
          }
        })

        socket.on('clear-chat', async (chatType: 'public' | 'private', contactUsername?: string) => {
          try {
            if (chatType === 'private' && contactUsername) {
              // 清除与特定用户的私聊消息
              const contact = await prisma.user.findUnique({
                where: { username: contactUsername }
              })

              if (!contact) {
                socket.emit('message-error', '找不到联系人')
                return
              }

              // 清除双方的私聊消息
              await prisma.message.deleteMany({
                where: {
                  isPrivate: true,
                  OR: [
                    {
                      AND: [
                        { senderId: socket.user!.id },
                        { receiverId: contact.id }
                      ]
                    },
                    {
                      AND: [
                        { senderId: contact.id },
                        { receiverId: socket.user!.id }
                      ]
                    }
                  ]
                }
              })

              // 通知对方聊天已清除
              const targetSocket = Array.from(io.sockets.sockets.values())
                .find((s: any) => s.user?.id === contact.id)
              if (targetSocket) {
                targetSocket.emit('chat-cleared', socket.user!.username)
              }
            } else {
              // 清除公共聊天消息
              await prisma.message.deleteMany({
                where: {
                  isPrivate: false
                }
              })
              
              // 通知所有用户公共聊天已清除
              io.emit('chat-cleared', 'public')
            }
          } catch (error) {
            console.error('Error clearing chat:', error)
            socket.emit('message-error', '清除聊天记录失败')
          }
        })

        socket.on('chat-cleared', (data: { type: 'public' | 'private', contact?: string }) => {
          try {
            if (data.type === 'private' && data.contact) {
              // 通知私聊对方聊天已清除
              const targetSocket = Array.from(io.sockets.sockets.values())
                .find((s: any) => s.user?.username === data.contact)
              if (targetSocket) {
                targetSocket.emit('chat-cleared', {
                  type: 'private',
                  from: socket.user!.username
                })
              }
            } else if (data.type === 'public') {
              // 通知所有用户公共聊天已清除
              socket.broadcast.emit('chat-cleared', {
                type: 'public',
                from: socket.user!.username
              })
            }
          } catch (error) {
            console.error('Error handling chat cleared:', error)
          }
        })
      } catch (error) {
        console.error('Error in connection handler:', error)
      }
    })

    server.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
  } catch (error) {
    console.error('Server initialization error:', error)
    process.exit(1)
  }
})

// 优雅关闭
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

// 辅助函数：获取用户的联系人列表
async function getContactList(userId: number) {
  console.log('Getting contacts for user:', userId)
  
  try {
    // 获取联系人关系
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { userId: userId },
          { contactId: userId }
        ]
      }
    })

    console.log('Found contact relationships:', contacts)

    if (contacts.length === 0) {
      console.log('No contacts found for user:', userId)
      return []
    }

    // 获取所有联系人的用户信息
    const contactPromises = contacts.map(async (contact) => {
      const targetUserId = contact.userId === userId ? contact.contactId : contact.userId
      const userInfo = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          username: true,
          socketId: true,
          status: true
        }
      })

      if (!userInfo) {
        console.log('Warning: User info not found for id:', targetUserId)
        return null
      }

      return {
        id: contact.id,
        contact: {
          id: userInfo.id,
          username: userInfo.username,
          status: userInfo.socketId ? 'online' : 'offline'
        }
      }
    })

    const formattedContacts = (await Promise.all(contactPromises)).filter(Boolean)
    console.log('Formatted contacts for user:', userId, formattedContacts)
    return formattedContacts
  } catch (error) {
    console.error('Error getting contacts:', error)
    return []
  }
}

// 在服务器端获取时间
async function getServerTime(): Promise<string> {
  try {
    const response = await fetch('https://time.448106.xyz/')
    const data: TimeResponse = await response.json()
    return data.local.datetime
  } catch (error) {
    console.error('Error fetching server time:', error)
    const now = new Date()
    now.setHours(now.getHours() + 8) // 调整为北京时间
    return now.toISOString()
  }
} 