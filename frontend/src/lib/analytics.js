// Medición de KPIs con Microsoft Clarity (mapas de calor, grabaciones y eventos).
//
// Reglas, porque las usuarias son menores de edad:
//  - Clarity NO se carga hasta que la persona acepta en el aviso de medición.
//  - Nunca se envía el usuario, el id, el correo ni textos escritos por ellas.
//    Solo eventos con nombre fijo y etiquetas de pocas opciones (portal, nivel, modo).
//  - Lo que ellas escriben se enmascara en las grabaciones (data-clarity-mask).
//  - Sin VITE_CLARITY_ID (o en desarrollo) todo esto no hace nada.
import { readStore, writeStore } from './offline'

const CLARITY_ID = (import.meta.env.VITE_CLARITY_ID || '').trim()
const CONSENT_KEY = 'herow:medicion'

/** ¿Hay un proyecto de Clarity configurado para este sitio? */
export const analyticsAvailable = Boolean(CLARITY_ID) && import.meta.env.PROD

/** 'si' | 'no' | null (aún no decide) */
export const readConsent = () => readStore(CONSENT_KEY)

const listeners = new Set()
export const onConsentReset = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

/** Vuelve a mostrar el aviso (enlace del footer). Si había aceptado, deja de medir al recargar. */
export function resetConsent() {
  writeStore(CONSENT_KEY, null)
  listeners.forEach(fn => fn())
}

let loaded = false
function loadClarity() {
  if (loaded || !analyticsAvailable || typeof window === 'undefined') return
  loaded = true
  // Snippet oficial de Clarity: deja una cola para los eventos mientras carga el script.
  ;(function (c, l, a, r, i) {
    c[a] = c[a] || function (...args) { (c[a].q = c[a].q || []).push(args) }
    const t = l.createElement(r)
    t.async = 1
    t.src = `https://www.clarity.ms/tag/${i}`
    const y = l.getElementsByTagName(r)[0]
    y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', CLARITY_ID)
  window.clarity('consent')
  setTag('modo', navigator.onLine ? 'online' : 'offline')
  setTag('instalada', window.matchMedia?.('(display-mode: standalone)').matches ? 'si' : 'no')
}

export function setConsent(accepted) {
  writeStore(CONSENT_KEY, accepted ? 'si' : 'no')
  if (accepted) loadClarity()
}

/** Se llama una vez al arrancar: si ya aceptó antes, empieza a medir. */
export function initAnalytics() {
  if (readConsent() === 'si') loadClarity()
}

const clarity = (...args) => {
  if (!loaded || typeof window.clarity !== 'function') return
  try { window.clarity(...args) } catch { /* la medición nunca rompe el juego */ }
}

/** Etiqueta de la sesión (para filtrar en Clarity). Solo valores de pocas opciones. */
export function setTag(key, value) {
  if (value === undefined || value === null) return
  clarity('set', key, String(value))
}

/**
 * Catálogo de eventos KPI. Usa SIEMPRE estos nombres: así los embudos de Clarity
 * no se rompen. Ver la tabla "KPIs y Clarity" del README.
 */
export const EVENTS = {
  registro: 'registro_completado',
  nivelSubido: 'nivel_subido',
  conectaAbierto: 'conecta_abierto',
  eventoApunto: 'evento_me_apunto',
  eventoInscripcion: 'evento_inscripcion_click',
  eventoCalendario: 'evento_calendario',
  preguntaEnviada: 'pregunta_enviada',
  preguntaEnCola: 'pregunta_en_cola_offline',
  powerupVisto: 'powerup_mentora_visto',
  mentoraSeguida: 'mentora_seguida',
  respuestaMeAyudo: 'respuesta_me_ayudo',
  respuestaMeInspira: 'respuesta_me_inspira',
  mentoraPostulo: 'mentora_postulo',
  mentoraRespondio: 'mentora_respondio',
  mentoraEvento: 'mentora_publico_evento',
  practicaRonda: 'practica_ronda_completada',
  practicaSinSenal: 'practica_sin_senal',
  sincronizado: 'sincronizacion_completada',
  appInstalada: 'app_instalada',
  abiertaSinSenal: 'app_abierta_sin_senal',
  kitImpreso: 'kit_impreso',
  waitlist: 'waitlist_enviado',
}

/** Registra un evento KPI. Sin consentimiento o sin Clarity, no hace nada. */
export function track(event, tags = {}) {
  for (const [k, v] of Object.entries(tags)) setTag(k, v)
  clarity('event', event)
}

/** Marca la sesión como importante para que Clarity la guarde siempre (p. ej. una sincronización). */
export const upgradeSession = (reason) => clarity('upgrade', reason)
