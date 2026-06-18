/**
 * UMNAAPP Maps JavaScript SDK
 * ---------------------------
 * Embed the UMNAAPP public map on any website and/or consume the public data
 * API — without authentication and without ever showing UMNAAPP login, register,
 * landing, or home pages.
 *
 * Usage:
 *   <script src="https://maps.umnaapp.com/sdk.js"></script>
 *   <div id="map" style="width:100%;height:480px"></div>
 *   <script>
 *     const map = UmnaMaps.embed('#map', {
 *       center: { lat: 12.97, lng: 77.59 },
 *       zoom: 12,
 *       categories: ['Restaurant', 'Hotel'],
 *     });
 *     map.on('ready', () => console.log('map ready'));
 *     map.on('placeClick', (place) => console.log('clicked', place));
 *
 *     // Pure data access (no map):
 *     UmnaMaps.api.search('coffee').then(console.log);
 *   </script>
 *
 * The SDK auto-detects the platform origin from its own <script src>.
 */
(function (global) {
  'use strict'

  function resolveOrigin() {
    try {
      var current = document.currentScript
      if (current && current.src) return new URL(current.src).origin
    } catch (e) {
      /* ignore */
    }
    // Fallback: find a <script> tag that loaded sdk.js
    var scripts = document.getElementsByTagName('script')
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || ''
      if (src.indexOf('/sdk.js') !== -1) {
        try {
          return new URL(src).origin
        } catch (e) {
          /* ignore */
        }
      }
    }
    return global.location ? global.location.origin : ''
  }

  var ORIGIN = resolveOrigin()
  var API_BASE = ORIGIN + '/api/public'

  function qs(params) {
    var parts = []
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k]
      if (v === undefined || v === null || v === '') return
      if (Array.isArray(v)) v = v.join(',')
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v))
    })
    return parts.length ? '?' + parts.join('&') : ''
  }

  function getJSON(path, params) {
    return fetch(API_BASE + path + qs(params), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    }).then(function (r) {
      if (!r.ok) throw new Error('UmnaMaps API ' + r.status)
      return r.json()
    })
  }

  /** Public data API — usable standalone, no map required. */
  var api = {
    places: function (opts) {
      return getJSON('/places', opts)
    },
    search: function (q, opts) {
      var p = Object.assign({ q: q }, opts || {})
      return getJSON('/search', p)
    },
    nearby: function (lat, lng, opts) {
      var p = Object.assign({ lat: lat, lng: lng }, opts || {})
      return getJSON('/nearby', p)
    },
    categories: function () {
      return getJSON('/categories')
    },
    place: function (id) {
      return getJSON('/place/' + encodeURIComponent(id))
    },
    route: function (start, end, opts) {
      var p = Object.assign(
        { start: start.lat + ',' + start.lng, end: end.lat + ',' + end.lng },
        opts || {}
      )
      return getJSON('/route', p)
    },
    config: function () {
      return getJSON('/config')
    },
  }

  /** Tiny event emitter. */
  function Emitter() {
    this._h = {}
  }
  Emitter.prototype.on = function (evt, fn) {
    ;(this._h[evt] = this._h[evt] || []).push(fn)
    return this
  }
  Emitter.prototype.off = function (evt, fn) {
    if (!this._h[evt]) return this
    this._h[evt] = this._h[evt].filter(function (f) {
      return f !== fn
    })
    return this
  }
  Emitter.prototype.emit = function (evt, data) {
    ;(this._h[evt] || []).forEach(function (fn) {
      try {
        fn(data)
      } catch (e) {
        /* listener error */
      }
    })
  }

  /**
   * Embedded map instance (iframe-backed). Communicates with the viewer via
   * window.postMessage so host pages never touch the map internals directly.
   */
  function EmbeddedMap(el, options) {
    Emitter.call(this)
    options = options || {}
    this.options = options
    this._ready = false
    this._queue = []

    var container = typeof el === 'string' ? document.querySelector(el) : el
    if (!container) throw new Error('UmnaMaps.embed: container not found: ' + el)

    var params = { embed: '1' }
    if (options.center) {
      params.lat = options.center.lat
      params.lng = options.center.lng
    }
    if (options.zoom != null) params.zoom = options.zoom
    if (options.categories) params.categories = [].concat(options.categories).join(',')
    if (options.query) params.q = options.query
    if (options.place) params.place = options.place
    if (options.search === false) params.search = '0'
    if (options.controls === false) params.controls = '0'

    var iframe = document.createElement('iframe')
    iframe.src = ORIGIN + '/embedded-map' + qs(params)
    iframe.style.border = '0'
    iframe.style.width = options.width || '100%'
    iframe.style.height = options.height || (container.style.height ? '100%' : '480px')
    iframe.allow = 'geolocation'
    iframe.setAttribute('loading', 'lazy')
    iframe.setAttribute('title', 'UMNAAPP Maps')
    container.appendChild(iframe)

    this.iframe = iframe
    var self = this

    this._onMessage = function (event) {
      if (event.source !== iframe.contentWindow) return
      var msg = event.data
      if (!msg || msg.__umna !== true) return
      if (msg.event === 'ready') {
        self._ready = true
        self._queue.forEach(function (m) {
          self._post(m)
        })
        self._queue = []
      }
      self.emit(msg.event, msg.payload)
    }
    global.addEventListener('message', this._onMessage)
  }
  EmbeddedMap.prototype = Object.create(Emitter.prototype)
  EmbeddedMap.prototype.constructor = EmbeddedMap

  EmbeddedMap.prototype._post = function (msg) {
    this.iframe.contentWindow.postMessage(Object.assign({ __umna: true }, msg), ORIGIN)
  }
  EmbeddedMap.prototype._send = function (command, payload) {
    var msg = { command: command, payload: payload }
    if (this._ready) this._post(msg)
    else this._queue.push(msg)
    return this
  }
  EmbeddedMap.prototype.setCenter = function (lat, lng, zoom) {
    return this._send('setCenter', { lat: lat, lng: lng, zoom: zoom })
  }
  EmbeddedMap.prototype.setCategories = function (categories) {
    return this._send('setCategories', { categories: [].concat(categories) })
  }
  EmbeddedMap.prototype.search = function (q) {
    return this._send('search', { q: q })
  }
  EmbeddedMap.prototype.selectPlace = function (id) {
    return this._send('selectPlace', { id: id })
  }
  EmbeddedMap.prototype.destroy = function () {
    global.removeEventListener('message', this._onMessage)
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe)
    }
  }

  var UmnaMaps = {
    version: '1.0.0',
    origin: ORIGIN,
    api: api,
    embed: function (el, options) {
      return new EmbeddedMap(el, options)
    },
  }

  // UMD-ish export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UmnaMaps
  } else {
    global.UmnaMaps = UmnaMaps
  }
})(typeof window !== 'undefined' ? window : this)
