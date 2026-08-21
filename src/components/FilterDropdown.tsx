'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, Check } from 'lucide-react'

export function FilterDropdown() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFilter = searchParams.get('filter') || 'none'
  const [isOpen, setIsOpen] = React.useState(false)

  const filters = [
    { id: 'none', label: 'All groups' },
    { id: 'owe', label: 'Groups where you owe a wash' },
    { id: 'owed', label: 'Groups where you are owed a wash' },
  ]

  const handleSelect = (id: string) => {
    setIsOpen(false)
    if (id === 'none') {
      router.push('/')
    } else {
      router.push(`/?filter=${id}`)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 -mr-2 rounded-full hover:bg-[var(--secondary)] transition-colors text-[var(--muted-foreground)]"
      >
        <SlidersHorizontal className="w-5 h-5" />
      </button>

      {/* Mobile Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          <div className="bg-[var(--card)] w-full max-w-sm rounded-2xl overflow-hidden relative animate-in slide-in-from-bottom-4 duration-200 shadow-xl border border-[var(--border)]">
            <div className="py-4 text-center border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)]">Set filter</h3>
            </div>
            
            <div className="flex flex-col">
              {filters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => handleSelect(filter.id)}
                  className="w-full text-center py-4 border-b border-[var(--border)] last:border-b-0 text-[#1cc29f] text-[17px] active:bg-[var(--secondary)] transition-colors relative"
                >
                  {filter.label}
                  {currentFilter === filter.id && (
                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1cc29f]" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 bg-[var(--background)]">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full bg-[var(--card)] border border-[var(--border)] py-3.5 rounded-xl text-[#1cc29f] font-semibold text-[17px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
