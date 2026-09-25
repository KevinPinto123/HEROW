import * as cheerio from 'cheerio'
import { z } from 'zod'
import { PORTAL_IDS, PORTAL_NAMES } from '../data/game.js'
import { SOURCES } from '../data/sources.js'
import { aiAvailable, generateJSON } from './ai.js'
import { fetchText, isAllowed, scrapeSource } from './scraper.js'
import { db, must } from './supabase.js'

const RECHECK_MS = 3 * 24 * 60 * 60 * 1000 // revisar cada enlace cada 3 días
const MAX_AI_PER_RUN = 30

// La IA a veces escribe "Gratuito", "Free" o "Pago opcional": se normaliza en vez de descartar.
const lower = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v)
const normCost = (v) => {
  const s = lower(v) ?? ''
  if (/grat|free|sin costo|0\s*soles/.test(s)) return 'gratis'
  if (/pag|paid|precio|s\/|\$|usd|costo/.test(s)) return 'pago'
  return 'desconocido'
}
const normType = (v) => {
  const s = lower(v) ?? ''
  if (/beca|scholar|crédito|credito/.test(s)) return 'beca'
  if (/curso|course|certific|especializ|clase/.test(s)) return 'curso'
  if (/program|bootcamp|mentor|convocatoria/.test(s)) return 'programa'
  if (/evento|event|feria|hackat|concurso|taller|webinar/.test(s)) return 'evento'
  return 'recurso'
}
const clip = (n) => (v) => (typeof v === 'string' ? v.slice(0, n) : v)

const extraction = z.object({
  is_opportunity: z.boolean(),
  title: z.preprocess(clip(160), z.string()).default(''),
  summary: z.preprocess(clip(400), z.string()).default(''),
  type: z.preprocess(normType, z.enum(['beca', 'curso', 'programa', 'evento', 'recurso'])),
  requirements: z.preprocess(
    (v) => (Array.isArray(v) ? v.filter(x => typeof x === 'string').map(x => x.slice(0, 160)).slice(0, 6) : []),
    z.array(z.string()),
  ),
  deadline: z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.slice(0, 80) : null), z.string().nullable()),
  cost: z.preprocess(normCost, z.enum(['gratis', 'pago', 'desconocido'])),
  min_age: z.preprocess((v) => {
    const n = Number(v)
    return Number.isInteger(n) && n >= 10 && n <= 99 ? n : null
  }, z.number().int().nullable()),
  portal_ids: z.preprocess(
    (v) => (Array.isArray(v) ? [...new Set(v.map(lower).filter(p => PORTAL_IDS.includes(p)))] : []),
    z.array(z.enum(['code', 'robotics', 'design', 'science'])),
  ),
})

/** Texto principal de una página, sin menús ni scripts. */
function pageText(html) {
  const $ = cheerio.load(html)
  $('script, style, noscript, nav, footer, header, svg, form, iframe').remove()
  const title = $('title').first().text().trim()
  const description = $('meta[name="description"]').attr('content') ?? ''
  const h1 = $('h1').first().text().trim()
  const body = $('main').text() || $('body').text()
  return `TÍTULO: ${title}\nH1: ${h1}\nDESCRIPCIÓN: ${description}\n\n${body.replace(/\s+/g, ' ').trim().slice(0, 4000)}`
}

async function analyze(item, source) {
  if (!(await isAllowed(item.url))) return null
  const text = pageText(await fetchText(item.url))
  const data = await generateJSON({
    system:
      'Analizas páginas web para una plataforma que orienta a chicas peruanas de 15 a 17 años hacia carreras STEM. ' +
      'Extraes datos SOLO de lo que dice la página; si un dato no aparece, usa null o "desconocido". Escribe en español.',
    prompt:
      `Fuente: ${source.name}. Enlace: ${item.url}\n` +
      'Decide si la página es una oportunidad concreta a la que una estudiante puede postular o inscribirse ' +
      '(beca, curso, programa, evento o recurso educativo). Si es una página genérica, de noticias, de login o un listado, is_opportunity=false.\n' +
      'Campos: is_opportunity, title (claro y corto), summary (máx. 2 frases para una adolescente), type, ' +
      'requirements (lista breve), deadline (texto tal cual o null), cost, ' +
      'min_age (edad mínima aproximada para postular: si es de posgrado/maestría usa 22; si exige tener título universitario usa 22; ' +
      'si exige haber terminado la secundaria o estar en la universidad usa 17; si es para escolares usa la edad que diga o null), ' +
      `portal_ids (de: ${PORTAL_IDS.map(p => `${p}=${PORTAL_NAMES[p]}`).join(', ')}).\n\n` +
      `CONTENIDO:\n${text}`,
    schema: extraction,
  })
  return data.is_opportunity ? data : null
}

let running = null
const rejected = new Map() // url -> fecha en que la IA dijo que no es oportunidad

/** Recorre las fuentes, verifica enlaces y actualiza la tabla de oportunidades. */
export function refreshOpportunities() {
  running ??= (async () => {
    const started = Date.now()
    let analyzed = 0
    let saved = 0
    let broken = 0
    const known = new Map(must(await db.from('opportunities').select('url, checked_at')).map(o => [o.url, o]))

    for (const source of SOURCES) {
      let listing
      try {
        listing = await scrapeSource(source)
      } catch (err) {
        console.error(`[agent] ${source.id}: ${err.message}`)
        continue
      }
      for (const item of listing.items) {
        const prev = known.get(item.url)
        if (prev && Date.now() - new Date(prev.checked_at).getTime() < RECHECK_MS) continue
        if (Date.now() - (rejected.get(item.url) ?? 0) < RECHECK_MS) continue
        if (analyzed >= MAX_AI_PER_RUN) break
        analyzed++
        try {
          const data = await analyze(item, source)
          if (!data) {
            rejected.set(item.url, Date.now())
            continue
          }
          must(await db.from('opportunities').upsert({
            url: item.url,
            source: source.name,
            source_id: source.id,
            title: data.title || item.title,
            summary: data.summary,
            type: data.type,
            requirements: data.requirements,
            deadline: data.deadline,
            cost: data.cost,
            min_age: data.min_age,
            portal_ids: data.portal_ids.length ? data.portal_ids : source.portals,
            link_ok: true,
            checked_at: new Date().toISOString(),
          }, { onConflict: 'url' }))
          saved++
        } catch (err) {
          // Enlace roto o inaccesible: si ya estaba guardado, se oculta; si no, no se reintenta en 3 días.
          rejected.set(item.url, Date.now())
          if (prev) {
            must(await db.from('opportunities').update({ link_ok: false, checked_at: new Date().toISOString() }).eq('url', item.url))
            broken++
          }
          console.error(`[agent] ${item.url}: ${err.message}`)
        }
      }
    }
    console.log(`[agent] oportunidades: ${saved} guardadas, ${broken} enlaces rotos, ${analyzed} analizadas en ${Math.round((Date.now() - started) / 1000)} s`)
    return { saved, broken, analyzed }
  })().finally(() => { running = null })
  return running
}

/** Arranca el agente al iniciar y lo repite cada `everyMs`. */
export function scheduleOpportunityAgent(everyMs) {
  if (!db || !aiAvailable()) return
  setTimeout(() => refreshOpportunities().catch(err => console.error('[agent]', err.message)), 5_000)
  setInterval(() => refreshOpportunities().catch(err => console.error('[agent]', err.message)), everyMs).unref()
}

// ───────── Recomendaciones personalizadas ─────────

/** Lee fechas tipo 9/8/2026, 13/11/2026 o 2026-11-13. null si no se entiende. */
export function parseDeadline(text) {
  if (!text) return null
  let m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59)
  m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 23, 59)
  return null
}

function reasonFor(portalId, skill, chosen) {
  const name = PORTAL_NAMES[portalId]
  if (skill?.answered >= 5 && skill.accuracy >= 70) return `Porque aciertas el ${skill.accuracy}% en ${name}`
  if (portalId === chosen) return `Porque ${name} es tu portal`
  if (!skill?.answered) return `Para que explores ${name}, que aún no has probado`
  return `Porque estás practicando ${name}`
}

/** Ordena las oportunidades según el desempeño real de la jugadora. */
/** Filas crudas para el ranking. Se puede pedir en paralelo con getPlayerState. */
export async function loadOpportunityRows(userId) {
  const [opps, saved] = await Promise.all([
    db.from('opportunities').select('*').eq('link_ok', true).then(must),
    db.from('saved_opportunities').select('opportunity_id, status').eq('user_id', userId).then(must),
  ])
  return { opps, saved }
}

export async function recommendationsFor(userId, state, rows = null) {
  const { opps, saved } = rows ?? await loadOpportunityRows(userId)
  const statusOf = new Map(saved.map(s => [s.opportunity_id, s.status]))
  const skills = Object.fromEntries(state.skills.map(s => [s.portal, s]))
  const totalAnswered = state.skills.reduce((a, s) => a + s.answered, 0) || 1
  const chosen = state.profile.portalId
  const age = state.profile.age

  const affinity = (p) => {
    const s = skills[p]
    return 0.4 * (s.answered / totalAnswered) + 0.4 * ((s.accuracy ?? 0) / 100) + (p === chosen ? 0.25 : 0)
  }

  const ranked = opps
    .map(o => {
      const portals = o.portal_ids.length ? o.portal_ids : [chosen ?? 'code']
      const best = portals.reduce((a, b) => (affinity(b) > affinity(a) ? b : a))
      let score = affinity(best)
      if (o.cost === 'gratis') score += 0.1
      if (o.type === 'beca') score += 0.08
      const tooYoung = o.min_age != null && o.min_age > age
      if (tooYoung) score -= 0.5
      const due = parseDeadline(o.deadline)
      const closed = due !== null && due < new Date()
      if (closed) score -= 0.4
      else if (due && due - Date.now() < 21 * 24 * 60 * 60 * 1000) score += 0.1 // cierra pronto: priorizar
      return {
        id: o.id,
        url: o.url,
        title: o.title,
        summary: o.summary,
        type: o.type,
        source: o.source,
        requirements: o.requirements,
        deadline: o.deadline,
        cost: o.cost,
        minAge: o.min_age,
        portals,
        reason: closed
          ? 'La convocatoria de este año ya cerró: guárdala para la próxima'
          : tooYoung
            ? `Disponible desde los ${o.min_age} años: guárdala para después`
            : reasonFor(best, skills[best], chosen),
        closed,
        match: Math.max(5, Math.min(99, Math.round(score * 100))),
        status: statusOf.get(o.id) ?? null,
        checkedAt: o.checked_at,
      }
    })
    .filter(o => o.status !== 'dismissed')
    .sort((a, b) => b.match - a.match)

  return {
    recommended: ranked.filter(o => !o.status),
    interested: ranked.filter(o => o.status === 'interested'),
    applied: ranked.filter(o => o.status === 'applied'),
  }
}
