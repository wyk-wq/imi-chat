import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

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

    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.userId) },
      select: {
        id: true,
        username: true,
        email: true,
        status: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Not Found', message: '用户不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '获取用户信息失败' },
      { status: 500 }
    )
  }
} 