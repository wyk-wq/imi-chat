import { NextApiRequest, NextApiResponse } from 'next'
import { serverPusher } from '@/utils/pusher'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { content, senderId, receiverId, isPrivate } = req.body

    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId,
        isPrivate
      },
      include: {
        sender: true,
        receiver: true
      }
    })

    // 使用 Pusher 发送消息
    const channel = isPrivate ? `private-chat-${senderId}-${receiverId}` : 'public-chat'
    await serverPusher.trigger(channel, 'new-message', message)

    res.status(200).json(message)
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ message: 'Error sending message' })
  }
} 