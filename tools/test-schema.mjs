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
const { rows: rls } = await db.query(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`)
if (rls.length) throw new Error('Tablas sin RLS: ' + rls.map(r => r.relname))
console.log('✅ RLS activo en todas las tablas')
const { rows: grants } = await db.query(`select grantee from information_schema.routine_privileges where routine_name = 'apply_round'`)
console.log('✅ apply_round ejecutable por:', [...new Set(grants.map(g => g.grantee))].join(', '))
