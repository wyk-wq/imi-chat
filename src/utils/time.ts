interface TimeResponse {
  timestamp: {
    seconds: number;
    milliseconds: number;
  };
  iso: string;
  timezone: {
    utc_offset: string;
    timezone_name: string;
  };
  utc: {
    datetime: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
  local: {
    datetime: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

// 转换时间为北京时间
function convertToChinaTime(date: Date): Date {
  try {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
    return new Date(utc + (3600000 * 8)) // 北京时间 UTC+8
  } catch (error) {
    console.error('Error converting to China time:', error)
    return date // 如果转换失败，返回原始时间
  }
}

// 获取北京时间
export async function getLocalTime(): Promise<string> {
  try {
    const response = await fetch('/api/time')
    const data: TimeResponse = await response.json()
    
    // 确保返回的是北京时间格式
    const chinaTime = new Date(data.local.datetime)
    if (isNaN(chinaTime.getTime())) {
      throw new Error('Invalid time from API')
    }
    
    return chinaTime.toISOString().replace('Z', '+08:00')
  } catch (error) {
    console.error('Error fetching time:', error)
    // 如果 API 调用失败，返回当前北京时间
    const chinaTime = convertToChinaTime(new Date())
    return chinaTime.toISOString().replace('Z', '+08:00')
  }
}

// 格式化显示时间
export function formatMessageTime(timestamp: string | undefined): string {
  if (!timestamp) {
    console.warn('Invalid timestamp:', timestamp)
    return '时间未知'
  }

  try {
    // 尝试从 createdAt 或 timestamp 获取时间
    let date: Date
    if (timestamp.includes('T')) {
      // ISO 格式的时间字符串
      date = new Date(timestamp.replace('Z', '+08:00'))
    } else {
      // 普通时间字符串
      date = new Date(timestamp)
    }

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', timestamp)
      return '时间格式错误'
    }

    const now = convertToChinaTime(new Date())
    
    // 如果是今天的消息，只显示时间
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Shanghai'
      })
    }
    
    // 如果是昨天的消息
    const yesterday = convertToChinaTime(new Date())
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Shanghai'
      })}`
    }
    
    // 其他日期显示完整日期和时间
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai'
    })
  } catch (error) {
    console.error('Error formatting time:', error, { timestamp })
    return '时间格式错误'
  }
} 