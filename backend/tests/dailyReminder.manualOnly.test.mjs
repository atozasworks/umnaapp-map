import test from 'node:test'
import assert from 'node:assert/strict'

import { startDailyReminderScheduler } from '../services/dailyReminderService.js'

test('daily reminder scheduler is disabled in manual-only mode', () => {
  const result = startDailyReminderScheduler()

  assert.equal(result?.enabled, false)
  assert.equal(result?.manualOnly, true)
})
