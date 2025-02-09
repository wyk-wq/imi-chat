import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher'

export async function POST(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = await verifyAuth(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { content, toId } = await req.json()
    const fromId = parseInt(decoded.userId)

    const message = await prisma.privateMessage.create({
      data: {
        content,
        fromId,
        toId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true
          }
        }
      }
    })

    // 通知接收者
    await pusherServer.trigger(
      `private-chat-${toId}-${fromId}`,
      'new-message',
      message
    )

    return NextResponse.json(message)
  } catch (error) {
    console.error('Failed to send private message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = await verifyAuth(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const url = new URL(req.url)
    const toId = url.searchParams.get('toId')
    const fromId = parseInt(decoded.userId)

    if (!toId) {
      return NextResponse.json(
        { error: 'Missing toId parameter' },
        { status: 400 }
      )
    }

    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { fromId, toId: parseInt(toId) },
          { fromId: parseInt(toId), toId: fromId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Failed to fetch private messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 