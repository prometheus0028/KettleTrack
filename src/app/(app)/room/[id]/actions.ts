'use server'

import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import webpush from 'web-push'
import { NUDGE_JOKES, OVERRIDE_JOKES, NEXT_TURN_JOKES, NEXT_TURN_FAVOR_JOKES, FAVOR_FULFILLED_JOKES } from '@/utils/jokes'
import fs from 'fs'

function debugLog(...args: any[]) {
  try {
    fs.appendFileSync('actions-debug.log', new Date().toISOString() + ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n')
  } catch (e) {}
}

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function logWash(formData: FormData) {
  debugLog('--- logWash called ---')
  console.log('logWash called');
  const roomId = formData.get('roomId') as string
  console.log('roomId:', roomId);
  const scheduledUserId = formData.get('expectedTurnUserId') as string
  console.log('scheduledUserId:', scheduledUserId);

  const supabase = await createClient()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  debugLog('session fetched', !!session, 'error:', sessionError)

  if (!session?.user || !roomId) {
    debugLog('returning early. User:', session?.user?.id, 'roomId:', roomId)
    console.log('no session or roomId');
    return
  }

  const washedById = session.user.id
  const isOverride = scheduledUserId && scheduledUserId !== washedById
  
  let washerName = session.user.email?.split('@')[0] || 'Someone'

  try {
    const user = await prisma.user.findUnique({ where: { id: washedById } })
    if (user && user.name) washerName = user.name

    const room = await prisma.room.findUnique({ 
      where: { id: roomId },
      include: {
        members: { where: { isActive: true }, orderBy: { position: 'asc' }, include: { user: true } },
      }
    })
    
    if (!room) return

    let favorFulfilled = false
    let targetOverrideUser: any = null
    
    // Choose the wash log joke based on the scenario for the washer
    let logJoke: string | null = null
    
    // 1. Transaction to handle the wash log and favors
    await prisma.$transaction(async (tx) => {
      if (isOverride) {
        // Does the washer currently owe the scheduled user a favor?
        const existingDebt = await tx.favor.findFirst({
          where: {
            roomId,
            owedByUserId: washedById,
            coveredByUserId: scheduledUserId,
            settled: false
          }
        })

        if (existingDebt) {
          // Settle the debt
          await tx.favor.update({
            where: { id: existingDebt.id },
            data: { settled: true, settledAt: new Date() }
          })
          favorFulfilled = true
          logJoke = FAVOR_FULFILLED_JOKES[Math.floor(Math.random() * FAVOR_FULFILLED_JOKES.length)]
          
          const remaining = await tx.favor.count({
            where: {
              roomId,
              owedByUserId: washedById,
              coveredByUserId: scheduledUserId,
              settled: false
            }
          })

          await tx.washLog.create({
            data: {
              roomId,
              washedById,
              expectedTurnUserId: scheduledUserId || null,
              isOverride: true,
              favorSettled: true,
              note: remaining > 0 ? "one favor settled" : "all favors settled",
              joke: logJoke
            }
          })
        } else {
          logJoke = OVERRIDE_JOKES[Math.floor(Math.random() * OVERRIDE_JOKES.length)]
          // Create new favor
          const washLog = await tx.washLog.create({
            data: {
              roomId,
              washedById,
              expectedTurnUserId: scheduledUserId || null,
              isOverride: true,
              joke: logJoke
            }
          })
          
          await tx.favor.create({
            data: {
              roomId,
              owedByUserId: scheduledUserId,
              coveredByUserId: washedById,
              washLogId: washLog.id,
              settled: false
            }
          })
          
          // Set variables for sending override notification later
          targetOverrideUser = await tx.user.findUnique({ where: { id: scheduledUserId } })
        }
      } else {
        // Normal wash, we might just pick a next turn joke or leave it null. Let's just pick one.
        logJoke = NEXT_TURN_JOKES[Math.floor(Math.random() * NEXT_TURN_JOKES.length)]
        await tx.washLog.create({
          data: {
            roomId,
            washedById,
            expectedTurnUserId: scheduledUserId || null,
            isOverride: false,
            joke: logJoke
          }
        })
      }
    })

    // 2. Send OVERRIDE Notification (if they just created a debt)
    if (isOverride && !favorFulfilled && targetOverrideUser && targetOverrideUser.notifyOverride) {
      const overrideJoke = OVERRIDE_JOKES[Math.floor(Math.random() * OVERRIDE_JOKES.length)]
      const payload = JSON.stringify({
        title: 'KettleTrack Update',
        body: `${washerName} washed the kettle for you! You now owe them 1 favor. ${overrideJoke}`,
        url: `/room/${roomId}`
      })
      const subs = await prisma.pushSubscription.findMany({ where: { userId: targetOverrideUser.id } })
      for (const sub of subs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, payload)
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
        }
      }
    }
    
    // 3. Send FAVOR FULFILLED Notification (if they just paid off a debt)
    if (favorFulfilled) {
      const targetUser = await prisma.user.findUnique({ where: { id: scheduledUserId } })
      if (targetUser && targetUser.notifyFavorFulfilled) {
        const fulfillJoke = FAVOR_FULFILLED_JOKES[Math.floor(Math.random() * FAVOR_FULFILLED_JOKES.length)]
        const payload = JSON.stringify({
          title: 'KettleTrack Debt Settled',
          body: `${washerName} washed the kettle to settle their debt to you! ${fulfillJoke}`,
          url: `/room/${roomId}`
        })
        const subs = await prisma.pushSubscription.findMany({ where: { userId: targetUser.id } })
        for (const sub of subs) {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, payload)
          } catch (err: any) {
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } })
            }
          }
        }
      }
    }

    // 4. Calculate Next Turn
    const activeMembers = room.members
    const lastScheduledUserId = scheduledUserId || washedById
    const lastPosIndex = activeMembers.findIndex(m => m.userId === lastScheduledUserId)
    
    let nextIndex = 0
    if (lastPosIndex !== -1) {
      nextIndex = (lastPosIndex + 1) % activeMembers.length
    }
    const nextUser = activeMembers[nextIndex]?.user

    // 5. Send NEXT TURN Notification
    if (nextUser && nextUser.id !== washedById) {
      // Check if nextUser is owed a favor by anyone
      const owedFavor = await prisma.favor.findFirst({
        where: { roomId, coveredByUserId: nextUser.id, settled: false }
      })

      if (owedFavor && nextUser.notifyNextTurnFavor) {
        const turnJoke = NEXT_TURN_FAVOR_JOKES[Math.floor(Math.random() * NEXT_TURN_FAVOR_JOKES.length)]
        const payload = JSON.stringify({
          title: 'Your Turn (But you have a favor!)',
          body: `${washerName} washed it. It's your turn, but someone owes you a favor! ${turnJoke}`,
          url: `/room/${roomId}`
        })
        const subs = await prisma.pushSubscription.findMany({ where: { userId: nextUser.id } })
        for (const sub of subs) {
          try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, payload) } catch(e) {}
        }
      } else if (!owedFavor && nextUser.notifyNextTurn) {
        const turnJoke = NEXT_TURN_JOKES[Math.floor(Math.random() * NEXT_TURN_JOKES.length)]
        const payload = JSON.stringify({
          title: 'Your Turn to Wash',
          body: `${washerName} finally washed it! ${turnJoke}`,
          url: `/room/${roomId}`
        })
        const subs = await prisma.pushSubscription.findMany({ where: { userId: nextUser.id } })
        for (const sub of subs) {
          try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, payload) } catch(e) {}
        }
      }
    }

    revalidatePath('/', 'layout')
  } catch (error: any) {
    debugLog('logWash error:', error?.message || error)
    console.error(error)
  }
}

export async function updateRoomName(formData: FormData) {
  const roomId = formData.get('roomId') as string
  const name = formData.get('name') as string

  if (!roomId || !name) return

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return

  try {
    // Anyone can rename
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) return

    await prisma.room.update({
      where: { id: roomId },
      data: { name }
    })

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }
}

export async function reorderMember(roomId: string, memberId: string, direction: 'up' | 'down') {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) return

    const members = await prisma.roomMember.findMany({
      where: { roomId },
      orderBy: { position: 'asc' }
    })

    const index = members.findIndex(m => m.id === memberId)
    if (index === -1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= members.length) return

    const currentMember = members[index]
    const targetMember = members[targetIndex]

    // Swap positions
    await prisma.$transaction([
      prisma.roomMember.update({
        where: { id: currentMember.id },
        data: { position: targetMember.position }
      }),
      prisma.roomMember.update({
        where: { id: targetMember.id },
        data: { position: currentMember.position }
      })
    ])

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }
}

export async function updateMemberOrder(roomId: string, memberIds: string[]) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user || !roomId || !memberIds || memberIds.length === 0) return

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) return

    // Ensure all members belong to the room
    const members = await prisma.roomMember.findMany({
      where: { roomId }
    })
    
    const validMemberIds = new Set(members.map(m => m.id))
    for (const id of memberIds) {
      if (!validMemberIds.has(id)) return // Invalid input
    }

    // Update positions in a transaction
    await prisma.$transaction(
      memberIds.map((memberId, index) => 
        prisma.roomMember.update({
          where: { id: memberId },
          data: { position: index }
        })
      )
    )

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }
}

export async function deleteRoom(formData: FormData) {
  const roomId = formData.get('roomId') as string

  if (!roomId) return

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) return

    // Delete cascading dependencies manually if Prisma doesn't do it via onDelete
    // Favors -> WashLogs -> RoomMembers -> Room
    await prisma.$transaction([
      prisma.favor.deleteMany({ where: { roomId } }),
      prisma.washLog.deleteMany({ where: { roomId } }),
      prisma.roomMember.deleteMany({ where: { roomId } }),
      prisma.room.delete({ where: { id: roomId } })
    ])

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }
  
  redirect('/')
}

export async function toggleMemberActive(formData: FormData) {
  const roomId = formData.get('roomId') as string
  const memberId = formData.get('memberId') as string
  const isActiveStr = formData.get('isActive') as string

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user || !roomId || !memberId) return

  const room = await prisma.room.findUnique({
    where: { id: roomId }
  })

  if (!room) return

  await prisma.roomMember.update({
    where: { id: memberId },
    data: {
      isActive: isActiveStr === 'true'
    }
  })

  revalidatePath('/', 'layout')
}

export async function deleteWashLog(formData: FormData) {
  const logId = formData.get('logId') as string
  const roomId = formData.get('roomId') as string

  if (!logId || !roomId) return

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return

  try {
    await prisma.$transaction([
      prisma.favor.deleteMany({ where: { washLogId: logId } }),
      prisma.washLog.delete({ where: { id: logId } })
    ])

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }

  redirect(`/room/${roomId}`)
}

export async function updateWashLog(formData: FormData) {
  const logId = formData.get('logId') as string
  const roomId = formData.get('roomId') as string
  const newWashedById = formData.get('washedById') as string

  if (!logId || !roomId || !newWashedById) return

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return

  try {
    await prisma.$transaction(async (tx) => {
      const log = await tx.washLog.findUnique({ where: { id: logId } })
      if (!log) return

      const isOverride = log.expectedTurnUserId && log.expectedTurnUserId !== newWashedById

      await tx.washLog.update({
        where: { id: logId },
        data: {
          washedById: newWashedById,
          isOverride: !!isOverride
        }
      })

      const existingFavor = await tx.favor.findFirst({
        where: { washLogId: logId }
      })

      if (isOverride) {
        if (existingFavor) {
          await tx.favor.update({
            where: { id: existingFavor.id },
            data: {
              coveredByUserId: newWashedById,
              owedByUserId: log.expectedTurnUserId!
            }
          })
        } else {
          await tx.favor.create({
            data: {
              roomId,
              owedByUserId: log.expectedTurnUserId!,
              coveredByUserId: newWashedById,
              washLogId: logId,
              settled: false
            }
          })
        }
      } else {
        if (existingFavor) {
          await tx.favor.delete({ where: { id: existingFavor.id } })
        }
      }
    })

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }

  redirect(`/room/${roomId}`)
}

export async function leaveRoom(formData: FormData) {
  const roomId = formData.get('roomId') as string
  const memberId = formData.get('memberId') as string

  if (!roomId || !memberId) return

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) return

    const member = await prisma.roomMember.findUnique({ where: { id: memberId } })
    
    if (member?.userId !== session.user.id) {
      return // Ensure a user can only remove themselves
    }

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

    if (unresolvedDebts.length > 0) {
      return // Cannot leave if they owe debts
    }

    await prisma.roomMember.delete({ where: { id: memberId } })

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }

  redirect('/')
}

export async function nudgeUser(targetUserId: string, roomId: string) {
  debugLog('--- nudgeUser called ---', targetUserId, roomId)
  const supabase = await createClient()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  debugLog('session fetched', !!session, 'error:', sessionError)

  if (!session?.user) {
    debugLog('No session user found')
    return
  }

  try {
    const nudger = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!nudger) {
      debugLog('Nudger not found in DB')
      return
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) {
      debugLog('Target user not found in DB')
      return
    }

    const randomJoke = NUDGE_JOKES[Math.floor(Math.random() * NUDGE_JOKES.length)]

    // Log the nudge in the DB
    await prisma.nudgeLog.create({
      data: {
        roomId,
        nudgerId: session.user.id,
        nudgedId: targetUserId,
        joke: randomJoke
      }
    })

    if (targetUser.notifyNudge) {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: targetUserId }
      })

      const payload = JSON.stringify({
        title: 'KettleTrack Nudge 👀',
        body: `${nudger.name || nudger.email.split('@')[0]} nudged you ${randomJoke}!`,
        url: `/room/${roomId}`
      })

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh
            }
          }, payload)
        } catch (err: any) {
          console.error('Failed to send push notification', err)
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
        }
      }
    }

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }
}
