/* HEROW · service worker (modo sin internet)
 *
 * Este archivo es una PLANTILLA: vite.config.js la copia a dist/sw.js en cada build
 * reemplazando los marcadores de VERSION y PRECACHE por la versión y la lista real
 * de archivos. Así cada despliegue trae un service worker nuevo con su propio caché.
 *
 * Estrategias:
 *  - Al instalarse guarda todo el juego (JS, CSS, imágenes): la segunda visita abre sin señal.
 *  - Páginas: primero la red; sin señal, la copia guardada (la app es una SPA).
 *  - Archivos: primero el caché y se actualiza en segundo plano.
 *  - /api y /live NUNCA se guardan aquí: los datos los maneja la app (colas y copias por usuaria).
 */
const VERSION = '__HEROW_VERSION__'
const PRECACHE = __HEROW_PRECACHE__
const CACHE = `herow-${VERSION}`
const FONT_CACHE = 'herow-fonts'
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']
// Algunos servidores responden con 'Vary: Origin'; los módulos JS se piden con Origin y
// lo guardado al instalar no. Sin ignoreVary, el juego no abriría sin internet.
const MATCH = { ignoreVary: true, ignoreSearch: false }

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // allSettled: si un archivo falla (p. ej. señal que se corta), el resto igual queda guardado.
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(new Request(url, { cache: 'reload' })))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('herow-') && k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function fromNetworkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const res = await fetch(request)
    if (res.ok) cache.put('/index.html', res.clone())
    return res
  } catch {
    return (await cache.match('/index.html', MATCH)) || (await cache.match('/', MATCH)) || Response.error()
  }
}

async function fromCacheThenUpdate(request, cacheName) {
  const cache = await caches.open(cacheName)
  // Busca en todos los cachés de HEROW: si una versión nueva aún se está guardando,
  // la anterior sigue sirviendo sus archivos.
  const cached = (await cache.match(request, MATCH)) || (await caches.match(request, MATCH))
  const update = fetch(request)
    .then(res => {
      if (res.ok || res.type === 'opaque') cache.put(request, res.clone())
      return res
    })
    .catch(() => null)
  return cached || (await update) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(fromCacheThenUpdate(request, FONT_CACHE))
    return
  }
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/live/')) return
  if (url.pathname === '/sw.js') return // el navegador lo actualiza solo; nunca desde caché

  if (request.mode === 'navigate') {
    event.respondWith(fromNetworkFirst(request))
    return
  }
  event.respondWith(fromCacheThenUpdate(request, CACHE))
})
