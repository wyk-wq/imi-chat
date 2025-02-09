import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher'

// 处理好友请求的接受/拒绝
export async function PUT(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1]
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

    const { requestId, action } = await req.json()
    const userId = parseInt(decoded.userId)

    // 查找好友请求
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        from: {
          select: {
            id: true,
            username: true
          }
        },
        to: {
          select: {
            id: true,
            username: true
          }
        }
      }
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: 'Not Found', message: '好友请求不存在' },
        { status: 404 }
      )
    }

    // 验证请求接收者是当前用户
    if (friendRequest.toId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: '无权处理此请求' },
        { status: 403 }
      )
    }

    if (action === 'accept') {
      // 接受好友请求
      await prisma.$transaction(async (tx) => {
        // 更新请求状态
        await tx.friendRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' }
        })

        // 创建双向好友关系
        await tx.contact.createMany({
          data: [
            { userId: friendRequest.fromId, contactId: friendRequest.toId },
            { userId: friendRequest.toId, contactId: friendRequest.fromId }
          ]
        })
      })

      // 通知发送者请求被接受
      await pusherServer.trigger(`private-user-${friendRequest.fromId}`, 'friend-request-accepted', {
        type: 'friend-request-accepted',
        message: `${friendRequest.to.username} 接受了您的好友请求`,
        contact: friendRequest.to
      })

      return NextResponse.json({ message: '已添加好友' })
    } else if (action === 'reject') {
      // 拒绝好友请求
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      })

      // 通知发送者请求被拒绝
      await pusherServer.trigger(`private-user-${friendRequest.fromId}`, 'friend-request-rejected', {
        type: 'friend-request-rejected',
        message: `${friendRequest.to.username} 拒绝了您的好友请求`
      })

      return NextResponse.json({ message: '已拒绝好友请求' })
    }

    return NextResponse.json(
      { error: 'Bad Request', message: '无效的操作' },
      { status: 400 }
    )
  } catch (error) {
    console.error('处理好友请求失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '处理好友请求失败' },
      { status: 500 }
    )
  }
}

// 获取好友请求列表
export async function GET(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1]
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

    const userId = parseInt(decoded.userId)

    const requests = await prisma.friendRequest.findMany({
      where: {
        toId: userId,
        status: 'PENDING'
      },
      include: {
        from: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('获取好友请求失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '获取好友请求失败' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic' 