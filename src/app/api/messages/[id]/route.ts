import { NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function DELETE(
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

    const messageId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // 检查消息是否存在
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Not Found', message: '消息不存在' },
        { status: 404 }
      )
    }

    // 检查是否是消息发送者
    if (message.senderId !== parseInt(decoded.userId)) {
      return NextResponse.json(
        { error: 'Forbidden', message: '无权操作此消息' },
        { status: 403 }
      )
    }

    if (action === 'delete') {
      // 删除消息
      await prisma.message.delete({
        where: { id: messageId }
      })

      // 通过 Pusher 广播删除事件
      await pusherServer.trigger('chat-public', 'message-deleted', {
        messageId
      })
    } else {
      // 撤回消息
      await prisma.message.update({
        where: { id: messageId },
        data: { revoked: true }
      })

      // 通过 Pusher 广播撤回事件
      await pusherServer.trigger('chat-public', 'message-revoked', {
        messageId
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Message operation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: '操作失败'
      },
      { status: 500 }
    )
  }
} 