import { NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      )
    }

    const decoded = await verifyAuth(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'token 无效或已过期' },
        { status: 401 }
      )
    }

    // 获取公共消息
    const messages = await prisma.message.findMany({
      where: {
        isPrivate: false,
        revoked: false // 不获取已撤回的消息
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
      },
      take: 100 // 限制返回最近的100条消息
    })

    return NextResponse.json({
      messages: messages.map(message => ({
        ...message,
        createdAt: message.createdAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('获取消息失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '获取消息失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      )
    }

    const decoded = await verifyAuth(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'token 无效或已过期' },
        { status: 401 }
      )
    }

    const { content, fileUrl, fileName, fileType, fileSize } = await request.json()
    const userId = Number(decoded.userId)

    // 创建消息
    const message = await prisma.message.create({
      data: {
        content,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        isPrivate: false,
        isRead: false,
        sender: {  // 使用 sender 而不是 senderId
          connect: {
            id: userId
          }
        }
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

    // 使用 Pusher 广播消息
    await pusherServer.trigger('chat-public', 'new-message', {
      ...message,
      createdAt: message.createdAt.toISOString()
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('发送消息失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '发送消息失败' },
      { status: 500 }
    )
  }
} 