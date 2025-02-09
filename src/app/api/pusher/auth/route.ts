import { NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'
import { verifyAuth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // 从请求头获取 token
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      )
    }

    // 验证 token
    const decoded = await verifyAuth(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'token 无效或已过期' },
        { status: 401 }
      )
    }

    // 获取请求数据
    const data = await request.formData()
    const socketId = data.get('socket_id')?.toString()
    const channel = data.get('channel_name')?.toString()

    if (!socketId || !channel) {
      return NextResponse.json(
        { error: 'Bad Request', message: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 验证用户是否有权限访问该频道
    if (channel.startsWith('private-')) {
      const userId = parseInt(decoded.userId)
      
      // 检查私聊频道权限
      if (channel.startsWith('private-chat-')) {
        const [_, __, fromId, toId] = channel.split('-')
        const userIds = [parseInt(fromId), parseInt(toId)]
        if (!userIds.includes(userId)) {
          return NextResponse.json(
            { error: 'Forbidden', message: '无权访问此频道' },
            { status: 403 }
          )
        }
      }
      
      // 检查用户私有频道权限
      if (channel === `private-user-${userId}`) {
        // 允许访问自己的私有频道
      } else if (channel.startsWith('private-user-') && 
                 channel !== `private-user-${userId}`) {
        return NextResponse.json(
          { error: 'Forbidden', message: '无权访问此频道' },
          { status: 403 }
        )
      }
    }

    // 生成认证响应
    const authResponse = pusherServer.authorizeChannel(socketId, channel)
    
    return NextResponse.json(authResponse)
  } catch (error) {
    console.error('Pusher auth error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '认证失败' },
      { status: 500 }
    )
  }
} 