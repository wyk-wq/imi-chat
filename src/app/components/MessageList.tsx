'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  id: number
  content: string
  senderId: number
  receiverId: number | null
  createdAt: string
}

export default function MessageList() {
  const [messages, setMessages] = useState<Message[]>([])
  const router = useRouter()

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/messages/private', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()
      if (!data.messages) {
        throw new Error('Invalid response format')
      }

      setMessages(data.messages)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  return (
    <div className="flex flex-col space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="p-4 bg-white rounded-lg shadow">
          <p>{message.content}</p>
          <span className="text-sm text-gray-500">
            {new Date(message.createdAt).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
} 