import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getArcadeGame } from '../arcade/catalog'
import { useMatchmaking } from '../arcade/online'
import { SafetyNote } from '../arcade/Safety'
import { api } from '../lib/api'
import { LIVE_ENABLED } from '../lib/live'
import { play } from '../lib/sfx'
import { usePlayer } from '../lib/usePlayer'

const ChispaGota = lazy(() => import('../arcade/chispagota/ChispaGota'))
const CristalesSolo = lazy(() => import('../arcade/cristales/Cristales'))
const CristalesOnline = lazy(() => import('../arcade/cristales/CristalesOnline'))
const Memoria = lazy(() => import('../arcade/Memoria'))
const LocalTurnGame = lazy(() => import('../arcade/TurnGame').then(m => ({ default: m.LocalTurnGame })))
const OnlineTurnGame = lazy(() => import('../arcade/TurnGame').then(m => ({ default: m.OnlineTurnGame })))

function ConsoleGame({ game, option }) {
  if (game.id === 'chispagota') return <ChispaGota mode={option} />
  if (game.id === 'cristales') return <CristalesSolo />
  if (game.id === 'memoria') return <Memoria mode={option} />
  const [mode, level] = option.split('-') // cpu-facil · cpu-dificil · local
  return <LocalTurnGame key={option} gameId={game.id} mode={mode} level={level} />
}

// ───────── Online ─────────
function OnlineLobby({ game }) {
  const { session } = usePlayer()
  const mm = useMatchmaking(game.id)
  const [codeInput, setCodeInput] = useState('')
  const [waiting, setWaiting] = useState(0)

  useEffect(() => {
    if (!session || mm.phase !== 'idle') return
    let alive = true
    const tick = () => api.arcadeLobby().then(r => alive && setWaiting(r.waiting?.[game.id] ?? 0)).catch(() => {})
    tick()
    const id = setInterval(tick, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [session, mm.phase, game.id])

  if (!session) {
    return (
      <div className="arc-panel center">
        <h3>🌐 Para jugar online necesitas tu cuenta HEROW</h3>
        <p>Es gratis y no pedimos tu correo: solo un nombre de usuaria y una contraseña. Las cuentas son para chicas de 15 a 17 años.</p>
        <div className="arc-row">
          <Link className="arc-btn" to="/registro" state={{ from: `/arcade/${game.id}` }}>✨ Crear mi cuenta</Link>
          <Link className="arc-btn ghost" to="/entrar" state={{ from: `/arcade/${game.id}` }}>Ya tengo cuenta</Link>
        </div>
        <p className="arc-muted">Mientras tanto, puedes jugar en 🎮 Consola sin registrarte.</p>
      </div>
    )
  }

  if (mm.phase === 'playing' && mm.room) {
    const props = { room: mm.room, onAgain: () => { play('confirm'); mm.find() }, onExit: () => mm.reset() }
    return game.id === 'cristales' ? <CristalesOnline key={mm.room.id} {...props} /> : <OnlineTurnGame key={mm.room.id} {...props} />
  }

  if (mm.phase === 'searching' || mm.phase === 'joining' || mm.phase === 'hosting') {
    return (
      <div className="arc-panel center">
        <div className="arc-spinner" aria-hidden="true">🌀</div>
        {mm.phase === 'searching' && <h3>Buscando rival para {game.name}…</h3>}
        {mm.phase === 'joining' && <h3>Entrando a la sala de tu amiga…</h3>}
        {mm.phase === 'hosting' && (
          mm.code
            ? <>
              <h3>Tu código de sala</h3>
              <p className="arc-code" aria-label={`Código ${mm.code.split('').join(' ')}`}>{mm.code}</p>
              <p>Díselo a tu amiga en persona o por tu grupo del cole. Ella entra a <strong>{game.name} → Online → Unirme con código</strong>.</p>
            </>
            : <h3>Creando tu sala…</h3>
        )}
        <button className="arc-btn ghost" onClick={() => { play('blip'); mm.cancel() }}>Cancelar</button>
      </div>
    )
  }

  return (
    <div className="arc-online">
      <div className="arc-panel">
        <h3>⚔️ Rival al azar</h3>
        <p>{game.online.label}. Te emparejamos con otra chica de HEROW.</p>
        <p className="arc-muted">{waiting > 0 ? `🟢 ${waiting} esperando rival ahora` : 'Nadie esperando ahora: ¡sé la primera!'}</p>
        <button className="arc-btn" onClick={() => { play('confirm'); mm.find() }}>Buscar rival</button>
      </div>
      <div className="arc-panel">
        <h3>👭 Con mi amiga</h3>
        <p>Crea una sala privada y pásale el código. Nadie más puede entrar.</p>
        <button className="arc-btn" onClick={() => { play('confirm'); mm.host() }}>Crear sala con código</button>
        <form className="arc-join" onSubmit={(e) => { e.preventDefault(); if (codeInput.trim().length === 5) { play('confirm'); mm.join(codeInput) } }}>
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
            placeholder="CÓDIGO"
            aria-label="Código de la sala de tu amiga"
            autoComplete="off"
          />
          <button className="arc-btn ghost" type="submit" disabled={codeInput.length !== 5}>Unirme con código</button>
        </form>
      </div>
      {(mm.phase === 'error' || mm.phase === 'nomatch') && (
        <p className="arc-error">{mm.phase === 'nomatch' ? 'Nadie más está buscando ahora. Prueba en un rato o invita a una amiga con un código.' : mm.error}</p>
      )}
    </div>
  )
}

export default function ArcadeGame() {
  const { gameId } = useParams()
  const game = getArcadeGame(gameId)
  if (!game) return <Navigate to="/arcade" replace />
  // key: al cambiar de juego, la pantalla empieza de cero.
  return <GamePage key={game.id} game={game} />
}

function GamePage({ game }) {
  const [tab, setTab] = useState('console')
  const [option, setOption] = useState(null)
  const online = game.online && LIVE_ENABLED

  return (
    <div className="arcade-page game">
      <header className="arc-top">
        <Link to="/arcade" className="arc-btn small ghost" onClick={() => play('blip')}>◀ Arcade</Link>
        <h1 className="arc-game-title" style={{ '--a': game.art[0], '--b': game.art[1] }}>{game.icon} {game.name}</h1>
        <span className="arc-muted">{game.players}</span>
      </header>

      <div className="arc-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'console'} className={`arc-tab ${tab === 'console' ? 'on' : ''}`} onClick={() => { play('blip'); setTab('console') }}>
          🎮 Jugar en consola <small>sin cuenta</small>
        </button>
        {online && (
          <button role="tab" aria-selected={tab === 'online'} className={`arc-tab ${tab === 'online' ? 'on' : ''}`} onClick={() => { play('blip'); setTab('online') }}>
            🌐 Jugar online <small>con tu cuenta</small>
          </button>
        )}
      </div>

      <main className="arc-stage">
        <Suspense fallback={<p className="arc-muted center">Cargando juego…</p>}>
          {tab === 'console' && !option && (
            <div className="arc-panel">
              <p>{game.about}</p>
              <div className="arc-col">
                {game.console.map(o => (
                  <button key={o.id} className="arc-btn big" onClick={() => { play('confirm'); setOption(o.id) }}>
                    {o.label}
                    {o.hint && <small>{o.hint}</small>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tab === 'console' && option && (
            <>
              <button className="arc-btn small ghost arc-back" onClick={() => { play('blip'); setOption(null) }}>◀ Cambiar modo</button>
              <ConsoleGame game={game} option={option} />
            </>
          )}
          {tab === 'online' && online && (
            <>
              <OnlineLobby game={game} />
              <SafetyNote />
            </>
          )}
        </Suspense>
      </main>
    </div>
  )
}
