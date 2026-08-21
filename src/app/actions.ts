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
  const name = formData.get('name') as string
  const maxMembersStr = formData.get('maxMembers') as string
  const avatarUrl = formData.get('avatarUrl') as string | null
  const maxMembers = parseInt(maxMembersStr, 10) || 4

  if (!name || name.trim() === '') {
    redirect('/?error=invalid_name')
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const userId = session.user.id

  // Ensure user exists in our DB
  await syncUser()

  // Generate a random 6 character join code
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const room = await prisma.room.create({
    data: {
      name: name.trim(),
      ownerId: userId,
      joinCode,
      maxMembers,
      avatarUrl,
      members: {
        create: {
          userId
        }
      }
    }
  })

  revalidatePath('/', 'layout')
  redirect(`/room/${room.id}`)
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
      update: {},
      create: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        avatarUrl: user.user_metadata?.avatar_url,
      }
    })
  }
}

