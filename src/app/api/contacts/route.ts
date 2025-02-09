import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher'

// 添加调试日志
console.log('Prisma instance:', !!prisma)

// 确保 prisma 实例正确导入
if (!prisma) {
  throw new Error('Prisma client is not initialized')
}

export async function POST(req: Request) {
  try {
    console.log('开始处理添加好友请求')
    
    const token = req.headers.get('Authorization')?.split(' ')[1]
    console.log('Token:', !!token) // 不要打印完整token
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      )
    }

    const decoded = await verifyAuth(token)
    console.log('Decoded token:', decoded)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'token 无效或已过期' },
        { status: 401 }
      )
    }

    const body = await req.json()
    console.log('Request body:', body)
    
    const { contactId } = body
    const fromId = parseInt(decoded.userId)
    console.log('FromId:', fromId, 'ContactId:', contactId)

    try {
      // 检查用户是否存在
      const toUser = await prisma.user.findUnique({
        where: { id: contactId }
      })
      console.log('Target user:', toUser)

      if (!toUser) {
        return NextResponse.json(
          { error: 'Not Found', message: '用户不存在' },
          { status: 404 }
        )
      }

      // 检查是否已经是好友
      console.log('检查是否已经是好友')
      const existingContact = await prisma.contact.findFirst({
        where: {
          OR: [
            { userId: fromId, contactId },
            { userId: contactId, contactId: fromId }
          ]
        }
      })
      console.log('Existing contact:', existingContact)

      if (existingContact) {
        return NextResponse.json(
          { error: 'Conflict', message: '已经是好友了' },
          { status: 409 }
        )
      }

      // 检查是否已经发送过请求
      console.log('检查是否已经发送过请求')
      try {
        const existingRequest = await prisma.friendRequest.findFirst({
          where: {
            OR: [
              { fromId, toId: contactId },
              { fromId: contactId, toId: fromId }
            ]
          }
        })
        console.log('Existing request:', existingRequest)

        if (existingRequest) {
          return NextResponse.json(
            { error: 'Conflict', message: '已经发送过好友请求' },
            { status: 409 }
          )
        }
      } catch (error) {
        console.error('检查好友请求失败:', error)
        if (error.code === 'P2021') {
          console.log('FriendRequest table does not exist')
          // 表不存在，可以继续创建
        } else {
          throw error
        }
      }

      // 创建好友请求
      console.log('创建好友请求')
      const friendRequest = await prisma.friendRequest.create({
        data: {
          fromId,
          toId: contactId
        },
        include: {
          from: {
            select: {
              id: true,
              username: true
            }
          }
        }
      })
      console.log('Created friend request:', friendRequest)

      // 通过 Pusher 发送好友请求通知
      console.log('发送Pusher通知')
      await pusherServer.trigger(`private-user-${contactId}`, 'friend-request', {
        type: 'friend-request',
        request: {
          id: friendRequest.id,
          from: friendRequest.from,
          createdAt: friendRequest.createdAt
        }
      })

      return NextResponse.json({ message: '好友请求已发送' })
    } catch (dbError) {
      console.error('数据库操作错误:', dbError)
      throw dbError
    }
  } catch (error) {
    console.error('发送好友请求失败:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '发送好友请求失败' },
      { status: 500 }
    )
  }
}

// 获取联系人列表
export async function GET(req: Request) {
  try {
    // 获取并验证 token
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

    const userId = parseInt(decoded.userId)

    // 获取用户的所有联系人
    const contacts = await prisma.contact.findMany({
      where: {
        userId: userId
      },
      include: {
        contact: {
          select: {
            id: true,
            username: true,
            status: true
          }
        }
      }
    })

    // 转换数据格式
    const formattedContacts = contacts.map(contact => ({
      id: contact.contact.id,
      username: contact.contact.username,
      status: contact.contact.status
    }))

    return NextResponse.json({ contacts: formattedContacts })
  } catch (error) {
    console.error('Failed to fetch contacts:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: '获取联系人失败' },
      { status: 500 }
    )
  }
} 