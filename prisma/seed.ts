import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 清理现有数据
  await prisma.message.deleteMany()
  await prisma.session.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.user.deleteMany()

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('123456', 10)
  
  const user1 = await prisma.user.create({
    data: {
      username: 'user1',
      password: hashedPassword,
      email: 'user1@example.com',
      status: 'online'
    }
  })

  const user2 = await prisma.user.create({
    data: {
      username: 'user2',
      password: hashedPassword,
      email: 'user2@example.com',
      status: 'online'
    }
  })

  // 创建联系人关系
  await prisma.contact.create({
    data: {
      userId: user1.id,
      contactId: user2.id
    }
  })

  // 创建一些测试消息
  await prisma.message.create({
    data: {
      content: '你好，这是一条测试消息',
      senderId: user1.id,
      receiverId: user2.id,
      isPrivate: true,
      isRead: false,
      createdAt: new Date()
    }
  })

  await prisma.message.create({
    data: {
      content: '这是一条群聊消息',
      senderId: user2.id,
      isPrivate: false,
      isRead: true,
      createdAt: new Date()
    }
  })

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 