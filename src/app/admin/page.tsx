'use client'
import React, { useEffect, useState } from 'react'
import { Users, MessageSquare, FileText, Clock } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalMessages: number
  totalFiles: number
  onlineUsers: number
  todayMessages: number
  activeUsers: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalMessages: 0,
    totalFiles: 0,
    onlineUsers: 0,
    todayMessages: 0,
    activeUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('获取统计数据失败')
        }

        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div>加载中...</div>
  }

  if (error) {
    return <div className="text-red-500">错误：{error}</div>
  }

  const statCards = [
    {
      title: '总用户数',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: '总消息数',
      value: stats.totalMessages,
      icon: MessageSquare,
      color: 'bg-green-500'
    },
    {
      title: '文件数量',
      value: stats.totalFiles,
      icon: FileText,
      color: 'bg-yellow-500'
    },
    {
      title: '在线用户',
      value: stats.onlineUsers,
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: '今日消息',
      value: stats.todayMessages,
      icon: Clock,
      color: 'bg-pink-500'
    },
    {
      title: '活跃用户',
      value: stats.activeUsers,
      icon: Users,
      color: 'bg-indigo-500'
    }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">后台管理系统</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow p-6 flex items-center space-x-4"
          >
            <div className={`p-3 rounded-lg ${card.color}`}>
              <card.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 欢迎信息 */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">欢迎使用后台管理系统</h2>
        <p className="text-gray-600">
          这里是系统的管理中心，您可以在这里管理用户和消息。使用左侧的导航菜单访问不同的功能模块。
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">快速导航</h3>
            <ul className="space-y-2">
              <li>
                <a href="/admin/users" className="text-blue-500 hover:underline">用户管理</a>
              </li>
              <li>
                <a href="/admin/messages" className="text-blue-500 hover:underline">消息管理</a>
              </li>
            </ul>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">系统信息</h3>
            <ul className="space-y-2 text-gray-600">
              <li>系统版本：1.0.0</li>
              <li>最后更新：{new Date().toLocaleDateString()}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 