import { io } from 'socket.io-client'

const socket = io({
  path: '/api/socketio',
  addTrailingSlash: false,
  transports: ['polling', 'websocket'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
  forceNew: true
})

export default socket 