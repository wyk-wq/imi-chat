/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    return config
  },
  env: {
    TZ: 'Asia/Shanghai',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig 