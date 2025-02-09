import ErrorBoundary from '../components/ErrorBoundary'
import { routes } from './routes'

export default function ChatLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
} 