// Configuración de Portal para HEROW (salas en vivo).
// Desplegar: npm run portal:deploy  (usa PORTAL_SECRET_KEY de server/.env)
//
// NOTA (probado el 2026-09-25): en este proyecto de Portal, cualquier regla de
// `anonymous: false`, `authz` u `onPublish` sobre un canal deja a TODAS las conexiones
// en "reconnecting" (incluso con token válido). Por eso los canales usan los valores
// por defecto y la seguridad se aplica en la app:
//   - Cada sala es `herow-match-<uuid>`: imposible de adivinar.
//   - Preguntas, respuestas y resultados los publica y decide SOLO el backend.
//   - La app ignora todo mensaje que no venga del servidor o no sea una reacción
//     de la lista permitida. No hay chat libre en ninguna pantalla.
// Cuando Portal resuelva el problema, se puede activar la regla de abajo.
import { defineConfig } from '@portalsdk/config'

export default defineConfig({
  channels: {},
})

/* Regla deseada (activar cuando funcione en Portal):
import { allow, block, defineMiddleware } from '@portalsdk/config'
const REACTIONS = ['👏', '💜', '🔥', '😮', '💪', '🤝']
const onlyReactions = defineMiddleware<{ emoji?: unknown }>('publish', (ctx) => {
  const { type, content } = ctx.message
  if (type === 'reaction' && typeof content?.emoji === 'string' && REACTIONS.includes(content.emoji)) return allow()
  return block('En HEROW solo se permiten reacciones.')
})
channels: { 'herow-match-*': { anonymous: false, onPublish: [onlyReactions] } }
*/
