const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 关闭输出静态HTML
  output: 'standalone',
  
  images: {
    domains: [
      'pub-1677b0882814e8ba8e4dc3b6202a248.r2.dev', // Cloudflare R2
      'images.seanbow.me' // 私聊图片域名
    ],
    // 如果需要支持更多图片域名，在这里添加
  },

  // 实验性功能
  experimental: {
    serverActions: true,
  },

  typescript: {
    // ⚠️ 警告：这会忽略所有类型错误
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    }
    return config
  },
}

module.exports = nextConfig 