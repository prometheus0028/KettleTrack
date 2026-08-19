import re

with open('src/app/(app)/room/[id]/actions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('export async function logWash')
end_idx = content.find('export async function updateRoomName')

new_log_wash = """export async function logWash(formData: FormData) {
  const roomId = formData.get('roomId') as string
  const scheduledUserId = formData.get('expectedTurnUserId') as string

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user || !roomId) return

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
    
    const { OVERRIDE_JOKES, NEXT_TURN_JOKES, NEXT_TURN_FAVOR_JOKES, FAVOR_FULFILLED_JOKES } = await import('@/utils/jokes')

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
          
          await tx.washLog.create({
            data: {
              roomId,
              washedById,
              expectedTurnUserId: scheduledUserId || null,
              isOverride: true,
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

    revalidatePath(`/room/${roomId}`)
  } catch (error) {
    console.error(error)
  }
}
"""

new_content = content[:start_idx] + new_log_wash + "\n" + content[end_idx:]

with open('src/app/(app)/room/[id]/actions.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done")
