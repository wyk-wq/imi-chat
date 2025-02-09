export interface InitMultipartUploadResponse {
  uploadId: string
  key: string
}

export interface PartUploadResponse {
  partNumber: number
  etag: string
}

export interface CompleteMultipartUploadResponse {
  url: string
  name: string
  type: string
  size: number
}

export interface UploadPart {
  partNumber: number
  etag: string
} 