'use client'

import { SubmitButton } from '@/components/SubmitButton'
import { LogOut } from 'lucide-react'

export function LeaveGroupButton({ disabled }: { disabled?: boolean }) {
  return (
    <SubmitButton
      defaultText="Leave Group"
      successText="Left Group"
      className={`w-full bg-[#ff652f] text-white py-3.5 rounded-xl font-semibold transition-all mt-4 ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-[#e05626] active:scale-[0.98]'}`}
    />
  )
}
