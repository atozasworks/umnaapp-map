/**
 * Imports open-data places into the OpenPlace table (the catalogue the Place
 * Extractor reads from). Nothing imported here appears on the public map until
 * a user picks it in the extractor and it passes the normal approval flow.
 *
 * Run from backend/ (after `npm run migrate:open-places`):
 *
 *   # Overture Maps — no account needed, reads straight from the public bucket
 *   node scripts/import-open-places.js --source overture --bbox 74.9,12.5,75.9,13.2
 *   node scripts/import-open-places.js --source overture --bbox india --country IN
 *
 *   # Foursquare OS Places — needs a free account; download the parquet files
 *   # (or set HF_TOKEN and pass the hf:// path) and point --file at them
 *   node scripts/import-open-places.js --source foursquare --file "D:/fsq/places/*.parquet" --country IN
 *
 *   # Any CSV with coordinates (government datasets: schools, health centres, post offices…)
 *   node scripts/import-open-places.js --source csv --file schools.csv --dataset "UDISE schools" \
 *     --name-col school_name --lat-col latitude --lng-col longitude --category School
 *
 * Options: --min-confidence 0.5 (overture)  --release 2026-11-18.0 (overture)
 *          --dry-run (download + count only, no database writes)  --keep-file
 */
import '../loadEnv.js'
import fs from 'fs'
import os from 'os'
import path from 'path'
import readline from 'readline'
import pg from 'pg'
import { mapOpenCategory } from '../utils/openPlaceCategory.js'

const BBOX_PRESETS = {
  india: [68.0, 6.5, 97.5, 37.2],
  karnataka: [74.0, 11.5, 78.6, 18.5],
}

const BATCH_SIZE = 1000

/** Overture gives regions as ISO 3166-2 codes ("IN-KA"); store the readable state name. */
const INDIA_STATE_CODES = {
  AN: 'Andaman and Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam',
  BR: 'Bihar', CH: 'Chandigarh', CG: 'Chhattisgarh', CT: 'Chhattisgarh',
  DH: 'Dadra and Nagar Haveli and Daman and Diu', DL: 'Delhi', GA: 'Goa', GJ: 'Gujarat',
  HR: 'Haryana', HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir', JH: 'Jharkhand',
  KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep', MP: 'Madhya Pradesh',
  MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya', MZ: 'Mizoram', NL: 'Nagaland',
  OD: 'Odisha', OR: 'Odisha', PY: 'Puducherry', PB: 'Punjab', RJ: 'Rajasthan', SK: 'Sikkim',
  TN: 'Tamil Nadu', TG: 'Telangana', TS: 'Telangana', TR: 'Tripura', UP: 'Uttar Pradesh',
  UK: 'Uttarakhand', UT: 'Uttarakhand', WB: 'West Bengal',
}

function readableRegion(region, country) {
  const value = String(region || '').trim()
  if (!value) return null
  const m = value.match(/^([A-Z]{2})-([A-Z0-9]{1,3})$/)
  if (m) return m[1] === 'IN' ? INDIA_STATE_CODES[m[2]] || null : null
  if (String(country || '').toUpperCase() === 'IN' && INDIA_STATE_CODES[value.toUpperCase()]) {
    return INDIA_STATE_CODES[value.toUpperCase()]
  }
  return value
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[key] = true
    else {
      out[key] = next
      i++
    }
  }
  return out
}

function parseBbox(value) {
  if (!value || value === true) return null
  const preset = BBOX_PRESETS[String(value).toLowerCase()]
  const parts = preset || String(value).split(',').map((n) => parseFloat(n))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error('--bbox must be "west,south,east,north" (or: india, karnataka)')
  }
  const [west, south, east, north] = parts
  if (west >= east || south >= north) throw new Error('--bbox: west must be < east and south < north')
  return { west, south, east, north }
}

/** Single-quoted SQL literal. */
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`
/** Double-quoted SQL identifier (CSV column names come from the command line). */
const ident = (v) => `"${String(v).replace(/"/g, '""')}"`

async function openDuckDb() {
  let mod
  try {
    mod = await import('@duckdb/node-api')
  } catch {
    throw new Error('DuckDB is not installed. Run:  npm install -D @duckdb/node-api')
  }
  const instance = await mod.DuckDBInstance.create(':memory:')
  return instance.connect()
}

async function latestOvertureRelease(conn) {
  const reader = await conn.runAndReadAll(
    "SELECT latest FROM read_json('https://stac.overturemaps.org/catalog.json')"
  )
  const release = reader.getRows()?.[0]?.[0]
  if (!release) throw new Error('Could not read the latest Overture release; pass --release explicitly.')
  return String(release)
}

function bboxWhere(bbox, lngExpr, latExpr) {
  if (!bbox) return []
  return [
    `${lngExpr} BETWEEN ${bbox.west} AND ${bbox.east}`,
    `${latExpr} BETWEEN ${bbox.south} AND ${bbox.north}`,
  ]
}

async function buildOvertureQuery(conn, args, bbox) {
  if (!bbox) throw new Error('--source overture needs --bbox (the full dataset is worldwide).')
  await conn.run('INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;')
  await conn.run("SET s3_region = 'us-west-2';")
  const release = args.release && args.release !== true ? String(args.release) : await latestOvertureRelease(conn)
  const minConfidence = Number.isFinite(parseFloat(args['min-confidence']))
    ? parseFloat(args['min-confidence'])
    : 0.5
  const where = [
    ...bboxWhere(bbox, 'bbox.xmin', 'bbox.ymin'),
    'names.primary IS NOT NULL',
    `coalesce(confidence, 0) >= ${minConfidence}`,
    "coalesce(operating_status, 'open') <> 'permanently_closed'",
  ]
  if (args.country && args.country !== true) {
    where.push(`addresses[1].country = ${lit(String(args.country).toUpperCase())}`)
  }
  const sql = `
    SELECT
      id AS source_id,
      names.primary AS name,
      taxonomy.primary AS cat_a,
      basic_category AS cat_b,
      ST_Y(geometry) AS latitude,
      ST_X(geometry) AS longitude,
      addresses[1].freeform AS full_address,
      addresses[1].locality AS locality,
      addresses[1].region AS region,
      addresses[1].postcode AS postcode,
      addresses[1].country AS country,
      phones[1] AS phone,
      websites[1] AS website,
      confidence,
      sources[1].dataset AS dataset
    FROM read_parquet(
      's3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*',
      hive_partitioning = 1
    )
    WHERE ${where.join('\n      AND ')}`
  return { sql, release, label: `Overture ${release}` }
}

async function buildFoursquareQuery(conn, args, bbox) {
  if (!args.file || args.file === true) {
    throw new Error(
      '--source foursquare needs --file "<path or glob to the places parquet files>".\n' +
        'Foursquare now requires a free account to download: see https://docs.foursquare.com/data-products/docs/access-fsq-os-places'
    )
  }
  const file = String(args.file)
  if (/^(hf|https?|s3):/i.test(file)) await conn.run('INSTALL httpfs; LOAD httpfs;')
  if (file.startsWith('hf://')) {
    const token = (process.env.HF_TOKEN || '').trim()
    if (!token) throw new Error('Reading hf:// paths needs HF_TOKEN in the environment (the dataset is gated).')
    await conn.run(`CREATE OR REPLACE SECRET hf_token (TYPE HUGGINGFACE, TOKEN ${lit(token)});`)
  }
  const where = [
    ...bboxWhere(bbox, 'longitude', 'latitude'),
    'name IS NOT NULL',
    'latitude IS NOT NULL',
    'longitude IS NOT NULL',
    'date_closed IS NULL',
  ]
  if (args.country && args.country !== true) {
    where.push(`country = ${lit(String(args.country).toUpperCase())}`)
  }
  const release = (file.match(/dt=(\d{4}-\d{2}-\d{2})/) || [])[1] || null
  const sql = `
    SELECT
      fsq_place_id AS source_id,
      name,
      fsq_category_labels[1] AS cat_a,
      fsq_category_labels[2] AS cat_b,
      latitude,
      longitude,
      address AS full_address,
      locality,
      region,
      postcode,
      country,
      tel AS phone,
      website,
      NULL::FLOAT AS confidence,
      'foursquare' AS dataset
    FROM read_parquet(${lit(file)})
    WHERE ${where.join('\n      AND ')}`
  return { sql, release, label: `Foursquare OS Places${release ? ` ${release}` : ''}` }
}

async function buildCsvQuery(conn, args, bbox) {
  if (!args.file || args.file === true) throw new Error('--source csv needs --file <path.csv>')
  const need = (flag) => {
    if (!args[flag] || args[flag] === true) throw new Error(`--source csv needs --${flag}`)
    return ident(args[flag])
  }
  const opt = (flag) => (args[flag] && args[flag] !== true ? `CAST(${ident(args[flag])} AS VARCHAR)` : 'NULL')
  const name = need('name-col')
  const lat = `TRY_CAST(${need('lat-col')} AS DOUBLE)`
  const lng = `TRY_CAST(${need('lng-col')} AS DOUBLE)`
  const dataset = args.dataset && args.dataset !== true ? String(args.dataset) : path.basename(String(args.file))
  const fixedCategory = args.category && args.category !== true ? lit(args.category) : 'NULL'
  const idExpr =
    args['id-col'] && args['id-col'] !== true
      ? `CAST(${ident(args['id-col'])} AS VARCHAR)`
      : `md5(concat_ws('|', CAST(${name} AS VARCHAR), CAST(${lat} AS VARCHAR), CAST(${lng} AS VARCHAR)))`
  const where = [
    ...bboxWhere(bbox, lng, lat),
    `${name} IS NOT NULL`,
    `${lat} BETWEEN -90 AND 90`,
    `${lng} BETWEEN -180 AND 180`,
  ]
  const sql = `
    SELECT
      ${idExpr} AS source_id,
      CAST(${name} AS VARCHAR) AS name,
      ${opt('category-col')} AS cat_a,
      ${fixedCategory} AS cat_b,
      ${lat} AS latitude,
      ${lng} AS longitude,
      ${opt('address-col')} AS full_address,
      ${opt('locality-col')} AS locality,
      ${opt('region-col')} AS region,
      ${opt('postcode-col')} AS postcode,
      ${opt('country-col')} AS country,
      ${opt('phone-col')} AS phone,
      ${opt('website-col')} AS website,
      NULL::FLOAT AS confidence,
      ${lit(dataset)} AS dataset
    FROM read_csv_auto(${lit(String(args.file))}, all_varchar = true)
    WHERE ${where.join('\n      AND ')}`
  return { sql, release: null, label: `CSV "${dataset}"`, fixedCategory: args.category && args.category !== true ? String(args.category) : null }
}

const clip = (v, max) => {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s.slice(0, max) : null
}

function toRow(raw, source, release, fixedCategory) {
  const lat = Number(raw.latitude)
  const lng = Number(raw.longitude)
  const name = clip(raw.name, 200)
  const sourceId = clip(raw.source_id, 200)
  if (!name || !sourceId || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  const rawCategory = clip(raw.cat_a, 200) || clip(raw.cat_b, 200)
  return {
    id: `${source}:${sourceId}`,
    source,
    source_id: sourceId,
    name,
    // A fixed --category is already one of the app's categories; otherwise map it.
    category: fixedCategory || mapOpenCategory(raw.cat_a, raw.cat_b, name),
    raw_category: rawCategory,
    latitude: lat,
    longitude: lng,
    full_address: clip(raw.full_address, 500),
    locality: clip(raw.locality, 200),
    region: clip(readableRegion(raw.region, raw.country), 200),
    postcode: clip(raw.postcode, 20),
    country: clip(raw.country, 100),
    phone: clip(raw.phone, 50),
    website: clip(raw.website, 500),
    confidence: raw.confidence == null ? null : Number(raw.confidence),
    dataset: clip(raw.dataset, 100),
    release,
  }
}

const UPSERT_SQL = `
  INSERT INTO "OpenPlace" (
    id, source, source_id, name, category, raw_category, latitude, longitude,
    full_address, locality, region, postcode, country, phone, website,
    confidence, dataset, release, imported_at
  )
  SELECT
    t.id, t.source, t.source_id, t.name, t.category, t.raw_category, t.latitude, t.longitude,
    t.full_address, t.locality, t.region, t.postcode, t.country, t.phone, t.website,
    t.confidence, t.dataset, t.release, now()
  FROM jsonb_to_recordset($1::jsonb) AS t(
    id text, source text, source_id text, name text, category text, raw_category text,
    latitude double precision, longitude double precision,
    full_address text, locality text, region text, postcode text, country text,
    phone text, website text, confidence real, dataset text, release text
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, raw_category = EXCLUDED.raw_category,
    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
    full_address = EXCLUDED.full_address, locality = EXCLUDED.locality, region = EXCLUDED.region,
    postcode = EXCLUDED.postcode, country = EXCLUDED.country, phone = EXCLUDED.phone,
    website = EXCLUDED.website, confidence = EXCLUDED.confidence, dataset = EXCLUDED.dataset,
    release = EXCLUDED.release, imported_at = now()`

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const source = String(args.source || '').toLowerCase()
  if (!['overture', 'foursquare', 'csv'].includes(source)) {
    throw new Error('Pass --source overture | foursquare | csv   (see the header of this script for examples)')
  }
  const bbox = parseBbox(args.bbox)
  const dryRun = Boolean(args['dry-run'])

  const conn = await openDuckDb()
  const builder = { overture: buildOvertureQuery, foursquare: buildFoursquareQuery, csv: buildCsvQuery }[source]
  const { sql, release, label, fixedCategory = null } = await builder(conn, args, bbox)

  const tmpFile = path.join(os.tmpdir(), `open-places-${source}-${Date.now()}.ndjson`)
  console.log(`Reading ${label}${bbox ? ` for bbox ${bbox.west},${bbox.south},${bbox.east},${bbox.north}` : ''}…`)
  const started = Date.now()
  await conn.run(`COPY (${sql}\n) TO ${lit(tmpFile.replace(/\\/g, '/'))} (FORMAT JSON);`)
  console.log(`Downloaded in ${((Date.now() - started) / 1000).toFixed(1)}s → ${tmpFile}`)

  let pool = null
  if (!dryRun) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (backend/.env).')
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
    const check = await pool.query(`SELECT to_regclass('public."OpenPlace"') AS t`)
    if (!check.rows[0]?.t) throw new Error('OpenPlace table is missing. Run:  npm run migrate:open-places')
  }

  let read = 0
  let skipped = 0
  let written = 0
  const byCategory = new Map()
  let batch = []
  const flush = async () => {
    if (batch.length === 0) return
    if (pool) await pool.query(UPSERT_SQL, [JSON.stringify(batch)])
    written += batch.length
    batch = []
    process.stdout.write(`\r  ${dryRun ? 'counted' : 'saved'} ${written} places`)
  }

  const rl = readline.createInterface({ input: fs.createReadStream(tmpFile), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    read++
    let row = null
    try {
      row = toRow(JSON.parse(line), source, release, fixedCategory)
    } catch {
      row = null
    }
    if (!row) {
      skipped++
      continue
    }
    byCategory.set(row.category, (byCategory.get(row.category) || 0) + 1)
    batch.push(row)
    if (batch.length >= BATCH_SIZE) await flush()
  }
  await flush()
  process.stdout.write('\n')

  if (pool) await pool.end()
  if (!args['keep-file']) fs.rmSync(tmpFile, { force: true })

  console.log(`${dryRun ? 'Dry run — nothing written. Found' : 'Imported'} ${written} places (${read} read, ${skipped} skipped as invalid).`)
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
  for (const [category, count] of top) console.log(`  ${String(count).padStart(8)}  ${category}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nImport failed:', err.message)
    process.exit(1)
  })
