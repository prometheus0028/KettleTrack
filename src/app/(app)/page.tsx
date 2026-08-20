import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SubmitButton } from '@/components/SubmitButton'
import { CancelButton } from '@/components/CancelButton'
import { ActionBox } from '@/components/ActionBox'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { createRoom, joinRoom } from '@/app/actions'
import { FilterDropdown } from '@/components/FilterDropdown'
import { SearchToggle } from './SearchToggle'
import { ThemeToggle } from '@/components/ThemeToggle'

import { Suspense } from 'react'

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ filter?: string, action?: string, q?: string, error?: string, max?: string }> }) {
  const { filter, action, q, error, max } = await searchParams
  const currentFilter = filter || 'none'

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const userId = session.user.id

  const userWithRooms = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      rooms: {
        include: { 
          room: {
            include: {
              favors: {
                where: {
                  settled: false,
                  OR: [
                    { owedByUserId: userId },
                    { coveredByUserId: userId }
                  ]
                }
              }
            }
          } 
        }
      }
    }
  })

  let roomsToDisplay = userWithRooms?.rooms || []
  let totalFavorsOwed = 0
  let totalFavorsOwedToMe = 0

  // Calculate balances and apply filters
  const roomsWithBalances = roomsToDisplay.map((rm: any) => {
    let owes = 0
    let owedToMe = 0
    
    rm.room.favors.forEach((f: any) => {
      if (f.owedByUserId === userId) owes++
      if (f.coveredByUserId === userId) owedToMe++
    })

    totalFavorsOwed += owes
    totalFavorsOwedToMe += owedToMe

    return {
      ...rm,
      owes,
      owedToMe,
      netBalance: owedToMe - owes
    }
  })

  if (currentFilter === 'outstanding') {
    roomsToDisplay = roomsWithBalances.filter(rm => rm.owes > 0 || rm.owedToMe > 0)
  } else if (currentFilter === 'owe') {
    roomsToDisplay = roomsWithBalances.filter(rm => rm.owes > 0)
  } else if (currentFilter === 'owed') {
    roomsToDisplay = roomsWithBalances.filter(rm => rm.owedToMe > 0)
  } else {
    roomsToDisplay = roomsWithBalances
  }

  if (q) {
    const searchLower = q.toLowerCase()
    roomsToDisplay = roomsToDisplay.filter(rm => rm.room.name.toLowerCase().includes(searchLower))
  }

  const hasRooms = userWithRooms && userWithRooms.rooms.length > 0
  const showAddGroup = ['add', 'create', 'join'].includes(action || '') || !hasRooms

  return (
    <div className="flex flex-col min-h-full">
      {!showAddGroup && (
        <>
          <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-[var(--background)] z-10">
            <Suspense fallback={<div className="w-6 h-6" />}>
              <SearchToggle />
            </Suspense>
            <div className="flex items-center gap-2">
              <Link href="?action=add" className="text-[#1cc29f] text-[15px] font-medium tracking-wide flex-shrink-0">
                Add a group
              </Link>
              <div className="-mr-2 flex items-center">
                <ThemeToggle />
              </div>
            </div>
          </div>

          <div className="px-4 pt-2 pb-4 flex items-center justify-between border-b border-[var(--border)]">
            <h1 className="text-[15px] font-semibold text-[var(--foreground)]">
              Overall, <span className="text-[var(--muted-foreground)] font-normal">
                {totalFavorsOwed > totalFavorsOwedToMe 
                  ? `you owe ${totalFavorsOwed - totalFavorsOwedToMe} favors` 
                  : totalFavorsOwedToMe > totalFavorsOwed
                    ? `you are owed ${totalFavorsOwedToMe - totalFavorsOwed} favors`
                    : `you are settled up`
                }
              </span>
            </h1>
            <FilterDropdown />
          </div>
        </>
      )}

      <div className="flex-1">
        {showAddGroup ? (
          <div className="p-6 md:p-8 max-w-md mx-auto w-full flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[70vh]">
            {action === 'create' ? (
              <div className="bg-[var(--card)] border border-[var(--border)] p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <Link href="?action=add" className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-input-bg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </Link>

                <div className="w-14 h-14 rounded-2xl bg-[#1cc29f]/10 text-[#1cc29f] flex items-center justify-center mb-6">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                
                <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mb-2">Create a new room</h2>
                <p className="text-[15px] text-[var(--muted-foreground)] mb-8">Give your room a name to start tracking kettle washes with your roommates.</p>
                
                <form action={createRoom} className="space-y-6">
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--muted-foreground)] mb-2 block uppercase tracking-wider">Room Name</label>
                    <input 
                      name="name" 
                      placeholder="e.g. 4B Apartment" 
                      className="w-full bg-input-bg border-2 border-[var(--border)] rounded-xl p-4 text-[16px] focus:outline-none focus:border-[var(--foreground)] text-[var(--foreground)] transition-all font-medium"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--muted-foreground)] mb-2 block uppercase tracking-wider">Max Members</label>
                    <input 
                      type="number"
                      name="maxMembers" 
                      defaultValue={4}
                      min={1}
                      max={20}
                      className="w-full bg-input-bg border-2 border-[var(--border)] rounded-xl p-4 text-[16px] focus:outline-none focus:border-[var(--foreground)] text-[var(--foreground)] transition-all font-medium"
                      required
                    />
                  </div>
                  <SubmitButton 
                    defaultText="Create Room"
                    className="w-full bg-[#1cc29f] text-white py-4 rounded-xl font-semibold text-[16px] shadow-sm shadow-[#1cc29f]/20 hover:bg-[#159e80] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  />
                </form>
              </div>
            ) : action === 'join' ? (
              <div className="bg-[var(--card)] border border-[var(--border)] p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <Link href="?action=add" className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-input-bg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </Link>

                <div className="w-14 h-14 rounded-2xl bg-[#1cc29f]/10 text-[#1cc29f] flex items-center justify-center mb-6">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                </div>

                <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mb-2">Join a room</h2>
                <p className="text-[15px] text-[var(--muted-foreground)] mb-8">Enter the 6-character room code or paste an invite link to jump in.</p>

                <form action={joinRoom} className="space-y-6">
                  <div>
                    {error === 'full' && (
                      <p className="text-[#ff652f] text-[14px] font-medium mb-4">Sorry, this group has reached its maximum capacity of {max || 'X'} members.</p>
                    )}
                    <label className="text-[13px] font-semibold text-[var(--muted-foreground)] mb-2 block uppercase tracking-wider">Join Code or Invite Link</label>
                    <input 
                      name="joinCode" 
                      placeholder="e.g. A1B2C3 or https://..." 
                      className="w-full bg-input-bg border-2 border-[var(--border)] rounded-xl p-4 text-[16px] focus:outline-none focus:border-[var(--foreground)] text-[var(--foreground)] transition-all font-medium"
                      required
                      autoFocus
                    />
                  </div>
                  <SubmitButton 
                    defaultText="Join Room"
                    className="w-full bg-[#1cc29f] text-white py-4 rounded-xl font-semibold text-[16px] shadow-sm shadow-[#1cc29f]/20 hover:bg-[#159e80] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  />
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-1.5 mb-8">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Get Started</h2>
                  <p className="text-[15px] text-[var(--muted-foreground)]">What would you like to do?</p>
                </div>
                
                <div className="space-y-3">
                  <ActionBox 
                    href="?action=create" 
                    title="Create a new room" 
                    description="Start tracking together"
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>}
                  />

                  <ActionBox 
                    href="?action=join" 
                    title="Join an existing room" 
                    description="Use a link or room code"
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>}
                  />
                </div>
              </div>
            )}
            
            {hasRooms && (
              <div className="mt-8 text-center">
                <CancelButton />
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] pb-24">
            {roomsToDisplay.map((rm: any) => (
              <Link key={rm.roomId} href={`/room/${rm.roomId}`} className="flex items-center gap-4 px-4 py-4 hover:bg-[var(--secondary)]/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[var(--secondary)] flex items-center justify-center border border-[var(--border)] flex-shrink-0">
                  <span className="text-sm font-bold text-[var(--muted-foreground)] uppercase">
                    {rm.room.name.substring(0, 2)}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h2 className="text-[17px] font-medium text-[var(--foreground)] truncate">
                    {rm.room.name}
                  </h2>
                  <p className="text-[13px] mt-0.5 truncate">
                    {rm.owes === 0 && rm.owedToMe === 0 ? (
                      <span className="text-[var(--muted-foreground)]">settled up</span>
                    ) : rm.owes > 0 && rm.owedToMe > 0 ? (
                      <span className="text-[var(--muted-foreground)]">
                        <span className="text-[#ff652f]">you owe {rm.owes}</span>, <span className="text-[#1cc29f]">are owed {rm.owedToMe}</span>
                      </span>
                    ) : rm.owes > 0 ? (
                      <span className="text-[#ff652f]">you owe {rm.owes} favor{rm.owes > 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-[#1cc29f]">you are owed {rm.owedToMe} favor{rm.owedToMe > 1 ? 's' : ''}</span>
                    )}
                  </p>
                </div>
                
                {/* Right side balance exactly like Splitwise */}
                <div className="text-right flex-shrink-0 flex flex-col justify-center gap-1.5">
                  {rm.owes > 0 && (
                    <div>
                      <p className="text-[11px] text-[#ff652f] leading-none">you owe</p>
                      <p className="text-[13px] font-medium text-[#ff652f] leading-none">{rm.owes} favor{rm.owes > 1 ? 's' : ''}</p>
                    </div>
                  )}
                  {rm.owedToMe > 0 && (
                    <div>
                      <p className="text-[11px] text-[#1cc29f] leading-none">you are owed</p>
                      <p className="text-[13px] font-medium text-[#1cc29f] leading-none">{rm.owedToMe} favor{rm.owedToMe > 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
            {roomsToDisplay.length === 0 && (
              <div className="p-8 text-center text-[var(--muted-foreground)] text-sm">
                No groups match this filter.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
