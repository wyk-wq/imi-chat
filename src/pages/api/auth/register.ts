import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' })
  }

  try {
    const { username, password, email } = req.body

    // 验证用户名是否已存在
    const existingUser = await prisma.user.findFirst({
      where: { username }
    })

    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建新用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
      }
    })

    res.status(201).json({ 
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: '注册失败，请重试' })
  }
} 