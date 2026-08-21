import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Settings } from 'lucide-react'
import { LogWashButton } from './LogWashButton'
import { NudgeButton } from './NudgeButton'
import { GREETING_JOKES } from '@/utils/jokes'

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
        include: { user: true }
      },
      washLogs: {
        take: 50,
        orderBy: { washedAt: 'desc' },
        include: { washedBy: true }
      },
      subgroups: {
        where: { isActive: true },
        include: {
          members: {
            orderBy: { position: 'asc' },
            include: { user: true }
          }
        }
      }
    }
  })

  if (!room) {
    redirect('/')
  }

  const activeMembers = room.members.filter(m => m.isActive)
  const users = activeMembers.map(m => m.user)

  // Find how many times this user has washed in this room recently
  const myWashes = room.washLogs.filter(log => log.washedById === session.user.id).length
  // eslint-disable-next-line react-hooks/purity
  const greeting = GREETING_JOKES[Math.floor(Math.random() * GREETING_JOKES.length)]

  // Filter out subgroups that don't include the current user, or just show all of them?
  // Showing all active subgroups in the room is fine, but maybe sort them so the ones you're in are first.
  const relevantSubgroups = room.subgroups.filter(sg => sg.members.some(m => m.userId === session.user.id))

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Green Header Block */}
      <div className="bg-[#1cc29f] text-white px-4 pt-4 pb-16 relative">
        <div className="flex items-center justify-between">
          <Link href="/" className="p-2 -ml-2 rounded-full bg-black/10 hover:bg-black/20">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold opacity-0">HiddenTitle</h1>
          <Link prefetch={true} href={`/room/${room.id}/settings`} className="p-2 -mr-2 rounded-full hover:bg-black/10">
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
        <div className="mb-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[var(--secondary)] border border-[var(--border)] mt-1 flex items-center justify-center">
            {room.avatarUrl ? (
              <img src={room.avatarUrl} alt="Group Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[16px] font-bold text-[var(--muted-foreground)] uppercase">
                {room.name.substring(0, 2)}
              </span>
            )}
          </div>
          <h2 className="text-[17px] text-[var(--foreground)]">
            <span>
              <strong className="text-[#1cc29f] block mb-1">{greeting}</strong>
              <span className="text-[13px] font-normal text-[var(--muted-foreground)] block mt-1">
                {myWashes > 0 ? `You've washed the kettle ${myWashes} times recently.` : "Log a wash when you use the kettle."}
              </span>
            </span>
          </h2>
        </div>

        {/* Action Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
          <LogWashButton 
            roomId={room.id} 
            activeMembers={users}
            currentUserId={session.user.id}
          />
          <Link prefetch={true} href={`/room/${room.id}/balances`} className="flex items-center whitespace-nowrap border border-[var(--border)] text-[var(--foreground)] px-5 py-2 rounded-full text-sm font-medium hover:bg-[var(--secondary)] active:scale-[0.98] transition-all">
            Balances
          </Link>
          <NudgeButton 
            roomId={room.id}
            activeMembers={users}
            currentUserId={session.user.id}
          />
        </div>

        {/* Next Turns */}
        {relevantSubgroups.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Up Next</h3>
            <div className="space-y-2">
              {relevantSubgroups.map(sg => {
                const nextUser = sg.members[0].user
                const isMyTurn = nextUser.id === session.user.id
                const nextUserName = isMyTurn ? 'Your' : (nextUser.name || nextUser.email.split('@')[0]) + "'s"
                
                const otherMembers = sg.members.filter(m => m.userId !== session.user.id)
                const names = ['You', ...otherMembers.map(m => m.user.name || m.user.email.split('@')[0])]
                
                let groupName = names.join(', ')
                if (names.length > 2) {
                  groupName = names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1]
                } else if (names.length === 2) {
                  groupName = names.join(' & ')
                }

                return (
                  <div key={sg.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--card)] p-3.5 rounded-xl border border-[var(--border)] shadow-sm gap-1 sm:gap-4">
                    <div className="text-[14px] font-medium text-[var(--foreground)] truncate">
                      {groupName}
                    </div>
                    <div className={`text-[14px] font-semibold whitespace-nowrap ${isMyTurn ? 'text-[#ff652f]' : 'text-[#1cc29f]'}`}>
                      {nextUserName} turn
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Expense List (Wash History) */}
        <div className="divide-y divide-[var(--border)] -mx-4 border-t border-[var(--border)]">
          {room.washLogs.map(log => {
            const date = new Date(log.washedAt)
            const month = date.toLocaleString('default', { month: 'short' })
            const day = date.getDate()
            
            const isMe = log.washedById === session.user.id
            const name = isMe ? 'You' : log.washedBy.name || log.washedBy.email.split('@')[0]

            return (
              <Link prefetch={true} href={`/room/${room.id}/log/${log.id}`} key={log.id} className="flex items-start gap-4 px-4 py-4 hover:bg-[var(--secondary)]/30 active:bg-[var(--secondary)] transition-colors block">
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
