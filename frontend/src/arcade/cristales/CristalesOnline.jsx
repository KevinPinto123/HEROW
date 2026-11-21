import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { play } from '../../lib/sfx'
import { PLAYER_COLORS } from '../colors'
import { useArcadeRoom } from '../online'
import PixelArt from '../PixelArt'
import { ReportButton } from '../Safety'
import { LiveStatus, ReactionBar, ReactionBubble, ResultBanner } from '../ui'
import { CristalesBoard } from './Cristales'

const SEND_EVERY_MS = 1000

/** Duelo online: las dos juegan el mismo tablero inicial durante 90 s. Gana el puntaje más alto. */
export default function CristalesOnline({ room, onAgain, onExit, onEnd }) {
  const me = room.you
  const { end, scores, status, bubbles, react } = useArcadeRoom(room, (m) => {
    if (m.type === 'end') {
      play(m.content.winner === me ? 'win' : m.content.winner === null ? 'confirm' : 'lose')
      onEnd?.()
    }
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
    const title = end.reason === 'reported' ? 'Duelo terminado' : end.winner === null ? 'Empate' : won ? '¡Ganaste!' : 'Buen duelo'
    const text = end.reason === 'left' ? (won ? 'Tu rival salió del duelo.' : 'Saliste del duelo.') : `${shown[me]} – ${shown[rivalIdx]}`
    overlay = (
      <div className="cg-overlay">
        <ResultBanner title={title} text={text} icon={end.winner === null ? 'smile' : won ? 'trophy' : 'bolt'} onAgain={onAgain} againLabel="Otro duelo"
          extra={<button className="pixel-btn ghost small" onClick={onExit}>Salir</button>} />
      </div>
    )
  } else if (now < startsAt) {
    overlay = <div className="cg-overlay"><p className="pixel-title cr-countdown">{countdown > 0 ? countdown : '¡Ya!'}</p></div>
  } else if (now >= endsAt) {
    overlay = <div className="cg-overlay"><p className="arc-label">¡Tiempo!</p></div>
  }

  return (
    <div className="cr-wrap">
      <div className="arc-hud">
        <LiveStatus status={status} />
        <span className="hud-chip arc-player" style={{ '--p': PLAYER_COLORS[me] }}>
          <ReactionBubble bubble={bubbles[me]} />
          <span className="arc-swatch" />Tú {mine}
        </span>
        <span className="hud-chip arc-player" style={{ '--p': PLAYER_COLORS[rivalIdx] }}>
          <ReactionBubble bubble={bubbles[rivalIdx]} />
          <span className="arc-swatch" />{room.players[rivalIdx].username} {shown[rivalIdx] ?? 0}
        </span>
        <span className="hud-chip"><PixelArt name="clock" size={12} /> {now < startsAt ? 90 : left}</span>
        {!end && <ReportButton roomId={room.id} rival={room.players[rivalIdx].username} />}
      </div>
      <div className="cr-stage">
        <CristalesBoard seed={room.state.seed} running={running} onScore={(v) => { myScore.current = v; setMineLocal(v) }} />
        {overlay}
      </div>
      <ReactionBar onReact={react} />
    </div>
  )
}
