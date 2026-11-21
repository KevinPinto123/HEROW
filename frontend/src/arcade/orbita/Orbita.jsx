import { useCallback, useEffect, useRef, useState } from 'react'
import { play } from '../../lib/sfx'
import PixelArt from '../PixelArt'
import { drawSprite } from '../sprites'
import { readBest, saveBest } from '../storage'
import { ResultBanner } from '../ui'
import { SIZE, init, speedFor, step, turn } from './logic'

const CELL = 24
const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
}

function draw(ctx, s, t) {
  const W = SIZE * CELL
  ctx.fillStyle = '#0F0A2E'
  ctx.fillRect(0, 0, W, W)
  // estrellas fijas
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < 50; i++) ctx.fillRect((i * 97) % W, (i * 61) % W, 2, 2)
  // cuadrícula tenue
  ctx.fillStyle = 'rgba(139,92,246,0.10)'
  for (let i = 0; i <= SIZE; i++) {
    ctx.fillRect(i * CELL, 0, 1, W)
    ctx.fillRect(0, i * CELL, W, 1)
  }
  if (s.food) {
    const pulse = Math.floor(t * 4) % 2
    drawSprite(ctx, 'star', s.food.x * CELL + 4 - pulse, s.food.y * CELL + 4 - pulse, 2 + pulse * 0.25)
  }
  s.body.forEach((b, i) => {
    if (i === 0) return
    const fade = Math.max(0.35, 1 - i / (s.body.length + 4))
    ctx.fillStyle = `rgba(34, 211, 238, ${fade})`
    ctx.fillRect(b.x * CELL + 4, b.y * CELL + 4, CELL - 8, CELL - 8)
    ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.5})`
    ctx.fillRect(b.x * CELL + 6, b.y * CELL + 6, 4, 4)
  })
  const h = s.body[0]
  drawSprite(ctx, 'satellite', h.x * CELL + 4, h.y * CELL + 4, 2)
}

export default function Orbita() {
  const canvasRef = useRef(null)
  const stateRef = useRef(init())
  const [phase, setPhase] = useState('ready') // ready | playing | over
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => readBest('orbita'))
  const touchStart = useRef(null)

  const steer = useCallback((dir) => {
    stateRef.current = turn(stateRef.current, dir)
  }, [])

  const start = () => {
    stateRef.current = init()
    setScore(0)
    setPhase('playing')
    play('confirm')
  }

  // Teclado
  useEffect(() => {
    const onKey = (e) => {
      const dir = KEYS[e.code]
      if (!dir) return
      e.preventDefault()
      if (phase === 'playing') steer(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, steer])

  // Bucle: un paso cada speedFor(eaten) ms; se dibuja en cada cuadro.
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf
    let acc = 0
    let last = performance.now()
    const frame = (now) => {
      const s0 = stateRef.current
      if (phase === 'playing' && !s0.over) {
        acc += now - last
        let guard = 0
        while (acc >= speedFor(stateRef.current.eaten) && guard++ < 5) {
          acc -= speedFor(stateRef.current.eaten)
          const before = stateRef.current.eaten
          stateRef.current = step(stateRef.current)
          if (stateRef.current.eaten > before) {
            play('select')
            setScore(stateRef.current.eaten * 10)
          }
          if (stateRef.current.over) {
            play('lose')
            const final = stateRef.current.eaten * 10
            setBest(saveBest('orbita', final))
            setPhase('over')
            break
          }
        }
      }
      last = now
      draw(ctx, stateRef.current, now / 1000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const onTouchStart = (e) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    const s = touchStart.current
    touchStart.current = null
    if (!s || phase !== 'playing') return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
  }

  const pad = (dir, label) => (
    <button className="pixel-btn ghost small or-pad-btn" onPointerDown={(e) => { e.preventDefault(); steer(dir) }} aria-label={label}>
      <span className={`or-arrow ${dir}`}><PixelArt name="cmdForward" size={16} /></span>
    </button>
  )

  return (
    <div className="or-wrap">
      <div className="arc-hud">
        <span className="hud-chip"><PixelArt name="star" size={12} /> {score}</span>
        <span className="hud-chip"><PixelArt name="trophy" size={12} /> {best}</span>
      </div>
      <div className="cg-stage">
        <canvas
          ref={canvasRef}
          width={SIZE * CELL}
          height={SIZE * CELL}
          className="or-canvas"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-label="Órbita"
        />
        {phase === 'ready' && (
          <div className="cg-overlay"><button className="pixel-btn gold" onClick={start}>▶ Despegar</button></div>
        )}
        {phase === 'over' && (
          <div className="cg-overlay">
            <ResultBanner title={`${score} puntos`} text={score > 0 && score >= best ? '¡Nuevo récord!' : 'El satélite perdió la señal.'} onAgain={start} againLabel="Otra vez" icon={score > 0 && score >= best ? 'trophy' : 'bolt'} />
          </div>
        )}
      </div>
      <div className="or-pad">
        <span />{pad('up', 'Arriba')}<span />
        {pad('left', 'Izquierda')}<span />{pad('right', 'Derecha')}
        <span />{pad('down', 'Abajo')}<span />
      </div>
    </div>
  )
}
