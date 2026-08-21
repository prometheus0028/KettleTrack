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

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@kettletrack.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

function hashSubgroup(userIds: string[]): string {
  return [...userIds].sort().join(',')
}

export async function getOrCreateSubgroup(roomId: string, userIds: string[]) {
  if (userIds.length < 2) throw new Error("A subgroup must have at least 2 members.")
  const hash = hashSubgroup(userIds)
  
  let subgroup = await prisma.subgroup.findUnique({
    where: { roomId_hash: { roomId, hash } },
    include: { members: { orderBy: { position: 'asc' }, include: { user: true } } }
  })

  if (!subgroup) {
    // Lazy creation: shuffle members so the initial queue order is random
    const shuffledUserIds = [...userIds].sort(() => Math.random() - 0.5)
    
    subgroup = await prisma.subgroup.create({
      data: {
        roomId,
        hash,
        isActive: true,
        members: {
          create: shuffledUserIds.map((uid, idx) => ({
            userId: uid,
            position: idx
          }))
        }
      },
      include: { members: { orderBy: { position: 'asc' }, include: { user: true } } }
    })
  } else if (!subgroup.isActive) {
    subgroup = await prisma.subgroup.update({
      where: { id: subgroup.id },
      data: { isActive: true },
      include: { members: { orderBy: { position: 'asc' }, include: { user: true } } }
    })
  }
  
  return subgroup
}

export async function getTurnForSubgroup(roomId: string, userIds: string[]) {
  const subgroup = await getOrCreateSubgroup(roomId, userIds)
  // The first person in the queue is whose turn it is
  return subgroup.members[0].user
}

export async function logWash(formData: FormData) {
  const roomId = formData.get('roomId') as string
  const whoUsedItStr = formData.get('whoUsedItIds') as string
  const washedById = formData.get('washedById') as string
  
  if (!roomId || !whoUsedItStr || !washedById) return

  const whoUsedItIds: string[] = JSON.parse(whoUsedItStr)
  if (whoUsedItIds.length < 2) return

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return

  try {
    const subgroup = await getOrCreateSubgroup(roomId, whoUsedItIds)
    const expectedTurnUserId = subgroup.members[0].userId
    const isOverride = expectedTurnUserId !== washedById

    let washerName = session.user.email?.split('@')[0] || 'Someone'
    const user = await prisma.user.findUnique({ where: { id: washedById } })
    if (user && user.name) washerName = user.name

    let favorFulfilled = false
    let targetOverrideUser: any = null
    let logJoke: string | null = null

    await prisma.$transaction(async (tx) => {
      let washLogId = ""

      if (isOverride) {
        // Did washer owe a favor to the expectedTurnUserId?
        const existingDebt = await tx.favor.findFirst({
          where: {
            roomId,
            owedByUserId: washedById,
            coveredByUserId: expectedTurnUserId,
            settled: false
          }
        })

        if (existingDebt) {
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
              coveredByUserId: expectedTurnUserId,
              settled: false
            }
          })

          const washLog = await tx.washLog.create({
            data: {
              roomId,
              subgroupId: subgroup.id,
              washedById,
              expectedTurnUserId,
              isOverride: true,
              favorSettled: true,
              note: remaining > 0 ? "one favor settled" : "all favors settled",
              joke: logJoke
            }
          })
          washLogId = washLog.id
        } else {
          logJoke = OVERRIDE_JOKES[Math.floor(Math.random() * OVERRIDE_JOKES.length)]
          const washLog = await tx.washLog.create({
            data: {
              roomId,
              subgroupId: subgroup.id,
              washedById,
              expectedTurnUserId,
              isOverride: true,
              joke: logJoke
            }
          })
          washLogId = washLog.id
          
          await tx.favor.create({
            data: {
              roomId,
              owedByUserId: expectedTurnUserId,
              coveredByUserId: washedById,
              washLogId: washLog.id,
              settled: false
            }
          })
          targetOverrideUser = await tx.user.findUnique({ where: { id: expectedTurnUserId } })
        }
      } else {
        logJoke = NEXT_TURN_JOKES[Math.floor(Math.random() * NEXT_TURN_JOKES.length)]
        const washLog = await tx.washLog.create({
          data: {
            roomId,
            subgroupId: subgroup.id,
            washedById,
            expectedTurnUserId,
            isOverride: false,
            joke: logJoke
          }
        })
        washLogId = washLog.id
      }

      // Advance queue: move front member to the back
      const members = await tx.subgroupMember.findMany({
        where: { subgroupId: subgroup.id },
        orderBy: { position: 'asc' }
      })
      
      const firstMember = members[0]
      for (let i = 1; i < members.length; i++) {
        await tx.subgroupMember.update({
          where: { id: members[i].id },
          data: { position: i - 1 }
        })
      }
      await tx.subgroupMember.update({
        where: { id: firstMember.id },
        data: { position: members.length - 1 }
      })
    })

    // 2. Send OVERRIDE Notification
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
    
    // 3. Send FAVOR FULFILLED Notification
    if (favorFulfilled) {
      const targetUser = await prisma.user.findUnique({ where: { id: expectedTurnUserId } })
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

    // 4. Send NEXT TURN Notification for the subgroup
    const updatedMembers = await prisma.subgroupMember.findMany({
      where: { subgroupId: subgroup.id },
      orderBy: { position: 'asc' },
      include: { user: true }
    })
    
    const nextUser = updatedMembers[0]?.user

    if (nextUser && nextUser.id !== washedById) {
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
    await prisma.room.update({
      where: { id: roomId },
      data: { name }
    })
    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }
}

export async function updateRoomAvatar(formData: FormData) {
  const roomId = formData.get('roomId') as string
  const avatarUrl = formData.get('avatarUrl') as string

  if (!roomId || !avatarUrl) return

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return

  try {
    await prisma.room.update({
      where: { id: roomId },
      data: { avatarUrl }
    })
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

    await prisma.$transaction([
      prisma.favor.deleteMany({ where: { roomId } }),
      prisma.washLog.deleteMany({ where: { roomId } }),
      prisma.subgroupMember.deleteMany({ where: { subgroup: { roomId } } }),
      prisma.subgroup.deleteMany({ where: { roomId } }),
      prisma.roomMember.deleteMany({ where: { roomId } }),
      prisma.room.delete({ where: { id: roomId } })
    ])

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }
  
  redirect('/')
}

export async function deleteWashLog(formData: FormData) {
  const logId = formData.get('logId') as string
  const roomId = formData.get('roomId') as string

  if (!logId || !roomId) return

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return

  try {
    const log = await prisma.washLog.findUnique({ where: { id: logId } })
    if (!log || !log.subgroupId) return

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated favors
      await tx.favor.deleteMany({ where: { washLogId: logId } })

      // 2. Rewind the subgroup queue
      const members = await tx.subgroupMember.findMany({
        where: { subgroupId: log.subgroupId! },
        orderBy: { position: 'asc' }
      })

      // To rewind, move the LAST member to position 0, shift everyone else down
      if (members.length > 0) {
        const lastMember = members[members.length - 1]
        for (let i = members.length - 2; i >= 0; i--) {
          await tx.subgroupMember.update({
            where: { id: members[i].id },
            data: { position: i + 1 }
          })
        }
        await tx.subgroupMember.update({
          where: { id: lastMember.id },
          data: { position: 0 }
        })
      }

      // 3. Delete log
      await tx.washLog.delete({ where: { id: logId } })
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
    const member = await prisma.roomMember.findUnique({ where: { id: memberId } })
    if (member?.userId !== session.user.id) return 

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

    if (unresolvedDebts.length > 0) return 

    await prisma.$transaction(async (tx) => {
      // Mark any subgroups this user is in as inactive
      const userSubgroupMembers = await tx.subgroupMember.findMany({
        where: { userId: session.user.id, subgroup: { roomId } }
      })
      
      const subgroupIDs = userSubgroupMembers.map(m => m.subgroupId)
      if (subgroupIDs.length > 0) {
        await tx.subgroup.updateMany({
          where: { id: { in: subgroupIDs } },
          data: { isActive: false }
        })
      }

      await tx.roomMember.delete({ where: { id: memberId } })
    })

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(error)
  }

  redirect('/')
}

export async function nudgeUserForSubgroup(targetUserId: string, roomId: string, subgroupId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return

  try {
    const nudger = await prisma.user.findUnique({ where: { id: session.user.id } })
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!nudger || !targetUser) return

    const randomJoke = NUDGE_JOKES[Math.floor(Math.random() * NUDGE_JOKES.length)]

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
            keys: { auth: sub.auth, p256dh: sub.p256dh }
          }, payload)
        } catch (err: any) {
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

export async function reorderSubgroup(roomId: string, subgroupId: string, memberIdsInOrder: string[]) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room || room.ownerId !== session.user.id) return // Only admin

    const subgroup = await prisma.subgroup.findUnique({ where: { id: subgroupId } })
    if (!subgroup || subgroup.queueLocked) return

    await prisma.$transaction(async (tx) => {
      // Ensure all members belong to the subgroup
      const members = await tx.subgroupMember.findMany({ where: { subgroupId } })
      const validMemberIds = new Set(members.map(m => m.id))
      
      for (const id of memberIdsInOrder) {
        if (!validMemberIds.has(id)) return // Invalid input
      }

      // Update positions
      for (let i = 0; i < memberIdsInOrder.length; i++) {
        await tx.subgroupMember.update({
          where: { id: memberIdsInOrder[i] },
          data: { position: i }
        })
      }

      await tx.subgroup.update({
        where: { id: subgroupId },
        data: { queueLocked: true }
      })
    })

    revalidatePath(`/room/${roomId}`)
  } catch (error) {
    console.error(error)
  }
}

export async function getPredictedTurn(roomId: string, whoUsedItIds: string[]) {
  if (whoUsedItIds.length < 2) return null
  const subgroup = await getOrCreateSubgroup(roomId, whoUsedItIds)
  return subgroup.members[0].user
}
