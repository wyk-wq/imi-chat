'use client'
import { useState, useRef, useEffect } from 'react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: any) => void
  onClose: () => void
}

export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsVisible(false)
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (!isVisible) return null

  return (
    <div ref={pickerRef} className="absolute bottom-full mb-2">
      <Picker
        data={data}
        onEmojiSelect={onEmojiSelect}
        theme="light"
        locale="zh"
        previewPosition="none"
        skinTonePosition="none"
      />
    </div>
  )
} 