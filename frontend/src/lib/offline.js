// HEROW sin internet.
//
// Pensado para colegios y comunidades donde la señal llega a ratos:
//  - Lo último que se vio (dashboard, Conecta) queda guardado y se puede abrir sin señal.
//  - Lo que la jugadora hace sin señal (practicar, apuntarse a un evento, preguntar a una
//    mentora) se guarda en una cola y se envía solo cuando vuelve la conexión.
//  - Todo se guarda por usuaria: en una compu compartida del colegio no se mezcla nada.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ApiError, api, isNetworkError } from './api'

// ───────── Almacenamiento seguro (incógnito o bloqueado = no rompe) ─────────
export function readStore(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // lleno o bloqueado: la app sigue funcionando en línea
  }
}

export function removeStore(key) {
  try { localStorage.removeItem(key) } catch { /* nada que hacer */ }
}

/** Clave propia de cada usuaria. */
export const userKey = (userId, name) => `herow:${userId || 'invitada'}:${name}`

/** La última usuaria que entró en este dispositivo (para practicar sin señal aunque la sesión venza). */
export const LAST_USER_KEY = 'herow:last-user'

/** uuid v4. crypto.randomUUID no existe fuera de https (p. ej. por la IP del wifi del colegio). */
export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const b = new Uint8Array(16)
  globalThis.crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ───────── ¿Hay internet? ─────────
const subscribeOnline = (cb) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}

// ───────── Avisos internos (para que la UI se actualice cuando cambian las colas) ─────────
const listeners = new Set()
const emit = () => listeners.forEach(fn => fn())
export function useQueueVersion() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const fn = () => setV(x => x + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return v
}

// ───────── Caché de pantallas ─────────
/** Guarda la última versión de una pantalla, con la hora. */
export function saveSnapshot(userId, name, data) {
  if (!userId) return
  writeStore(userKey(userId, name), { savedAt: new Date().toISOString(), data })
}

/** { savedAt, data } o null */
export const loadSnapshot = (userId, name) => (userId ? readStore(userKey(userId, name)) : null)

/** "hace 5 min", "hace 2 h", "hace 3 d" */
export function since(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'hace un momento'
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`
  return `hace ${Math.round(s / 86400)} d`
}

// ───────── Cola de acciones de Conecta (apuntarse, preguntar) ─────────
const outboxKey = (userId) => userKey(userId, 'outbox')

export const readOutbox = (userId) => readStore(outboxKey(userId), [])

export function enqueue(userId, item) {
  const list = readOutbox(userId)
  // Apuntarse, seguir o reaccionar varias veces a lo mismo: solo vale la última decisión.
  const same = (i) => i.kind === item.kind && (
    (item.kind === 'rsvp' && i.eventId === item.eventId) ||
    (item.kind === 'follow' && i.mentorId === item.mentorId) ||
    (item.kind === 'react' && i.questionId === item.questionId && i.reaction === item.reaction))
  const clean = list.filter(i => !same(i))
  writeStore(outboxKey(userId), [...clean, { id: uuid(), createdAt: new Date().toISOString(), ...item }].slice(-50))
  emit()
}

const isRetryable = (err) => isNetworkError(err) || (err instanceof ApiError && (err.status >= 500 || err.status === 401))

async function flushOutbox(userId) {
  const list = readOutbox(userId)
  if (!list.length) return { sent: 0, failed: [] }
  const keep = []
  const failed = []
  let sent = 0
  for (const item of list) {
    try {
      if (item.kind === 'rsvp') await api.conectaRsvp(item.eventId, item.going)
      else if (item.kind === 'question') await api.conectaAsk(item.payload)
      else if (item.kind === 'follow') await api.conectaFollow(item.mentorId, item.following)
      else if (item.kind === 'react') await api.conectaReact(item.questionId, item.reaction, item.on)
      sent++
    } catch (err) {
      if (isRetryable(err)) keep.push(item)
      else failed.push({ ...item, error: err.message }) // dato inválido: reintentarlo no sirve
    }
  }
  writeStore(outboxKey(userId), keep)
  if (failed.length) writeStore(userKey(userId, 'outbox-failed'), failed.slice(-10))
  emit()
  return { sent, failed }
}

// ───────── Práctica sin internet ─────────
const PACK_KEY = 'herow:offline-pack' // igual para todas: es el banco de preguntas
const PACK_MAX_AGE_MS = 7 * 86_400_000

export const readPack = () => readStore(PACK_KEY)

/** Descarga el paquete si no está o tiene más de 7 días. No lanza: sin señal se queda el que hay. */
export async function ensurePack({ force = false } = {}) {
  const current = readPack()
  const fresh = current && Date.now() - Date.parse(current.savedAt) < PACK_MAX_AGE_MS
  if (current && fresh && !force) return current
  try {
    const pack = await api.offlinePack()
    const next = { ...pack, savedAt: new Date().toISOString() }
    writeStore(PACK_KEY, next)
    emit()
    return next
  } catch {
    return current
  }
}

const practiceKey = (userId) => userKey(userId, 'practice-queue')
export const readPractice = (userId) => readStore(practiceKey(userId), [])

export function savePracticeAnswer(userId, answer) {
  writeStore(practiceKey(userId), [...readPractice(userId), answer].slice(-500))
  emit()
}

/** Sube las respuestas de práctica en lotes. Devuelve el resumen o null si no había nada. */
async function flushPractice(userId) {
  let queue = readPractice(userId)
  if (!queue.length) return null
  const total = { accepted: 0, pointsAwarded: 0, capped: false, state: null, schemaOutdated: false }
  while (queue.length) {
    const batch = queue.slice(0, 50).map(({ id, questionId, choice, ms, answeredAt }) => ({ id, questionId, choice, ms, answeredAt }))
    let res
    try {
      res = await api.offlineSync(batch)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'schema_outdated') total.schemaOutdated = true
      if (err instanceof ApiError && err.status === 400) {
        // Lote dañado (no debería pasar): se descarta para no trabar la cola para siempre.
        queue = queue.slice(batch.length)
        writeStore(practiceKey(userId), queue)
        continue
      }
      break // sin señal o servidor caído: se reintenta después
    }
    const done = new Set(res.processed)
    queue = readPractice(userId).filter(a => !done.has(a.id))
    writeStore(practiceKey(userId), queue)
    total.accepted += res.accepted
    total.pointsAwarded += res.pointsAwarded
    total.capped ||= res.capped
    total.state = res.state
  }
  emit()
  return total
}

// ───────── Sincronización automática ─────────
let syncing = null

/**
 * Envía todo lo pendiente de una usuaria. Se puede llamar muchas veces:
 * si ya hay un envío en curso, devuelve ese mismo.
 */
export function syncNow(userId) {
  if (!userId || typeof navigator === 'undefined' || !navigator.onLine) return Promise.resolve(null)
  if (!syncing) {
    syncing = (async () => {
      const outbox = await flushOutbox(userId).catch(() => ({ sent: 0, failed: [] }))
      const practice = await flushPractice(userId).catch(() => null)
      return { outbox, practice }
    })().finally(() => { syncing = null })
  }
  return syncing
}

export const pendingCount = (userId) => (userId ? readOutbox(userId).length + readPractice(userId).length : 0)
