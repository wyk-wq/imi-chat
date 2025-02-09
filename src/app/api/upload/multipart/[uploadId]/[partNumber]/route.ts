import { NextResponse } from 'next/server'
import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3'
import { verifyAuth } from '@/lib/auth'

const R2_CLIENT = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
})

export async function POST(
  request: Request,
  { params }: { params: { uploadId: string; partNumber: string } }
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

    const { key, body } = await request.json()
    const partNumber = parseInt(params.partNumber)

    const command = new UploadPartCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      UploadId: params.uploadId,
      PartNumber: partNumber,
      Body: Buffer.from(body)
    })

    const { ETag } = await R2_CLIENT.send(command)

    return NextResponse.json({
      partNumber,
      etag: ETag
    })
  } catch (error) {
    console.error('Upload part error:', error)
    return NextResponse.json(
      { error: 'Failed to upload part', message: '上传分片失败' },
      { status: 500 }
    )
  }
} 