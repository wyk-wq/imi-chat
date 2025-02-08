import { Server as ServerIO } from 'socket.io'
import { NextApiRequest, NextApiResponse } from 'next'

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (res.socket.server.io) {
    console.log('Socket is already running')
    res.end()
    return
  }

  const io = new ServerIO(res.socket.server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['polling', 'websocket'],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    }
  })

  res.socket.server.io = io

  io.on('connection', (socket) => {
    console.log('Client connected')
    
    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
    
    // 其他 socket 事件处理...
  })

  console.log('Setting up socket')
  res.end()
}

export default SocketHandler

export const config = {
  api: {
    bodyParser: false
  }
} 