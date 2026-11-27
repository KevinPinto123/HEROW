import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EVENTS, track, upgradeSession } from '../lib/analytics'
import { pendingCount, syncNow, useOnline, useQueueVersion } from '../lib/offline'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

// Aviso flotante de conexión + sincronización automática de lo hecho sin internet.
export default function NetStatus() {
  const online = useOnline()
  const { userId, setState } = usePlayer()
  useQueueVersion() // se vuelve a pintar cuando cambian las colas
  const pending = pendingCount(userId)
  const [toast, setToast] = useState(null)
  const [closed, setClosed] = useState(false)

  // Al abrir la app y cada vez que vuelve la señal: enviar lo pendiente.
  useEffect(() => {
    if (!online || !userId) return
    let alive = true
    syncNow(userId).then(r => {
      if (!alive || !r) return
      const p = r.practice
      if (p?.state) setState(s => ({ ...s, ...p.state }))
      const parts = []
      const n = (k, one, many) => `${k} ${k === 1 ? one : many}`
      if (p?.accepted) parts.push(`${n(p.accepted, 'respuesta', 'respuestas')} de práctica (+${p.pointsAwarded} pts${p.capped ? ', tope del día' : ''})`)
      if (r.outbox?.sent) parts.push(`${n(r.outbox.sent, 'acción', 'acciones')} de Conecta`)
      if (r.outbox?.failed?.length) parts.push(`${r.outbox.failed.length} no se pudieron enviar: ${r.outbox.failed[0].error}`)
      if (p?.accepted || r.outbox?.sent) {
        track(EVENTS.sincronizado, { modo: 'online' })
        upgradeSession('sincronizacion')
      }
      if (parts.length) {
        play('win')
        setToast(`☁️ Sincronizado: ${parts.join(' · ')}`)
      }
    })
    return () => { alive = false }
  }, [online, userId, setState])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 7000)
    return () => clearTimeout(t)
  }, [toast])

  // KPI: pérdida de señal durante una sesión. Ojo: si la app se abrió ya sin señal, Clarity no
  // carga y el evento se pierde; el dato fiable de uso sin internet está en el panel del equipo
  // (respuestas sincronizadas en offline_answers).
  useEffect(() => { if (!online) track(EVENTS.abiertaSinSenal, { modo: 'offline' }) }, [online])

  // Sin señal el aviso se muestra completo unos segundos y luego se reduce a un chip.
  useEffect(() => {
    if (online || closed) return
    const t = setTimeout(() => setClosed(true), 8000)
    return () => clearTimeout(t)
  }, [online, closed])

  // Al recuperar la señal se vuelve a mostrar el aviso la próxima vez que se pierda.
  const [wasOnline, setWasOnline] = useState(online)
  if (online !== wasOnline) {
    setWasOnline(online)
    if (online) setClosed(false)
  }

  if (toast) {
    return (
      <div className="net-status ok" role="status" onClick={() => setToast(null)}>
        {toast}
      </div>
    )
  }
  if (online) return null
  // Minimizado: un chip pequeño que se puede volver a abrir.
  if (closed) {
    return (
      <button type="button" className="net-status off mini" onClick={() => setClosed(false)} aria-label="Ver estado sin internet">
        <strong>📡</strong>{pending ? <span>{pending} por enviar</span> : null}
      </button>
    )
  }
  return (
    <div className="net-status off" role="status">
      <strong>📡 Sin internet</strong>
      <span>
        {pending
          ? `${pending} cosa${pending === 1 ? '' : 's'} esperando señal. Se envían solas.`
          : 'Sigues jugando: lo que hagas se guarda en este dispositivo.'}
      </span>
      <span className="net-status-links">
        <Link to="/practica" onClick={() => play('blip')}>Practicar</Link>
        <Link to="/arcade" onClick={() => play('blip')}>Arcade</Link>
        <button type="button" onClick={() => setClosed(true)} aria-label="Minimizar aviso">✕</button>
      </span>
    </div>
  )
}
