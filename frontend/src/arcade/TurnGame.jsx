import { useCallback, useEffect, useRef, useState } from 'react'
import { getHeroine } from '../data/heroines'
import { api } from '../lib/api'
import { play } from '../lib/sfx'
import { AI } from './ai'
import { Conecta4Board, MichiBoard, TimbiricheBoard } from './boards'
import { PLAYER_COLORS } from './colors'
import { useArcadeRoom } from './online'
import { TURN_GAMES } from './rules'
import PixelArt from './PixelArt'
import { ReportButton } from './Safety'
import { LiveStatus, ReactionBar, ReactionBubble, ResultBanner } from './ui'

const BOARDS = { michi: MichiBoard, conecta4: Conecta4Board, timbiriche: TimbiricheBoard }

function Scoreboard({ names, turn, over, scores, timer }) {
  return (
    <div className="arc-hud">
      {names.map((name, i) => (
        <span key={i} className={`hud-chip arc-player ${turn === i && !over ? 'turn' : ''}`} style={{ '--p': PLAYER_COLORS[i] }}>
          <span className="arc-swatch" />{name}{scores ? ` ${scores[i]}` : ''}
        </span>
      ))}
      {timer}
    </div>
  )
}

/** Consola: contra la computadora ('cpu') o 2 jugadoras en el mismo equipo ('local'). */
export function LocalTurnGame({ gameId, mode, level = 'facil' }) {
  const rules = TURN_GAMES[gameId]
  const Board = BOARDS[gameId]
  const [round, setRound] = useState(0)
  const [state, setState] = useState(() => rules.init())
  const [wins, setWins] = useState([0, 0]) // por persona (no por color)
  const thinking = useRef(false)
  // En cada partida se alterna quién empieza: la "jugadora 0" de las reglas cambia.
  const swapSides = round % 2 === 1
  const people = mode === 'cpu' ? ['Tú', 'Compu'] : ['Jugadora 1', 'Jugadora 2']
  const names = swapSides ? [people[1], people[0]] : people
  const cpuIdx = mode === 'cpu' ? (swapSides ? 0 : 1) : -1

  // Aplica un estado nuevo y, si terminó la partida, suma la victoria.
  const apply = useCallback((next) => {
    setState(next)
    if (!next.over) return
    if (next.draw) { play('confirm'); return }
    const person = swapSides ? 1 - next.winner : next.winner
    setWins(w => w.map((v, i) => (i === person ? v + 1 : v)))
    play(mode === 'cpu' && next.winner === cpuIdx ? 'lose' : 'win')
  }, [swapSides, mode, cpuIdx])

  useEffect(() => {
    if (state.over || state.turn !== cpuIdx || thinking.current) return
    thinking.current = true
    const id = setTimeout(() => {
      const m = AI[gameId](state, cpuIdx, level)
      const r = rules.move(state, cpuIdx, m)
      thinking.current = false
      if (r.ok) {
        play('blip')
        apply(r.state)
      }
    }, 450)
    return () => { clearTimeout(id); thinking.current = false }
  }, [state, cpuIdx, gameId, level, rules, apply])

  const move = (m) => {
    if (state.over || state.turn === cpuIdx) return
    const r = rules.move(state, state.turn, m)
    if (!r.ok) return
    play('select')
    apply(r.state)
  }

  const again = () => {
    setRound(r => r + 1)
    setState(rules.init())
  }

  let title = ''
  let icon = 'trophy'
  if (state.over) {
    if (state.draw) { title = 'Empate'; icon = 'smile' }
    else if (mode === 'cpu' && state.winner === cpuIdx) { title = 'Ganó la compu'; icon = 'bolt' }
    else title = mode === 'cpu' ? '¡Ganaste!' : `¡Ganó ${names[state.winner]}!`
  }

  return (
    <div className="tg-wrap">
      <Scoreboard names={names} turn={state.turn} over={state.over} scores={state.scores} />
      <p className="arc-muted">{people[0]} {wins[0]} – {wins[1]} {people[1]}</p>
      <Board state={state} canMove={!state.over && state.turn !== cpuIdx} onMove={move} />
      {state.over && <ResultBanner title={title} icon={icon} onAgain={again} />}
    </div>
  )
}

const END_TEXT = {
  timeout: (won) => (won ? 'Tu rival se quedó sin tiempo.' : 'Se acabaron tus 30 segundos de turno.'),
  left: (won) => (won ? 'Tu rival salió de la partida.' : 'Saliste de la partida.'),
  reported: () => 'La partida terminó por un reporte. Gracias por cuidar la comunidad.',
  completed: () => '',
}

/** Online: el servidor arbitra. Aquí solo se muestra y se envían jugadas. */
export function OnlineTurnGame({ room, onAgain, onExit, onEnd }) {
  const rules = TURN_GAMES[room.game]
  const Board = BOARDS[room.game]
  const me = room.you
  const [deadline, setDeadline] = useState(() => (room.state.turnRemainingMs != null ? Date.now() + room.state.turnRemainingMs : null))
  const { state, end, status, bubbles, react, eventCount } = useArcadeRoom(room, (m) => {
    if (m.type === 'state') {
      if (m.content.by !== me) play('blip')
      const ms = m.content.state.turnRemainingMs
      setDeadline(ms != null ? Date.now() + ms : null)
    }
    if (m.type === 'end') {
      play(m.content.winner === me ? 'win' : m.content.winner === null ? 'confirm' : 'lose')
      onEnd?.()
    }
  })
  // Jugada optimista: se ve al instante y desaparece cuando llega cualquier evento del servidor.
  const [pending, setPending] = useState(null) // { state, base }
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const optimistic = pending && pending.base === eventCount ? pending.state : null
  const view = optimistic ?? state
  const over = Boolean(end) || view.over
  const canMove = !over && view.turn === me && !optimistic

  const move = (m) => {
    if (!canMove) return
    const r = rules.move(state, me, m)
    if (!r.ok) return
    play('select')
    setPending({ state: r.state, base: eventCount })
    setError('')
    api.arcadeMove(room.id, m).catch(err => {
      setPending(null)
      setError(err.code === 'not_your_turn' ? 'Espera tu turno.' : err.message)
    })
  }

  const names = room.players.map((p, i) => (i === me ? 'Tú' : p.username))
  const secs = deadline && !over ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null
  const timer = secs !== null && (
    <span className={`hud-chip ${secs <= 5 ? 'arc-danger' : ''}`}><PixelArt name="clock" size={12} /> {secs}</span>
  )

  let banner = null
  if (end) {
    const won = end.winner === me
    const title = end.winner === null ? 'Empate' : won ? '¡Ganaste!' : 'Buen juego'
    banner = <ResultBanner title={title} icon={end.winner === null ? 'smile' : won ? 'trophy' : 'bolt'} text={END_TEXT[end.reason]?.(won)} onAgain={onAgain} againLabel="Otra rival"
      extra={<button className="pixel-btn ghost small" onClick={onExit}>Salir</button>} />
  }

  return (
    <div className="tg-wrap">
      <div className="arc-hud">
        <LiveStatus status={status} />
        {!end && <ReportButton roomId={room.id} rival={room.players[1 - me].username} />}
      </div>
      <Scoreboard names={names} turn={view.turn} over={over} scores={view.scores} timer={timer} />
      <div className="tg-players">
        {room.players.map((p, i) => {
          const h = getHeroine(p.heroineId)
          return (
            <div key={p.userId} className="tg-player" style={{ '--p': PLAYER_COLORS[i] }}>
              <ReactionBubble bubble={bubbles[i]} />
              {h ? <img src={h.sprite} alt="" className="pixel-img" /> : <PixelArt name={i === 0 ? 'markX' : 'markO'} size={28} />}
            </div>
          )
        })}
      </div>
      <Board state={view} canMove={canMove} onMove={move} />
      {error && <p className="form-error" onClick={() => setError('')}>{error}</p>}
      {banner}
      <ReactionBar onReact={react} />
    </div>
  )
}
