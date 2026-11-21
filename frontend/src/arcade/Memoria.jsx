import { useRef, useState } from 'react'
import { HEROINES } from '../data/heroines'
import { SPRITES } from '../data/assets'
import { play } from '../lib/sfx'
import { PLAYER_COLORS } from './colors'
import PixelArt from './PixelArt'
import { ResultBanner } from './ui'

const PAIRS = 8

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function newDeck() {
  const picked = shuffle(HEROINES).slice(0, PAIRS)
  return shuffle(picked.flatMap(h => [{ key: `${h.id}-a`, hero: h }, { key: `${h.id}-b`, hero: h }]))
}

const BEST_KEY = 'herow.arcade.memoria.best'
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || null } catch { return null } }

/** mode: 'solo' (contra el reloj) | 'duo' (2 jugadoras por turnos en el mismo equipo) */
export default function Memoria({ mode = 'solo' }) {
  const [deck, setDeck] = useState(newDeck)
  const [open, setOpen] = useState([]) // índices boca arriba sin pareja
  const [found, setFound] = useState({}) // heroId -> jugadora que la encontró (0/1)
  const [turn, setTurn] = useState(0)
  const [scores, setScores] = useState([0, 0])
  const [moves, setMoves] = useState(0)
  const [last, setLast] = useState(null) // última heroína encontrada (para la ficha)
  const [best, setBest] = useState(readBest)
  const lock = useRef(false)
  const duo = mode === 'duo'
  const done = Object.keys(found).length === PAIRS


  const flip = (i) => {
    if (lock.current || open.includes(i) || found[deck[i].hero.id] !== undefined) return
    play('blip')
    const next = [...open, i]
    setOpen(next)
    if (next.length < 2) return
    const total = moves + 1
    setMoves(total)
    const [a, b] = next.map(k => deck[k])
    if (a.hero.id === b.hero.id) {
      play('win')
      setFound(f => ({ ...f, [a.hero.id]: turn }))
      if (!duo && Object.keys(found).length + 1 === PAIRS && (best === null || total < best)) {
        setBest(total)
        try { localStorage.setItem(BEST_KEY, String(total)) } catch { /* sin almacenamiento */ }
      }
      setScores(s => s.map((v, k) => (k === turn ? v + 1 : v)))
      setLast(a.hero)
      setOpen([])
      return // acierto: sigue la misma jugadora
    }
    lock.current = true
    setTimeout(() => {
      setOpen([])
      if (duo) setTurn(t => 1 - t)
      lock.current = false
    }, 900)
  }

  const restart = () => {
    setDeck(newDeck())
    setOpen([])
    setFound({})
    setTurn(0)
    setScores([0, 0])
    setMoves(0)
    setLast(null)
    play('confirm')
  }

  const names = ['Jugadora 1', 'Jugadora 2']
  const winner = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1

  return (
    <div className="mem-wrap">
      <div className="arc-hud">
        {duo
          ? names.map((n, i) => (
            <span key={n} className={`hud-chip arc-player ${turn === i && !done ? 'turn' : ''}`} style={{ '--p': PLAYER_COLORS[i] }}>
              <span className="arc-swatch" />{n} {scores[i]}
            </span>
          ))
          : <>
            <span className="hud-chip">Intentos {moves}</span>
            <span className="hud-chip"><PixelArt name="heart" size={12} /> {Object.keys(found).length}/{PAIRS}</span>
            {best !== null && <span className="hud-chip"><PixelArt name="trophy" size={12} /> {best}</span>}
          </>}
        <button className="pixel-btn ghost small" onClick={restart}>Nuevo tablero</button>
      </div>
      <div className="mem-grid">
        {deck.map((card, i) => {
          const owner = found[card.hero.id]
          const up = open.includes(i) || owner !== undefined
          return (
            <button
              key={card.key}
              className={`mem-card ${up ? 'up' : ''} ${owner !== undefined ? `found p${owner}` : ''}`}
              onClick={() => flip(i)}
              aria-label={up ? card.hero.name : 'Carta boca abajo'}
            >
              <span className="mem-face mem-back"><img src={SPRITES.yessenia} alt="" className="pixel-img" /></span>
              <span className="mem-face mem-front">
                <img src={card.hero.sprite} alt="" className="pixel-img" loading="lazy" />
                <small>{card.hero.name.split(' ')[0]}</small>
              </span>
            </button>
          )
        })}
      </div>
      {last && !done && (
        <div className="pixel-panel mem-fact anim-pop" key={last.id}>
          <img src={last.sprite} alt="" className="pixel-img" />
          <div>
            <p className="arc-label">{last.name}</p>
            <p className="arc-muted">{last.bio}</p>
          </div>
        </div>
      )}
      {done && (
        <ResultBanner
          title={duo ? (winner === null ? 'Empate' : `¡Ganó ${names[winner]}!`) : `¡${moves} intentos!`}
          text={`Conociste a ${PAIRS} mujeres reales de la ciencia y la tecnología.`}
          icon={duo && winner === null ? 'smile' : 'trophy'}
          onAgain={restart}
          againLabel="Otra vez"
        />
      )}
    </div>
  )
}
