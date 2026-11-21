import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Cuenta regresiva para juegos contrarreloj.
 * phase: ready | playing | over · penalty(ms) descuenta tiempo · onEnd se llama una vez al terminar.
 */
export function useTimer(durationMs, onEnd) {
  const [phase, setPhase] = useState('ready')
  const [left, setLeft] = useState(durationMs)
  const endAt = useRef(0)
  const endRef = useRef(onEnd)
  useEffect(() => { endRef.current = onEnd })

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const l = Math.max(0, endAt.current - Date.now())
      setLeft(l)
      if (l === 0) {
        clearInterval(id)
        setPhase('over')
        endRef.current?.()
      }
    }, 100)
    return () => clearInterval(id)
  }, [phase])

  const start = useCallback(() => {
    endAt.current = Date.now() + durationMs
    setLeft(durationMs)
    setPhase('playing')
  }, [durationMs])

  const penalty = useCallback((ms) => { endAt.current -= ms }, [])

  return { phase, left, start, penalty, seconds: Math.ceil(left / 1000) }
}
