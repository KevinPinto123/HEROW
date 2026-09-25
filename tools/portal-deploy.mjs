// Despliega portal/portal.config.ts con la clave secreta de server/.env (sin mostrarla).
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const line = readFileSync(join(root, 'server', '.env'), 'utf8').split(/\r?\n/).find(l => l.startsWith('PORTAL_SECRET_KEY='))
const secret = line?.slice('PORTAL_SECRET_KEY='.length).replace(/^"|"$/g, '').trim()
if (!secret) {
  console.error('❌ Falta PORTAL_SECRET_KEY en server/.env')
  process.exit(1)
}
const r = spawnSync('npx', ['portal', 'deploy', '--config', 'portal/portal.config.ts'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORTAL_SECRET: secret },
})
process.exit(r.status ?? 1)
