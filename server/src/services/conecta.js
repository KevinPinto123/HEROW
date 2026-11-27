// HEROW Conecta: la red de mentoras.
//
// Reglas que NO se rompen (las jugadoras son menores de edad):
//  - Las mentoras son adultas verificadas a mano por el equipo antes de aparecer.
//  - No existe chat privado: las jugadoras preguntan de forma anónima y la respuesta
//    se publica para todas. La mentora nunca ve el usuario de quien pregunta.
//  - Los eventos son grupales y publicados; la mentora ve cuántas se apuntaron, no quiénes.
//  - Ningún texto lleva datos de contacto (services/safety.js) y todo pasa por moderación.
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { db, must } from './supabase.js'

// Sin letras ni números que se confunden al dictarlos (0/O, 1/I/L).
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** Código de acceso al panel de la mentora: HRW-XXXX-XXXX-XXXX (≈ 60 bits). */
export function generateMentorCode() {
  const group = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
  return `HRW-${group()}-${group()}-${group()}`
}

/** Normaliza (mayúsculas, sin espacios ni guiones) y aplica sha256. */
export function hashMentorCode(code) {
  const clean = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return createHash('sha256').update(clean).digest('hex')
}

/** Compara tokens sin filtrar su longitud por el tiempo de respuesta. */
export function sameToken(a, b) {
  const x = createHash('sha256').update(String(a ?? '')).digest()
  const y = createHash('sha256').update(String(b ?? '')).digest()
  return timingSafeEqual(x, y)
}

/** ¿El error es porque falta correr el schema.sql nuevo en Supabase? */
export function isMissingTable(err) {
  const msg = String(err?.message ?? err ?? '')
  return /does not exist|schema cache|could not find the table|PGRST205|42P01/i.test(msg)
}

export const SCHEMA_OUTDATED = {
  error: 'schema_outdated',
  message: 'La red de mentoras todavía no está activa: falta actualizar la base de datos (supabase/schema.sql).',
}

/** Middleware de error para los routers de Conecta: tabla faltante = 503 claro, no 500. */
export function conectaErrors(err, _req, res, next) {
  if (isMissingTable(err)) return res.status(503).json(SCHEMA_OUTDATED)
  next(err)
}

// ───────── Lo que ve cada quien ─────────

/** Lo que una jugadora puede ver de una mentora. Sin correo ni LinkedIn. */
export const publicMentor = (m) => ({
  id: m.id,
  name: m.name,
  role: m.role,
  org: m.org,
  portals: m.portals ?? [],
  region: m.region,
  story: m.story,
  advice: m.advice,
})

export const publicEvent = (e, mentorsById, counts = new Map(), mine = new Set()) => {
  const m = mentorsById.get(e.mentor_id)
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    kind: e.kind,
    modality: e.modality,
    region: e.region,
    place: e.place,
    url: e.url,
    startsAt: e.starts_at,
    durationMin: e.duration_min,
    portals: e.portals ?? [],
    status: e.status,
    mentor: m ? { id: m.id, name: m.name, role: m.role, org: m.org } : null,
    going: counts.get(e.id) ?? 0,
    mine: mine.has(e.id),
  }
}

/** Pregunta tal como se muestra: anónima (nivel y portal, nunca el usuario). */
export const publicQuestion = (q, mentorsById) => {
  const asked = q.mentor_id ? mentorsById.get(q.mentor_id) : null
  const by = q.answered_by ? mentorsById.get(q.answered_by) : null
  return {
    id: q.id,
    question: q.question,
    answer: q.status === 'answered' ? q.answer : null,
    status: q.status,
    portal: q.portal_id,
    level: q.level,
    askedTo: asked ? { id: asked.id, name: asked.name } : null,
    answeredBy: by ? { name: by.name, role: by.role, org: by.org } : null,
    answeredAt: q.answered_at,
    createdAt: q.created_at,
  }
}

// ───────── Consultas ─────────

const MENTOR_FIELDS = 'id, name, role, org, portals, region, story, advice, powerup, status'

export async function approvedMentors() {
  return must(await db.from('mentors').select(MENTOR_FIELDS).eq('status', 'approved').order('approved_at', { ascending: true }))
}

/** Mapa id → mentora (cualquier estado), para nombrar autoras de eventos y respuestas. */
export async function mentorsMap(ids) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map()
  const rows = must(await db.from('mentors').select(MENTOR_FIELDS).in('id', unique))
  return new Map(rows.map(m => [m.id, m]))
}

/** Cuántas jugadoras se apuntaron a cada evento. */
export async function rsvpCounts(eventIds) {
  const counts = new Map()
  if (!eventIds.length) return counts
  const rows = must(await db.from('event_rsvps').select('event_id').in('event_id', eventIds))
  for (const r of rows) counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1)
  return counts
}

// Un evento sigue visible hasta 2 h después de empezar (por si alguien llega tarde).
const VISIBLE_AFTER_START_MS = 2 * 60 * 60 * 1000

export async function upcomingEvents(limit = 60) {
  const since = new Date(Date.now() - VISIBLE_AFTER_START_MS).toISOString()
  return must(await db.from('mentor_events').select('*')
    .eq('status', 'published').gte('starts_at', since)
    .order('starts_at', { ascending: true }).limit(limit))
}

/** Ordena poniendo primero lo que coincide con los portales de la jugadora. */
export function byPortalMatch(portals) {
  const set = new Set(portals.filter(Boolean))
  const score = (list) => (!list?.length ? 1 : list.some(p => set.has(p)) ? 2 : 0)
  return (a, b) => score(b.portals) - score(a.portals)
}

// ───────── Seguidores, reacciones e insignias ─────────

/** Cuenta filas por una columna (seguidores por mentora, reacciones por respuesta…). */
async function countBy(table, column, ids, extra = (q) => q, key = column) {
  const out = new Map()
  if (!ids.length) return out
  const rows = must(await extra(db.from(table).select(key === column ? column : `${column}, ${key}`).in(column, ids)))
  for (const r of rows) {
    const k = key === column ? r[column] : `${r[column]}:${r[key]}`
    out.set(k, (out.get(k) ?? 0) + 1)
  }
  return out
}

export const followerCounts = (mentorIds) => countBy('mentor_follows', 'mentor_id', mentorIds)

/** Mapa "questionId:kind" → cantidad */
export const reactionCounts = (questionIds) => countBy('answer_reactions', 'question_id', questionIds, q => q, 'kind')

/** Respuestas publicadas por cada mentora */
export const answeredCounts = (mentorIds) =>
  countBy('mentor_questions', 'answered_by', mentorIds, q => q.eq('status', 'answered'))

/** "Me ayudó" recibidos por cada mentora (suma sobre sus respuestas). */
export async function helpfulByMentor(mentorIds) {
  const out = new Map()
  if (!mentorIds.length) return out
  const qs = must(await db.from('mentor_questions').select('id, answered_by').eq('status', 'answered').in('answered_by', mentorIds).limit(5000))
  const counts = await reactionCounts(qs.map(q => q.id))
  for (const q of qs) out.set(q.answered_by, (out.get(q.answered_by) ?? 0) + (counts.get(`${q.id}:me_ayudo`) ?? 0))
  return out
}

// Insignias de mentora: suben con el impacto real, no con la cantidad de texto.
export const BADGES = [
  { id: 'semilla', name: 'Semilla', emoji: '🌱', min: 0 },
  { id: 'guia', name: 'Guía', emoji: '🧭', min: 10 },
  { id: 'inspiradora', name: 'Inspiradora', emoji: '✨', min: 40 },
  { id: 'leyenda', name: 'Leyenda HEROW', emoji: '👑', min: 100 },
]

/** Puntos de impacto: seguidoras + 3 por respuesta + 2 por "Me ayudó" + 1 por chica apuntada. */
export function mentorBadge({ followers = 0, answered = 0, helpful = 0, going = 0 } = {}) {
  const points = followers + answered * 3 + helpful * 2 + going
  const idx = BADGES.findLastIndex(b => points >= b.min)
  const badge = BADGES[idx]
  const next = BADGES[idx + 1] ?? null
  return {
    id: badge.id,
    name: badge.name,
    emoji: badge.emoji,
    points,
    next: next ? { name: next.name, emoji: next.emoji, missing: next.min - points, progress: Math.round(((points - badge.min) / (next.min - badge.min)) * 100) } : null,
  }
}
