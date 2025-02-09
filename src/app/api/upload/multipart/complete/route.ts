import { NextResponse } from 'next/server'
import { S3Client, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { verifyAuth } from '@/lib/auth'
import { UploadPart } from '@/types/upload'

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

    const { uploadId, key, parts, fileName, fileType, fileSize } = await request.json()

    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part: UploadPart) => ({
          PartNumber: part.partNumber,
          ETag: part.etag
        }))
      }
    })

    await R2_CLIENT.send(command)

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`

    return NextResponse.json({
      url: fileUrl,
      name: fileName,
      type: fileType,
      size: fileSize
    })
  } catch (error) {
    console.error('Complete multipart upload error:', error)
    return NextResponse.json(
      { error: 'Failed to complete upload', message: '完成上传失败' },
      { status: 500 }
    )
  }
} 