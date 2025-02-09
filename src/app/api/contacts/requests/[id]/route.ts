import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { action } = await request.json()
    const requestId = parseInt(params.id)

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

    if (action === 'accept') {
      // 创建双向好友关系
      await prisma.$transaction([
        prisma.contact.create({
          data: {
            userId: friendRequest.fromId,
            contactId: friendRequest.toId
          }
        }),
        prisma.contact.create({
          data: {
            userId: friendRequest.toId,
            contactId: friendRequest.fromId
          }
        }),
        prisma.friendRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' }
        })
      ])

      // 通知发送请求的用户
      await pusherServer.trigger(`private-user-${friendRequest.fromId}`, 'friend-request-accepted', {
        type: 'friend-request-accepted',
        message: `${friendRequest.to.username} 接受了您的好友请求`,
        contact: friendRequest.to
      })
    } else {
      // 拒绝请求
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      })

      // 通知发送请求的用户
      await pusherServer.trigger(`private-user-${friendRequest.fromId}`, 'friend-request-rejected', {
        type: 'friend-request-rejected',
        message: `${friendRequest.to.username} 拒绝了您的好友请求`
      })
    }

    return NextResponse.json({ 
      success: true,
      message: action === 'accept' ? '已接受好友请求' : '已拒绝好友请求'
    })
  } catch (error) {
    console.error('处理好友请求失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '处理好友请求失败' },
      { status: 500 }
    )
  }
} 