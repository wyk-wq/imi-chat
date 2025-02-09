import { redirect } from 'next/navigation'
import { DEFAULT_LOGIN_REDIRECT } from '../routes'

export default function ChatPage() {
  redirect(DEFAULT_LOGIN_REDIRECT)
} 