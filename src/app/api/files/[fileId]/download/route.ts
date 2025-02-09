import { NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { verifyAuth } from '@/lib/auth'

const R2_CLIENT = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
})

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
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

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: params.fileId
    })

    const signedUrl = await getSignedUrl(R2_CLIENT, command, { expiresIn: 3600 }) // 1小时有效

    return NextResponse.json({ url: signedUrl })
  } catch (error) {
    console.error('Get download URL error:', error)
    return NextResponse.json(
      { error: 'Failed to get download URL', message: '获取下载链接失败' },
      { status: 500 }
    )
  }
} 