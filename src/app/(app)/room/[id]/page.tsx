import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Settings } from 'lucide-react'
import { logWash } from './actions'
import { LogWashButton } from './LogWashButton'
import { NudgeButton } from './NudgeButton'

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await params
  
  // Enforce minimum load time for the kettle animation
  await new Promise(resolve => setTimeout(resolve, 1500))

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: { user: true },
        orderBy: { position: 'asc' }
      },
      washLogs: {
        take: 50,
        orderBy: { washedAt: 'desc' },
        include: { washedBy: true }
      }
    }
  })

  if (!room) {
    redirect('/')
  }

  const activeMembers = room.members.filter(m => m.isActive)
  let baseScheduledUser = activeMembers[0]?.user

  if (activeMembers.length > 0 && room.washLogs.length > 0) {
    const lastWash = room.washLogs[0]
    const lastScheduledUserId = lastWash.expectedTurnUserId || lastWash.washedById

    const lastPosIndex = activeMembers.findIndex(m => m.userId === lastScheduledUserId)
    
    let nextIndex = 0
    if (lastPosIndex !== -1) {
      nextIndex = (lastPosIndex + 1) % activeMembers.length
    } else {
      const originalPos = room.members.find(m => m.userId === lastScheduledUserId)?.position || 0
      const nextActive = activeMembers.find(m => m.position > originalPos) || activeMembers[0]
      nextIndex = activeMembers.indexOf(nextActive)
    }
    baseScheduledUser = activeMembers[nextIndex]?.user
  }

  // Favor Substitution
  let expectedTurnUser = baseScheduledUser
  let substitutingForUser = null

  if (baseScheduledUser) {
    const unsettledFavorsOwedToScheduled = await prisma.favor.findMany({
      where: {
        roomId,
        coveredByUserId: baseScheduledUser.id,
        settled: false
      },
      include: { owedByUser: true }
    })

    if (unsettledFavorsOwedToScheduled.length > 0) {
      expectedTurnUser = unsettledFavorsOwedToScheduled[0].owedByUser
      substitutingForUser = baseScheduledUser
    }
  }

  const isMyTurn = expectedTurnUser?.id === session.user.id

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Green Header Block */}
      <div className="bg-[#1cc29f] text-white px-4 pt-4 pb-16 relative">
        {/* Background Pattern Hint (optional CSS pattern can go here) */}
        <div className="flex items-center justify-between">
          <Link href="/" className="p-2 -ml-2 rounded-full bg-black/10 hover:bg-black/20">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold opacity-0">HiddenTitle</h1>
          <Link href={`/room/${room.id}/settings`} className="p-2 -mr-2 rounded-full hover:bg-black/10">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{room.name}</h1>
        </div>
        <div className="mt-1 flex items-center gap-2 text-white/80 text-sm">
          <UsersIcon /> {room.members.length} people
        </div>
      </div>

      {/* Main Area */}
      <div className="bg-[var(--background)] -mt-8 rounded-t-xl z-10 px-4 pt-6 flex-1 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        
        {/* Status Line */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[var(--secondary)] border-2 border-[#1cc29f]">
            {expectedTurnUser?.avatarUrl ? (
              <img src={expectedTurnUser.avatarUrl} alt="" className="w-full h-full object-cover p-0.5 rounded-full" />
            ) : (
              <span className="text-lg font-bold text-[var(--muted-foreground)] flex items-center justify-center h-full">
                {expectedTurnUser?.name ? expectedTurnUser.name.charAt(0).toUpperCase() : expectedTurnUser?.email.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h2 className="text-[17px] text-[var(--foreground)]">
            {isMyTurn ? (
              <span className="text-[#ff652f]">
                You are next to wash {substitutingForUser && <span className="text-[13px] font-normal text-[var(--muted-foreground)] block">(covering a favor for {substitutingForUser.name || substitutingForUser.email.split('@')[0]})</span>}
              </span>
            ) : (
              <span>
                <strong className="text-[#1cc29f]">{expectedTurnUser?.name || expectedTurnUser?.email.split('@')[0]}</strong> is next to wash
                {substitutingForUser && <span className="text-[13px] font-normal text-[var(--muted-foreground)] block">(covering a favor for {substitutingForUser.name || substitutingForUser.email.split('@')[0]})</span>}
              </span>
            )}
          </h2>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)] mb-6">
          Plus {activeMembers.length - 1} other active members in rotation
        </p>

        {/* Action Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
          <LogWashButton 
            roomId={room.id} 
            expectedTurnUserId={baseScheduledUser?.id || ''} 
            logWashAction={logWash} 
          />
          <Link href={`/room/${room.id}/balances`} className="whitespace-nowrap border border-[var(--border)] text-[var(--foreground)] px-5 py-2 rounded-full text-sm font-medium hover:bg-[var(--secondary)] active:scale-[0.98] transition-all">
            Balances
          </Link>
          {!isMyTurn && expectedTurnUser && (
            <NudgeButton targetUserId={expectedTurnUser.id} roomId={room.id} />
          )}
        </div>

        {/* Expense List (Wash History) */}
        <div className="divide-y divide-[var(--border)] -mx-4 border-t border-[var(--border)]">
          {room.washLogs.map(log => {
            const date = new Date(log.washedAt)
            const month = date.toLocaleString('default', { month: 'short' })
            const day = date.getDate()
            
            const isMe = log.washedById === session.user.id
            const name = isMe ? 'You' : log.washedBy.name || log.washedBy.email.split('@')[0]

            return (
              <Link key={log.id} href={`/room/${room.id}/log/${log.id}`} className="flex items-start gap-4 px-4 py-4 hover:bg-[var(--secondary)]/30 active:bg-[var(--secondary)] transition-colors block">
                <div className="flex flex-col items-center justify-center w-8 flex-shrink-0 text-[var(--muted-foreground)]">
                  <span className="text-[11px] font-medium uppercase tracking-widest">{month}</span>
                  <span className="text-[19px] font-light leading-none text-[var(--foreground)]">{day}</span>
                </div>

                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--secondary)] border border-[var(--border)]">
                  {log.washedBy.avatarUrl ? (
                    <img src={log.washedBy.avatarUrl} alt="" className="w-full h-full object-cover p-0.5 rounded-full" />
                  ) : (
                    <span className="text-sm font-bold text-[var(--muted-foreground)] flex items-center justify-center h-full">
                      {log.washedBy.name ? log.washedBy.name.charAt(0).toUpperCase() : log.washedBy.email.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 py-1">
                  <p className="text-[15px] font-medium text-[var(--foreground)] truncate">
                    Kettle washed
                  </p>
                  <p className="text-[13px] text-[var(--muted-foreground)] truncate mt-0.5">
                    {isMe ? 'You washed it' : `${name} washed it`}
                  </p>
                </div>

                <div className="text-right flex-shrink-0 pl-2">
                  {isMe ? (
                    log.favorSettled ? (
                      <>
                        <p className="text-[11px] text-[#1cc29f]">favor</p>
                        <p className="text-[13px] font-medium text-[#1cc29f]">{log.note === 'one favor settled' ? '1 settled' : (log.note === 'all favors settled' ? 'all settled' : 'settled')}</p>
                      </>
                    ) : log.isOverride ? (
                      <>
                        <p className="text-[11px] text-[#1cc29f]">you are owed</p>
                        <p className="text-[13px] font-medium text-[#1cc29f]">1 favor</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-[var(--muted-foreground)]">you washed</p>
                        <p className="text-[13px] font-medium text-[#1cc29f]">Good job!</p>
                      </>
                    )
                  ) : log.favorSettled && log.expectedTurnUserId === session.user.id ? (
                    <>
                      <p className="text-[11px] text-[#1cc29f]">favor</p>
                      <p className="text-[13px] font-medium text-[#1cc29f]">{log.note === 'one favor settled' ? '1 settled' : (log.note === 'all favors settled' ? 'all settled' : 'settled')}</p>
                    </>
                  ) : log.isOverride && log.expectedTurnUserId === session.user.id ? (
                    <>
                      <p className="text-[11px] text-[#ff652f]">you owe</p>
                      <p className="text-[13px] font-medium text-[#ff652f]">1 favor</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] text-[var(--muted-foreground)] mt-3">not involved</p>
                    </>
                  )}
                </div>
              </Link>
            )
          })}

          {room.washLogs.length === 0 && (
            <div className="p-8 text-center text-[var(--muted-foreground)] text-sm">
              No activity yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UsersIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  )
}

