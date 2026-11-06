import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { db } from '../services/supabase.js'

export const leadsRouter = Router()

// Qué tipo de contacto es. Sirve para segmentar después de la feria.
export const LEAD_ROLES = ['colegio', 'empresa', 'inversor', 'docente', 'familia', 'estudiante', 'otro']

// Validación propia en vez de z.email(): así podemos limpiar el texto antes
// de revisarlo (la gente escribe con espacios y mayúsculas en el celular).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

const text = (max, campo) =>
  z.string({ error: `${campo} debe ser texto.` })
    .trim()
    .max(max, `${campo} no puede pasar de ${max} caracteres.`)
    .optional()
    .default('')

const leadBody = z.object({
  email: z.string({ error: 'Escribe tu correo.' })
    .trim()
    .toLowerCase()
    .max(160, 'Ese correo es demasiado largo.')
    .refine(v => EMAIL_RE.test(v), 'Escribe un correo válido (ej. nombre@colegio.edu.pe).'),
  name: text(80, 'El nombre'),
  org: text(120, 'La organización'),
  role: z.enum(LEAD_ROLES, { error: 'Elige una de las opciones de la lista.' }).optional().default('otro'),
  phone: text(40, 'El teléfono'),
  message: text(500, 'El mensaje'),
  source: text(40, 'El origen'),
  // Aceptó que le escribamos. Guardamos cuándo, no solo que sí.
  consent: z.boolean({ error: 'El permiso de contacto debe ser sí o no.' }).optional().default(false),
  // Trampa anti-spam: es un campo invisible. Si viene lleno, lo llenó un bot.
  website: text(200, 'El campo oculto'),
})

const noDb = (res) =>
  res.status(503).json({
    error: 'db_unavailable',
    message: 'Ahora mismo no podemos guardar tu correo. Escríbenos y te sumamos a mano.',
  })

/** Deja tu correo. Público: no necesita sesión. */
leadsRouter.post('/', async (req, res) => {
  const body = leadBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', message: body.error.issues[0].message })

  const { website, email, name, org, role, phone, message, source, consent } = body.data
  // Al bot le respondemos ok para que no reintente, pero no guardamos nada.
  if (website) return res.status(201).json({ ok: true })
  if (!db) return noDb(res)

  const row = {
    email,
    name: name || null,
    org: org || null,
    role,
    phone: phone || null,
    message: message || null,
    source: source || 'landing',
    consent_at: consent ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await db.from('leads').insert(row)
  if (!error) return res.status(201).json({ ok: true, duplicate: false })

  // 23505 = ya existe ese correo. No es un fallo: completamos lo que falte.
  if (error.code === '23505') {
    const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null))
    const { error: upErr } = await db.from('leads').update(clean).eq('email', email)
    if (upErr) throw new Error(`[leads] ${upErr.message}`)
    return res.json({ ok: true, duplicate: true })
  }

  throw new Error(`[leads] ${error.message}`)
})

/** Cuántas personas se sumaron. La landing lo usa como prueba social. */
leadsRouter.get('/count', async (_req, res) => {
  if (!db) return res.json({ count: 0 })
  const { count, error } = await db.from('leads').select('id', { count: 'exact', head: true })
  if (error) return res.json({ count: 0 })
  res.json({ count: count ?? 0 })
})

/**
 * Descarga los leads en CSV, para el día después de la feria.
 *   GET /api/leads/export?token=...   (LEADS_ADMIN_TOKEN en server/.env)
 * Sin token configurado, la ruta no existe.
 */
leadsRouter.get('/export', async (req, res) => {
  const token = config.leadsAdminToken
  if (!token) return res.status(404).json({ error: 'not_found' })
  if (req.query.token !== token) return res.status(401).json({ error: 'unauthorized' })
  if (!db) return noDb(res)

  const { data, error } = await db
    .from('leads')
    .select('created_at, role, name, email, phone, org, message, source, consent_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`[leads] ${error.message}`)

  // Comillas dobles escapadas y prefijo ' en + para que Excel no rompa teléfonos.
  const cell = (v) => {
    const s = v == null ? '' : String(v)
    return `"${(s.startsWith('+') ? `'${s}` : s).replace(/"/g, '""')}"`
  }
  const header = ['fecha', 'tipo', 'nombre', 'correo', 'telefono', 'organizacion', 'mensaje', 'origen', 'acepto_contacto']
  const rows = (data ?? []).map(r =>
    [r.created_at, r.role, r.name, r.email, r.phone, r.org, r.message, r.source, r.consent_at ?? 'no'])
  const csv = [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="herow-leads-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(`\uFEFF${csv}`) // BOM: Excel abre las tildes bien
})
