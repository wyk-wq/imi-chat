import { NextApiRequest, NextApiResponse } from 'next'
import { serverPusher } from '@/utils/pusher'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { messageId, senderId } = req.body

    // 查找消息
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message || message.senderId !== senderId) {
      return res.status(403).json({ message: '无权撤回此消息' })
    }

    // 检查是否在5分钟内
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (message.createdAt < fiveMinutesAgo) {
      return res.status(400).json({ message: '只能撤回5分钟内的消息' })
    }

    // 更新消息状态
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { 
        content: '此消息已被撤回',
        revoked: true
      },
      include: {
        sender: true,
        receiver: true
      }
    })

    // 通过 Pusher 发送撤回通知
    const channel = message.isPrivate 
      ? `private-chat-${message.senderId}-${message.receiverId}`
      : 'public-chat'

    await serverPusher.trigger(channel, 'message-revoked', {
      messageId,
      content: updatedMessage.content
    })

    res.status(200).json(updatedMessage)
  } catch (error) {
    console.error('Error revoking message:', error)
    res.status(500).json({ message: 'Error revoking message' })
  }
} 