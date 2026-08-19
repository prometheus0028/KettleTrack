import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect(`/login?callbackUrl=/join/${code}`)
  }

  const room = await prisma.room.findUnique({
    where: { joinCode: code },
    include: { members: true }
  })

  if (!room) {
    redirect('/?error=InvalidInviteCode')
  }

  const userId = session.user.id
  
  // Check if already a member
  const existingMember = room.members.find(m => m.userId === userId)
  if (existingMember) {
    redirect(`/room/${room.id}`)
  }

  // Calculate new position
  const maxPosition = room.members.length > 0 
    ? Math.max(...room.members.map(m => m.position)) 
    : -1

  // Join room
  await prisma.roomMember.create({
    data: {
      roomId: room.id,
      userId: userId,
      position: maxPosition + 1
    }
  })

  redirect(`/room/${room.id}`)
}
