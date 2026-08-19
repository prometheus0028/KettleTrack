'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

export function ActivityFilter({ groups, currentGroup }: { groups: { id: string, name: string }[], currentGroup: string }) {
  const router = useRouter()

  return (
    <select 
      value={currentGroup}
      onChange={(e) => {
        const val = e.target.value
        if (val === 'all') {
          router.push('/activity')
        } else {
          router.push(`/activity?group=${val}`)
        }
      }}
      className="bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] text-sm rounded-lg px-2 py-1 outline-none focus:border-[#1cc29f]"
    >
      <option value="all">All groups</option>
      {groups.map(g => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </select>
  )
}
