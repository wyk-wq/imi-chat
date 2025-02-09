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

// 从环境变量获取文件大小限制，默认 50MB
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800')

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

    // 只验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024))
      return NextResponse.json(
        { error: 'File too large', message: `文件大小不能超过${maxSizeMB}MB` },
        { status: 400 }
      )
    }

    // 添加错误处理和日志
    console.log('Uploading file:', {
      name: file.name,
      type: file.type || 'application/octet-stream', // 如果没有类型，使用二进制流类型
      size: file.size
    })

    const buffer = await file.arrayBuffer()
    const fileExt = file.name.split('.').pop() || ''
    const fileName = `${uuidv4()}${fileExt ? `.${fileExt}` : ''}`
    
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

    console.log('File uploaded successfully:', {
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
    console.error('Upload error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        message: error instanceof Error ? error.message : '上传失败，请重试'
      },
      { status: 500 }
    )
  }
} 