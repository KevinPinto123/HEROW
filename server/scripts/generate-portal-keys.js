// Genera el par de claves RS256 para firmar los tokens de Portal
// y guarda la privada en server/.env (lo crea desde .env.example si no existe).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exportPKCS8, generateKeyPair } from 'jose'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')
const examplePath = join(root, '.env.example')

let env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : readFileSync(examplePath, 'utf8')

const current = env.match(/^PORTAL_JWT_PRIVATE_KEY=(.*)$/m)?.[1]?.trim()
if (current && !process.argv.includes('--force')) {
  console.log('Ya hay una clave en server/.env. Usa --force para reemplazarla.')
  process.exit(0)
}

const { privateKey } = await generateKeyPair('RS256', { modulusLength: 2048, extractable: true })
const pem = (await exportPKCS8(privateKey)).trim().replace(/\r?\n/g, '\\n')
const line = `PORTAL_JWT_PRIVATE_KEY="${pem}"`

env = /^PORTAL_JWT_PRIVATE_KEY=.*$/m.test(env)
  ? env.replace(/^PORTAL_JWT_PRIVATE_KEY=.*$/m, () => line)
  : `${env.trimEnd()}\n${line}\n`

writeFileSync(envPath, env)
console.log('✅ Clave privada guardada en server/.env')
console.log('   La pública se publica sola en <PUBLIC_URL>/.well-known/jwks.json')
