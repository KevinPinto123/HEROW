import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameNav from '../components/GameNav'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { HEROINES, PORTALS, getHeroine } from '../data/heroines'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

// Camino de niveles (las reglas reales viven en el servidor: server/src/data/game.js).
const LEVEL_PATH = [
  { level: 1, name: 'Despertar', points: 0, mission: 'Descubre tu portal y elige tu heroína', real: null, x: 14, y: 78 },
  { level: 2, name: 'Exploradora', points: 500, mission: 'Tu perfil profesional', real: 'Publícalo en LinkedIn (16+) o en tu portafolio', x: 40, y: 58 },
  { level: 3, name: 'Creadora', points: 1000, mission: 'Tu primer post', real: 'Publícalo en LinkedIn o tu portafolio', x: 68, y: 40 },
  { level: 4, name: 'Heroína', points: 1500, mission: 'Tu mini proyecto', real: 'Postula a una oportunidad real', x: 44, y: 16 },
]

export default function Niveles() {
  const navigate = useNavigate()
  const { state } = usePlayer()
  const p = state.profile
  const hero = getHeroine(p.heroineId) ?? HEROINES[0]
  const color = PORTALS[hero.portal].color
  const [selected, setSelected] = useState(Math.min(p.level + 1, LEVEL_PATH.length))

  const statusOf = (lv) => (lv.level <= p.level ? 'completed' : lv.level === p.level + 1 ? 'active' : 'locked')
  const node = LEVEL_PATH[selected - 1]
  const nodeStatus = statusOf(node)
  const isNext = state.next && node.level === state.next.targetLevel
  const here = LEVEL_PATH[p.level - 1]
  const polyline = LEVEL_PATH.map(n => `${n.x},${n.y}`).join(' ')

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.map} dim={0.6} />
      <div className="scene-content dash-wrap">
        <GameNav />
        <div className="levels-layout">
          <div className="pixel-panel levels-map">
            <h1 className="dash-h">🗺️ Tu camino de heroína</h1>
            <div className="levels-board" style={{ backgroundImage: `url(${BACKGROUNDS.map})` }}>
              <svg className="levels-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={polyline} fill="none" stroke="rgba(15,10,46,0.8)" strokeWidth="3" />
                <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="3 3" className="animated-dash" />
              </svg>
              {LEVEL_PATH.map(lv => {
                const st = statusOf(lv)
                return (
                  <button
                    key={lv.level}
                    className={`level-node ${st} ${selected === lv.level ? 'selected' : ''}`}
                    style={{ left: `${lv.x}%`, top: `${lv.y}%`, '--aura': color }}
                    onClick={() => { play('blip'); setSelected(lv.level) }}
                  >
                    <span className="level-num">{st === 'locked' ? '🔒' : lv.level}</span>
                    <span className="level-label">{lv.name}</span>
                  </button>
                )
              })}
              <img src={hero.sprite} alt={hero.name} className="pixel-img map-hero" style={{ left: `${here.x}%`, top: `${here.y}%`, '--aura': color }} />
            </div>
          </div>

          <aside className="pixel-panel levels-info" style={{ borderColor: color }}>
            <span className={`pixel-tag level-status ${nodeStatus}`}>
              {nodeStatus === 'completed' ? '✔ Completado' : nodeStatus === 'active' ? '🔥 Tu próxima meta' : '🔒 Bloqueado'}
            </span>
            <h2 className="pixel-title" style={{ fontSize: '1rem', margin: '14px 0 6px' }}>Nivel {node.level}</h2>
            <h3 className="dash-h" style={{ color }}>{node.name}</h3>
            <ul className="dash-checklist">
              {node.points > 0 && (
                <li className={p.points >= node.points ? 'done' : ''}>
                  <span className="check">{p.points >= node.points ? '✔' : '·'}</span>
                  <span><strong>{node.points} puntos</strong><small>Tienes {p.points}</small></span>
                </li>
              )}
              <li className={nodeStatus === 'completed' || (isNext && state.next.buildDone) ? 'done' : ''}>
                <span className="check">{nodeStatus === 'completed' || (isNext && state.next.buildDone) ? '✔' : '·'}</span>
                <span><strong>{node.mission}</strong><small>{node.level === 1 ? 'Diagnóstico con YessenIA' : 'Lo revisa YessenIA'}</small></span>
              </li>
              {node.real && (
                <li className={nodeStatus === 'completed' || (isNext && state.next.realDone) ? 'done' : ''}>
                  <span className="check">{nodeStatus === 'completed' || (isNext && state.next.realDone) ? '✔' : '·'}</span>
                  <span><strong>{node.real}</strong><small>Impacto en el mundo real</small></span>
                </li>
              )}
              {node.level > 1 && (
                <li className={nodeStatus === 'completed' ? 'done' : ''}>
                  <span className="check">{nodeStatus === 'completed' ? '✔' : '👾'}</span>
                  <span><strong>Vencer al NoPuedo</strong></span>
                </li>
              )}
            </ul>
            {isNext && (
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                {state.next.ready
                  ? <button className="pixel-btn gold" onClick={() => navigate('/boss')}>👾 Enfrentar al NoPuedo</button>
                  : <button className="pixel-btn gold" onClick={() => navigate('/mision')}>🎯 Ver mi misión</button>}
                <button className="pixel-btn cyan" onClick={() => navigate('/multiverso')}>⚔️ Jugar para sumar puntos</button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
