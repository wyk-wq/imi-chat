'use client'

interface ErrorAlertProps {
  message: string
  onClose: () => void
}

export function ErrorAlert({ message, onClose }: ErrorAlertProps) {
  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center">
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-white hover:text-red-100"
      >
        ✕
      </button>
    </div>
  )
} 