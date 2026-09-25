// Carga las variables del backend en Railway desde server/.env, sin mostrar valores
// (se envían por stdin, no aparecen en la línea de comandos).
//   node tools/railway-env.mjs --frontend https://tu-app.vercel.app
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE = 'herow-api'
const API_URL = 'https://herow-api-production.up.railway.app'

const arg = (name) => {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : undefined
}
const frontend = arg('--frontend')

const env = Object.fromEntries(
  readFileSync(join(root, 'server', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(l => /^[A-Z_]+=/.test(l))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '').trim()]),
)

// Secretos que se copian tal cual desde server/.env
const COPY = [
  'GEMINI_API_KEY', 'GEMINI_MODEL', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_MODERATION_MODEL',
  'AI_PROVIDER', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY',
  'PORTAL_SECRET_KEY', 'SCRAPE_CACHE_HOURS',
]
// Valores propios de producción
const PROD = {
  NODE_ENV: 'production',
  DEV_TOOLS: 'false',
  PUBLIC_URL: API_URL,
  ...(frontend ? { CORS_ORIGIN: frontend.replace(/\/$/, '') } : {}),
}

const vars = { ...Object.fromEntries(COPY.filter(k => env[k]).map(k => [k, env[k]])), ...PROD }
let failed = 0
for (const [key, value] of Object.entries(vars)) {
  const r = spawnSync('railway', ['variable', 'set', key, '--stdin', '--service', SERVICE, '--skip-deploys'], {
    cwd: join(root, 'server'),
    input: value,
    shell: true,
    encoding: 'utf8',
  })
  if (r.status === 0) console.log(`✅ ${key}`)
  else {
    failed++
    console.error(`❌ ${key}: ${(r.stderr || r.stdout).split('\n').find(l => l.trim()) ?? 'error'}`)
  }
}
const missing = COPY.filter(k => !env[k])
if (missing.length) console.log(`⚪ No están en server/.env (se usan valores por defecto): ${missing.join(', ')}`)
process.exit(failed ? 1 : 0)
