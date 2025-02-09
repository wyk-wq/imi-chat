import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      console.log('认证失败：缺少 token')
      return NextResponse.json(
        { error: 'Unauthorized', code: 'NO_TOKEN', message: '请先登录' },
        { status: 401 }
      )
    }

    const decoded = await verifyAuth(token)
    if (!decoded) {
      console.log('认证失败：token 验证失败')
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN', message: 'token 无效或已过期' },
        { status: 401 }
      )
    }

    // 确保返回的消息格式正确
    const messages = await db.message.findMany({
      where: {
        OR: [
          {
            senderId: parseInt(decoded.userId),
            receiverId: parseInt(params.userId),
            isPrivate: true
          },
          {
            senderId: parseInt(params.userId),
            receiverId: parseInt(decoded.userId),
            isPrivate: true
          }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // 改为升序，这样前端就不需要 reverse
      }
    })

    return NextResponse.json({
      messages,
      timestamp: new Date().toISOString(),
      total: messages.length
    })
  } catch (error) {
    console.error('获取消息失败:', error)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// POST 路由
export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyAuth(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    const message = await db.message.create({
      data: {
        content,
        senderId: parseInt(decoded.userId),
        receiverId: parseInt(params.userId),
        isPrivate: true
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true
          }
        }
      }
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error in POST /api/messages/private/[userId]:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 