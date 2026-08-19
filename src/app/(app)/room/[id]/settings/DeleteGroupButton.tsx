'use client'

import { Trash2 } from 'lucide-react'

export function DeleteGroupButton() {
  return (
    <button 
      className="w-full bg-white dark:bg-black border border-[#ff652f] text-[#ff652f] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#ff652f] hover:text-white transition-colors"
      onClick={(e) => {
        if(!confirm('Are you sure you want to delete this group? All data will be lost.')) {
          e.preventDefault()
        }
      }}
    >
      <Trash2 className="w-4 h-4" />
      Delete Group
    </button>
  )
}
