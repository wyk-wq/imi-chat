'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './register.module.css'

interface RegisterError {
  type: 'username' | 'email' | 'password' | 'general'
  message: string
}

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<RegisterError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // 基本验证
      if (username.length < 2) {
        setError({ type: 'username', message: '用户名至少需要2个字符' })
        return
      }
      if (password.length < 6) {
        setError({ type: 'password', message: '密码至少需要6个字符' })
        return
      }
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
        setError({ type: 'email', message: '请输入有效的邮箱地址' })
        return
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, email }),
      })

      const data = await res.json()

      if (!res.ok) {
        // 处理不同类型的错误
        if (data.code === 'P2002') {
          if (data.meta?.target?.includes('email')) {
            setError({ type: 'email', message: '该邮箱已被注册' })
          } else if (data.meta?.target?.includes('username')) {
            setError({ type: 'username', message: '该用户名已被使用' })
          }
        } else {
          throw new Error(data.message || '注册失败')
        }
        return
      }

      // 注册成功后跳转到登录页
      router.push('/login')
    } catch (err: any) {
      setError({ type: 'general', message: err.message || '注册失败，请稍后重试' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.title}>注册</h1>
        {error && (
          <div className={`${styles.error} ${styles[error.type]}`}>
            {error.message}
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              className={error?.type === 'username' ? styles.inputError : ''}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={error?.type === 'email' ? styles.inputError : ''}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={error?.type === 'password' ? styles.inputError : ''}
            />
          </div>
          <button 
            type="submit" 
            className={styles.button}
            disabled={isLoading}
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className={styles.link}>
          已有账号？ <Link href="/login">去登录</Link>
        </p>
      </div>
    </div>
  )
} 