import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || 'all'
    const sender = searchParams.get('sender') || ''
    const receiver = searchParams.get('receiver') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    // 构建查询条件
    const where = {
      AND: [
        // 内容搜索
        search ? {
          content: {
            contains: search
          }
        } : {},
        // 消息类型筛选
        type === 'file' ? {
          fileUrl: {
            not: null
          }
        } : type === 'text' ? {
          fileUrl: null
        } : type === 'private' ? {
          isPrivate: true
        } : type === 'public' ? {
          isPrivate: false
        } : {},
        // 发送者筛选
        sender ? {
          sender: {
            username: {
              contains: sender
            }
          }
        } : {},
        // 接收者筛选
        receiver ? {
          receiver: {
            username: {
              contains: receiver
            }
          }
        } : {},
        // 日期范围筛选
        startDate ? {
          createdAt: {
            gte: new Date(startDate)
          }
        } : {},
        endDate ? {
          createdAt: {
            lte: new Date(endDate + 'T23:59:59')
          }
        } : {}
      ]
    }

    // 获取总数
    const total = await prisma.message.count({ where })

    // 获取分页数据
    const messages = await prisma.message.findMany({
      where,
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
        createdAt: 'desc'
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    return NextResponse.json({
      messages,
      total,
      page,
      pageSize
    })
  } catch (error) {
    console.error('获取消息列表失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '获取消息列表失败' },
      { status: 500 }
    )
  }
} 