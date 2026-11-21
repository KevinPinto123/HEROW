import { Link } from 'react-router-dom'
import { CATEGORIES, gamesIn } from '../arcade/catalog'
import PixelArt from '../arcade/PixelArt'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { play } from '../lib/sfx'
import { usePlayer } from '../lib/usePlayer'

function GameTile({ game }) {
  return (
    <Link
      to={`/arcade/${game.id}`}
      className="arc-tile"
      style={{ '--tile': game.color }}
      onMouseEnter={() => play('blip')}
      onClick={() => play('portal')}
    >
      <span className="arc-thumb"><PixelArt name={game.id} size={96} /></span>
      <span className="arc-tile-name">{game.name}</span>
      <span className="arc-tile-modes">
        <PixelArt name="pad" size={16} title="Se juega sin cuenta" />
        {game.online && <PixelArt name="online" size={16} title="También online" />}
      </span>
    </Link>
  )
}

export default function Arcade() {
  const { session } = usePlayer()

  return (
    <div className="scene arcade">
      <SceneBg src={BACKGROUNDS.hub} dim={0.55} />
      <div className="hud">
        <Link to={session ? '/dashboard' : '/'} className="pixel-btn ghost small" onClick={() => play('blip')}>◀ HEROW</Link>
        <h1 className="pixel-title arc-title">ARCADE</h1>
        {session
          ? <span className="arc-hud-spacer" />
          : <Link to="/entrar" state={{ from: '/arcade' }} className="pixel-btn ghost small" onClick={() => play('blip')}>Entrar</Link>}
      </div>

      <main className="scene-content arc-sections">
        {CATEGORIES.map(cat => (
          <section key={cat.id} className="arc-section" aria-labelledby={`cat-${cat.id}`}>
            <h2 id={`cat-${cat.id}`} className="arc-section-title" style={{ '--cat': cat.color }}>{cat.name}</h2>
            <div className="arc-grid">
              {gamesIn(cat.id).map(g => <GameTile key={g.id} game={g} />)}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
