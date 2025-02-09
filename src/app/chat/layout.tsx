import ErrorBoundary from '../components/ErrorBoundary'

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

export const dynamic = 'force-dynamic' 