'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Contact {
  id: number
  username: string
  status: string
}

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        const response = await fetch('/api/contacts', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth/login')
            return
          }
          throw new Error('Failed to fetch contacts')
        }

        const data = await response.json()
        setContacts(data.contacts || [])
      } catch (error) {
        console.error('Failed to fetch contacts:', error)
        setError('获取联系人失败')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContacts()
  }, [router])

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">加载中...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-blue-500 hover:text-blue-600"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">我的好友</h1>
        <Link
          href="/chat/hall"
          className="text-blue-500 hover:text-blue-600"
        >
          返回聊天大厅
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          还没有好友，去聊天大厅找找新朋友吧！
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex items-center">
                <div className="relative">
                  <span className={`block w-2.5 h-2.5 rounded-full ${
                    contact.status === 'online' 
                      ? 'bg-green-500 ring-4 ring-green-100' 
                      : contact.status === 'busy'
                      ? 'bg-yellow-500 ring-4 ring-yellow-100'
                      : 'bg-gray-400 ring-4 ring-gray-100'
                  }`} />
                </div>
                <span className="ml-3 text-gray-900">{contact.username}</span>
              </div>
              <div className="flex space-x-2">
                <Link
                  href={`/chat/private/${contact.id}`}
                  className="px-4 py-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  发送消息
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 