import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ActivityFilter } from './ActivityFilter'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NUDGE_JOKES } from '@/utils/jokes'

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const userId = session.user.id

  // Find all rooms the user is in
  const userRooms = await prisma.roomMember.findMany({
    where: { userId },
    select: { roomId: true, room: { select: { id: true, name: true } } }
  })
  const roomIds = userRooms.map(r => r.roomId)
  const availableGroups = userRooms.map(r => r.room)

  // Determine filter
  const filterGroup = group && roomIds.includes(group) ? group : undefined

  // Fetch all activity across these rooms
  const logs = await prisma.washLog.findMany({
    where: { roomId: filterGroup || { in: roomIds } },
    orderBy: { washedAt: 'desc' },
    take: 50,
    include: {
      washedBy: true,
      room: true
    }
  })

  const nudgeLogs = await prisma.nudgeLog.findMany({
    where: { roomId: filterGroup || { in: roomIds } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      nudger: true,
      nudged: true,
      room: true
    }
  })

  const allActivity = [
    ...logs.map(l => ({ type: 'wash' as const, date: new Date(l.washedAt), data: l })),
    ...nudgeLogs.map(n => ({ type: 'nudge' as const, date: new Date(n.createdAt), data: n }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 100)

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)]">
      <div className="px-4 py-3 sticky top-0 bg-[var(--background)] z-10">
        <div className="flex justify-end mb-2 -mr-2">
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Recent activity</h1>
          <ActivityFilter groups={availableGroups} currentGroup={filterGroup || 'all'} />
        </div>
      </div>

      {/* Activity Feed */}
      <div className="flex-1 pb-4">
        {allActivity.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {allActivity.map(item => {
              if (item.type === 'wash') {
                const log = item.data as any;
                const isMe = log.washedById === userId
                const name = isMe ? 'You' : log.washedBy.name || log.washedBy.email.split('@')[0]
                
                const minutesAgo = Math.floor((new Date().getTime() - item.date.getTime()) / 60000)
                let timeStr = `${minutesAgo} minutes ago`
                if (minutesAgo > 60) {
                  const hours = Math.floor(minutesAgo / 60)
                  timeStr = `${hours} hour${hours > 1 ? 's' : ''} ago`
                  if (hours > 24) {
                    const days = Math.floor(hours / 24)
                    timeStr = `${days} day${days > 1 ? 's' : ''} ago`
                  }
                }

                return (
                  <div key={`wash-${log.id}`} className="flex items-start gap-4 px-4 py-4 hover:bg-[var(--secondary)]/30 transition-colors">
                    <div className="w-10 h-10 flex items-center justify-center relative flex-shrink-0 mt-1">
                      <SoapIcon className="w-8 h-8 text-[#1cc29f]" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden border border-white">
                        {log.washedBy.avatarUrl ? (
                          <img src={log.washedBy.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-600 flex items-center justify-center text-[8px] font-bold text-white">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-[var(--foreground)] leading-snug">
                        <span className="font-semibold">{name}</span> washed the kettle in <span className="font-semibold">"{log.room.name}"</span>.
                      </p>
                      
                      {log.joke ? (
                        <p className="text-[#1cc29f] text-[13px] mt-1 font-medium italic">{log.joke}</p>
                      ) : isMe ? (
                        log.isOverride ? (
                          <p className="text-[#1cc29f] text-[13px] mt-1 font-medium">You get back a favor</p>
                        ) : (
                          <p className="text-[#1cc29f] text-[13px] mt-1 font-medium">Good job!</p>
                        )
                      ) : log.isOverride && log.expectedTurnUserId === userId ? (
                        <p className="text-[#ff652f] text-[13px] mt-1 font-medium">You owe a favor</p>
                      ) : (
                        <p className="text-[var(--muted-foreground)] text-[13px] mt-1 font-medium">not involved</p>
                      )}
                      
                      <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{timeStr}</p>
                    </div>
                  </div>
                )
              } else {
                const nudge = item.data as any;
                const isNudgerMe = nudge.nudgerId === userId
                const isNudgedMe = nudge.nudgedId === userId
                
                const nudgerName = isNudgerMe ? 'You' : nudge.nudger.name || nudge.nudger.email.split('@')[0]
                const nudgedName = isNudgedMe ? 'you' : nudge.nudged.name || nudge.nudged.email.split('@')[0]
                
                const minutesAgo = Math.floor((new Date().getTime() - item.date.getTime()) / 60000)
                let timeStr = `${minutesAgo} minutes ago`
                if (minutesAgo > 60) {
                  const hours = Math.floor(minutesAgo / 60)
                  timeStr = `${hours} hour${hours > 1 ? 's' : ''} ago`
                  if (hours > 24) {
                    const days = Math.floor(hours / 24)
                    timeStr = `${days} day${days > 1 ? 's' : ''} ago`
                  }
                }

                // Consistent random based on ID
                const charCodeSum = nudge.id.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0)
                const joke = NUDGE_JOKES[charCodeSum % NUDGE_JOKES.length]

                return (
                  <div key={`nudge-${nudge.id}`} className="flex items-start gap-4 px-4 py-4 hover:bg-[var(--secondary)]/30 transition-colors">
                    <div className="w-10 h-10 flex items-center justify-center relative flex-shrink-0 mt-1 bg-[#ff652f]/10 rounded-full text-[#ff652f]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden border border-white">
                        {nudge.nudger.avatarUrl ? (
                          <img src={nudge.nudger.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-600 flex items-center justify-center text-[8px] font-bold text-white">
                            {nudgerName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-[var(--foreground)] leading-snug">
                        <span className="font-semibold">{nudgerName}</span> nudged <span className="font-semibold">{nudgedName}</span> in <span className="font-semibold">"{nudge.room.name}"</span>
                      </p>
                      
                      <p className="text-[#ff652f] text-[13px] mt-1 font-medium italic">{nudge.joke || joke}</p>
                      
                      <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{timeStr}</p>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-[var(--muted-foreground)] text-sm">
            No recent activity.
          </div>
        )}
      </div>
    </div>
  )
}

function SoapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="8" width="18" height="12" rx="4" />
      <path d="M7 8v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2" opacity="0.3" />
      <circle cx="8" cy="14" r="1.5" fill="currentColor" opacity="0.2" />
      <circle cx="15" cy="15" r="1" fill="currentColor" opacity="0.2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.2" />
    </svg>
  )
}
