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

    // 获取当前用户的联系人列表
    const contacts = await prisma.contact.findMany({
      where: { userId: parseInt(decoded.userId) },
      select: { contactId: true }
    })

    const contactIds = contacts.map(contact => contact.contactId)

    // 获取所有用户及其状态
    const users = await prisma.user.findMany({
      where: {
        id: { not: parseInt(decoded.userId) } // 排除当前用户
      },
      select: {
        id: true,
        username: true,
        status: true
      },
      orderBy: {
        username: 'asc'
      }
    })

    // 添加 isContact 标记
    const usersWithContactStatus = users.map(user => ({
      ...user,
      isContact: contactIds.includes(user.id),
      status: user.status || 'offline'  // 确保总是有状态值
    }))

    // 获取在线用户数量
    const onlineCount = await prisma.user.count({
      where: { status: 'online' }
    })

    console.log('Users with status:', usersWithContactStatus) // 添加调试日志

    return NextResponse.json({
      users: usersWithContactStatus,
      onlineCount: users.filter(user => user.status === 'online').length
    })
  } catch (error) {
    console.error('获取在线用户失败:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '获取在线用户失败' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic' 