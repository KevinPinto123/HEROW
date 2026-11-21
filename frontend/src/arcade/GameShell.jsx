import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { isMuted, play, toggleMute } from '../lib/sfx'
import { exitFullscreen, fullscreenSupported, toggleFullscreen, useIsFullscreen } from './fullscreen'
import PixelArt from './PixelArt'

/**
 * Marco de juego a pantalla completa: barra superior (salir, sonido, ayuda,
 * pantalla completa) y el juego ocupando todo el espacio restante.
 * confirmExit: pide confirmación antes de salir (partidas online).
 */
export default function GameShell({ game, onExit, confirmExit = false, children }) {
  const fullscreen = useIsFullscreen()
  const [muted, setMuted] = useState(isMuted)
  useEffect(() => {
    const sync = () => setMuted(isMuted())
    window.addEventListener('herow-mute', sync)
    return () => window.removeEventListener('herow-mute', sync)
  }, [])
  const [help, setHelp] = useState(false)
  const [asking, setAsking] = useState(false)

  // Sin scroll de la página detrás del juego.
  useEffect(() => {
    document.body.classList.add('arc-playing')
    return () => document.body.classList.remove('arc-playing')
  }, [])

  // Al salir del juego, también se sale de la pantalla completa.
  useEffect(() => () => exitFullscreen(), [])

  const leave = () => {
    if (confirmExit && !asking) {
      setAsking(true)
      play('blip')
      return
    }
    play('blip')
    exitFullscreen()
    onExit()
  }

  // Portal al <body>: así el juego queda encima de todo, fuera de cualquier capa de la página.
  return createPortal(
    <div className="arc-play" style={{ '--tile': game.color }} role="dialog" aria-modal="true" aria-label={game.name}>
      <SceneBg src={BACKGROUNDS.hub} dim={0.8} />
      <header className="arc-play-bar">
        <button className="pixel-btn ghost small" onClick={leave}>◀ Salir</button>
        <h1 className="arc-play-title"><PixelArt name={game.id} size={26} /> <span>{game.name}</span></h1>
        <div className="arc-play-tools">
          <button className={`pixel-btn small ${help ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setHelp(h => !h) }} aria-pressed={help} aria-label="Cómo jugar">?</button>
          <button className="pixel-btn ghost small" onClick={() => setMuted(toggleMute())} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
            <PixelArt name={muted ? 'soundOff' : 'soundOn'} size={16} />
          </button>
          {fullscreenSupported() && (
            <button className="pixel-btn ghost small" onClick={() => { play('blip'); toggleFullscreen() }} aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
              <PixelArt name={fullscreen ? 'fsClose' : 'fsOpen'} size={16} />
            </button>
          )}
        </div>
      </header>

      {asking && (
        <div className="arc-play-confirm pixel-panel anim-pop" role="alertdialog" aria-label="Confirmar salida">
          <p className="arc-label">¿Salir de la partida?</p>
          <p className="arc-muted">Si sales ahora, tu rival gana.</p>
          <div className="arc-row">
            <button className="pixel-btn pink small" onClick={leave}>Sí, salir</button>
            <button className="pixel-btn ghost small" onClick={() => setAsking(false)}>Seguir jugando</button>
          </div>
        </div>
      )}

      {help && (
        <div className="arc-play-help pixel-panel anim-pop">
          <p className="arc-label">Cómo jugar</p>
          <ol className="arc-howto">{game.howTo.map(l => <li key={l}>{l}</li>)}</ol>
          <button className="pixel-btn gold small" onClick={() => setHelp(false)}>Entendido</button>
        </div>
      )}

      <main className="arc-play-body">
        <div className="arc-play-inner">{children}</div>
      </main>
    </div>,
    document.body,
  )
}
