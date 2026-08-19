import { prisma } from '../src/utils/prisma'

async function main() {
  const room = await prisma.room.findFirst()
  if (!room) {
    console.log("No room found")
    return
  }
  const user = await prisma.user.findFirst()
  if (!user) {
    console.log("No user found")
    return
  }
  
  console.log("Trying to insert WashLog...")
  try {
    const log = await prisma.washLog.create({
      data: {
        roomId: room.id,
        washedById: user.id,
        expectedTurnUserId: user.id,
        isOverride: false,
        joke: "Test joke"
      }
    })
    console.log("Success!", log)
  } catch (e) {
    console.error("Error inserting:", e)
  }
}

main()
