import * as cheerio from 'cheerio'
import { config } from '../config.js'

const USER_AGENT = 'HerowBot/0.1 (+plataforma educativa; contacto: equipo HEROW)'
const TIMEOUT_MS = 12_000
const MAX_LINKS_PER_SOURCE = 8
// Textos de navegación que no son recomendaciones.
const IGNORED_TEXT = ['únete', 'inicia sesión', 'iniciar sesión', 'regístrate', 'join for free', 'log in', 'sign up']

const cache = new Map() // url -> { at, data }
const robotsCache = new Map() // origin -> { at, disallow: string[] }

export async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es-PE,es;q=0.9' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`)
  return res.text()
}

// Lectura simple de robots.txt: reglas Disallow del grupo "User-agent: *".
export async function isAllowed(url) {
  const { origin, pathname, search } = new URL(url)
  let entry = robotsCache.get(origin)
  if (!entry || Date.now() - entry.at > config.scrapeCacheMs) {
    const disallow = []
    try {
      const lines = (await fetchText(`${origin}/robots.txt`)).split(/\r?\n/)
      let applies = false
      for (const raw of lines) {
        const line = raw.split('#')[0].trim()
        const [key, ...rest] = line.split(':')
        const value = rest.join(':').trim()
        if (/^user-agent$/i.test(key)) applies = value === '*'
        else if (applies && /^disallow$/i.test(key) && value) disallow.push(value)
      }
    } catch {
      // Sin robots.txt accesible: se permite.
    }
    entry = { at: Date.now(), disallow }
    robotsCache.set(origin, entry)
  }
  const path = pathname + search
  return !entry.disallow.some(rule => {
    const pattern = '^' + rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    return new RegExp(pattern).test(path)
  })
}

function clean(text) {
  return text.replace(/\s+/g, ' ').trim()
}

/** Extrae título, descripción y enlaces relevantes de una fuente. */
export async function scrapeSource(source) {
  const cached = cache.get(source.url)
  if (cached && Date.now() - cached.at < config.scrapeCacheMs) return cached.data

  if (!(await isAllowed(source.url))) {
    throw new Error(`robots.txt no permite leer ${source.url}`)
  }

  const $ = cheerio.load(await fetchText(source.url))
  const base = new URL(source.url)
  const seen = new Set()
  const items = []
  if (source.direct) items.push({ title: clean($('title').first().text()) || source.name, url: source.url })

  $('a[href]').each((_, el) => {
    if (source.direct) return false
    if (items.length >= MAX_LINKS_PER_SOURCE) return false
    const title = clean($(el).text())
    if (title.length < 5 || title.length > 140) return
    const lower = title.toLowerCase()
    if (!source.keywords.some(k => lower.includes(k))) return
    if (IGNORED_TEXT.some(t => lower.includes(t))) return
    let href
    try {
      href = new URL($(el).attr('href'), base).href
    } catch {
      return
    }
    if (!href.startsWith('http') || seen.has(href)) return
    seen.add(href)
    items.push({ title, url: href })
  })

  const data = {
    sourceId: source.id,
    source: source.name,
    type: source.type,
    pageTitle: clean($('title').first().text()),
    description: clean($('meta[name="description"]').attr('content') ?? ''),
    items,
    fetchedAt: new Date().toISOString(),
  }
  cache.set(source.url, { at: Date.now(), data })
  return data
}
