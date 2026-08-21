import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { deleteWashLog } from '../../actions'
import { DeleteLogButton } from './DeleteLogButton'

export default async function EditWashLogPage({ params }: { params: Promise<{ id: string, logId: string }> }) {
  const { id: roomId, logId } = await params
  
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const log = await prisma.washLog.findUnique({
    where: { id: logId, roomId },
    include: {
      washedBy: true,
      subgroup: {
        include: {
          members: {
            include: { user: true }
          }
        }
      },
      room: {
        include: {
          members: {
            where: { isActive: true },
            include: { user: true }
          }
        }
      }
    }
  })

  if (!log) {
    redirect(`/room/${roomId}`)
  }

  // Format date
  const dateStr = new Date(log.washedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  const timeStr = new Date(log.washedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })

  let groupName = "Unknown group"
  if (log.subgroup) {
    const otherMembers = log.subgroup.members.filter(m => m.userId !== session.user.id)
    const hasMe = log.subgroup.members.some(m => m.userId === session.user.id)
    
    const names = []
    if (hasMe) names.push('You')
    names.push(...otherMembers.map(m => m.user.name || m.user.email.split('@')[0]))
    
    if (names.length > 2) {
      groupName = names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1]
    } else if (names.length === 2) {
      groupName = names.join(' & ')
    } else if (names.length === 1) {
      groupName = names[0]
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)]">
      {/* Header */}
      <div className="bg-[#1cc29f] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link prefetch={true} href={`/room/${roomId}`} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-[17px] font-semibold">Wash details</h1>
        <div className="w-9" />
      </div>

      <div className="p-4 flex flex-col gap-6">
        <div className="flex flex-col items-center py-4">
          <div className="flex items-center justify-center relative flex-shrink-0 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-[#1cc29f]">
              <rect x="3" y="8" width="18" height="12" rx="4" />
              <path d="M7 8v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2" opacity="0.3" />
              <circle cx="8" cy="14" r="1.5" fill="currentColor" opacity="0.2" />
              <circle cx="15" cy="15" r="1" fill="currentColor" opacity="0.2" />
              <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Kettle washed</h2>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">{dateStr} at {timeStr}</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Who washed it?</label>
            <div className="w-full bg-[var(--secondary)]/50 border border-[var(--border)] rounded-lg p-3.5 text-[15px] text-[var(--foreground)] font-medium flex items-center gap-3">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--secondary)] border border-[var(--border)]">
                {log.washedBy.avatarUrl ? (
                  <img src={log.washedBy.avatarUrl} alt="" className="w-full h-full object-cover p-0.5 rounded-full" />
                ) : (
                  <span className="text-[11px] font-bold text-[var(--muted-foreground)] flex items-center justify-center h-full">
                    {log.washedBy.name ? log.washedBy.name.charAt(0).toUpperCase() : log.washedBy.email.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {log.washedBy.id === session.user.id ? 'You' : (log.washedBy.name || log.washedBy.email)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">For Group</label>
            <div className="w-full bg-[var(--secondary)]/50 border border-[var(--border)] rounded-lg p-3.5 text-[15px] text-[var(--foreground)] font-medium">
              {groupName}
            </div>
          </div>
        </div>

        <form action={deleteWashLog} className="mt-4">
          <input type="hidden" name="logId" value={log.id} />
          <input type="hidden" name="roomId" value={roomId} />
          <DeleteLogButton />
        </form>
      </div>
    </div>
  )
}
