import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { REACTIONS } from '../../lib/live'
import { play } from '../../lib/sfx'
import { PLAYER_COLORS } from '../colors'
import { useArcadeRoom } from '../online'
import { ReportButton } from '../Safety'
import { CristalesBoard } from './Cristales'

const SEND_EVERY_MS = 1000

/** Duelo online: las dos juegan el mismo tablero inicial durante 90 s. Gana el puntaje más alto. */
export default function CristalesOnline({ room, onAgain, onExit }) {
  const me = room.you
  const { end, scores, status, bubbles, react } = useArcadeRoom(room, (m) => {
    if (m.type === 'end') play(m.content.winner === me ? 'win' : m.content.winner === null ? 'confirm' : 'lose')
  })
  // Reloj del servidor → reloj local (evita desfases entre equipos).
  const [offset] = useState(() => (room.state.now ?? Date.now()) - Date.now())
  const startsAt = room.state.startsAt - offset
  const endsAt = room.state.endsAt - offset
  const [now, setNow] = useState(() => Date.now())
  const myScore = useRef(0)
  const sent = useRef(0)
  const [mineLocal, setMineLocal] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [])

  // Envía el puntaje cada segundo y uno final al terminar.
  useEffect(() => {
    const flush = () => {
      if (myScore.current === sent.current) return
      const value = myScore.current
      sent.current = value
      api.arcadeMove(room.id, { score: value }).catch(() => { sent.current = Math.min(sent.current, value - 1) })
    }
    const id = setInterval(flush, SEND_EVERY_MS)
    const finalTimer = setTimeout(flush, Math.max(0, endsAt - Date.now() + 300))
    return () => { clearInterval(id); clearTimeout(finalTimer); flush() }
  }, [room.id, endsAt])

  const running = !end && now >= startsAt && now < endsAt
  const countdown = Math.ceil((startsAt - now) / 1000)
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const rivalIdx = 1 - me
  const shown = scores ?? [0, 0]
  const mine = Math.max(mineLocal, shown[me] ?? 0)

  let overlay = null
  if (end) {
    const won = end.winner === me
    overlay = (
      <div className="cg-overlay">
        <p>{end.reason === 'left' ? (won ? 'Tu rival salió del duelo. ¡Ganaste!' : 'Saliste del duelo.') : end.reason === 'reported' ? 'El duelo terminó por un reporte.' : end.winner === null ? '🤝 ¡Empate!' : won ? '🏆 ¡Ganaste el duelo!' : '💪 ¡Buen duelo!'}</p>
        <p>{shown[me]} – {shown[rivalIdx]}</p>
        <div className="arc-row">
          <button className="arc-btn" onClick={onAgain}>⚔️ Otro duelo</button>
          <button className="arc-btn ghost" onClick={onExit}>Salir</button>
        </div>
      </div>
    )
  } else if (now < startsAt) {
    overlay = <div className="cg-overlay"><p className="cr-countdown">{countdown > 0 ? countdown : '¡Ya!'}</p><p>Mismo tablero para las dos. ¡A sumar cristales!</p></div>
  } else if (now >= endsAt) {
    overlay = <div className="cg-overlay"><p>⏰ ¡Tiempo! Calculando…</p></div>
  }

  return (
    <div className="cr-wrap">
      <div className="arc-hud">
        <span className={`arc-chip ${status === 'ready' ? 'ok' : ''}`}>{status === 'ready' ? '🟢 En vivo' : '🟡 Reconectando…'}</span>
        <span className="arc-chip player" style={{ '--p': PLAYER_COLORS[me] }}>
          {bubbles[me] && <span className="reaction-bubble" key={bubbles[me].key}>{bubbles[me].emoji}</span>}
          Tú ⭐ {mine}
        </span>
        <span className="arc-chip player" style={{ '--p': PLAYER_COLORS[rivalIdx] }}>
          {bubbles[rivalIdx] && <span className="reaction-bubble" key={bubbles[rivalIdx].key}>{bubbles[rivalIdx].emoji}</span>}
          {room.players[rivalIdx].username} ⭐ {shown[rivalIdx] ?? 0}
        </span>
        <span className="arc-chip">⏱ {now < startsAt ? 90 : left} s</span>
        {!end && <ReportButton roomId={room.id} rival={room.players[rivalIdx].username} />}
      </div>
      <div className="cr-stage">
        <CristalesBoard seed={room.state.seed} running={running} onScore={(v) => { myScore.current = v; setMineLocal(v) }} />
        {overlay}
      </div>
      <div className="arc-reactions" aria-label="Reacciones">
        {REACTIONS.map(e => <button key={e} className="arc-react" onClick={() => react(e)}>{e}</button>)}
        <span className="arc-muted">Solo reacciones: en HEROW no hay chat.</span>
      </div>
    </div>
  )
}
