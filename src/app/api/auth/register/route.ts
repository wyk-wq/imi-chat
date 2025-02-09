import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json()

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUsername) {
      return NextResponse.json(
        { message: '用户名已被使用' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      })

      if (existingEmail) {
        return NextResponse.json(
          { message: '邮箱已被注册' },
          { status: 400 }
        )
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建新用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        status: 'offline'
      }
    })

    return NextResponse.json({ 
      message: '注册成功',
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        status: user.status
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: '注册失败' },
      { status: 500 }
    )
  }
} 