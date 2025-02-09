import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { verifyAuth } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

const R2_CLIENT = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
})

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      )
    }

    const decoded = await verifyAuth(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'token 无效或已过期' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', message: '请选择文件' },
        { status: 400 }
      )
    }

    // 添加错误处理和日志
    console.log('Uploading private chat file:', {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size
    })

    const buffer = await file.arrayBuffer()
    const fileExt = file.name.split('.').pop() || ''
    const fileName = `private/${uuidv4()}${fileExt ? `.${fileExt}` : ''}`

    // 上传文件
    const putCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: Buffer.from(buffer),
      ContentType: file.type || 'application/octet-stream',
      Metadata: {
        'original-filename': file.name
      }
    })

    await R2_CLIENT.send(putCommand)

    // 使用正确的公共 URL
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`

    console.log('Private chat file uploaded successfully:', {
      url: fileUrl,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size
    })

    return NextResponse.json({
      url: fileUrl,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size
    })
  } catch (error) {
    console.error('Private chat upload error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        message: error instanceof Error ? error.message : '上传失败，请重试'
      },
      { status: 500 }
    )
  }
} 