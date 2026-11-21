import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { REACTIONS, SERVER_SENDER } from '../lib/live'
import { useChannel } from '../lib/realtime'

const SEARCH_MAX_MS = 2 * 60_000
const HOST_MAX_MS = 10 * 60_000

/**
 * Emparejamiento del arcade online.
 *   find()          → rival al azar
 *   host()          → crea un código y espera a la amiga
 *   join(code)      → entra con el código de la amiga
 * phase: idle | searching | hosting | joining | nomatch | playing | error
 */
export function useMatchmaking(game) {
  const [phase, setPhase] = useState('idle')
  const [code, setCode] = useState('')
  const [room, setRoom] = useState(null)
  const [error, setError] = useState('')
  const run = useRef(null) // búsqueda activa: { cancelled, ticket }

  const stop = useCallback(() => {
    const r = run.current
    run.current = null
    if (r && !r.cancelled) {
      r.cancelled = true
      api.arcadeCancel(r.ticket).catch(() => {})
    }
  }, [])

  useEffect(() => stop, [stop])

  const loop = useCallback(async (kind, codeArg) => {
    stop()
    const r = { cancelled: false, ticket: crypto.randomUUID() }
    run.current = r
    setError('')
    setRoom(null)
    setPhase(kind)
    const started = Date.now()
    const max = kind === 'searching' ? SEARCH_MAX_MS : HOST_MAX_MS
    try {
      let c = codeArg
      if (kind === 'hosting') {
        c = (await api.arcadeCode(game)).code
        if (r.cancelled) return
        setCode(c)
      }
      while (!r.cancelled && Date.now() - started < max) {
        const res = await api.arcadeQueue(game, { code: c, ticket: r.ticket })
        if (r.cancelled) return
        if (res.matched) {
          run.current = null
          setRoom(res.room)
          setPhase('playing')
          return
        }
        if (res.cancelled) return // otra búsqueda la reemplazó
      }
      if (!r.cancelled) {
        run.current = null
        setPhase('nomatch')
      }
    } catch (err) {
      if (r.cancelled) return
      run.current = null
      setError(err.code === 'code_not_found' ? 'Ese código no existe o ya venció. Pídele a tu amiga uno nuevo.' : err.message)
      setPhase('error')
    }
  }, [game, stop])

  return {
    phase, code, room, error,
    find: () => loop('searching'),
    host: () => loop('hosting'),
    join: (c) => loop('joining', c.trim().toUpperCase()),
    cancel: () => { stop(); setPhase('idle'); setCode('') },
    reset: () => { stop(); setRoom(null); setPhase('idle'); setCode('') },
  }
}

/**
 * Canal en vivo de una sala del arcade: estado actual, fin, reacciones y abandono.
 * onEvent(m) recibe cada evento nuevo del servidor (para sonidos).
 */
export function useArcadeRoom(room, onEvent) {
  const [bubbles, setBubbles] = useState({}) // índice de jugadora -> { emoji, key }
  const lastReaction = useRef(0)
  const ended = useRef(Boolean(room.end))

  const { messages, send, status } = useChannel({
    channelId: room.channelId,
    onMessage: (m) => {
      if (m.sender.id === SERVER_SENDER) {
        if (m.type === 'end') ended.current = true
        onEvent?.(m)
        return
      }
      const idx = room.players.findIndex(p => p.userId === m.sender.id)
      if (m.type === 'reaction' && idx >= 0 && REACTIONS.includes(m.content?.emoji)) {
        const key = m.id
        setBubbles(b => ({ ...b, [idx]: { emoji: m.content.emoji, key } }))
        setTimeout(() => setBubbles(b => (b[idx]?.key === key ? { ...b, [idx]: null } : b)), 2500)
      }
    },
  })

  // Salir de la pantalla a mitad de partida cuenta como abandono.
  // (Con retraso: en desarrollo React monta dos veces.)
  const leaveTimer = useRef(null)
  useEffect(() => {
    clearTimeout(leaveTimer.current)
    return () => {
      leaveTimer.current = setTimeout(() => { if (!ended.current) api.arcadeLeave(room.id).catch(() => {}) }, 400)
    }
  }, [room.id])

  const server = messages.filter(m => m.sender.id === SERVER_SENDER)
  const lastState = server.filter(m => m.type === 'state').at(-1)
  const state = lastState?.content.state ?? room.state
  const stateAt = lastState?.at ?? null
  const end = server.find(m => m.type === 'end')?.content ?? room.end
  const scoreMsgs = server.filter(m => m.type === 'score')
  const scores = scoreMsgs.at(-1)?.content.scores ?? room.state.scores ?? null

  const react = (emoji) => {
    const t = Date.now()
    if (t - lastReaction.current < 1300) return
    lastReaction.current = t
    send({ type: 'reaction', content: { emoji } }).catch(() => {})
  }

  return { state, stateAt, end, scores, status, bubbles, react, eventCount: server.length }
}
