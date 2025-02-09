import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// 添加调试日志
console.log('Initializing Prisma client...')

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

// 添加调试日志
console.log('Prisma client initialized:', !!prisma)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  console.log('Prisma client cached in development')
}

// 测试数据库连接
prisma.$connect()
  .then(() => {
    console.log('Successfully connected to database')
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error)
  }) 