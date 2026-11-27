// Filtros de seguridad para el texto que cruza entre adultas y menores.
// Van ANTES de la moderación de OpenAI: atrapan lo que la moderación no ve
// (un número de teléfono no es "contenido dañino", pero abre un canal privado).
import { moderate } from './moderation.js'

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i
// 9 o más dígitos seguidos (celular peruano o fijo con código), con espacios,
// puntos o guiones en medio. 9 y no 7 para no bloquear "2025-2026".
const PHONE = /(?:\+?\d[\s.-]?){9,}/
const HANDLE = /(^|[\s(])@[a-z0-9_.]{3,}/i
const LINK = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|pe|net|org|io|app)(\/\S*)?\b/i
// Pedir o dar contacto fuera de HEROW.
const CONTACT_WORDS = /\b(whats ?app|wsp|wasap|telegram|instagram|insta|tiktok|facebook|snapchat|discord|inbox|dm|mi n[uú]mero|mi celular|escr[ií]beme|agr[eé]game|s[ií]gueme|mi direcci[oó]n)\b/i

/**
 * ¿El texto trae datos de contacto o invita a salir de la plataforma?
 * Devuelve un mensaje para la persona, o null si está limpio.
 * allowUrls: los eventos sí llevan su enlace de inscripción en un campo aparte.
 */
export function findPersonalData(text, { allowUrls = false } = {}) {
  const t = String(text ?? '')
  if (EMAIL.test(t)) return 'Quita el correo: en HEROW nadie comparte datos de contacto.'
  if (PHONE.test(t)) return 'Quita el número: en HEROW nadie comparte teléfonos.'
  if (HANDLE.test(t)) return 'Quita el @usuario: en HEROW no se comparten redes sociales.'
  if (!allowUrls && LINK.test(t)) return 'Quita el enlace: aquí no se comparten links.'
  if (CONTACT_WORDS.test(t)) return 'Todo pasa dentro de HEROW: no se pide ni se da contacto por redes o mensajes privados.'
  return null
}

/** Solo enlaces https bien formados (inscripción a eventos). */
export function isSafeHttpsUrl(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && Boolean(u.hostname.includes('.')) && !u.username && !u.password
  } catch {
    return false
  }
}

/**
 * Revisión completa de un texto antes de mostrárselo a otras personas.
 *   ok      → se publica
 *   review  → la moderación automática no está disponible: lo revisa el equipo
 *   blocked → no se publica (message explica por qué)
 */
export async function reviewText(text, opts) {
  const personal = findPersonalData(text, opts)
  if (personal) return { verdict: 'blocked', message: personal }
  const m = await moderate(text)
  if (m.allowed) return { verdict: 'ok' }
  if (m.reason === 'flagged') {
    return { verdict: 'blocked', message: 'Ese texto no cumple las normas de HEROW. Escríbelo de otra forma.' }
  }
  return { verdict: 'review' }
}
