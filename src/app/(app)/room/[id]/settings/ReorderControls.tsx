'use client'

import * as React from 'react'
import { reorderMember } from '../actions'
import { ArrowUp, ArrowDown } from 'lucide-react'

export function ReorderControls({ roomId, memberId, isFirst, isLast }: { roomId: string, memberId: string, isFirst: boolean, isLast: boolean }) {
  const [isPending, startTransition] = React.useTransition()

  return (
    <div className="flex flex-col gap-1 mr-2">
      <button 
        disabled={isFirst || isPending}
        onClick={() => startTransition(() => reorderMember(roomId, memberId, 'up'))}
        className="p-1 text-[var(--muted-foreground)] hover:text-[#1cc29f] disabled:opacity-30 disabled:hover:text-[var(--muted-foreground)] transition-colors rounded-md"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
      <button 
        disabled={isLast || isPending}
        onClick={() => startTransition(() => reorderMember(roomId, memberId, 'down'))}
        className="p-1 text-[var(--muted-foreground)] hover:text-[#1cc29f] disabled:opacity-30 disabled:hover:text-[var(--muted-foreground)] transition-colors rounded-md"
      >
        <ArrowDown className="w-4 h-4" />
      </button>
    </div>
  )
}
