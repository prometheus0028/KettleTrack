'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function CancelButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[var(--background)] flex flex-col items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <button 
      onClick={() => {
        setIsLoading(true)
        setTimeout(() => {
          router.push('/')
        }, 800) // Show loader for a brief moment to satisfy the requested UX
      }}
      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-[14px] font-medium transition-colors cursor-pointer"
    >
      Cancel
    </button>
  )
}
