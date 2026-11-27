// Pruebas de la red de mentoras y del modo sin internet (sin red ni base de datos).
//   npm run test:conecta
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EVENT_KINDS, MODALITIES, REGIONS } from '../src/data/conecta.js'
import * as front from '../../frontend/src/data/conecta.js'
import { QUESTION_BANK } from '../src/data/question-bank.js'
import {
  BADGES, byPortalMatch, generateMentorCode, mentorBadge, hashMentorCode, isMissingTable, publicMentor, publicQuestion, sameToken,
} from '../src/services/conecta.js'
import { OFFLINE_RULES, PACK_VERSION, gradeOffline, offlinePack, printableKit, startOfDayPeru } from '../src/services/offline.js'
import { findPersonalData, isSafeHttpsUrl } from '../src/services/safety.js'

test('los catálogos son iguales en servidor y frontend', () => {
  assert.deepEqual(front.REGIONS, REGIONS)
  assert.deepEqual(front.EVENT_KINDS, EVENT_KINDS)
  assert.deepEqual(front.MODALITIES, MODALITIES)
  for (const k of EVENT_KINDS) assert.ok(front.KIND_LABEL[k], `falta etiqueta para ${k}`)
  for (const m of MODALITIES) assert.ok(front.MODALITY_LABEL[m], `falta etiqueta para ${m}`)
})

test('bloquea datos de contacto y salidas de la plataforma', () => {
  const bloqueados = [
    'escríbeme a ana.torres@gmail.com',
    'mi número es 987 654 321',
    'llámame al +51 987654321',
    'sígueme en @ana_codea',
    'te paso mi whatsapp',
    'mándame inbox',
    'entra a www.mipagina.com',
    'mira https://bit.ly/abc',
    'búscame en tiktok',
  ]
  for (const t of bloqueados) assert.ok(findPersonalData(t), `debió bloquear: ${t}`)
})

test('deja pasar preguntas normales (sin falsos positivos comunes)', () => {
  const limpios = [
    '¿Qué estudiaste para trabajar en la NASA?',
    '¿Es difícil la ingeniería de sistemas para alguien que recién aprende Python?',
    'Programa 2025-2026: ¿cuándo abren las becas?',
    'Tengo 16 años y me da miedo no ser buena en matemáticas, ¿qué hago?',
    'En mi región hay 3 universidades, ¿cuál conviene?',
    'Me gusta el diseño.Me gustaría saber más',
  ]
  for (const t of limpios) assert.equal(findPersonalData(t), null, `no debió bloquear: ${t}`)
})

test('los eventos pueden llevar enlace https en su campo, nunca http', () => {
  assert.ok(isSafeHttpsUrl('https://forms.gle/abc123'))
  assert.ok(isSafeHttpsUrl('https://www.eventbrite.com/e/123'))
  assert.equal(isSafeHttpsUrl('http://inseguro.com'), false)
  assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false)
  assert.equal(isSafeHttpsUrl('https://user:pass@sitio.com'), false)
  assert.equal(isSafeHttpsUrl('no es un enlace'), false)
  assert.equal(findPersonalData('Inscríbete en https://forms.gle/x', { allowUrls: true }), null)
})

test('código de mentora: formato legible y hash tolerante a cómo se escribe', () => {
  const code = generateMentorCode()
  assert.match(code, /^HRW-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/)
  assert.equal(hashMentorCode(code), hashMentorCode(code.toLowerCase().replace(/-/g, ' ')))
  assert.notEqual(hashMentorCode(code), hashMentorCode(generateMentorCode()))
  assert.ok(sameToken('abc', 'abc'))
  assert.equal(sameToken('abc', 'abd'), false)
  assert.equal(sameToken(undefined, 'abc'), false)
})

test('una jugadora nunca ve correo, LinkedIn ni quién preguntó', () => {
  const m = publicMentor({ id: 'm1', name: 'Ana', email: 'a@b.com', linkedin: 'https://x', code_hash: 'h', role: 'Ingeniera', portals: ['code'] })
  assert.equal(m.email, undefined)
  assert.equal(m.linkedin, undefined)
  assert.equal(m.code_hash, undefined)
  const q = publicQuestion({ id: 'q1', user_id: 'u1', question: '¿Cómo empezaste?', answer: 'Así', status: 'review', level: 2 }, new Map())
  assert.equal(q.user_id, undefined)
  assert.equal(q.answer, null, 'una respuesta en revisión no se muestra')
})

test('ordena primero lo de su portal', () => {
  const list = [{ id: 'a', portals: ['design'] }, { id: 'b', portals: ['code'] }, { id: 'c', portals: [] }]
  assert.deepEqual([...list].sort(byPortalMatch(['code'])).map(x => x.id), ['b', 'c', 'a'])
})

test('detecta cuando falta correr el schema nuevo', () => {
  assert.ok(isMissingTable(new Error("[db] Could not find the table 'public.mentors' in the schema cache")))
  assert.ok(isMissingTable(new Error('[db] relation "public.mentor_events" does not exist')))
  assert.equal(isMissingTable(new Error('[db] timeout')), false)
})

// ───────── Sin internet ─────────
const now = Date.parse('2026-11-27T15:00:00Z')
const q1 = QUESTION_BANK[0]
const q2 = QUESTION_BANK[1]
const ans = (id, q, choice, at = '2026-11-27T14:00:00Z') => ({ id, questionId: q.id, choice, ms: 4000, answeredAt: at })

test('el paquete trae todo el banco y una versión estable', () => {
  const pack = offlinePack()
  assert.equal(pack.questions.length, QUESTION_BANK.length)
  assert.equal(pack.version, PACK_VERSION)
  assert.equal(pack.version, offlinePack().version)
  for (const q of pack.questions) assert.ok(q.answer >= 0 && q.answer < q.options.length)
  const kit = printableKit(8)
  assert.deepEqual(Object.keys(kit).sort(), ['code', 'design', 'robotics', 'science'])
  for (const list of Object.values(kit)) assert.ok(list.length > 0 && list.length <= 8)
})

test('el servidor corrige: acierto, error y sin responder', () => {
  const { graded, invalid } = gradeOffline([ans('a', q1, q1.answer), ans('b', q2, (q2.answer + 1) % q2.options.length), ans('c', q1, null)], { now })
  assert.deepEqual(invalid, [])
  assert.deepEqual(graded.map(g => [g.correct, g.points]), [[true, OFFLINE_RULES.correct], [false, OFFLINE_RULES.wrong], [false, OFFLINE_RULES.wrong]])
  assert.equal(graded[0].portal, q1.portal_id)
})

test('respeta el tope diario de puntos', () => {
  const many = Array.from({ length: 30 }, (_, i) => ans(`x${i}`, q1, q1.answer))
  const { graded, capped } = gradeOffline(many, { now, pointsToday: OFFLINE_RULES.dailyCap - 6 })
  assert.equal(graded.reduce((s, g) => s + g.points, 0), 6)
  assert.ok(capped)
  assert.equal(graded.length, 30, 'las respuestas igual cuentan para la precisión aunque ya no den puntos')
})

test('descarta preguntas inventadas y fechas imposibles', () => {
  const { graded, invalid } = gradeOffline([
    { id: 'i1', questionId: 'no-existe', choice: 0, answeredAt: '2026-11-27T14:00:00Z' },
    ans('i2', q1, 0, '2025-01-01T00:00:00Z'), // más de 45 días
    ans('i3', q1, 0, '2026-12-30T00:00:00Z'), // en el futuro
    ans('i4', q1, 0, 'ayer'),
  ], { now })
  assert.equal(graded.length, 0)
  assert.deepEqual(invalid, ['i1', 'i2', 'i3', 'i4'])
})

test('el día empieza a medianoche de Perú', () => {
  assert.equal(startOfDayPeru(Date.parse('2026-11-27T15:00:00Z')).toISOString(), '2026-11-27T05:00:00.000Z')
  assert.equal(startOfDayPeru(Date.parse('2026-11-28T03:00:00Z')).toISOString(), '2026-11-27T05:00:00.000Z')
})

test('insignias de mentora: suben con el impacto real', () => {
  const nueva = mentorBadge()
  assert.equal(nueva.id, 'semilla')
  assert.equal(nueva.points, 0)
  assert.equal(nueva.next.name, 'Guía')
  assert.equal(nueva.next.missing, 10)
  // 4 seguidoras + 2 respuestas (6) = 10 → Guía
  assert.equal(mentorBadge({ followers: 4, answered: 2 }).id, 'guia')
  // 10 + 3*5 + 2*5 + 5 = 40 → Inspiradora
  assert.equal(mentorBadge({ followers: 10, answered: 5, helpful: 5, going: 5 }).id, 'inspiradora')
  const leyenda = mentorBadge({ followers: 100 })
  assert.equal(leyenda.id, 'leyenda')
  assert.equal(leyenda.next, null)
  const mitad = mentorBadge({ followers: 25 }) // entre Guía (10) e Inspiradora (40)
  assert.equal(mitad.next.progress, 50)
  assert.equal(BADGES.length, 4)
})
