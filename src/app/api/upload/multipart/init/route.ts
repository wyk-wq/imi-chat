import { NextResponse } from 'next/server'
import { S3Client, CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
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

    const { fileName, fileType } = await request.json()
    const fileExt = fileName.split('.').pop() || ''
    const key = `${uuidv4()}${fileExt ? `.${fileExt}` : ''}`

    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType || 'application/octet-stream',
      Metadata: {
        'original-filename': fileName
      }
    })

    const { UploadId } = await R2_CLIENT.send(command)

    return NextResponse.json({
      uploadId: UploadId,
      key
    })
  } catch (error) {
    console.error('Init multipart upload error:', error)
    return NextResponse.json(
      { error: 'Failed to init upload', message: '初始化上传失败' },
      { status: 500 }
    )
  }
} 