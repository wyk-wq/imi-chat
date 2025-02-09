'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clock } from 'lucide-react'

interface FriendRequestProps {
  request: {
    id: number
    from: {
      id: number
      username: string
    }
    createdAt: string
  }
  onAccept: () => void
  onReject: () => void
}

export function FriendRequest({ request, onAccept, onReject }: FriendRequestProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAccept = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/friend-requests', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: request.id,
          action: 'accept'
        })
      })

      if (response.ok) {
        onAccept()
      } else {
        const data = await response.json()
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('接受好友请求失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/friend-requests', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: request.id,
          action: 'reject'
        })
      })

      if (response.ok) {
        onReject()
      } else {
        const data = await response.json()
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('拒绝好友请求失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-4 mb-2 overflow-hidden bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
    >
      <div className="p-4">
        <div className="flex items-center space-x-3">
          {/* 用户头像 */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
              {request.from.username[0].toUpperCase()}
            </div>
          </div>
          
          {/* 用户信息 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {request.from.username}
            </p>
            <div className="flex items-center mt-1">
              <Clock className="w-3 h-3 text-gray-400 mr-1" />
              <p className="text-xs text-gray-500">
                {new Date(request.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="mt-4 flex justify-end space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAccept}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          >
            <Check className="w-4 h-4 mr-1" />
            接受
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReject}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <X className="w-4 h-4 mr-1" />
            拒绝
          </motion.button>
        </div>
      </div>

      {/* 加载状态指示器 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </motion.div>
  )
} 