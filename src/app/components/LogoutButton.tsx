'use client'

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      // 调用登出API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      // 清理本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // 直接重定向到登录页面
      router.push('/auth/login')
      
      // 强制刷新页面以确保所有状态都被清理
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="text-red-500 hover:text-red-600 font-medium"
    >
      退出登录
    </button>
  )
} 