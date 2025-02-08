import { io } from 'socket.io-client'

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'https://imi-chat-git-main-wykseans-projects.vercel.app'
  : 'http://localhost:3000'

const socket = io(SOCKET_URL, {
  path: '/api/socketio',
  addTrailingSlash: false,
  transports: ['polling', 'websocket'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
  forceNew: true,
  withCredentials: true
})

export default socket 