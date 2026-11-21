import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getArcadeGame } from '../arcade/catalog'
import { enterFullscreen } from '../arcade/fullscreen'
import GameShell from '../arcade/GameShell'
import { useMatchmaking } from '../arcade/online'
import PixelArt from '../arcade/PixelArt'
import { SafetyNote } from '../arcade/Safety'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS, SPRITES } from '../data/assets'
import { api } from '../lib/api'
import { LIVE_ENABLED } from '../lib/live'
import { play } from '../lib/sfx'
import { usePlayer } from '../lib/usePlayer'

const ChispaGota = lazy(() => import('../arcade/chispagota/ChispaGota'))
const CristalesSolo = lazy(() => import('../arcade/cristales/Cristales'))
const CristalesOnline = lazy(() => import('../arcade/cristales/CristalesOnline'))
const Memoria = lazy(() => import('../arcade/Memoria'))
const Orbita = lazy(() => import('../arcade/orbita/Orbita'))
const CodigoRobot = lazy(() => import('../arcade/robot/CodigoRobot'))
const Circuito = lazy(() => import('../arcade/circuito/Circuito'))
const Binario = lazy(() => import('../arcade/Binario'))
const CienciaFlash = lazy(() => import('../arcade/flash/CienciaFlash'))
const MenteRapida = lazy(() => import('../arcade/mates/MenteRapida'))
const Secuencia = lazy(() => import('../arcade/Secuencia'))

// Juegos de una sola modalidad: id → componente.
const SIMPLE_GAMES = { orbita: Orbita, robot: CodigoRobot, circuito: Circuito, binario: Binario, flash: CienciaFlash, mates: MenteRapida, secuencia: Secuencia }
const LocalTurnGame = lazy(() => import('../arcade/TurnGame').then(m => ({ default: m.LocalTurnGame })))
const OnlineTurnGame = lazy(() => import('../arcade/TurnGame').then(m => ({ default: m.OnlineTurnGame })))

function ConsoleGame({ game, option }) {
  if (game.id === 'chispagota') return <ChispaGota mode={option} />
  if (game.id === 'cristales') return <CristalesSolo />
  if (game.id === 'memoria') return <Memoria mode={option} />
  const Simple = SIMPLE_GAMES[game.id]
  if (Simple) return <Simple />
  const [mode, level] = option.split('-') // cpu-facil · cpu-dificil · local
  return <LocalTurnGame key={option} gameId={game.id} mode={mode} level={level} />
}

const LANDSCAPE = new Set(['chispagota'])
const enterGame = (game) => enterFullscreen({ landscape: LANDSCAPE.has(game.id) })

function HowTo({ game }) {
  return (
    <ol className="arc-howto">
      {game.howTo.map(line => <li key={line}>{line}</li>)}
    </ol>
  )
}

// ───────── Online ─────────
function OnlineLobby({ game }) {
  const { session } = usePlayer()
  const mm = useMatchmaking(game.id)
  const [codeInput, setCodeInput] = useState('')
  const [waiting, setWaiting] = useState(0)
  const [ended, setEnded] = useState(false) // la partida online terminó: salir sin confirmar
  const begin = (fn) => { play('confirm'); setEnded(false); enterGame(game); fn() }

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
      <div className="pixel-panel arc-panel center">
        <p>Para jugar online necesitas tu cuenta HEROW.</p>
        <div className="arc-row">
          <Link className="pixel-btn gold small" to="/registro" state={{ from: `/arcade/${game.id}` }}>Crear cuenta</Link>
          <Link className="pixel-btn ghost small" to="/entrar" state={{ from: `/arcade/${game.id}` }}>Ya tengo cuenta</Link>
        </div>
      </div>
    )
  }

  if (mm.phase === 'playing' && mm.room) {
    const props = { room: mm.room, onAgain: () => { play('confirm'); setEnded(false); mm.find() }, onExit: () => mm.reset() }
    return (
      <GameShell game={game} onExit={() => mm.reset()} confirmExit={!ended}>
        {game.id === 'cristales'
          ? <CristalesOnline key={mm.room.id} {...props} onEnd={() => setEnded(true)} />
          : <OnlineTurnGame key={mm.room.id} {...props} onEnd={() => setEnded(true)} />}
      </GameShell>
    )
  }

  if (mm.phase === 'searching' || mm.phase === 'joining' || mm.phase === 'hosting') {
    return (
      <GameShell game={game} onExit={() => mm.cancel()}>
      <div className="pixel-panel arc-panel center">
        <img src={SPRITES.yessenia} alt="" className="pixel-img arc-spinner" />
        {mm.phase === 'searching' && <p className="arc-label">Buscando rival…</p>}
        {mm.phase === 'joining' && <p className="arc-label">Entrando a la sala…</p>}
        {mm.phase === 'hosting' && (mm.code
          ? <>
            <p className="arc-label">Código de tu sala</p>
            <p className="arc-code" aria-label={`Código ${mm.code.split('').join(' ')}`}>{mm.code}</p>
            <p className="arc-muted">Dáselo a tu amiga. Ella entra a Online → Unirme.</p>
          </>
          : <p className="arc-label">Creando sala…</p>)}
        <button className="pixel-btn ghost small" onClick={() => { play('blip'); mm.cancel() }}>Cancelar</button>
      </div>
      </GameShell>
    )
  }

  return (
    <div className="arc-online">
      <div className="pixel-panel arc-panel arc-wide">
        <p className="arc-label">Cómo jugar</p>
        <HowTo game={game} />
      </div>
      <div className="pixel-panel arc-panel">
        <p className="arc-label">Rival al azar</p>
        <p className="arc-muted">{game.online.label}</p>
        <p className="arc-muted"><PixelArt name={waiting > 0 ? 'live' : 'wait'} size={10} /> {waiting > 0 ? `${waiting} esperando` : 'Nadie esperando'}</p>
        <button className="pixel-btn gold" onClick={() => begin(mm.find)}>Buscar rival</button>
      </div>
      <div className="pixel-panel arc-panel">
        <p className="arc-label">Con mi amiga</p>
        <button className="pixel-btn cyan" onClick={() => begin(mm.host)}>Crear sala</button>
        <form className="arc-join" onSubmit={(e) => { e.preventDefault(); if (codeInput.length === 5) begin(() => mm.join(codeInput)) }}>
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
            placeholder="CÓDIGO"
            aria-label="Código de la sala de tu amiga"
            autoComplete="off"
          />
          <button className="pixel-btn ghost small" type="submit" disabled={codeInput.length !== 5}>Unirme</button>
        </form>
      </div>
      {(mm.phase === 'error' || mm.phase === 'nomatch') && (
        <p className="form-error arc-wide">{mm.phase === 'nomatch' ? 'Nadie más está buscando ahora. Prueba en un rato o crea una sala para tu amiga.' : mm.error}</p>
      )}
      <SafetyNote />
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
  const playing = tab === 'console' && option
  const choose = (id) => {
    play('portal')
    enterGame(game)
    setOption(id)
  }

  return (
    <div className="scene arcade game" style={{ '--tile': game.color }}>
      <SceneBg src={BACKGROUNDS.hub} dim={0.7} />
      <div className="hud">
        <Link to="/arcade" className="pixel-btn ghost small" onClick={() => play('blip')}>◀ Arcade</Link>
        <h1 className="pixel-title arc-title small"><PixelArt name={game.id} size={32} /> {game.name}</h1>
        {online
          ? (
            <div className="arc-tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'console'} className={`pixel-btn small ${tab === 'console' ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setTab('console') }}>
                <PixelArt name="pad" size={14} /> Consola
              </button>
              <button role="tab" aria-selected={tab === 'online'} className={`pixel-btn small ${tab === 'online' ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setTab('online') }}>
                <PixelArt name="online" size={14} /> Online
              </button>
            </div>
          )
          : <span className="arc-hud-spacer" />}
      </div>

      <main className="scene-content arc-stage">
        <Suspense fallback={<p className="arc-muted center">Cargando…</p>}>
          {tab === 'console' && (
            <div className="pixel-panel arc-panel">
              <p className="arc-label">Cómo jugar</p>
              <HowTo game={game} />
              <div className="arc-modes">
                {game.console.map((o, i) => (
                  <button key={o.id} className={`pixel-btn ${i === 0 ? 'gold' : 'cyan'}`} onClick={() => choose(o.id)}>
                    ▶ {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {playing && (
            <GameShell game={game} onExit={() => setOption(null)}>
              <Suspense fallback={<p className="arc-muted center">Cargando…</p>}>
                <ConsoleGame game={game} option={option} />
              </Suspense>
            </GameShell>
          )}
          {tab === 'online' && online && <OnlineLobby game={game} />}
        </Suspense>
      </main>
    </div>
  )
}
