import { Router } from 'express'
import { z } from 'zod'
import { HEROINES, PORTAL_IDS } from '../data/game.js'
import { cachedGuide, guideMessage } from '../services/missions.js'
import { loadOpportunityRows, recommendationsFor } from '../services/opportunities.js'
import { getPlayerState } from '../services/progress.js'
import { db, must } from '../services/supabase.js'

export const meRouter = Router()

// Estado completo de la jugadora (dashboard, HUD, mapa).
meRouter.get('/', async (req, res) => {
  const state = await getPlayerState(req.user.id)
  if (!state.profile) return res.status(404).json({ error: 'no_profile' })
  res.json(state)
})

const startBody = z.object({
  heroineId: z.enum(Object.keys(HEROINES)),
  portalId: z.enum(PORTAL_IDS),
})

// Elegir heroína inicial (después del diagnóstico) o cambiar a una ya desbloqueada.
meRouter.post('/heroine', async (req, res) => {
  const body = startBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const { heroineId, portalId } = body.data

  const profile = must(await db.from('profiles').select('heroine_id').eq('id', req.user.id).single())
  const unlocked = must(await db.from('unlocked_heroines').select('heroine_id').eq('user_id', req.user.id).eq('heroine_id', heroineId))
  const isStarter = !profile.heroine_id

  if (isStarter && HEROINES[heroineId].portal !== portalId) {
    return res.status(400).json({ error: 'heroine_not_in_portal', message: 'Esa heroína no pertenece a tu portal.' })
  }
  if (!isStarter && !unlocked.length) {
    return res.status(403).json({ error: 'heroine_locked', message: 'Todavía no desbloqueas a esa heroína.' })
  }

  if (isStarter) {
    must(await db.from('unlocked_heroines').upsert(
      { user_id: req.user.id, heroine_id: heroineId },
      { onConflict: 'user_id,heroine_id', ignoreDuplicates: true },
    ))
  }
  must(await db.from('profiles').update({
    heroine_id: heroineId,
    portal_id: isStarter ? portalId : undefined,
    guide_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', req.user.id))

  res.json(await getPlayerState(req.user.id))
})

// Dashboard: estado + oportunidades ordenadas. La guía llega al instante (guardada o base);
// si no está vigente, el navegador pide la nueva a /guide sin bloquear la pantalla.
meRouter.get('/dashboard', async (req, res) => {
  const [state, rows] = await Promise.all([getPlayerState(req.user.id), loadOpportunityRows(req.user.id)])
  if (!state.profile) return res.status(404).json({ error: 'no_profile' })
  const opportunities = await recommendationsFor(req.user.id, state, rows)
  const guide = cachedGuide(state)
  res.json({ ...state, opportunities, guide: guide.text, guidePending: !guide.fresh })
})

// Mensaje personalizado de la guía (IA), según el progreso actual.
meRouter.get('/guide', async (req, res) => {
  const [state, rows] = await Promise.all([getPlayerState(req.user.id, { unlock: false }), loadOpportunityRows(req.user.id)])
  if (!state.profile) return res.status(404).json({ error: 'no_profile' })
  const opportunities = await recommendationsFor(req.user.id, state, rows)
  res.json({ guide: await guideMessage(req.user.id, state, opportunities) })
})
