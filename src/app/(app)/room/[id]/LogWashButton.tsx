'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  const handleHaptic = () => {
    // Only trigger if not already pending
    if (!pending && typeof navigator !== 'undefined' && navigator.vibrate) {
      // Very short, snappy vibration pattern (e.g. 15ms)
      navigator.vibrate(15)
    }
  }

  return (
    <button 
      onClick={handleHaptic}
      disabled={pending}
      className="whitespace-nowrap bg-[#ff652f] text-white px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? 'Logging...' : 'Log wash'}
    </button>
  )
}

export function LogWashButton({ 
  roomId, 
  expectedTurnUserId,
  logWashAction
}: { 
  roomId: string
  expectedTurnUserId: string
  logWashAction: (formData: FormData) => Promise<void>
}) {
  return (
    <form action={logWashAction}>
      <input type="hidden" name="roomId" value={roomId} />
      <input type="hidden" name="expectedTurnUserId" value={expectedTurnUserId} />
      <SubmitButton />
    </form>
  )
}
