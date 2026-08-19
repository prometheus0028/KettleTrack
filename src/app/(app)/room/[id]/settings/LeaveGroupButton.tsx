'use client'

import { useFormStatus } from 'react-dom'
import { LogOut } from 'lucide-react'

export function LeaveGroupButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  const isDisabled = pending || disabled

  return (
    <button
      disabled={isDisabled}
      className={`w-full bg-[#ff652f] text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all mt-4
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e05626] active:scale-[0.98]'}`}
    >
      {pending ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        <>
          <LogOut className="w-5 h-5 -ml-1" />
          Leave Group
        </>
      )}
    </button>
  )
}
