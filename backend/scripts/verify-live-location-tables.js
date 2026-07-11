import prisma from '../config/database.js'

const count = await prisma.liveLocationShare.count()
console.log({ liveLocationShareTableReady: true, count })
await prisma.$disconnect()
