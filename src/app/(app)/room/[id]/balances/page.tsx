import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function RoomBalancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await params
  
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
      favors: {
        where: { settled: false },
        include: {
          owedByUser: true,
          coveredByUser: true
        }
      }
    }
  })

  if (!room) {
    redirect('/')
  }

  // Calculate All-Time Totals
  const allTimeLogs = await prisma.washLog.findMany({
    where: {
      roomId
    }
  })

  const washCounts: Record<string, number> = {}
  room.members.forEach(m => {
    washCounts[m.userId] = 0
  })

  allTimeLogs.forEach(log => {
    if (washCounts[log.washedById] !== undefined) {
      washCounts[log.washedById]++
    }
  })

  const allTimeTotals = room.members
    .map(m => ({
      userId: m.userId,
      name: m.user.name || m.user.email.split('@')[0],
      avatar: m.user.avatarUrl,
      count: washCounts[m.userId]
    }))
    .sort((a, b) => b.count - a.count)

  // Aggregate Favors
  const userBalances: Record<string, {
    user: any,
    owes: Record<string, { user: any, count: number }>,
    isSettled: boolean
  }> = {}

  room.members.forEach(m => {
    userBalances[m.userId] = {
      user: m.user,
      owes: {},
      isSettled: true
    }
  })

  room.favors.forEach(favor => {
    if (userBalances[favor.owedByUserId]) {
      userBalances[favor.owedByUserId].isSettled = false
      if (userBalances[favor.coveredByUserId]) {
        userBalances[favor.coveredByUserId].isSettled = false
      }

      if (!userBalances[favor.owedByUserId].owes[favor.coveredByUserId]) {
        userBalances[favor.owedByUserId].owes[favor.coveredByUserId] = {
          user: favor.coveredByUser,
          count: 0
        }
      }
      userBalances[favor.owedByUserId].owes[favor.coveredByUserId].count++
    }
  })

  return (
    <div className="flex flex-col min-h-full pb-20 bg-[var(--background)]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-[var(--background)] z-10 border-b border-[var(--border)]">
        <Link href={`/room/${room.id}`} className="text-[#1cc29f] flex items-center">
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span className="font-medium text-[15px]">Back</span>
        </Link>
        <h1 className="text-[17px] font-semibold text-[var(--foreground)] absolute left-1/2 -translate-x-1/2">Balances</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-8">
        
        {/* Balances Section */}
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Group Balances</h2>
          
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {Object.values(userBalances).map(({ user, owes, isSettled }) => {
              const owesList = Object.values(owes)
              const name = user.id === session.user.id ? 'You' : user.name || user.email.split('@')[0]
              
              return (
                <div key={user.id} className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--secondary)] border border-[var(--border)]">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover p-0.5 rounded-full" />
                    ) : (
                      <span className="text-sm font-bold text-[var(--muted-foreground)] flex items-center justify-center h-full">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-[15px] font-medium text-[var(--card-foreground)] mb-1">
                      {name}
                    </p>
                    {isSettled ? (
                      <p className="text-[13px] text-[var(--muted-foreground)]">all settled up</p>
                    ) : (
                      <div className="space-y-1">
                        {owesList.map(o => {
                          const targetName = o.user.id === session.user.id ? 'you' : o.user.name || o.user.email.split('@')[0]
                          return (
                            <p key={o.user.id} className="text-[13px] text-[#ff652f]">
                              owes <span className="font-medium">{targetName}</span> {o.count} wash{o.count > 1 ? 'es' : ''}
                            </p>
                          )
                        })}
                        {owesList.length === 0 && !isSettled && (
                          <p className="text-[13px] text-[#1cc29f]">is owed washes</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* All-Time Totals Section */}
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Total Washes (All Time)</h2>
          
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {allTimeTotals.map((t, idx) => {
              const name = t.userId === session.user.id ? 'You' : t.name
              return (
                <div key={t.userId} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center text-[12px] font-bold text-[var(--muted-foreground)]">
                      {idx + 1}
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--secondary)] border border-[var(--border)]">
                      {t.avatar ? (
                        <img src={t.avatar} alt="" className="w-full h-full object-cover p-0.5 rounded-full" />
                      ) : (
                        <span className="text-xs font-bold text-[var(--muted-foreground)] flex items-center justify-center h-full">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] font-medium text-[var(--card-foreground)]">
                      {name}
                    </p>
                  </div>
                  <div className="text-[15px] font-semibold text-[#1cc29f]">
                    {t.count}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
