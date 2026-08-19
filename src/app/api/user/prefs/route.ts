import { NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prefs = await req.json()
    
    // Only allow updating known boolean preference fields
    const allowedKeys = ['notifyNudge', 'notifyOverride', 'notifyNextTurn', 'notifyNextTurnFavor', 'notifyFavorFulfilled']
    const dataToUpdate: Record<string, boolean> = {}
    
    for (const key of allowedKeys) {
      if (typeof prefs[key] === 'boolean') {
        dataToUpdate[key] = prefs[key]
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ success: true })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update user prefs', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
