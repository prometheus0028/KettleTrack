import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { deleteRoom, leaveRoom } from '../actions'
import { DeleteGroupButton } from './DeleteGroupButton'
import { LeaveGroupButton } from './LeaveGroupButton'
import { RoomNameForm } from './RoomNameForm'
import { RoomAvatarForm } from './RoomAvatarForm'
import { InviteLinkButton } from './InviteLinkButton'
import { SubgroupsManager } from './SubgroupsManager'

export default async function RoomSettingsPage({ params }: { params: Promise<{ id: string }> }) {
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
      subgroups: {
        where: { isActive: true },
        include: {
          members: {
            include: { user: true },
            orderBy: { position: 'asc' }
          }
        }
      }
    }
  })

  if (!room) {
    redirect('/')
  }

  const isOwner = room.ownerId === session.user.id
  const currentMember = room.members.find(m => m.userId === session.user.id)

  const unresolvedDebts = await prisma.favor.findMany({
    where: {
      roomId,
      OR: [
        { owedByUserId: session.user.id },
        { coveredByUserId: session.user.id }
      ],
      settled: false
    }
  })
  const hasUnresolvedDebts = unresolvedDebts.length > 0

  return (
    <div className="flex flex-col min-h-full pb-20 bg-[var(--background)]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-[var(--background)] z-10 border-b border-[var(--border)]">
        <Link href={`/room/${room.id}`} className="text-[#1cc29f] flex items-center">
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span className="font-medium text-[15px]">Back</span>
        </Link>
        <h1 className="text-[17px] font-semibold text-[var(--foreground)] absolute left-1/2 -translate-x-1/2">Group settings</h1>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="p-4 space-y-8">
        
        {/* Rename Room */}
        <div>
          <RoomNameForm roomId={room.id} initialName={room.name} />
          <RoomAvatarForm roomId={room.id} currentAvatarUrl={room.avatarUrl} />

          <h2 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Join Code</h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 text-[15px] text-[var(--foreground)] font-mono uppercase tracking-widest text-center mb-3">
            {room.joinCode}
          </div>
          <InviteLinkButton joinCode={room.joinCode} />
        </div>

        {/* Cycle Tracking - Subgroups */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Sub-groups (Cycles)</h2>
          </div>
          <p className="text-[14px] text-[var(--foreground)] mb-4">
            {isOwner 
              ? "Manage the active rotations for washing the kettle based on who drank. You can lock an order once it is set." 
              : "The active rotations for washing the kettle."}
          </p>

          <SubgroupsManager 
            roomId={room.id} 
            subgroups={room.subgroups} 
            isOwner={isOwner}
            currentUserId={session.user.id}
          />
        </div>

        {/* Actions */}
        <div className="pt-8">
          {isOwner ? (
            <>
              <h2 className="text-[13px] font-semibold text-[#ff652f] uppercase tracking-wider mb-2">Danger Zone</h2>
              <div className="bg-[#ff652f]/10 border border-[#ff652f]/20 rounded-xl p-4">
                <p className="text-[14px] text-[#ff652f] mb-4 font-medium">
                  Deleting this group will permanently remove all members, wash logs, and balances. This action cannot be undone.
                </p>
                <form action={deleteRoom}>
                  <input type="hidden" name="roomId" value={room.id} />
                  <DeleteGroupButton />
                </form>
              </div>
            </>
          ) : (
            <div>
              <p className="text-[14px] text-[var(--muted-foreground)] mb-4 text-center">
                Leaving this group will remove you from the wash cycle. Your past wash logs and balances will remain in the group history.
              </p>
              {hasUnresolvedDebts && (
                <div className="bg-[#ff652f] text-white text-[13px] font-semibold px-3 py-2 rounded-lg mb-4 flex items-center gap-2">
                  <span>⚠️</span> You cannot leave the group until all your debts (owed or to be received) are settled.
                </div>
              )}
              {currentMember && (
                <form action={leaveRoom}>
                  <input type="hidden" name="roomId" value={room.id} />
                  <input type="hidden" name="memberId" value={currentMember.id} />
                  <LeaveGroupButton disabled={hasUnresolvedDebts} />
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
