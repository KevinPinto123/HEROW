import { Router } from 'express'
import { z } from 'zod'
import { db, must, usernameToEmail } from '../services/supabase.js'

export const authRouter = Router()

const MIN_AGE = 15
const MAX_AGE = 17

const registerBody = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, 'Usa de 3 a 20 letras, números o _ (sin espacios ni tildes).'),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres.').max(72),
  birth: z.object({
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1990).max(2030),
  }),
  guardianContact: z.string().trim().max(120).optional().default(''),
})

function exactAge({ day, month, year }) {
  const today = new Date()
  const birth = new Date(year, month - 1, day)
  if (birth.getMonth() !== month - 1) return null // fecha imposible (ej. 31 de febrero)
  let age = today.getFullYear() - year
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--
  return age
}

// Crea la cuenta. Sin email real: usuario + contraseña (menos datos de menores).
authRouter.post('/register', async (req, res) => {
  const body = registerBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', message: body.error.issues[0].message })
  const { username, password, birth, guardianContact } = body.data

  const age = exactAge(birth)
  if (age === null) return res.status(400).json({ error: 'invalid_date', message: 'Esa fecha no existe.' })
  if (age < MIN_AGE || age > MAX_AGE) {
    return res.status(403).json({
      error: 'age_out_of_range',
      message: 'Por ahora HEROW es para chicas de 15 a 17 años (4to y 5to de secundaria). ¡Pronto abriremos nuevos niveles!',
    })
  }

  const taken = must(await db.from('profiles').select('id').eq('username', username).maybeSingle())
  if (taken) return res.status(409).json({ error: 'username_taken', message: 'Ese nombre de usuaria ya existe. Prueba con otro.' })

  const { data, error } = await db.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username },
  })
  if (error) {
    const exists = /already|registered|exists/i.test(error.message)
    return res.status(exists ? 409 : 400).json({
      error: exists ? 'username_taken' : 'auth_error',
      message: exists ? 'Ese nombre de usuaria ya existe. Prueba con otro.' : 'No pudimos crear la cuenta. Intenta de nuevo.',
    })
  }

  const { error: profileError } = await db.from('profiles').insert({
    id: data.user.id,
    username,
    birth_year: birth.year,
    guardian_contact: guardianContact || null,
  })
  if (profileError) {
    await db.auth.admin.deleteUser(data.user.id) // no dejar cuentas a medias
    throw new Error(`[register] ${profileError.message}`)
  }

  res.status(201).json({ ok: true, email: usernameToEmail(username) })
})
