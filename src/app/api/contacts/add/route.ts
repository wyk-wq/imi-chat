import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    // 验证 token
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: '无效的 token' }, { status: 401 })
    }

    // 获取要添加的联系人用户名
    const { username } = await request.json()

    // 查找要添加的用户
    const contactUser = await prisma.user.findUnique({
      where: { username }
    })

    if (!contactUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    if (contactUser.id === user.id) {
      return NextResponse.json({ error: '不能添加自己为联系人' }, { status: 400 })
    }

    // 检查是否已经是联系人
    const existingContact = await prisma.contact.findFirst({
      where: {
        OR: [
          {
            AND: [
              { userId: user.id },
              { contactId: contactUser.id }
            ]
          },
          {
            AND: [
              { userId: contactUser.id },
              { contactId: user.id }
            ]
          }
        ]
      }
    })

    if (existingContact) {
      return NextResponse.json({ error: '该用户已经是你的联系人' }, { status: 400 })
    }

    // 添加联系人关系（只添加一条记录）
    const newContact = await prisma.contact.create({
      data: {
        userId: user.id,
        contactId: contactUser.id,
        createdAt: new Date()
      }
    })

    // 返回新添加的联系人信息
    return NextResponse.json({
      id: newContact.id,
      contact: {
        id: contactUser.id,
        username: contactUser.username,
        status: contactUser.socketId ? 'online' : 'offline'
      }
    })
  } catch (error) {
    console.error('Error adding contact:', error)
    return NextResponse.json({ error: '添加联系人失败' }, { status: 500 })
  }
} 