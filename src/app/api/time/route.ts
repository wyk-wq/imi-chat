import { NextResponse } from 'next/server'

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

export async function GET() {
  try {
    const response = await fetch('https://time.448106.xyz/', {
      next: { revalidate: 0 } // 禁用缓存
    })
    const data: TimeResponse = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching time:', error)
    // 如果 API 调用失败，返回服务器时间
    const now = new Date()
    now.setHours(now.getHours() + 8) // 调整为北京时间
    
    return NextResponse.json({
      local: {
        datetime: now.toISOString()
      }
    })
  }
} 