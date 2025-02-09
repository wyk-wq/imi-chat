import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
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

    const { isPrivate, targetUserId } = await request.json()

    if (isPrivate && targetUserId) {
      // 清除私聊记录
      await prisma.message.deleteMany({
        where: {
          OR: [
            {
              senderId: decoded.id,
              receiverId: targetUserId,
              isPrivate: true
            },
            {
              senderId: targetUserId,
              receiverId: decoded.id,
              isPrivate: true
            }
          ]
        }
      })
    } else {
      // 清除大厅聊天记录
      await prisma.message.deleteMany({
        where: {
          senderId: decoded.id,
          isPrivate: false
        }
      })
    }

    // 添加更多的日志
    console.log('Messages cleared successfully', {
      userId: decoded.id,
      isPrivate,
      targetUserId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // 改进错误处理
    console.error('Clear messages error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { 
        error: 'Failed to clear messages',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 