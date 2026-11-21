import { Link } from 'react-router-dom'
import { ARCADE_GAMES } from '../arcade/catalog'
import { SafetyNote } from '../arcade/Safety'
import { play } from '../lib/sfx'
import { usePlayer } from '../lib/usePlayer'

export default function Arcade() {
  const { session } = usePlayer()

  return (
    <div className="arcade-page">
      <header className="arc-top">
        <Link to="/" className="arc-logo" onClick={() => play('blip')}>🌀 HEROW</Link>
        <nav className="arc-top-links">
          {session
            ? <Link to="/dashboard" className="arc-btn small">🏠 Mi aventura</Link>
            : <>
              <Link to="/entrar" state={{ from: '/arcade' }} className="arc-btn small ghost">Entrar</Link>
              <Link to="/registro" state={{ from: '/arcade' }} className="arc-btn small">Crear cuenta</Link>
            </>}
        </nav>
      </header>

      <section className="arc-hero">
        <h1>Arcade HEROW</h1>
        <p>Juegos gratis para pensar, crear y divertirte. <strong>Juega en consola sin registrarte</strong>, o crea tu cuenta para retar a otras chicas online.</p>
      </section>

      <main className="arc-grid">
        {ARCADE_GAMES.map((g, i) => (
          <Link
            key={g.id}
            to={`/arcade/${g.id}`}
            className="arc-tile"
            style={{ '--a': g.art[0], '--b': g.art[1], '--tilt': `${(i % 3) - 1}deg` }}
            onMouseEnter={() => play('blip')}
            onClick={() => play('select')}
          >
            <div className="arc-thumb">
              <span className="arc-thumb-icon">{g.icon}</span>
              {g.badge && <span className="arc-badge">{g.badge}</span>}
              <span className="arc-modes">
                <span title="Se juega sin cuenta">🎮</span>
                {g.online && <span title="También online">🌐</span>}
              </span>
            </div>
            <div className="arc-tile-name">{g.name}</div>
            <div className="arc-tile-tag">{g.tagline}</div>
          </Link>
        ))}
      </main>

      <section className="arc-info">
        <div className="arc-legend">
          <h3>¿Cómo se juega?</h3>
          <p><strong>🎮 Consola:</strong> en este equipo, sin cuenta. Contra la compu o con alguien a tu lado.</p>
          <p><strong>🌐 Online:</strong> contra otra chica de HEROW o con tu amiga usando un código. Necesitas tu cuenta (de 15 a 17 años).</p>
        </div>
        <SafetyNote />
      </section>

      <footer className="arc-foot">
        <Link to="/">← Volver a HEROW</Link> · <Link to="/seguridad">Seguridad</Link> · <Link to="/privacidad">Privacidad</Link>
      </footer>
    </div>
  )
}
