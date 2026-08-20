'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ActionBox({ 
  href, 
  title, 
  description, 
  icon 
}: { 
  href: string, 
  title: string, 
  description: string, 
  icon: React.ReactNode 
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <button 
      onClick={() => {
        setIsLoading(true)
        router.push(href)
      }}
      disabled={isLoading}
      className="w-full text-left relative group block bg-[var(--card)] hover:bg-[var(--secondary)]/40 border border-[var(--border)] hover:border-[#1cc29f]/40 p-5 rounded-2xl transition-all hover:shadow-md hover:shadow-[#1cc29f]/5 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:-translate-y-0 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#1cc29f]/10 text-[#1cc29f] flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-[#1cc29f] group-hover:text-white transition-all duration-300">
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            icon
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-[16px] font-semibold text-[var(--foreground)] mb-0.5">{title}</h3>
          <p className="text-[13px] text-[var(--muted-foreground)]">{description}</p>
        </div>
      </div>
    </button>
  )
}
