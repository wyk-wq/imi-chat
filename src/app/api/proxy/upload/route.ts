import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    
    const response = await fetch('https://images.seanbow.me/upload', {
      method: 'POST',
      body: formData
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Upload proxy error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
} 