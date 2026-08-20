'use server'

import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const avatarUrl = formData.get('avatarUrl') as string

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || null,
      avatarUrl: avatarUrl || null
    }
  })

  revalidatePath('/', 'layout')
}

export async function logOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
