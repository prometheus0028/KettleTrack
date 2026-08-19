'use client'

import { useState } from 'react'
import { updateRoomName } from '../actions'

export function RoomNameForm({ roomId, initialName }: { roomId: string, initialName: string }) {
  const [successMsg, setSuccessMsg] = useState('')

  async function handleAction(formData: FormData) {
    await updateRoomName(formData)
    const newName = formData.get('name') as string
    setSuccessMsg(`Name changed to "${newName}"`)
    
    // clear after 3 seconds
    setTimeout(() => {
      setSuccessMsg('')
    }, 3000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 min-h-5">
        <h2 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Group Name</h2>
        {successMsg && (
          <span className="text-[12px] text-[#1cc29f] font-medium animate-in fade-in duration-300">{successMsg}</span>
        )}
      </div>
      <form action={handleAction} className="flex gap-2 mb-4">
        <input type="hidden" name="roomId" value={roomId} />
        <input 
          type="text" 
          name="name" 
          defaultValue={initialName} 
          className="flex-1 bg-input-bg border border-[var(--border)] rounded-lg p-3 text-[15px] focus:outline-none focus:border-[#1cc29f] text-[var(--foreground)]"
          required
        />
        <button className="bg-[#1cc29f] text-white px-5 py-3 rounded-lg font-medium text-[15px] hover:bg-[#159e80] active:scale-95 transition-all">
          Save
        </button>
      </form>
    </div>
  )
}
