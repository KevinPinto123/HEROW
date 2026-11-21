// Piezas de interfaz compartidas por los juegos del arcade (estilo pixel de HEROW).
import { REACTIONS } from '../lib/live'
import PixelArt from './PixelArt'
import { REACTION_SPRITES } from './sprites'

export function ReactionBar({ onReact }) {
  return (
    <div className="arc-reactions" aria-label="Reacciones">
      {REACTIONS.map(e => (
        <button key={e} className="arc-react" onClick={() => onReact(e)} aria-label={`Reacción ${REACTION_SPRITES[e]}`}>
          <PixelArt name={REACTION_SPRITES[e]} size={22} />
        </button>
      ))}
    </div>
  )
}

export function ReactionBubble({ bubble }) {
  if (!bubble) return null
  return <span className="reaction-bubble" key={bubble.key}><PixelArt name={REACTION_SPRITES[bubble.emoji]} size={30} /></span>
}

export function LiveStatus({ status }) {
  const ok = status === 'ready'
  return (
    <span className={`hud-chip arc-live ${ok ? 'ok' : ''}`}>
      <PixelArt name={ok ? 'live' : 'wait'} size={10} /> {ok ? 'En vivo' : 'Reconectando'}
    </span>
  )
}

export function ResultBanner({ title, text, onAgain, againLabel = 'Otra partida', extra, icon = 'trophy' }) {
  return (
    <div className="pixel-panel arc-banner anim-pop">
      <PixelArt name={icon} size={40} />
      <p className="arc-label">{title}</p>
      {text && <p className="arc-muted">{text}</p>}
      <div className="arc-row">
        {onAgain && <button className="pixel-btn gold small" onClick={onAgain}>▶ {againLabel}</button>}
        {extra}
      </div>
    </div>
  )
}
