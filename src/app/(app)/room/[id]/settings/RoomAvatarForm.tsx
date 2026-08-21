'use client'

import { useState } from 'react'
import { updateRoomAvatar } from '../actions'
import { SubmitButton } from '@/components/SubmitButton'

export function RoomAvatarForm({ roomId, currentAvatarUrl }: { roomId: string, currentAvatarUrl: string | null }) {
  const [successMsg, setSuccessMsg] = useState('')

  async function handleAction(formData: FormData) {
    await updateRoomAvatar(formData)
    setSuccessMsg(`Avatar updated!`)
    
    setTimeout(() => {
      setSuccessMsg('')
    }, 3000)
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 min-h-5">
        <h2 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Group Avatar</h2>
        {successMsg && (
          <span className="text-[12px] text-[#1cc29f] font-medium animate-in fade-in duration-300">{successMsg}</span>
        )}
      </div>
      <form action={handleAction} className="space-y-4">
        <input type="hidden" name="roomId" value={roomId} />
        
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'].map((seed, i) => {
            const url = `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}`
            return (
              <label key={seed} className="relative cursor-pointer flex-shrink-0">
                <input 
                  type="radio" 
                  name="avatarUrl" 
                  value={url} 
                  defaultChecked={currentAvatarUrl === url || (!currentAvatarUrl && i === 0)} 
                  className="peer sr-only" 
                />
                <div className="w-12 h-12 rounded-full border-2 border-transparent peer-checked:border-[#1cc29f] peer-checked:scale-110 transition-all overflow-hidden bg-[var(--secondary)]">
                  <img src={url} alt="avatar" className="w-full h-full object-cover" />
                </div>
              </label>
            )
          })}
        </div>
        
        <SubmitButton 
          defaultText="Save Avatar"
          successText="Saved"
          className="bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)] px-4 py-2 rounded-lg font-medium text-[14px] hover:bg-black/5 active:scale-95 transition-all w-full"
        />
      </form>
    </div>
  )
}
