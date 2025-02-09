import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher'

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

    const { status } = await req.json()
    const userId = parseInt(decoded.userId)

    // 更新用户状态
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status }
    })

    // 通知其他用户状态变化
    await pusherServer.trigger('presence-online-users', 'user-status-changed', {
      userId,
      status
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('更新状态失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '更新状态失败' },
      { status: 500 }
    )
  }
} 