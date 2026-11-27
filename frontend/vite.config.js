import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const publicDir = fileURLToPath(new URL('./public', import.meta.url))

/**
 * Modo sin internet: en cada build genera dist/sw.js a partir de sw-template.js con la
 * lista de TODOS los archivos del juego (JS, CSS, imágenes). Así, la primera visita con
 * señal deja HEROW guardado en el dispositivo y las siguientes abren sin internet.
 */
function herowOffline() {
  const walk = (dir) => readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
  return {
    name: 'herow-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle)
        .filter(f => !f.endsWith('.map') && f !== 'sw.js')
        .map(f => `/${f}`)
      const pub = walk(publicDir)
        .map(p => ({ url: `/${relative(publicDir, p).split(sep).join('/')}`, size: statSync(p).size }))
        .filter(f => !f.url.endsWith('.gitkeep'))
      const files = [...new Set(['/', '/index.html', ...built, ...pub.map(f => f.url)])]
      const template = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8')
      // La versión cambia si cambia cualquier archivo (los del build traen hash en el nombre)
      // o la lógica del propio service worker.
      const version = createHash('sha1')
        .update(files.join('|'))
        .update(pub.map(f => f.size).join(','))
        .update(template)
        .digest('hex')
        .slice(0, 12)
      const source = template
        .replace("const VERSION = '__HEROW_VERSION__'", `const VERSION = '${version}'`)
        .replace('const PRECACHE = __HEROW_PRECACHE__', () => `const PRECACHE = ${JSON.stringify(files)}`)
      if (source === template || source.includes('__HEROW_') || !source.includes(`'${version}'`)) {
        this.error('sw-template.js: no se pudo reemplazar la versión o la lista de archivos')
      }
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), herowOffline()],
  server: {
    // En desarrollo el backend corre en :3001 (npm run dev desde la raíz).
    proxy: {
      '/api': 'http://localhost:3001',
      // Tiempo real (WebSocket de HEROW Live)
      '/live': { target: 'ws://localhost:3001', ws: true },
    },
  },
})
