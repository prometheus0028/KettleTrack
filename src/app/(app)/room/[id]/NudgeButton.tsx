'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { nudgeUser } from './actions'

export function NudgeButton({ targetUserId, roomId }: { targetUserId: string, roomId: string }) {
  const [nudging, setNudging] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleNudge = async () => {
    setNudging(true)
    try {
      await nudgeUser(targetUserId, roomId)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setNudging(false)
    }
  }

  return (
    <button 
      onClick={handleNudge}
      disabled={nudging || success}
      className={`flex items-center gap-1.5 whitespace-nowrap border border-[var(--border)] px-5 py-2 rounded-full text-sm font-medium transition-all ${
        success 
          ? 'bg-[#1cc29f] text-white border-[#1cc29f]' 
          : 'text-[var(--foreground)] hover:bg-[var(--secondary)] active:scale-[0.98]'
      }`}
    >
      <Bell className={`w-4 h-4 ${success ? 'text-white' : 'text-[#ff652f]'}`} />
      {success ? 'Nudged!' : nudging ? 'Nudging...' : 'Nudge'}
    </button>
  )
}
