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

  // 添加动态路由配置
  experimental: {
    serverActions: true,
  },

  // 配置动态API路由
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ]
      }
    ]
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

  // 添加这个配置
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // 禁用静态导出
  staticPageGenerationTimeout: 0,
}

module.exports = nextConfig 