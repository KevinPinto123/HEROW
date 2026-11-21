import { z } from 'zod'
import { HEROINES, PORTAL_NAMES } from '../data/game.js'
import { aiAvailable, generate, generateJSON } from './ai.js'
import { moderate } from './moderation.js'
import { db, must } from './supabase.js'

export class MissionError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const review = z.object({
  approved: z.boolean(),
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(10).max(600),
  strengths: z.array(z.string().max(200)).max(4).default([]),
  improvements: z.array(z.string().max(200)).max(4).default([]),
  personal_data_found: z.boolean().default(false),
})

/** Paso 1: la IA revisa lo que la jugadora armó en HEROW. */
export async function submitBuild(userId, next, fields) {
  const { mission } = next
  const content = {}
  for (const f of mission.fields) {
    const value = String(fields?.[f.key] ?? '').trim()
    if (value.length < f.min) throw new MissionError('too_short', `"${f.label}" necesita al menos ${f.min} caracteres.`)
    if (value.length > f.max) throw new MissionError('too_long', `"${f.label}" puede tener hasta ${f.max} caracteres.`)
    content[f.key] = value
  }
  if (!aiAvailable()) throw new MissionError('ai_unavailable', 'La revisión con IA no está disponible ahora.')

  const text = mission.fields.map(f => `${f.label}:\n${content[f.key]}`).join('\n\n')
  const check = await moderate(text)
  let result
  if (!check.allowed) {
    result = {
      approved: false, score: 0, strengths: [], improvements: ['Revisa que tu texto sea respetuoso y apropiado.'],
      feedback: 'Tu texto tiene contenido que no podemos publicar. Escríbelo de nuevo pensando en que lo leerán profesionales.',
      personal_data_found: false,
    }
  } else {
    result = await generateJSON({
      system:
        'Eres YessenIA, mentora de chicas peruanas de 15 a 17 años en STEM. Revisas su trabajo con cariño y exigencia: ' +
        'reconoces lo bueno y das mejoras concretas. Hablas de tú, en español, sin tecnicismos. ' +
        'Si el texto incluye teléfono, dirección, nombre del colegio, DNI o correo, marca personal_data_found=true y pide quitarlos.',
      prompt:
        `Misión: ${mission.title}. Rúbrica (cada punto cuenta):\n- ${mission.rubric.join('\n- ')}\n\n` +
        'Aprueba (approved=true) solo si score >= 70 y cumple la rúbrica. ' +
        'Formato: {"approved","score" 0-100,"feedback" 2-3 frases,"strengths":[...],"improvements":[...],"personal_data_found"}\n\n' +
        `TRABAJO DE LA ESTUDIANTE:\n${text}`,
      schema: review,
    })
  }

  const approved = result.approved && result.score >= 70 && !result.personal_data_found
  const row = must(await db.from('mission_submissions').insert({
    user_id: userId,
    level: next.targetLevel,
    mission_id: mission.id,
    step: 'build',
    content,
    status: approved ? 'approved' : 'needs_work',
    score: result.score,
    feedback: {
      text: result.feedback,
      strengths: result.strengths,
      improvements: result.improvements,
      personalData: result.personal_data_found,
    },
  }).select('id, status, score, feedback, content, created_at').single())
  must(await db.from('profiles').update({ guide_at: null }).eq('id', userId))
  return row
}

/** Paso 2: el enlace de lo que publicó en el mundo real. */
export async function submitReal(userId, next, rawUrl) {
  const { mission } = next
  if (!mission.real.needsUrl) throw new MissionError('not_needed', 'Este paso se completa marcando una oportunidad como "Postulé".')
  if (!next.buildDone) throw new MissionError('build_first', 'Primero YessenIA debe aprobar tu trabajo.')

  let url
  try {
    url = new URL(String(rawUrl ?? '').trim())
  } catch {
    throw new MissionError('bad_url', 'Pega un enlace completo, que empiece con https://')
  }
  const host = url.hostname.replace(/^www\./, '')
  if (url.protocol !== 'https:') throw new MissionError('bad_url', 'El enlace debe empezar con https://')
  if (!mission.real.domains.some(d => host === d || host.endsWith(`.${d}`))) {
    throw new MissionError('bad_domain', `Usa un enlace de: ${mission.real.domains.join(', ')}`)
  }
  if (url.pathname.length < 3) throw new MissionError('bad_url', 'Ese enlace es la página principal. Pega el enlace de TU perfil o publicación.')
  if (host.endsWith('linkedin.com')) {
    const ok = mission.id === 'perfil' ? /^\/in\/[^/]+/.test(url.pathname) : /^\/(posts|feed\/update|pulse)\//.test(url.pathname)
    if (!ok) {
      throw new MissionError('bad_url', mission.id === 'perfil'
        ? 'El enlace de un perfil de LinkedIn se ve así: linkedin.com/in/tu-nombre'
        : 'Pega el enlace de la publicación (menú ··· → Copiar enlace de la publicación).')
    }
  }

  must(await db.from('profiles').update({ guide_at: null }).eq('id', userId))
  return must(await db.from('mission_submissions').insert({
    user_id: userId,
    level: next.targetLevel,
    mission_id: mission.id,
    step: 'real',
    content: { url: url.href },
    status: 'approved',
  }).select('id, status, content, created_at').single())
}

const GUIDE_TTL_MS = 30 * 60 * 1000

/** Mensaje de la guía en el dashboard, según su progreso real. Se guarda 6 h. */
/** Mensaje guardado si sigue vigente; si no, uno base instantáneo (y fresh=false). */
export function cachedGuide(state) {
  const { guide, guideAt } = state.profile
  if (guide && guideAt && Date.now() - new Date(guideAt).getTime() < GUIDE_TTL_MS) return { text: guide, fresh: true }
  return { text: fallbackGuide(state), fresh: false }
}

function fallbackGuide(state) {
  const n = state.next
  if (!n) return '¡Llegaste al nivel máximo! Sigue explorando portales y postulando a oportunidades.'
  const missing = Math.max(0, n.pointsNeeded - state.profile.points)
  if (missing > 0) return `¡Vas muy bien! Te faltan ${missing} puntos y tu misión "${n.mission.title}" para llegar al nivel ${n.targetLevel}.`
  if (!n.buildDone) return `¡Ya tienes los puntos del nivel ${n.targetLevel}! Ahora completa tu misión "${n.mission.title}".`
  if (!n.realDone) return `¡YessenIA aprobó tu misión! Completa el paso real: ${n.mission.real.title}.`
  return '¡Todo listo! El NoPuedo te espera. Ve a enfrentarlo y sube de nivel.'
}

export async function guideMessage(userId, state, recs) {
  const cached = cachedGuide(state)
  if (cached.fresh) return cached.text
  const hero = HEROINES[state.profile.heroineId]
  const n = state.next
  const skills = state.skills.filter(s => s.answered).map(s => `${s.name}: ${s.answered} rondas, ${s.accuracy}% aciertos`).join('; ') || 'aún no juega'
  const fallback = cached.text
  if (!aiAvailable()) return fallback

  try {
    const text = await generate({
      system:
        'Eres YessenIA, guía de HEROW, un juego STEM para chicas peruanas de 15 a 17 años. ' +
        'Escribe UN mensaje de 2 o 3 frases, cálido y concreto, con como mucho un emoji. ' +
        'Dile qué hacer ahora. No inventes datos: usa solo los que te doy.',
      messages: [{
        role: 'user',
        content:
          `Jugadora: ${state.profile.username}, nivel ${state.profile.level} (${state.profile.levelName}), ${state.profile.points} puntos. ` +
          `Heroína: ${hero?.name ?? 'sin elegir'}. Portal favorito: ${PORTAL_NAMES[state.profile.portalId] ?? 'ninguno'}. ` +
          `Desempeño: ${skills}. ` +
          (n ? `Siguiente nivel ${n.targetLevel}: necesita ${n.pointsNeeded} puntos (${n.pointsDone ? 'ya los tiene' : 'aún no'}), misión "${n.mission.title}" (${n.buildDone ? 'aprobada' : 'pendiente'}), paso real "${n.mission.real.title}" (${n.realDone ? 'hecho' : 'pendiente'}). ` : 'Ya está en el nivel máximo. ') +
          `Mejores oportunidades para ella: ${recs.recommended.slice(0, 3).map(o => `${o.title} (${o.reason})`).join('; ') || 'todavía ninguna'}.`,
      }],
    })
    const safe = await moderate(text.text)
    const message = safe.allowed ? text.text : fallback
    must(await db.from('profiles').update({ guide_message: message, guide_at: new Date().toISOString() }).eq('id', userId))
    return message
  } catch (err) {
    console.error('[guide]', err.message)
    return fallback
  }
}
