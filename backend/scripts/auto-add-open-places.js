/**
 * Adds places from the OpenPlace catalogue to the map automatically.
 * (Catalogue is filled by scripts/import-open-places.js.)
 *
 * Run from backend/:
 *
 *   # See what would happen, write nothing
 *   node scripts/auto-add-open-places.js --bbox 75.3,12.6,75.6,12.9 --dry-run
 *
 *   # Add up to 200 places in a named area
 *   node scripts/auto-add-open-places.js --region "Kadaba, Dakshina Kannada, Karnataka" --limit 200
 *
 * What happens to each catalogue place:
 *   - same as a place already on the map (rules, or AI for unclear pairs) → not added
 *   - confidence >= --approve-confidence (default 0.85)                   → added, visible to everyone
 *   - lower confidence, unknown category, or AI unsure about a duplicate  → added as pending for admin review
 *   - confidence < --min-confidence (default 0.5)                         → left alone
 * Each decision is stored on the catalogue row, so the next run continues with the rest.
 *
 * Options:
 *   --bbox west,south,east,north | --region "place name"
 *   --limit 200                  catalogue rows handled per run
 *   --approve-confidence 0.85    --min-confidence 0.5
 *   --review-only                never approve directly; everything waits for an admin
 *   --review-days 30             a held place is auto-approved after this many days without a decision
 *   --categories "Temple,School" --sources overture,foursquare,csv
 *   --trust csv                  sources without a confidence score that may be approved directly
 *   --owner-email you@example.com   existing user to own the places (default: a dedicated import user)
 *   --no-ai  --no-geocode  --no-translate  --dry-run
 *   --reset                      forget earlier decisions of status "skipped" in the area (re-check them)
 */
import '../loadEnv.js'
import prisma from '../config/database.js'
import { runAutoAdd, ensureAutoAddColumns } from '../services/openPlaceAutoAdd.js'
import { lookupRegion } from '../services/openPlaceQuery.js'

const FLAGS = new Set(['dry-run', 'no-ai', 'no-geocode', 'no-translate', 'review-only', 'reset', 'help'])

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`)
    const key = token.slice(2)
    if (FLAGS.has(key)) args[key] = true
    else {
      const value = argv[++i]
      if (value == null || value.startsWith('--')) throw new Error(`--${key} needs a value`)
      args[key] = value
    }
  }
  return args
}

const list = (value) =>
  value
    ? String(value).split(',').map((s) => s.trim()).filter(Boolean)
    : null

function number(value, fallback, name, min, max) {
  if (value == null) return fallback
  const n = Number(value)
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`--${name} must be between ${min} and ${max}`)
  return n
}

async function resolveBbox(args) {
  if (args.bbox) {
    const p = String(args.bbox).split(',').map(Number)
    if (p.length !== 4 || p.some((n) => !Number.isFinite(n)) || p[0] >= p[2] || p[1] >= p[3]) {
      throw new Error('--bbox must be "west,south,east,north"')
    }
    return { minLng: p[0], minLat: p[1], maxLng: p[2], maxLat: p[3] }
  }
  if (args.region) {
    const region = await lookupRegion(args.region)
    if (!region) throw new Error(`Could not find the region "${args.region}"`)
    console.log(`Region: ${region.name}`)
    return region.bbox
  }
  throw new Error('Give an area: --bbox west,south,east,north  or  --region "place name"')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log('See the comment at the top of scripts/auto-add-open-places.js for options.')
    return
  }
  const bbox = await resolveBbox(args)
  const dryRun = Boolean(args['dry-run'])

  if (args.reset && !dryRun) {
    await ensureAutoAddColumns()
    const n = await prisma.$executeRawUnsafe(
      `UPDATE "OpenPlace" SET auto_status = NULL, auto_note = NULL, auto_checked_at = NULL
       WHERE auto_status = 'skipped' AND latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4`,
      bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng
    )
    console.log(`Reset ${n} skipped catalogue row(s).`)
  }

  const summary = await runAutoAdd({
    bbox,
    limit: number(args.limit, 200, 'limit', 1, 5000),
    approveConfidence: number(args['approve-confidence'], 0.85, 'approve-confidence', 0, 1),
    minConfidence: number(args['min-confidence'], 0.5, 'min-confidence', 0, 1),
    reviewDays: number(args['review-days'], 30, 'review-days', 1, 3650),
    reviewOnly: Boolean(args['review-only']),
    categories: list(args.categories),
    sources: list(args.sources),
    trustedSources: list(args.trust) || [],
    ownerEmail: args['owner-email'] || null,
    useAi: !args['no-ai'],
    geocode: !args['no-geocode'],
    translate: !args['no-translate'],
    dryRun,
    log: (msg) => console.log(msg),
  })

  if (dryRun && summary.items.length) {
    console.log('')
    for (const item of summary.items) {
      const conf = item.confidence == null ? ' -- ' : Number(item.confidence).toFixed(2)
      console.log(`  ${item.decision.padEnd(9)} ${conf}  ${item.name} [${item.category}] — ${item.reason}`)
    }
  }

  console.log('')
  console.log(dryRun ? 'DRY RUN — nothing was written.' : 'Done.')
  console.log(`  checked            : ${summary.scanned}`)
  console.log(`  added (approved)   : ${summary.approved}`)
  console.log(`  added (for review) : ${summary.review}`)
  console.log(`  duplicates skipped : ${summary.duplicates}`)
  console.log(`  low quality skipped: ${summary.skipped}`)
  if (summary.failed) console.log(`  failed             : ${summary.failed}`)
  console.log(
    `  AI                 : ${summary.aiEnabled ? 'on' : 'off'} — ${summary.aiPairs} unclear pair(s)` +
      (summary.aiPairs ? ` (same ${summary.aiSame}, different ${summary.aiDifferent}, unsure ${summary.aiUnsure})` : '')
  )
  console.log(`  still waiting      : ${summary.remainingAfter} catalogue place(s) in this area`)
  if (summary.failed) {
    for (const item of summary.items.filter((i) => i.decision === 'failed').slice(0, 10)) {
      console.log(`  ! ${item.name}: ${item.reason}`)
    }
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    console.error('Auto-add failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
