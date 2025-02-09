/**
 * 公开路由 - 所有用户都可以访问
 * @type {string[]}
 */
export const publicRoutes = [
  '/auth/login',
  '/auth/register'
]

/**
 * 认证路由 - 只有未登录用户可以访问
 * @type {string[]}
 */
export const authRoutes = [
  '/auth/login',
  '/auth/register'
]

/**
 * API 认证前缀
 * @type {string}
 */
export const apiAuthPrefix = '/api/auth'

/**
 * 默认登录后重定向路径
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT = '/chat/hall'

/**
 * 受保护路由 - 只有已登录用户可以访问
 * @type {string[]}
 */
export const protectedRoutes = [
  '/chat',
  '/chat/hall',
  '/chat/contacts',
  '/chat/private'
]

export const apiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/messages',
  '/api/messages/private',
  '/api/messages/private/:userId'
] 