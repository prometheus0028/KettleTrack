import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronDown } from 'lucide-react'
import { updateWashLog, deleteWashLog } from '../../actions'
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
      room: {
        include: {
          members: {
            where: { isActive: true },
            include: { user: true },
            orderBy: { position: 'asc' }
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

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)]">
      {/* Header */}
      <div className="bg-[#1cc29f] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href={`/room/${roomId}`} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors">
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

        <form action={updateWashLog} className="space-y-4">
          <input type="hidden" name="logId" value={log.id} />
          <input type="hidden" name="roomId" value={roomId} />
          
          <div className="relative">
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Who washed it?</label>
            <select 
              name="washerId" 
              defaultValue={log.washedById}
              className="w-full bg-input-bg border border-[var(--border)] rounded-lg p-3.5 pr-10 text-[15px] focus:outline-none focus:border-[#1cc29f] text-[var(--foreground)] appearance-none font-medium"
            >
              {log.room.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.id === session.user.id ? 'You' : m.user.name || m.user.email}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-[38px] pointer-events-none text-[var(--muted-foreground)]">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          <button className="w-full bg-[#1cc29f] text-white py-3 rounded-lg font-medium text-[15px] hover:bg-[#159e80] active:scale-[0.98] transition-all">
            Save Changes
          </button>
        </form>

        <form action={deleteWashLog} className="mt-4">
          <input type="hidden" name="logId" value={log.id} />
          <input type="hidden" name="roomId" value={roomId} />
          <DeleteLogButton />
        </form>
      </div>
    </div>
  )
}
