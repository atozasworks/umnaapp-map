/**
 * Manually trigger the daily "Add a Place" reminder email run.
 *
 * Useful for:
 *   - Local testing:            node scripts/send-daily-reminders.js
 *   - External system cron:     (crontab) 0 9 * * *  cd /app/backend && node scripts/send-daily-reminders.js
 *
 * The in-process scheduler in server.js already runs this daily; a system cron
 * is an optional, more robust alternative. The per-day dedupe means running it
 * more than once a day will not send anyone a second email.
 *
 * Pass --force to bypass nothing extra (dedupe still applies); it simply logs
 * that the run was manually forced.
 */
import '../loadEnv.js'
import prisma from '../config/database.js'
import { sendDailyReminders } from '../services/dailyReminderService.js'

const force = process.argv.includes('--force')

sendDailyReminders({ force })
  .then((summary) => {
    console.log('Daily reminder summary:', summary)
    process.exit(0)
  })
  .catch((err) => {
    console.error('Daily reminder run failed:', err.message)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect().catch(() => {})
  })
