import '../loadEnv.js'
import prisma from '../config/database.js'

async function main() {
  await prisma.$executeRaw`ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "image_data" TEXT`
  console.log('Feedback image column is ready.')
}

main()
  .catch((error) => {
    console.error('Feedback image migration failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
