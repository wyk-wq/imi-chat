import { NextApiRequest, NextApiResponse } from 'next'
import { serverPusher } from '@/utils/pusher'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { messageId, userId } = req.body

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: true }
    })

    if (!message || message.receiverId !== userId) {
      return res.status(403).json({ message: '无权标记此消息' })
    }

    // 更新消息已读状态
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true }
    })

    // 通知发送者消息已读
    if (message.isPrivate) {
      const channel = `private-chat-${message.senderId}-${message.receiverId}`
      await serverPusher.trigger(channel, 'message-read', {
        messageId,
        readBy: userId
      })
    }

    res.status(200).json(updatedMessage)
  } catch (error) {
    console.error('Error marking message as read:', error)
    res.status(500).json({ message: 'Error marking message as read' })
  }
} 