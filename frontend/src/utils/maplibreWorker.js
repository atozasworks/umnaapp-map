/**
 * MapLibre GL v6 runs tile parsing in a web worker that lives in its own file
 * (maplibre-gl-worker.mjs). By default the library looks for that file next to
 * its own script, but a production build bundles the library into a hashed
 * chunk and does not copy the worker, so the request came back as index.html
 * ("non-JavaScript MIME type" / "Worker failed to load").
 *
 * Importing the worker with ?url makes Vite ship the file and gives us its real
 * address. Import this module once before creating any map.
 */
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(workerUrl)
