import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { PORTAL_NAMES } from '../data/game.js'
import { QUESTION_BANK } from '../data/question-bank.js'
import { aiAvailable, generateJSON } from './ai.js'
import { moderate } from './moderation.js'
import { db, must } from './supabase.js'

/** Copia el banco semilla a la base (idempotente). */
export async function seedQuestions() {
  must(await db.from('questions').upsert(QUESTION_BANK, { onConflict: 'id' }))
  return QUESTION_BANK.length
}

/** Dificultad según el desempeño de la jugadora en ese portal. */
export function targetDifficulty(stat) {
  if (!stat || stat.answered < 4) return 1
  const accuracy = stat.correct / stat.answered
  if (stat.answered >= 8 && accuracy >= 0.8) return 3
  if (accuracy >= 0.6) return 2
  return 1
}

const aiQuestionSchema = z.object({
  questions: z.array(z.object({
    type: z.enum(['elegir', 'ordenar', 'error', 'decidir']),
    text: z.string().min(15).max(400),
    options: z.array(z.string().min(1).max(160)).length(4),
    answer: z.number().int().min(0).max(3),
    explain: z.string().min(10).max(300),
  })).min(1).max(6),
})

/** La IA crea preguntas nuevas cuando la jugadora ya vio todo el banco. */
export async function generateQuestions(portalId, difficulty, count = 4) {
  if (!aiAvailable()) return []
  const level = ['', 'fácil', 'intermedia', 'difícil'][difficulty]
  const { questions } = await generateJSON({
    system:
      'Eres una docente peruana que crea preguntas de opción múltiple para chicas de 15 a 17 años ' +
      'que exploran carreras STEM. Las preguntas deben ser correctas, verificables, sin ambigüedad, ' +
      'con exactamente una respuesta correcta, en español neutro y sin temas sensibles.',
    prompt:
      `Crea ${count} preguntas de dificultad ${level} sobre "${PORTAL_NAMES[portalId]}". ` +
      'Mezcla los tipos: elegir (concepto), ordenar (pasos en orden, opciones con flechas →), ' +
      'error (detectar el fallo en un código o experimento) y decidir (mejor decisión en un escenario real). ' +
      'Formato: {"questions":[{"type","text","options":[4 opciones],"answer":índice 0-3,"explain":"por qué es correcta"}]}',
    schema: aiQuestionSchema,
  })

  const accepted = []
  for (const item of questions) {
    if (new Set(item.options.map(o => o.toLowerCase())).size !== 4) continue
    const check = await moderate(`${item.text}\n${item.options.join('\n')}\n${item.explain}`)
    if (!check.allowed) continue
    accepted.push({ id: `ai-${portalId}-${randomUUID().slice(0, 8)}`, portal_id: portalId, difficulty, source: 'ai', ...item })
  }
  if (accepted.length) must(await db.from('questions').insert(accepted))
  return accepted
}

const inFlight = new Map() // "portal:dificultad" -> promesa de generación en curso

/** Elige una pregunta que no haya visto hace poco, de la dificultad adecuada. */
export async function pickQuestion(userId, portalId, stat) {
  const target = targetDifficulty(stat)
  const [recent, all] = await Promise.all([
    db.from('rounds').select('question_id').eq('user_id', userId).eq('portal_id', portalId)
      .order('created_at', { ascending: false }).limit(60).then(must),
    db.from('questions').select('*').eq('portal_id', portalId).then(must),
  ])
  const seen = new Set(recent.map(r => r.question_id))
  const byCloseness = (a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target)

  const key = `${portalId}:${target}`
  const generate = () => {
    if (!inFlight.has(key)) {
      inFlight.set(key, generateQuestions(portalId, target)
        .catch(err => { console.error('[questions:ai]', err.message); return [] })
        .finally(() => inFlight.delete(key)))
    }
    return inFlight.get(key)
  }

  let pool = all.filter(q => !seen.has(q.id)).sort(byCloseness)
  if (!pool.length) {
    // No queda nada sin ver: esperamos a que la IA cree preguntas nuevas.
    pool = await generate()
  } else if (pool[0].difficulty !== target) {
    // Hay preguntas, pero no de su dificultad: usamos la más cercana y
    // la IA prepara las de su nivel para la próxima ronda.
    generate()
  }
  if (!pool.length) {
    // Vio todo y no hay IA: repetimos la que vio hace más tiempo.
    const order = [...recent].reverse().map(r => r.question_id)
    pool = [...all].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }
  const best = pool.filter(q => q.difficulty === pool[0].difficulty)
  return best[Math.floor(Math.random() * best.length)]
}
