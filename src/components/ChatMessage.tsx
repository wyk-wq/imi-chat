interface ChatMessageProps {
  message: {
    id: number
    content: string
    sender: {
      id: number
      username: string
    }
    createdAt: string
    revoked?: boolean
    isPrivate?: boolean
  }
  isOwnMessage: boolean
}

export default function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  // 检查是否是图片消息
  const isImageMessage = message.content.startsWith('![image](') && message.content.endsWith(')')
  
  // 如果是图片消息，提取图片URL
  const getImageUrl = (content: string) => {
    const match = content.match(/!\[image\]\((.*?)\)/)
    return match ? match[1] : null
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-100'} rounded-lg p-3`}>
        {!isOwnMessage && (
          <div className="text-sm text-gray-600 mb-1">{message.sender.username}</div>
        )}
        
        {isImageMessage ? (
          <div className="message-image">
            <img 
              src={getImageUrl(message.content)} 
              alt="聊天图片" 
              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(getImageUrl(message.content)!, '_blank')}
            />
          </div>
        ) : (
          <div className="break-words">{message.content}</div>
        )}
        
        <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          {new Date(message.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
} 