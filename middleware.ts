import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { 
  publicRoutes, 
  authRoutes, 
  DEFAULT_LOGIN_REDIRECT,
  protectedRoutes,
  apiRoutes 
} from './app/routes'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')

  // API路由的特殊处理
  if (pathname.startsWith('/api/')) {
    // 跳过认证API的token检查
    if (pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }

    // 其他API需要token
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // 页面路由处理
  if (token && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, request.url))
  }

  if (!token && !publicRoutes.includes(pathname)) {
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    )
    
    if (isProtectedRoute) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/:path*'
  ]
} 