// Waitlist a prueba de feria.
//
// El wifi de un evento se cae: si el backend no responde, el correo NO se pierde.
// Se guarda en este navegador y se reintenta solo (al volver la conexión y al
// abrir la página). Para quien lo deja, el formulario siempre dice "listo".

import { ApiError, api } from './api'

const KEY = 'herow_leads_pendientes'
const MAX = 200 // tope de seguridad para no llenar el almacenamiento

const read = () => {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return [] // modo incógnito o almacenamiento bloqueado
  }
}

const write = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)))
  } catch {
    // Sin almacenamiento no podemos encolar; el envío directo sigue funcionando.
  }
}

/**
 * ¿Es un fallo de red o del servidor (reintentable) y no un dato mal escrito?
 *
 * El 404 cuenta: significa que el backend desplegado todavía no tiene la ruta
 * /api/leads. Mejor guardar el correo y reintentar que perder un contacto y
 * mostrarle un error a alguien en plena feria.
 */
const isRetryable = (err) =>
  err instanceof ApiError && (err.status === 0 || err.status === 404 || err.status >= 500)

export const pendingLeads = () => read().length

/**
 * Envía un contacto. Si no hay red, lo deja en cola y responde { queued: true }.
 * Lanza solo cuando el error es culpa del formulario (correo inválido, etc.).
 */
export async function submitLead(lead) {
  const payload = { ...lead, source: lead.source || 'landing' }
  try {
    const res = await api.joinWaitlist(payload)
    return { ...res, queued: false }
  } catch (err) {
    if (!isRetryable(err)) throw err
    write([...read().filter(l => l.email !== payload.email), payload])
    return { ok: true, queued: true }
  }
}

/** Reintenta lo que quedó pendiente. Devuelve cuántos se enviaron. */
export async function flushLeads() {
  const list = read()
  if (!list.length) return 0
  const quedan = []
  let enviados = 0
  for (const lead of list) {
    try {
      await api.joinWaitlist(lead)
      enviados++
    } catch (err) {
      if (isRetryable(err)) quedan.push(lead) // sigue sin red: lo guardamos otra vez
      // Si el dato era inválido lo descartamos: reintentarlo nunca funcionaría.
    }
  }
  write(quedan)
  return enviados
}

let vigilando = false

/**
 * Engancha el reintento automático al volver la conexión.
 * Se puede llamar varias veces: solo la primera hace algo (React monta
 * los componentes dos veces en desarrollo y no queremos listeners repetidos).
 */
export function watchLeadQueue() {
  if (typeof window === 'undefined' || vigilando) return
  vigilando = true
  window.addEventListener('online', () => { flushLeads().catch(() => {}) })
  flushLeads().catch(() => {})
}
