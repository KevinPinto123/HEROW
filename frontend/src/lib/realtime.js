import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

// ───────── HEROW Live: cliente de tiempo real (reemplaza a Portal) ─────────
// Una sola conexión WebSocket con el backend para toda la app.
//   - Se autentica con la sesión de Supabase (el servidor verifica quién es cada una).
//   - Si se cae (wifi, celular bloqueado), se reconecta sola, vuelve a entrar a los
//     canales y recibe el historial: no se pierde ninguna ronda.

const WS_PATH = '/live/ws'

function socketUrl() {
  const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  if (api) return api.replace(/^http/, 'ws') + WS_PATH
  // Desarrollo: pasa por el proxy de Vite (ver vite.config.js).
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${WS_PATH}`
}

async function accessToken(forceRefresh = false) {
  if (!supabase) return null
  if (forceRefresh) {
    const { data } = await supabase.auth.refreshSession()
    return data.session?.access_token ?? null
  }
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

const MAX_MESSAGES = 300

class LiveClient {
  ws = null
  status = 'idle' // idle | connecting | ready | offline
  wanted = false
  retries = 0
  retryTimer = null
  refreshToken = false
  gen = 0 // cada intento de conexión tiene su número; los viejos se descartan
  channels = new Map() // nombre -> { refs, joined, messages, seen:Set, presence, listeners:Set }
  statusListeners = new Set()

  setStatus(status) {
    if (this.status === status) return
    this.status = status
    for (const fn of this.statusListeners) fn(status)
    for (const ch of this.channels.values()) this.emit(ch)
  }

  start() {
    if (this.wanted) return
    this.wanted = true
    this.connect()
  }

  stop() {
    this.wanted = false
    this.gen++
    clearTimeout(this.retryTimer)
    const ws = this.ws
    this.ws = null
    ws?.close(1000, 'logout')
    for (const ch of this.channels.values()) ch.joined = false
    this.setStatus('idle')
  }

  /** Reconecta ya (al volver el internet o la pestaña). */
  nudge() {
    if (!this.wanted || this.status === 'ready' || this.status === 'connecting') return
    clearTimeout(this.retryTimer)
    this.connect()
  }

  async connect() {
    if (!this.wanted) return
    const gen = ++this.gen
    this.setStatus('connecting')
    const token = await accessToken(this.refreshToken).catch(() => null)
    this.refreshToken = false
    if (!this.wanted || gen !== this.gen) return
    if (!token) return this.scheduleRetry()

    let ws
    try {
      ws = new WebSocket(socketUrl())
    } catch {
      return this.scheduleRetry()
    }
    this.ws = ws
    ws.onopen = () => ws.send(JSON.stringify({ t: 'auth', token }))
    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }
      this.handle(msg)
    }
    ws.onclose = (e) => {
      if (this.ws !== ws) return
      this.ws = null
      for (const ch of this.channels.values()) ch.joined = false
      if (e.code === 4001) this.refreshToken = true // sesión vencida: pedir token nuevo
      this.scheduleRetry()
    }
    ws.onerror = () => {}
  }

  scheduleRetry() {
    if (!this.wanted) return
    this.setStatus('offline')
    const delay = Math.min(10_000, 800 * 2 ** this.retries) + Math.random() * 400
    this.retries++
    clearTimeout(this.retryTimer)
    this.retryTimer = setTimeout(() => this.connect(), delay)
  }

  sendRaw(data) {
    if (this.ws?.readyState === WebSocket.OPEN && this.status === 'ready') {
      this.ws.send(JSON.stringify(data))
      return true
    }
    return false
  }

  handle(msg) {
    if (msg.t === 'ready') {
      this.retries = 0
      this.setStatus('ready')
      for (const name of this.channels.keys()) this.sendRaw({ t: 'join', ch: name })
      return
    }
    const ch = msg.ch && this.channels.get(msg.ch)
    if (msg.t === 'joined' && ch) {
      ch.joined = true
      // El historial completo reemplaza lo que había (fuente de verdad: el servidor).
      ch.messages = msg.history.slice(-MAX_MESSAGES)
      const fresh = msg.history.filter(m => !ch.seen.has(m.id))
      for (const m of msg.history) ch.seen.add(m.id)
      // Solo se avisan los eventos nuevos (no se repiten sonidos al reconectar).
      if (ch.primed) for (const m of fresh) for (const fn of ch.listeners) fn.onMessage?.(m)
      ch.primed = true
      this.emit(ch)
    } else if (msg.t === 'msg' && ch) {
      const m = msg.m
      if (m.type !== 'reaction') {
        if (ch.seen.has(m.id)) return
        ch.seen.add(m.id)
        ch.messages = [...ch.messages, m].slice(-MAX_MESSAGES)
      }
      for (const fn of ch.listeners) fn.onMessage?.(m)
      this.emit(ch)
    } else if (msg.t === 'presence' && ch) {
      ch.presence = { count: msg.count }
      this.emit(ch)
    } else if (msg.t === 'error' && ch) {
      ch.error = msg.code
      this.emit(ch)
    }
  }

  emit(ch) {
    const view = {
      messages: ch.messages,
      presence: ch.presence,
      status: this.status === 'ready' && ch.joined ? 'ready' : this.status === 'idle' ? 'idle' : 'connecting',
      error: ch.error ?? null,
    }
    for (const fn of ch.listeners) fn.onChange(view)
  }

  subscribe(name, listener) {
    let ch = this.channels.get(name)
    if (!ch) {
      ch = { refs: 0, joined: false, primed: false, messages: [], seen: new Set(), presence: null, error: null, listeners: new Set() }
      this.channels.set(name, ch)
      this.sendRaw({ t: 'join', ch: name })
    }
    ch.refs++
    ch.listeners.add(listener)
    this.emit(ch)
    return () => {
      ch.listeners.delete(listener)
      if (--ch.refs > 0) return
      this.channels.delete(name)
      this.sendRaw({ t: 'leave', ch: name })
    }
  }

  react(name, emoji) {
    return this.sendRaw({ t: 'react', ch: name, emoji })
  }
}

export const live = new LiveClient()

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => live.nudge())
  document.addEventListener('visibilitychange', () => { if (!document.hidden) live.nudge() })
}

/** Abre la conexión mientras haya sesión; la cierra al salir de la cuenta. */
export function useLiveConnection(userId, enabled = true) {
  useEffect(() => {
    if (!userId || !enabled) return
    live.start()
    return () => live.stop()
  }, [userId, enabled])
}

/**
 * Suscripción a un canal. Devuelve { messages, presence, status, error, send }.
 * onMessage se llama solo con eventos nuevos (no con el historial inicial).
 */
export function useChannel({ channelId, onMessage }) {
  const [view, setView] = useState({ messages: [], presence: null, status: 'connecting', error: null })
  const handler = useRef(onMessage)
  useEffect(() => { handler.current = onMessage })

  useEffect(() => {
    if (!channelId) return
    const listener = { onChange: setView, onMessage: (m) => handler.current?.(m) }
    return live.subscribe(channelId, listener)
  }, [channelId])

  const send = async ({ type, content }) => {
    if (type !== 'reaction') throw new Error('Solo se permiten reacciones')
    if (!live.react(channelId, content?.emoji)) throw new Error('Sin conexión')
  }
  return { ...view, send }
}
