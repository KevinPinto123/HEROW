import { useChannel } from '@portalsdk/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameNav from '../components/GameNav'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { HEROINES, PORTALS, getHeroine, heroinesByPortal } from '../data/heroines'
import { usePlayer } from '../lib/usePlayer'
import { api } from '../lib/api'
import { LIVE_ENABLED, LOBBY_CHANNEL } from '../lib/live'
import { play } from '../lib/sfx'

function OnlineCount() {
  const { presence, status } = useChannel({ channelId: LOBBY_CHANNEL, history: 'none' })
  if (status !== 'ready' || !presence) return <span className="hud-chip">🟡 Conectando…</span>
  return <span className="hud-chip">🟢 {presence.count} {presence.count === 1 ? 'jugadora' : 'jugadoras'} en línea</span>
}

const TOPICS = {
  code: 'Programación · IA · Datos',
  robotics: 'Robótica · Espacio · Electrónica',
  design: 'UX/UI · Arquitectura · Inventos',
  science: 'Química · Biología · Arqueología',
}

export default function Multiverso() {
  const navigate = useNavigate()
  const { state } = usePlayer()
  const heroine = getHeroine(state.profile.heroineId) ?? HEROINES[0]
  const skills = Object.fromEntries(state.skills.map(s => [s.portal, s]))
  const [warping, setWarping] = useState(null)
  const [mode, setMode] = useState(LIVE_ENABLED ? 'live' : 'ai')
  const [waiting, setWaiting] = useState({})

  // Quién está esperando rival en cada portal (se actualiza cada 4 s).
  useEffect(() => {
    if (!LIVE_ENABLED) return
    let alive = true
    const tick = () => api.liveLobby().then(r => alive && setWaiting(r.waiting)).catch(() => {})
    tick()
    const id = setInterval(tick, 4000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const enter = (portalId) => {
    play('portal')
    setWarping(portalId)
    setTimeout(() => navigate(mode === 'live' ? '/vivo' : '/combate', { state: { portal: portalId } }), 650)
  }

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.hub} dim={0.15} />
      <div className="scene-content dash-wrap" style={{ paddingBottom: 0 }}>
        <GameNav />
      </div>

      <div className={`scene-content hub-wrap ${warping ? 'anim-flash' : ''}`}>
        <h1 className="pixel-title hub-title">Elige tu portal</h1>
        <div className="mode-switch">
          {LIVE_ENABLED && (
            <button className={`pixel-btn small ${mode === 'live' ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setMode('live') }}>
              ⚔️ En vivo vs otra chica
            </button>
          )}
          <button className={`pixel-btn small ${mode === 'ai' ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setMode('ai') }}>
            🤖 Práctica vs IA
          </button>
          {LIVE_ENABLED && <OnlineCount />}
        </div>
        <div className="hub-portals">
          {Object.values(PORTALS).map(p => {
            const s = skills[p.id]
            return (
              <button
                key={p.id}
                className="hub-portal"
                style={{ '--aura': p.color }}
                onClick={() => enter(p.id)}
                onMouseEnter={() => play('blip')}
                disabled={Boolean(warping)}
              >
                {p.id === state.profile.portalId && <span className="badge">★ Tu portal</span>}
                {mode === 'live' && waiting[p.id] && waiting[p.id] !== state.profile.username && (
                  <span className="badge waiting">⚔️ {waiting[p.id]} te espera</span>
                )}
                <span className="emoji">{p.emoji}</span>
                <h3>{p.name}</h3>
                <p>{TOPICS[p.id]}</p>
                <div className="mini-heroes">
                  {heroinesByPortal(p.id).slice(0, 4).map(h => (
                    <img key={h.id} src={h.sprite} alt={h.name} title={h.name} className="pixel-img" />
                  ))}
                </div>
                <p className="hub-portal-stats">
                  {s?.answered ? `${s.answered} rondas · ${s.accuracy}% aciertos` : 'Aún sin explorar'}
                </p>
              </button>
            )
          })}
        </div>

        <div className="hub-player" style={{ '--aura': PORTALS[heroine.portal].color }}>
          <img src={heroine.sprite} alt={heroine.name} className="pixel-img" />
        </div>
        {state.next?.ready && (
          <div className="center" style={{ marginTop: 16 }}>
            <button className="pixel-btn gold big" onClick={() => { play('boss'); navigate('/boss') }}>👾 Enfrentar al NoPuedo</button>
          </div>
        )}
      </div>
    </div>
  )
}
