import { Router } from 'express'
import { z } from 'zod'
import { SOURCES } from '../data/sources.js'
import { scrapeSource } from '../services/scraper.js'

export const recommendationsRouter = Router()

const query = z.object({
  portal: z.enum(['code', 'robotics', 'design', 'science']),
})

// GET /api/recommendations?portal=code
// Lee en vivo (con caché) las fuentes del portal. Si una fuente falla, las demás siguen.
recommendationsRouter.get('/', async (req, res) => {
  const q = query.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'invalid_query', issues: q.error.issues })

  const sources = SOURCES.filter(s => s.portals.includes(q.data.portal))
  const settled = await Promise.allSettled(sources.map(scrapeSource))

  const results = []
  const errors = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') results.push(r.value)
    else errors.push({ sourceId: sources[i].id, error: r.reason.message })
  })

  res.json({ portal: q.data.portal, results, errors })
})
