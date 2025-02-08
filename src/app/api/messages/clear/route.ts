import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyAuth } from '@/utils/auth'

const prisma = new PrismaClient()

export async function DELETE(request: Request) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chatType = searchParams.get('type')
    const contactUsername = searchParams.get('contact')

    if (chatType === 'private' && contactUsername) {
      // 清除私聊消息
      const contact = await prisma.user.findUnique({
        where: { username: contactUsername }
      })

      if (!contact) {
        return NextResponse.json({ error: '找不到联系人' }, { status: 404 })
      }

      // 删除与特定用户的私聊记录
      await prisma.message.deleteMany({
        where: {
          isPrivate: true,
          OR: [
            {
              AND: [
                { senderId: user.id },
                { receiverId: contact.id }
              ]
            },
            {
              AND: [
                { senderId: contact.id },
                { receiverId: user.id }
              ]
            }
          ]
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: `已清除与 ${contactUsername} 的聊天记录` 
      })
    } else if (chatType === 'public') {
      // 删除公共聊天记录
      await prisma.message.deleteMany({
        where: {
          isPrivate: false
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: '已清除公共聊天记录' 
      })
    }

    return NextResponse.json({ error: '无效的请求参数' }, { status: 400 })
  } catch (error) {
    console.error('Error clearing messages:', error)
    return NextResponse.json({ error: '清除聊天记录失败' }, { status: 500 })
  }
} 