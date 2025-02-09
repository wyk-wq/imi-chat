import { NextResponse } from 'next/server'
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
        { error: 'Invalid token', message: 'token 无效或已过期' },
        { status: 401 }
      )
    }

    // 获取今天的开始时间
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 获取各项统计数据
    const [
      totalUsers,
      totalMessages,
      totalFiles,
      onlineUsers,
      todayMessages,
      activeUsers
    ] = await Promise.all([
      // 总用户数
      prisma.user.count(),
      // 总消息数
      prisma.message.count(),
      // 文件数量
      prisma.message.count({
        where: {
          fileUrl: {
            not: null
          }
        }
      }),
      // 在线用户数
      prisma.user.count({
        where: {
          status: 'online'
        }
      }),
      // 今日消息数
      prisma.message.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),
      // 活跃用户数（今日发送过消息的用户）
      prisma.user.count({
        where: {
          sentMessages: {
            some: {
              createdAt: {
                gte: today
              }
            }
          }
        }
      })
    ])

    return NextResponse.json({
      totalUsers,
      totalMessages,
      totalFiles,
      onlineUsers,
      todayMessages,
      activeUsers
    })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '获取统计数据失败' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic' 