import { useCallback, useEffect, useRef, useState } from 'react'
import { play } from '../../lib/sfx'
import { HEROES, LEVELS, T, gemTotals, loadLevel, step } from './engine'

const DT = 1 / 60
const KEYS = {
  chispa: { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW'] },
  gota: { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'] },
  // En modo 1 jugadora, ambos juegos de teclas mueven a la heroína activa.
  solo: { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], jump: ['KeyW', 'ArrowUp', 'Space'] },
}
const BLOCKED = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'])

// ───────── Dibujo ─────────
function drawTile(ctx, ch, x, y, t, open) {
  if (ch === '#') {
    ctx.fillStyle = '#3B2F6B'
    ctx.fillRect(x, y, T, T)
    ctx.fillStyle = '#4C3D8A'
    ctx.fillRect(x + 2, y + 2, T - 4, T - 4)
    ctx.fillStyle = '#5E4BA8'
    ctx.fillRect(x + 2, y + 2, T - 4, 4)
    return
  }
  if (ch === 'L' || ch === 'W' || ch === 'A') {
    const colors = { L: ['#7A1E00', '#FF5400', '#FFB703'], W: ['#03256C', '#1768AC', '#7FDBFF'], A: ['#1B4332', '#2DC653', '#B7FF5C'] }[ch]
    ctx.fillStyle = '#3B2F6B'
    ctx.fillRect(x, y, T, T)
    ctx.fillStyle = colors[0]
    ctx.fillRect(x, y + 6, T, T - 6)
    ctx.fillStyle = colors[1]
    const wave = Math.sin(t * 4 + x / 20) * 2
    ctx.fillRect(x, y + 4 + wave, T, 10)
    ctx.fillStyle = colors[2]
    ctx.fillRect(x + ((t * 30 + x) % T), y + 5 + wave, 6, 3)
    return
  }
  if (ch === 'D') {
    ctx.fillStyle = open ? 'rgba(232,121,249,0.15)' : 'rgba(232,121,249,0.85)'
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 7, y, 4, T)
  }
}

function drawHero(ctx, p, t, active) {
  const x = Math.round(p.x)
  const y = Math.round(p.y)
  const bob = p.onGround && p.vx ? Math.sin(t * 18) * 1.5 : 0
  if (active) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.moveTo(x + 10, y - 14)
    ctx.lineTo(x + 5, y - 20)
    ctx.lineTo(x + 15, y - 20)
    ctx.fill()
  }
  // cabello: llama o gota
  ctx.fillStyle = p.light
  if (p.element === 'fire') {
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i * 6, y - 6 - ((i % 2) * 4) - Math.abs(Math.sin(t * 10 + i)) * 3, 5, 9)
  } else {
    ctx.beginPath()
    ctx.moveTo(x + 10, y - 10)
    ctx.quadraticCurveTo(x + 20, y + 2, x + 10, y + 4)
    ctx.quadraticCurveTo(x, y + 2, x + 10, y - 10)
    ctx.fill()
  }
  ctx.fillStyle = p.color
  ctx.fillRect(x, y + bob, 20, 28 - bob)
  ctx.fillStyle = '#FFE8D6'
  ctx.fillRect(x + 3, y + 3 + bob, 14, 10)
  ctx.fillStyle = '#1A1145'
  const eye = p.facing > 0 ? 2 : 0
  ctx.fillRect(x + 5 + eye, y + 6 + bob, 3, 3)
  ctx.fillRect(x + 11 + eye, y + 6 + bob, 3, 3)
  ctx.fillStyle = '#fff'
  ctx.fillRect(x + 4, y + 18 + bob, 12, 3)
}

function draw(ctx, s, t, activeIdx) {
  const W = s.cols * T
  const H = s.rows * T
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1A1145')
  g.addColorStop(1, '#2B1C6B')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // estrellas de fondo
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53) % H, 2, 2)

  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) drawTile(ctx, s.grid[r][c], c * T, r * T, t, s.open)

  for (const b of s.buttons) {
    const pressed = s.open
    ctx.fillStyle = '#E879F9'
    ctx.fillRect(b.c * T + 6, b.r * T + (pressed ? 28 : 24), T - 12, pressed ? 4 : 8)
  }
  for (const [key, d] of Object.entries(s.doors)) {
    const hero = HEROES.find(h => h.door === key)
    const x = d.c * T
    const y = d.r * T - T
    ctx.fillStyle = '#120B33'
    ctx.fillRect(x + 2, y + 4, T - 4, 2 * T - 4)
    ctx.strokeStyle = hero.color
    ctx.lineWidth = 3
    ctx.strokeRect(x + 3.5, y + 5.5, T - 7, 2 * T - 7)
    ctx.font = '18px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(hero.element === 'fire' ? '🔥' : '💧', x + T / 2, y + 28)
  }
  for (const gem of s.gems) {
    if (gem.taken) continue
    const x = gem.c * T + T / 2
    const y = gem.r * T + T / 2 + Math.sin(t * 3 + gem.c) * 3
    ctx.fillStyle = gem.kind === 'f' ? '#FF5400' : '#1E96FC'
    ctx.beginPath()
    ctx.moveTo(x, y - 9)
    ctx.lineTo(x + 8, y)
    ctx.lineTo(x, y + 9)
    ctx.lineTo(x - 8, y)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillRect(x - 2, y - 5, 3, 4)
  }
  s.players.forEach((p, i) => drawHero(ctx, p, t, activeIdx === i))
}

// ───────── Controles táctiles ─────────
function Pad({ label, color, onChange }) {
  const btn = (key, text) => (
    <button
      type="button"
      className="cg-pad-btn"
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); onChange(key, true) }}
      onPointerUp={() => onChange(key, false)}
      onPointerCancel={() => onChange(key, false)}
      onPointerLeave={() => onChange(key, false)}
      onContextMenu={(e) => e.preventDefault()}
    >{text}</button>
  )
  return (
    <div className="cg-pad" style={{ '--pad': color }}>
      <span className="cg-pad-label">{label}</span>
      {btn('left', '◀')}{btn('jump', '▲')}{btn('right', '▶')}
    </div>
  )
}

export default function ChispaGota({ mode = 'duo' }) {
  const canvasRef = useRef(null)
  const [game, setGame] = useState(() => loadLevel(0))
  const stateRef = useRef(game)
  const keys = useRef(new Set())
  const touch = useRef([{}, {}])
  const activeRef = useRef(0)
  const [level, setLevel] = useState(0)
  const [hud, setHud] = useState({ status: 'playing', gems: [0, 0], time: 0, deadId: null })
  const [active, setActive] = useState(0)
  const [finished, setFinished] = useState(false)
  const solo = mode === 'solo'

  useEffect(() => { stateRef.current = game }, [game])

  const restart = useCallback((idx = level) => {
    setGame(loadLevel(idx))
    setHud({ status: 'playing', gems: [0, 0], time: 0, deadId: null })
  }, [level])

  const switchHero = useCallback(() => {
    activeRef.current = 1 - activeRef.current
    setActive(activeRef.current)
    play('blip')
  }, [])

  // Teclado
  useEffect(() => {
    const down = (e) => {
      if (BLOCKED.has(e.code)) e.preventDefault()
      if (e.repeat) return
      if (solo && (e.code === 'Tab' || e.code === 'KeyQ')) { e.preventDefault(); switchHero(); return }
      if (e.code === 'KeyR') restart()
      keys.current.add(e.code)
    }
    const up = (e) => keys.current.delete(e.code)
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [solo, switchHero, restart])

  // Bucle del juego (paso fijo de 1/60 s)
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf
    let last = performance.now()
    let acc = 0
    let prevStatus = 'playing'
    let prevGems = 0
    let jumpHeld = [false, false]
    const read = (map) => ({
      left: map.left.some(k => keys.current.has(k)),
      right: map.right.some(k => keys.current.has(k)),
      jump: map.jump.some(k => keys.current.has(k)),
    })
    const frame = (now) => {
      const s = stateRef.current
      // Tope de 0.5 s: en equipos lentos el juego no va en cámara lenta (la física sigue en pasos de 1/60).
      acc = Math.min(acc + (now - last) / 1000, 0.5)
      last = now
      while (acc >= DT && s) {
        let input
        if (solo) {
          const k = read(KEYS.solo)
          const tch = touch.current[0]
          const merged = { left: k.left || tch.left, right: k.right || tch.right, jump: k.jump || tch.jump }
          input = [{}, {}]
          input[activeRef.current] = merged
        } else {
          input = [read(KEYS.chispa), read(KEYS.gota)].map((k, i) => {
            const tch = touch.current[i]
            return { left: k.left || tch.left, right: k.right || tch.right, jump: k.jump || tch.jump }
          })
        }
        // Saltar al presionar (no repetir mientras se mantiene).
        input = input.map((k, i) => {
          const fresh = k.jump && !jumpHeld[i]
          jumpHeld[i] = Boolean(k.jump)
          if (fresh && s.players[i].onGround) play('blip')
          return { ...k, jump: fresh }
        })
        step(s, input, DT)
        acc -= DT
      }
      if (s) {
        draw(ctx, s, now / 1000, solo ? activeRef.current : -1)
        const gems = s.players.map(p => p.gems)
        const total = gems[0] + gems[1]
        if (total > prevGems) play('select')
        prevGems = total
        if (s.status !== prevStatus) {
          prevStatus = s.status
          if (s.status === 'dead') play('lose')
          if (s.status === 'won') play('win')
        }
        if (s.status === 'playing' && prevStatus !== 'playing') prevStatus = 'playing'
        setHud(h => (h.status === s.status && h.gems[0] === gems[0] && h.gems[1] === gems[1] && Math.floor(h.time) === Math.floor(s.time)
          ? h
          : { status: s.status, gems, time: s.time, deadId: s.deadId }))
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [solo])

  const totals = gemTotals(game)
  const def = LEVELS[level]
  const next = () => {
    if (level + 1 < LEVELS.length) {
      setLevel(level + 1)
      restart(level + 1)
    } else setFinished(true)
    play('confirm')
  }
  const setTouch = (idx) => (key, value) => { touch.current[idx] = { ...touch.current[idx], [key]: value } }

  if (finished) {
    return (
      <div className="arc-result">
        <div className="arc-result-emoji">🏆</div>
        <h2>¡Terminaron el laboratorio!</h2>
        <p>Chispa y Gota superaron los {LEVELS.length} niveles trabajando en equipo. Así trabajan las científicas de verdad: cada una aporta lo que sabe hacer.</p>
        <button className="arc-btn" onClick={() => { setFinished(false); setLevel(0); restart(0) }}>🔄 Jugar otra vez</button>
      </div>
    )
  }

  return (
    <div className="cg-wrap">
      <div className="arc-hud">
        <span className="arc-chip">Nivel {level + 1}/{LEVELS.length} · {def.name}</span>
        <span className="arc-chip" style={{ color: HEROES[0].color }}>🔥 {hud.gems[0]}/{totals.f}</span>
        <span className="arc-chip" style={{ color: HEROES[1].color }}>💧 {hud.gems[1]}/{totals.w}</span>
        <span className="arc-chip">⏱ {Math.floor(hud.time)} s</span>
        {solo && <button className="arc-btn small" onClick={switchHero}>🔄 Cambiar a {HEROES[1 - active].name}</button>}
        <button className="arc-btn small ghost" onClick={() => restart()}>↺ Reiniciar</button>
      </div>
      <p className="cg-tip">💡 {def.tip}</p>
      <div className="cg-stage">
        <canvas ref={canvasRef} width={24 * T} height={14 * T} className="cg-canvas" aria-label={`Chispa y Gota, nivel ${level + 1}`} />
        {hud.status === 'dead' && (
          <div className="cg-overlay">
            <p>{hud.deadId === 'chispa' ? '💦 ¡Chispa se apagó!' : '🔥 ¡Gota se evaporó!'}</p>
            <button className="arc-btn" onClick={() => restart()}>↺ Intentar de nuevo</button>
          </div>
        )}
        {hud.status === 'won' && (
          <div className="cg-overlay">
            <p>✨ ¡Nivel superado en {Math.floor(hud.time)} s!</p>
            <button className="arc-btn" onClick={next}>{level + 1 < LEVELS.length ? '▶ Siguiente nivel' : '🏆 Ver final'}</button>
          </div>
        )}
      </div>
      <p className="cg-keys">
        {solo
          ? '⌨️ Flechas o WASD para mover y saltar · Tab o Q para cambiar de heroína · R reinicia'
          : '⌨️ Chispa: W A D · Gota: ← ↑ → · R reinicia'}
      </p>
      <div className="cg-pads">
        {solo
          ? <Pad label={HEROES[active].name} color={HEROES[active].color} onChange={setTouch(0)} />
          : <>
            <Pad label="Chispa" color={HEROES[0].color} onChange={setTouch(0)} />
            <Pad label="Gota" color={HEROES[1].color} onChange={setTouch(1)} />
          </>}
      </div>
    </div>
  )
}
