import { NextApiRequest, NextApiResponse } from 'next'
import { serverPusher } from '@/utils/pusher'
import { PrismaClient } from '@prisma/client'
import { getServerTime } from '@/utils/time'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { content, senderId, receiverId, isPrivate } = req.body
    const currentTime = await getServerTime()

    // 创建消息记录
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId,
        isPrivate,
        createdAt: new Date(currentTime.replace('+08:00', 'Z')),
        isRead: false,
        revoked: false
      },
      include: {
        sender: true,
        receiver: true
      }
    })

    // 确定消息频道
    const channel = isPrivate 
      ? `private-chat-${senderId}-${receiverId}` 
      : 'public-chat'

    // 通过 Pusher 发送消息
    await serverPusher.trigger(channel, 'new-message', {
      ...message,
      timestamp: message.createdAt.toISOString()
    })

    res.status(200).json(message)
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ message: 'Error sending message' })
  }
} 