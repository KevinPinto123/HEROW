import { NavLink, useNavigate } from 'react-router-dom'
import { getHeroine } from '../data/heroines'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

// Barra superior de las pantallas de juego: nivel, puntos y navegación.
export default function GameNav() {
  const navigate = useNavigate()
  const { state, logout } = usePlayer()
  const p = state?.profile
  if (!p) return null
  const hero = getHeroine(p.heroineId)
  const next = state.next

  const link = ({ isActive }) => `pixel-btn small ${isActive ? 'gold' : 'ghost'}`

  return (
    <nav className="game-nav">
      <div className="game-nav-player">
        {hero && <img src={hero.sprite} alt="" className="pixel-img" />}
        <div>
          <div className="game-nav-name">{p.username}</div>
          <div className="game-nav-meta">
            Nivel {p.level} · {p.levelName} · 🏆 {p.points}
            {next ? ` / ${next.pointsNeeded}` : ''}
          </div>
        </div>
      </div>
      <div className="game-nav-links">
        <NavLink to="/dashboard" className={link} onClick={() => play('blip')}>🏠 Inicio</NavLink>
        <NavLink to="/multiverso" className={link} onClick={() => play('blip')}>⚔️ Jugar</NavLink>
        <NavLink to="/mision" className={link} onClick={() => play('blip')}>🎯 Misión</NavLink>
        <NavLink to="/niveles" className={link} onClick={() => play('blip')}>🗺️ Mapa</NavLink>
        <button className="pixel-btn ghost small" onClick={async () => { await logout(); navigate('/') }}>Salir</button>
      </div>
    </nav>
  )
}
