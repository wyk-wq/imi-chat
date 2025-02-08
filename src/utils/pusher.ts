import Pusher from 'pusher'
import PusherClient from 'pusher-js'

// 服务器端 Pusher 实例
export const serverPusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
})

// 客户端 Pusher 实例
export const clientPusher = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    forceTLS: true
  }
)

// 开发环境启用日志
if (process.env.NODE_ENV === 'development') {
  PusherClient.logToConsole = true
} 