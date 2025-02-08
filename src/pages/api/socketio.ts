import { Server as ServerIO } from 'socket.io'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as NetServer } from 'http'
import { Socket as NetSocket } from 'net'

interface SocketServer extends NetServer {
  io?: ServerIO
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

const SocketHandler = async (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (req.method !== 'GET') {
    res.status(400).json({ error: 'Invalid method' })
    return
  }

  if (res.socket.server.io) {
    console.log('Socket is already running')
    res.end()
    return
  }

  const io = new ServerIO(res.socket.server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? 'https://imi-chat-git-main-wykseans-projects.vercel.app'
        : 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['polling', 'websocket'],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    }
  })

  res.socket.server.io = io

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)
    
    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
    
    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', reason)
    })
  })

  console.log('Setting up socket')
  res.end()
}

export default SocketHandler

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true
  }
} 