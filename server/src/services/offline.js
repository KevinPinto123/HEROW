// Modo sin internet: la jugadora descarga un paquete de preguntas, practica sin
// conexión y, cuando vuelve la señal, sus respuestas se sincronizan.
//
// El servidor vuelve a corregir cada respuesta con su propio banco: el navegador
// nunca dice "acerté". Hay tope diario de puntos para que practicar sin internet
// ayude a avanzar sin reemplazar los combates.
import { createHash } from 'node:crypto'
import { QUESTION_BANK } from '../data/question-bank.js'

export const OFFLINE_RULES = {
  correct: 4, // acierto: menos que ganar un combate (10), porque no hay rival ni reloj
  wrong: 1, // intentarlo también suma: así es HEROW
  dailyCap: 60, // puntos máximos por día desde la práctica sin internet
  maxAgeDays: 45, // respuestas más antiguas ya no cuentan
  batch: 50, // respuestas por sincronización
}

export const BANK_BY_ID = new Map(QUESTION_BANK.map(q => [q.id, q]))

/** Versión del paquete: cambia solo si cambia el banco. El navegador la usa para no re-descargar. */
export const PACK_VERSION = createHash('sha1')
  .update(JSON.stringify(QUESTION_BANK.map(q => [q.id, q.text, q.options, q.answer])))
  .digest('hex').slice(0, 12)

export function offlinePack() {
  return {
    version: PACK_VERSION,
    rules: { correct: OFFLINE_RULES.correct, wrong: OFFLINE_RULES.wrong, dailyCap: OFFLINE_RULES.dailyCap },
    questions: QUESTION_BANK.map(({ id, portal_id, type, difficulty, text, options, answer, explain }) =>
      ({ id, portal: portal_id, type, difficulty, text, options, answer, explain })),
  }
}

/** Kit imprimible para colegios sin internet: n preguntas por portal, de fácil a difícil. */
export function printableKit(perPortal = 8) {
  const byPortal = {}
  for (const q of QUESTION_BANK) (byPortal[q.portal_id] ??= []).push(q)
  return Object.fromEntries(Object.entries(byPortal).map(([portal, list]) => [
    portal,
    [...list].sort((a, b) => a.difficulty - b.difficulty).slice(0, perPortal)
      .map(({ id, type, difficulty, text, options, answer, explain }) => ({ id, type, difficulty, text, options, answer, explain })),
  ]))
}

/**
 * Corrige un lote de respuestas sin conexión.
 *   answers:       [{ id, questionId, choice, ms, answeredAt }]  (choice = índice ORIGINAL de la opción)
 *   pointsToday:   puntos ya ganados hoy por práctica sin internet
 * Devuelve las filas válidas con sus puntos (respetando el tope) y las inválidas.
 */
export function gradeOffline(answers, { pointsToday = 0, now = Date.now(), bank = BANK_BY_ID } = {}) {
  let remaining = Math.max(0, OFFLINE_RULES.dailyCap - pointsToday)
  const minTime = now - OFFLINE_RULES.maxAgeDays * 86_400_000
  const maxTime = now + 5 * 60_000 // reloj del celular algo adelantado
  const graded = []
  const invalid = []
  let capped = false

  for (const a of answers) {
    const q = bank.get(a.questionId)
    const at = Date.parse(a.answeredAt)
    if (!q || !Number.isFinite(at) || at < minTime || at > maxTime) {
      invalid.push(a.id)
      continue
    }
    const correct = Number.isInteger(a.choice) && a.choice === q.answer
    const wanted = correct ? OFFLINE_RULES.correct : OFFLINE_RULES.wrong
    const points = Math.min(wanted, remaining)
    if (points < wanted) capped = true
    remaining -= points
    graded.push({
      id: a.id,
      questionId: q.id,
      portal: q.portal_id,
      difficulty: q.difficulty,
      correct,
      points,
      ms: Math.max(0, Math.min(Math.round(Number(a.ms) || 0), 600_000)),
      answeredAt: new Date(at).toISOString(),
    })
  }
  return { graded, invalid, capped }
}

/** Inicio del día de hoy en hora de Perú (UTC-5, sin horario de verano). */
export function startOfDayPeru(now = Date.now()) {
  const offset = 5 * 60 * 60 * 1000
  const local = new Date(now - offset)
  local.setUTCHours(0, 0, 0, 0)
  return new Date(local.getTime() + offset)
}
