// Prueba supabase/schema.sql en un Postgres embebido que imita a Supabase.
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid());
  create role anon; create role authenticated; create role service_role;
`)
const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
await db.exec(sql)
await db.exec(sql) // idempotente
console.log('✅ schema.sql corre 2 veces sin errores')

const { rows: [u] } = await db.query('insert into auth.users default values returning id')
await db.query(`insert into public.profiles (id, username, birth_year) values ($1, 'marie_c', 2010)`, [u.id])
const call = (c, w, p) => db.query('select points, current_streak, best_streak from public.apply_round($1, $2, $3, $4, $5, $6)', [u.id, 'science', c, w, 1200, p])
await call(true, true, 10); await call(true, true, 10); await call(false, false, 5)
const { rows: [p] } = await call(true, true, 10)
const { rows: [s] } = await db.query('select * from public.skill_stats where user_id = $1', [u.id])
console.log('perfil', p, 'stats', { answered: s.answered, correct: s.correct, wins: s.wins, total_ms: Number(s.total_ms) })
if (p.points !== 35 || p.current_streak !== 1 || p.best_streak !== 2 || s.answered !== 4 || s.correct !== 3) throw new Error('apply_round calcula mal')
console.log('✅ apply_round suma puntos y rachas correctamente')

const bad = await db.query(`insert into public.profiles (id, username, birth_year) values (gen_random_uuid(), 'X Y', 2010)`).catch(e => e.message)
console.log('✅ rechaza username inválido:', String(bad).slice(0, 60))
// ---------- Waitlist / leads ----------
await db.query(`insert into public.leads (email, name, org, role) values ('directora@colegio.edu.pe', 'Ana', 'IE 123', 'colegio')`)
const dup = await db.query(`insert into public.leads (email, role) values ('directora@colegio.edu.pe', 'empresa')`).catch(e => e.message)
if (!/duplicate|unique/i.test(String(dup))) throw new Error('leads acepta correos repetidos')
const rolMalo = await db.query(`insert into public.leads (email, role) values ('x@y.com', 'inventado')`).catch(e => e.message)
if (!/check constraint/i.test(String(rolMalo))) throw new Error('leads acepta tipos de contacto inventados')
const { rows: [lead] } = await db.query(`select role, source from public.leads where email = 'directora@colegio.edu.pe'`)
if (lead.role !== 'colegio' || lead.source !== 'landing') throw new Error('leads guarda mal los valores por defecto')
console.log('✅ leads: correo único, tipo validado y origen por defecto')

const { rows: rls } = await db.query(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`)
if (rls.length) throw new Error('Tablas sin RLS: ' + rls.map(r => r.relname))
console.log('✅ RLS activo en todas las tablas')
const { rows: grants } = await db.query(`select grantee from information_schema.routine_privileges where routine_name = 'apply_round'`)
console.log('✅ apply_round ejecutable por:', [...new Set(grants.map(g => g.grantee))].join(', '))

// ---------- Red de mentoras ----------
const { rows: [m] } = await db.query(`insert into public.mentors (name, email, role, portals, code_hash) values ('Ana Torres', 'ana@empresa.pe', 'Ingeniera de datos', '{code}', 'abc') returning id, status`)
if (m.status !== 'pending') throw new Error('una mentora nueva debería quedar pendiente de verificación')
const { rows: [ev] } = await db.query(`insert into public.mentor_events (mentor_id, title, kind, modality, starts_at) values ($1, 'Charla: mi primer código', 'charla', 'virtual', now() + interval '3 days') returning id`, [m.id])
await db.query('insert into public.event_rsvps (user_id, event_id) values ($1, $2)', [u.id, ev.id])
const rsvpDup = await db.query('insert into public.event_rsvps (user_id, event_id) values ($1, $2)', [u.id, ev.id]).catch(e => e.message)
if (!/duplicate|unique/i.test(String(rsvpDup))) throw new Error('una jugadora puede apuntarse dos veces al mismo evento')
const corta = await db.query(`insert into public.mentor_questions (user_id, question) values ($1, 'hola')`, [u.id]).catch(e => e.message)
if (!/check constraint/i.test(String(corta))) throw new Error('mentor_questions acepta preguntas vacías')
await db.query(`insert into public.mentor_questions (user_id, portal_id, question) values ($1, 'code', '¿Qué estudiaste para trabajar con datos?')`, [u.id])
const malKind = await db.query(`insert into public.mentor_events (mentor_id, title, kind, modality, starts_at) values ($1, 'Evento raro', 'fiesta', 'virtual', now())`, [m.id]).catch(e => e.message)
if (!/check constraint/i.test(String(malKind))) throw new Error('mentor_events acepta tipos inventados')
console.log('✅ mentoras: pendientes por defecto, RSVP único, preguntas y tipos de evento validados')

// ---------- Modo sin internet ----------
const offId = '11111111-1111-4111-8111-111111111111'
const offline = () => db.query(`insert into public.offline_answers (id, user_id, question_id, correct, points, answered_at) values ($1, $2, 'code-01', true, 4, now())`, [offId, u.id])
await offline()
const offDup = await offline().catch(e => e.message)
if (!/duplicate|unique/i.test(String(offDup))) throw new Error('offline_answers suma dos veces la misma respuesta')
await db.query(`insert into public.rounds (user_id, portal_id, question_id, difficulty, correct, ms, outcome, points, mode) values ($1, 'code', 'code-01', 1, true, 900, 'win', 4, 'offline')`, [u.id])
console.log('✅ sin internet: respuestas sin duplicados y rondas en modo offline')

const { rows: rls2 } = await db.query(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`)
if (rls2.length) throw new Error('Tablas sin RLS: ' + rls2.map(r => r.relname))
console.log('✅ RLS activo también en las tablas nuevas')

// ---------- Seguidores y reacciones ----------
await db.query('insert into public.mentor_follows (user_id, mentor_id) values ($1, $2)', [u.id, m.id])
const followDup = await db.query('insert into public.mentor_follows (user_id, mentor_id) values ($1, $2)', [u.id, m.id]).catch(e => e.message)
if (!/duplicate|unique/i.test(String(followDup))) throw new Error('una jugadora puede seguir dos veces a la misma mentora')
const { rows: [qq] } = await db.query('select id from public.mentor_questions limit 1')
await db.query(`insert into public.answer_reactions (user_id, question_id, kind) values ($1, $2, 'me_ayudo')`, [u.id, qq.id])
const malaReaccion = await db.query(`insert into public.answer_reactions (user_id, question_id, kind) values ($1, $2, 'odio')`, [u.id, qq.id]).catch(e => e.message)
if (!/check constraint/i.test(String(malaReaccion))) throw new Error('answer_reactions acepta reacciones inventadas')
const { rows: rls3 } = await db.query(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`)
if (rls3.length) throw new Error('Tablas sin RLS: ' + rls3.map(r => r.relname))
console.log('✅ seguidores únicos y reacciones solo predefinidas, con RLS')
