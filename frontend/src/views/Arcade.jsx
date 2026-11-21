import { Link } from 'react-router-dom'
import { ARCADE_GAMES } from '../arcade/catalog'
import PixelArt from '../arcade/PixelArt'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { play } from '../lib/sfx'
import { usePlayer } from '../lib/usePlayer'

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

      <main className="scene-content arc-grid">
        {ARCADE_GAMES.map(g => (
          <Link
            key={g.id}
            to={`/arcade/${g.id}`}
            className="arc-tile"
            style={{ '--tile': g.color }}
            onMouseEnter={() => play('blip')}
            onClick={() => play('portal')}
          >
            <span className="arc-thumb"><PixelArt name={g.id} size={96} /></span>
            <span className="arc-tile-name">{g.name}</span>
            <span className="arc-tile-modes">
              <PixelArt name="pad" size={16} title="Se juega sin cuenta" />
              {g.online && <PixelArt name="online" size={16} title="También online" />}
            </span>
          </Link>
        ))}
      </main>
    </div>
  )
}
