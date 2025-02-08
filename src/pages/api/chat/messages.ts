import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { isPrivate, receiverId } = req.query

    const messages = await prisma.message.findMany({
      where: {
        isPrivate: isPrivate === 'true',
        ...(receiverId && {
          OR: [
            {
              AND: [
                { senderId: Number(receiverId) },
                { receiverId: Number(receiverId) }
              ]
            },
            {
              AND: [
                { senderId: Number(receiverId) },
                { receiverId: Number(receiverId) }
              ]
            }
          ]
        })
      },
      include: {
        sender: true,
        receiver: true
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 50
    })

    res.status(200).json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ message: 'Error fetching messages' })
  }
} 