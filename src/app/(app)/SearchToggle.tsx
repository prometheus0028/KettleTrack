'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export function SearchToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.get('q') || ''
  
  const [isSearching, setIsSearching] = React.useState(!!currentQuery)

  if (isSearching) {
    return (
      <div className="flex-1 flex items-center bg-input-bg rounded-lg px-3 py-1.5 mr-3">
        <Search className="w-4 h-4 text-[var(--muted-foreground)] mr-2" />
        <input 
          autoFocus
          type="text" 
          placeholder="Search groups..."
          defaultValue={currentQuery}
          className="bg-transparent border-none outline-none text-sm w-full text-[var(--foreground)]"
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString())
            if (e.target.value) {
              params.set('q', e.target.value)
            } else {
              params.delete('q')
            }
            router.replace(`/?${params.toString()}`)
          }}
        />
        <button 
          onClick={() => {
            setIsSearching(false)
            const params = new URLSearchParams(searchParams.toString())
            params.delete('q')
            router.replace(`/?${params.toString()}`)
          }}
          className="text-[var(--muted-foreground)] ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <button 
      onClick={() => setIsSearching(true)}
      className="p-1 -ml-1 text-[var(--foreground)]"
    >
      <Search className="w-6 h-6" />
    </button>
  )
}
