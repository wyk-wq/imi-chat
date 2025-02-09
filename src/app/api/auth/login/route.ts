import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    console.log('Login attempt for username:', username)

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Missing credentials', message: '请输入用户名和密码' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { username }
    })

    console.log('Found user:', user ? 'yes' : 'no')

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials', message: '用户名或密码错误' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    console.log('Password valid:', isPasswordValid)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials', message: '用户名或密码错误' },
        { status: 401 }
      )
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        status: 'online',
        socketId: null
      }
    })

    console.log('User logged in successfully:', updatedUser.id)

    const response = NextResponse.json({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        status: updatedUser.status
      },
      token
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
} 