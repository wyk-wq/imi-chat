export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    // 处理发送消息
    socket.on('send_message', async (data) => {
      try {
        const message = await prisma.message.create({
          data: {
            content: data.content,
            senderId: socket.data.userId, // 确保已经设置了用户ID
            isPrivate: data.isPrivate,
          },
        });
        
        // 只广播一次
        io.emit('new_message', message);
      } catch (error) {
        console.error('消息处理错误:', error);
        socket.emit('error', '消息发送失败');
      }
    });
  });
}; 