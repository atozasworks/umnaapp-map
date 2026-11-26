/**
 * "Extract & add" for a whole region, started by an admin from the Place Extractor.
 *
 * One background job at a time:
 *   1. find the region's bounding box (Nominatim)
 *   2. import that area from Overture into the OpenPlace catalogue (services/openPlaceImport.js)
 *   3. run the auto-add job on it (services/openPlaceAutoAdd.js)
 *
 * The job lives in memory: a server restart forgets it, but the catalogue rows keep
 * their decisions, so starting the same region again simply continues.
 */
import { lookupRegion } from './openPlaceQuery.js'
import { runAutoAdd } from './openPlaceAutoAdd.js'
import { importOvertureBbox } from './openPlaceImport.js'

export const REGION_JOB_MAX_AREA_KM2 = parseFloat(process.env.AUTO_ADD_MAX_AREA_KM2) || 2500
export const REGION_JOB_MAX_PLACES = parseInt(process.env.AUTO_ADD_MAX_PLACES, 10) || 1000
const LOG_LINES = 40

/** @type {null | object} */
let current = null

function bboxAreaKm2({ minLat, maxLat, minLng, maxLng }) {
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180)
  return Math.abs((maxLat - minLat) * 111.32 * (maxLng - minLng) * 111.32 * Math.cos(midLat))
}

export class RegionJobError extends Error {
  constructor(code, message, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

function publicJob(job) {
  if (!job) return null
  const { summary, ...rest } = job
  return {
    ...rest,
    summary: summary
      ? {
          checked: summary.scanned,
          approved: summary.approved,
          review: summary.review,
          duplicates: summary.duplicates,
          skipped: summary.skipped,
          failed: summary.failed,
          remaining: summary.remainingAfter,
          aiEnabled: summary.aiEnabled,
          aiPairs: summary.aiPairs,
        }
      : null,
  }
}

export function getRegionJob() {
  return publicJob(current)
}

function note(job, line) {
  const text = String(line || '').trim()
  if (!text) return
  job.message = text
  job.log.push(text)
  if (job.log.length > LOG_LINES) job.log.shift()
}

async function runJob(job, options) {
  try {
    job.step = 'import'
    note(job, 'Downloading open place data for this area…')
    job.imported = await importOvertureBbox(job.bbox, (line) => note(job, line))

    job.step = 'add'
    note(job, 'Checking duplicates and adding places to the map…')
    job.summary = await runAutoAdd({
      bbox: job.bbox,
      limit: job.limit,
      reviewOnly: options.reviewOnly,
      dryRun: options.dryRun,
      log: (line) => note(job, line),
    })
    job.status = 'done'
    job.step = 'done'
    note(job, 'Finished.')
  } catch (err) {
    console.error('[region-job] failed:', err)
    job.status = 'failed'
    job.error = err.message || 'Unknown error'
    note(job, `Failed: ${job.error}`)
  } finally {
    job.finishedAt = new Date().toISOString()
  }
}

/**
 * Starts the job and returns at once; poll getRegionJob() for progress.
 * @param {{region:string, limit?:number, reviewOnly?:boolean, dryRun?:boolean, startedBy?:string}} options
 *   dryRun still downloads into the catalogue but adds nothing to the map.
 */
export async function startRegionJob({ region, limit, reviewOnly = false, dryRun = false, startedBy = null }) {
  if (current?.status === 'running') {
    throw new RegionJobError('JOB_RUNNING', `Another region is being added right now (${current.regionName}).`, 409)
  }
  const found = await lookupRegion(region)
  if (!found) throw new RegionJobError('REGION_NOT_FOUND', `Could not find the region "${region}".`, 404)
  const areaKm2 = bboxAreaKm2(found.bbox)
  if (areaKm2 > REGION_JOB_MAX_AREA_KM2) {
    throw new RegionJobError(
      'AREA_TOO_LARGE',
      `"${found.name}" covers about ${Math.round(areaKm2).toLocaleString()} km². Pick a smaller area such as a taluk or town (max ${REGION_JOB_MAX_AREA_KM2.toLocaleString()} km²).`
    )
  }

  const job = {
    id: `${Date.now()}`,
    status: 'running',
    step: 'start',
    region,
    regionName: found.name,
    bbox: found.bbox,
    areaKm2: Math.round(areaKm2 * 10) / 10,
    limit: Math.min(Math.max(parseInt(limit, 10) || 300, 1), REGION_JOB_MAX_PLACES),
    reviewOnly: Boolean(reviewOnly),
    dryRun: Boolean(dryRun),
    startedBy,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    imported: null,
    message: '',
    log: [],
    summary: null,
    error: null,
  }
  current = job
  void runJob(job, { reviewOnly: job.reviewOnly, dryRun: job.dryRun })
  return publicJob(job)
}
