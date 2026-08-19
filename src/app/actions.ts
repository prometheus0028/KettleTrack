'use server'

import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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

  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  await prisma.room.create({
    data: {
      name,
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

  redirect('/')
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
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId,
        position: room.members.length,
        isActive: true
      }
    })
  }

  redirect('/')
}

export async function logOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
