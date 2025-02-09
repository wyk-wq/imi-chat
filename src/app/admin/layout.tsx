'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // 这里可以添加管理员验证逻辑
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
    }
    setIsAdmin(true)
  }, [router])

  if (!isAdmin) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold mb-8">后台管理系统</h1>
        <nav className="space-y-2">
          <Link 
            href="/admin/users" 
            className="block px-4 py-2 rounded hover:bg-gray-700"
          >
            用户管理
          </Link>
          <Link 
            href="/admin/messages" 
            className="block px-4 py-2 rounded hover:bg-gray-700"
          >
            消息管理
          </Link>
        </nav>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
} 