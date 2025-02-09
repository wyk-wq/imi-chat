'use client'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface ClearChatButtonProps {
  isPrivate?: boolean
  targetUserId?: number
  onClear: () => void
}

export default function ClearChatButton({ isPrivate, targetUserId, onClear }: ClearChatButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleClear = async () => {
    if (!isConfirming) {
      setIsConfirming(true)
      setTimeout(() => setIsConfirming(false), 3000)
      return
    }

    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('未登录')
      }

      const response = await fetch('/api/messages/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isPrivate,
          targetUserId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '清除失败')
      }

      onClear()
      setIsConfirming(false)
    } catch (error) {
      console.error('Failed to clear messages:', error)
      alert(error instanceof Error ? error.message : '清除失败，请重试')
    } finally {
      setIsLoading(false)
      setIsConfirming(false)  // 重置确认状态
    }
  }

  return (
    <button
      onClick={handleClear}
      disabled={isLoading}
      className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-colors ${
        isConfirming
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <Trash2 className="w-4 h-4" />
      {isLoading ? '清除中...' : isConfirming ? '确认清除？' : '清除记录'}
    </button>
  )
} 