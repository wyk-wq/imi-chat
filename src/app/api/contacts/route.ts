import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    // 从请求头获取 token
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 验证 token 并获取用户信息
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: '无效的 token' }, { status: 401 })
    }

    // 获取联系人列表
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { userId: user.id },
          { contactId: user.id }
        ]
      },
      distinct: ['userId', 'contactId'],
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 获取联系人详细信息时去重
    const contactsMap = new Map()
    const contactsWithDetails = await Promise.all(
      contacts.map(async (contact) => {
        const targetUserId = contact.userId === user.id ? contact.contactId : contact.userId
        
        // 如果已经处理过这个用户，跳过
        if (contactsMap.has(targetUserId)) {
          return null
        }
        
        const userInfo = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: {
            id: true,
            username: true,
            status: true,
            socketId: true
          }
        })

        if (!userInfo) return null
        
        contactsMap.set(targetUserId, true)
        return {
          id: contact.id,
          contact: {
            id: userInfo.id,
            username: userInfo.username,
            status: userInfo.socketId ? 'online' : 'offline'
          }
        }
      })
    )

    // 过滤掉无效的联系人
    const validContacts = contactsWithDetails.filter(Boolean)

    return NextResponse.json(validContacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: '获取联系人列表失败' }, { status: 500 })
  }
} 