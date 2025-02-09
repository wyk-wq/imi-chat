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

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    // 构建查询条件
    const where = {
      AND: [
        {
          OR: [
            { username: { contains: search } },
            { email: { contains: search } }
          ]
        },
        status !== 'all' ? { status } : {}
      ]
    }

    // 获取总数
    const total = await prisma.user.count({ where })

    // 获取分页数据
    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    return NextResponse.json({
      users,
      total,
      page,
      pageSize
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '获取用户列表失败' },
      { status: 500 }
    )
  }
} 