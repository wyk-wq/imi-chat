'use client'
import React, { useEffect, useState, Fragment } from 'react'
import { format } from 'date-fns'
import { Search, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface Message {
  id: number
  content: string
  sender: {
    id: number
    username: string
  }
  receiver?: {
    id: number
    username: string
  }
  createdAt: string
  isPrivate: boolean
  isRead: boolean
  revoked: boolean
  fileName?: string
  fileSize?: number
  fileType?: string
  fileUrl?: string
}

interface PaginatedResponse {
  messages: Message[]
  total: number
  page: number
  pageSize: number
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [messageType, setMessageType] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [senderUsername, setSenderUsername] = useState('')
  const [receiverUsername, setReceiverUsername] = useState('')

  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  const fetchMessages = async (
    currentPage: number,
    search: string,
    type: string,
    sender: string,
    receiver: string,
    startDate: string,
    endDate: string
  ) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        search,
        type,
        sender,
        receiver,
        startDate,
        endDate
      })

      const response = await fetch(`/api/admin/messages?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('获取消息列表失败')
      }

      const data: PaginatedResponse = await response.json()
      setMessages(data.messages)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = debounce((value: string) => {
    setPage(1)
    fetchMessages(1, value, messageType, senderUsername, receiverUsername, dateRange.start, dateRange.end)
  }, 500)

  useEffect(() => {
    fetchMessages(
      page,
      searchTerm,
      messageType,
      senderUsername,
      receiverUsername,
      dateRange.start,
      dateRange.end
    )
  }, [page, pageSize, messageType, dateRange.start, dateRange.end])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    debouncedSearch(value)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const totalPages = Math.ceil(total / pageSize)

  if (loading) {
    return <div>加载中...</div>
  }

  if (error) {
    return <div className="text-red-500">错误：{error}</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">消息管理</h1>

      {/* 搜索和筛选区域 */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="搜索消息内容..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部类型</option>
            <option value="text">文本消息</option>
            <option value="file">文件消息</option>
            <option value="private">私聊消息</option>
            <option value="public">公共消息</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">10条/页</option>
            <option value="20">20条/页</option>
            <option value="50">50条/页</option>
          </select>
        </div>

        <div className="flex gap-4">
          <input
            type="text"
            placeholder="发送者用户名"
            value={senderUsername}
            onChange={(e) => setSenderUsername(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="接收者用户名"
            value={receiverUsername}
            onChange={(e) => setReceiverUsername(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1 flex gap-2 items-center">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span>至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 表格区域 */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">发送者</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">接收者</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">文件</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {messages.map(message => (
              <tr key={message.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{message.id}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate">{message.content}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {message.sender.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {message.receiver?.username || '公共消息'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(message.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {message.isPrivate && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        私聊
                      </span>
                    )}
                    {message.isRead && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        已读
                      </span>
                    )}
                    {message.revoked && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        已撤回
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {message.fileName ? (
                    <a 
                      href={message.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {message.fileName}
                    </a>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页区域 */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          共 {total} 条记录，第 {page}/{totalPages} 页
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className={`p-2 rounded ${
              page === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .map((p, i, arr) => (
              <Fragment key={p}>
                {i > 0 && arr[i - 1] !== p - 1 && (
                  <span className="px-2 text-gray-400">...</span>
                )}
                <button
                  onClick={() => handlePageChange(p)}
                  className={`px-3 py-1 rounded ${
                    p === page
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              </Fragment>
            ))}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className={`p-2 rounded ${
              page === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
} 