import { Router } from 'express'
import { z } from 'zod'
import { recommendationsFor } from '../services/opportunities.js'
import { getPlayerState } from '../services/progress.js'
import { db, must } from '../services/supabase.js'

export const opportunitiesRouter = Router()

opportunitiesRouter.get('/', async (req, res) => {
  const state = await getPlayerState(req.user.id, { unlock: false })
  if (!state.profile) return res.status(404).json({ error: 'no_profile' })
  res.json(await recommendationsFor(req.user.id, state))
})

const statusBody = z.object({ status: z.enum(['interested', 'applied', 'dismissed']).nullable() })

// Me interesa / Postulé / Descartar (null = quitar de guardadas).
opportunitiesRouter.post('/:id/status', async (req, res) => {
  const id = z.uuid().safeParse(req.params.id)
  const body = statusBody.safeParse(req.body)
  if (!id.success || !body.success) return res.status(400).json({ error: 'invalid_body' })

  const exists = must(await db.from('opportunities').select('id').eq('id', id.data).maybeSingle())
  if (!exists) return res.status(404).json({ error: 'not_found' })

  if (body.data.status === null) {
    must(await db.from('saved_opportunities').delete().eq('user_id', req.user.id).eq('opportunity_id', id.data))
  } else {
    must(await db.from('saved_opportunities').upsert({
      user_id: req.user.id,
      opportunity_id: id.data,
      status: body.data.status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,opportunity_id' }))
  }
  const state = await getPlayerState(req.user.id)
  res.json({ opportunities: await recommendationsFor(req.user.id, state), state })
})
