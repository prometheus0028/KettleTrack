'use server'

import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id
}

export async function createRoom(formData: FormData) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  if (!name) throw new Error('Room name required')

  const maxMembersStr = formData.get('maxMembers') as string
  const maxMembers = maxMembersStr ? parseInt(maxMembersStr, 10) : 4

  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const newRoom = await prisma.room.create({
    data: {
      name,
      maxMembers,
      ownerId: userId,
      joinCode,
      members: {
        create: {
          userId,
          position: 0,
          isActive: true
        }
      }
    }
  })

  revalidatePath('/', 'layout')
  redirect(`/room/${newRoom.id}`)
}

export async function joinRoom(formData: FormData) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  let joinCode = formData.get('joinCode') as string
  if (!joinCode) throw new Error('Join code required')

  joinCode = joinCode.trim()

  if (joinCode.includes('/join/')) {
    const parts = joinCode.split('/join/')
    if (parts.length > 1) {
      joinCode = parts[1].split('/')[0].split('?')[0]
    }
  }

  joinCode = joinCode.toUpperCase()

  const room = await prisma.room.findUnique({
    where: { joinCode },
    include: { members: true }
  })

  if (!room) throw new Error('Invalid join code')

  const existingMember = room.members.find(m => m.userId === userId)
  if (!existingMember) {
    if (room.members.length >= room.maxMembers) {
      redirect(`/?action=join&error=full&max=${room.maxMembers}`)
    }
    
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId,
        position: room.members.length,
        isActive: true
      }
    })
  }

  revalidatePath('/', 'layout')
  redirect(`/room/${room.id}`)
}

export async function logOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function syncUser() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session?.user) {
    const { user } = session
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        avatarUrl: user.user_metadata?.avatar_url,
      },
      create: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        avatarUrl: user.user_metadata?.avatar_url,
      }
    })
  }
}

export async function reorderQueue(roomId: string, memberIdsInOrder: string[]) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: true }
  })

  if (!room) throw new Error('Room not found')
  if (room.ownerId !== userId) throw new Error('Only the admin can reorder the queue')
  if (room.queueLocked) throw new Error('The queue order has already been locked')

  // Update positions based on array order in a transaction
  const updates = memberIdsInOrder.map((mId, index) => {
    return prisma.roomMember.update({
      where: { id: mId },
      data: { position: index }
    })
  })

  await prisma.$transaction([
    ...updates,
    prisma.room.update({
      where: { id: roomId },
      data: { queueLocked: true }
    })
  ])

  revalidatePath(`/room/${roomId}`)
}
