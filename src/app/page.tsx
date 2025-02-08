'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      // 未登录，重定向到登录页
      router.push('/login')
    } else {
      // 已登录，重定向到聊天页
      router.push('/chat')
    }
  }, [router])

  return (
    <div>
      <p>正在加载...</p>
    </div>
  )
}
