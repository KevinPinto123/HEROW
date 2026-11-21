import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PixelDialog from '../components/PixelDialog'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS, SPRITES } from '../data/assets'
import { HEROINES, PORTALS, getHeroine, heroinesByPortal } from '../data/heroines'
import { api } from '../lib/api'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const WHISPERS = [
  { text: '"La tecnología es muy difícil para ti"', style: { top: '18%', left: '4%' } },
  { text: '"Eres muy chica para esto"', style: { top: '30%', right: '4%', animationDelay: '0.8s' } },
  { text: '"Nadie va a leer lo que publicas"', style: { top: '52%', left: '6%', animationDelay: '1.6s' } },
  { text: '"Eso no es para chicas"', style: { top: '62%', right: '6%', animationDelay: '2.2s' } },
]

export default function Boss() {
  const navigate = useNavigate()
  const { state, setState } = usePlayer()
  const hero = getHeroine(state.profile.heroineId) ?? HEROINES[0]
  const portal = PORTALS[hero.portal]

  // Aliadas: heroínas que ya desbloqueó; si aún no tiene, las de su portal la inspiran.
  const unlockedAllies = state.collection.filter(h => h.unlocked && h.id !== hero.id).map(h => getHeroine(h.id))
  const allies = (unlockedAllies.length ? unlockedAllies : heroinesByPortal(portal.id).filter(h => h.id !== hero.id)).slice(0, 4)

  const [step, setStep] = useState('appear') // appear | allies | attack | victory
  const [hp, setHp] = useState(100)
  const [shake, setShake] = useState(false)
  const [levelUp, setLevelUp] = useState(null) // { before, after }
  const [rewards, setRewards] = useState(null)
  const [error, setError] = useState('')

  const ready = state.next?.ready

  useEffect(() => { if (ready) play('boss') }, [ready])

  const strike = (floor = 0, amount = 34) => {
    play('hit')
    setShake(true)
    setHp(h => Math.max(floor, h - amount))
    setTimeout(() => setShake(false), 420)
  }

  const comboAttack = () => {
    setStep('attack')
    strike()
    setTimeout(() => strike(), 450)
    setTimeout(async () => {
      strike(0, 100)
      play('win')
      try {
        const before = state.profile.level
        const { state: after } = await api.advanceLevel()
        setState(after)
        setLevelUp({ before, after })
        setStep('victory')
        api.opportunities().then(o => setRewards(o.recommended.slice(0, 3))).catch(() => setRewards([]))
      } catch (err) {
        setError(err.message)
      }
    }, 900)
  }

  if (!ready && step !== 'victory') {
    const n = state.next
    return (
      <div className="scene">
        <SceneBg src={BACKGROUNDS.boss} dim={0.6} />
        <div className="scene-content boss-wrap" style={{ paddingTop: 60 }}>
          <img src={SPRITES.nopuedo} alt="El NoPuedo" className="pixel-img boss-sprite idle" style={{ width: 'min(420px, 80vw)' }} />
          <div className="pixel-panel" style={{ maxWidth: 620, margin: '0 auto', textAlign: 'left' }}>
            <h1 className="dash-h">El NoPuedo todavía no aparece</h1>
            {n ? (
              <ul className="dash-checklist">
                <li className={n.pointsDone ? 'done' : ''}><span className="check">{n.pointsDone ? '✔' : '·'}</span><span><strong>{n.pointsNeeded} puntos</strong><small>{state.profile.points} / {n.pointsNeeded}</small></span></li>
                <li className={n.buildDone ? 'done' : ''}><span className="check">{n.buildDone ? '✔' : '·'}</span><span><strong>{n.mission.title}</strong></span></li>
                <li className={n.realDone ? 'done' : ''}><span className="check">{n.realDone ? '✔' : '·'}</span><span><strong>{n.mission.real.title}</strong></span></li>
              </ul>
            ) : <p>Ya estás en el nivel máximo.</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button className="pixel-btn gold" onClick={() => navigate('/mision')}>🎯 Ver mi misión</button>
              <button className="pixel-btn ghost" onClick={() => navigate('/dashboard')}>🏠 Inicio</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'victory' && levelUp) {
    const p = levelUp.after.profile
    return (
      <div className="scene">
        <SceneBg src={BACKGROUNDS.victory} dim={0.3} />
        <div className="scene-content boss-wrap" style={{ paddingTop: 30 }}>
          <div style={{ fontSize: '4rem' }} className="anim-pop">🏆</div>
          <h1 className="pixel-title anim-pop" style={{ fontSize: 'clamp(1.4rem, 5vw, 2.6rem)', color: 'var(--gold)', margin: '12px 0' }}>
            ¡NIVEL {p.level}!
          </h1>
          <p style={{ fontSize: '1.3rem', textShadow: '2px 2px 0 var(--ink)' }}>
            Ahora eres <strong>{p.levelName}</strong>. Venciste al NoPuedo con ayuda: esa es la estrategia más poderosa.
          </p>
          <div className="allies" style={{ '--aura': portal.color }}>
            {[hero, ...allies].map((h, i) => (
              <img key={h.id} src={h.sprite} alt={h.name} className="pixel-img ally anim-float" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <div className="pixel-panel" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'left' }}>
            {levelUp.after.newlyUnlocked?.length > 0 && (
              <p className="unlock-inline">🎉 Desbloqueaste a {levelUp.after.newlyUnlocked.map(id => getHeroine(id)?.name).join(', ')}</p>
            )}
            <h3 className="dash-h">🎓 Oportunidades para tu nuevo nivel</h3>
            {rewards === null ? (
              <p className="dash-muted">YessenIA está eligiendo<span className="pixel-caret">▌</span></p>
            ) : rewards.length ? (
              <div className="rewards-list">
                {rewards.map(r => (
                  <a key={r.id} className="reward-link" href={r.url} target="_blank" rel="noreferrer noopener">
                    {r.title}
                    <small>{r.reason} · {r.source} ↗</small>
                  </a>
                ))}
              </div>
            ) : (
              <p className="dash-muted">Revisa tu dashboard: el agente sigue buscando oportunidades para ti.</p>
            )}
            {levelUp.after.next && (
              <p className="dash-muted" style={{ marginTop: 12 }}>
                Próxima meta: nivel {levelUp.after.next.targetLevel} con {levelUp.after.next.pointsNeeded} puntos y la misión “{levelUp.after.next.mission.title}”.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
            <button className="pixel-btn gold" onClick={() => navigate('/dashboard')}>🏠 Ir a mi dashboard</button>
            <button className="pixel-btn ghost" onClick={() => navigate('/multiverso')}>⚔️ Seguir jugando</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`scene ${shake ? 'anim-shake' : ''}`}>
      <SceneBg src={BACKGROUNDS.boss} dim={0.2} />
      {step === 'appear' && (
        <div className="boss-whispers">
          {WHISPERS.map(w => <span key={w.text} style={w.style}>{w.text}</span>)}
        </div>
      )}
      <div className="hud">
        <button className="pixel-btn ghost small" onClick={() => navigate('/dashboard')}>◀ Huir</button>
        <span className="pixel-tag" style={{ borderColor: '#FB7185', color: '#FB7185' }}>⚠️ JEFE DEL NIVEL {state.next?.targetLevel}</span>
      </div>
      <div className="scene-content boss-wrap">
        <div className="boss-hp">
          <div className="boss-hp-label">NOPUEDO · VIDA {hp}%</div>
          <div className="pixel-bar"><div className="pixel-bar-fill" style={{ width: `${hp}%` }} /></div>
        </div>
        <img src={hp < 50 ? SPRITES.nopuedoHurt : SPRITES.nopuedo} alt="El NoPuedo" className={`pixel-img boss-sprite ${shake ? 'anim-flash' : 'idle'}`} />
        <div className="allies" style={{ '--aura': portal.color, height: step === 'appear' ? 150 : 170 }}>
          <img src={hero.sprite} alt={hero.name} className="pixel-img ally" />
          {step !== 'appear' && allies.map((h, i) => (
            <img key={h.id} src={h.sprite} alt={h.name} className="pixel-img ally" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'left' }}>
          {error && <p className="form-error">{error}</p>}
          {step === 'appear' && (
            <PixelDialog text={'Completaste tu misión en el mundo real. El NoPuedo intenta convencerte de que no sirvió de nada…\n¡Llama a tus heroínas y demuéstrale lo contrario!'}>
              <button className="pixel-btn ghost" onClick={() => strike(80, 7)}>⚔️ Atacar sola</button>
              <button className="pixel-btn gold" onClick={() => { play('confirm'); setStep('allies') }}>✨ Llamar a mis heroínas</button>
            </PixelDialog>
          )}
          {step === 'allies' && (
            <PixelDialog speaker="YessenIA" text={`¡Llegaron ${allies.map(a => a.name).join(', ')}! Ellas también escucharon al NoPuedo y lo vencieron. Juntas son imparables.`}>
              <button className="pixel-btn gold big" onClick={comboAttack}>💥 Ataque combinado</button>
            </PixelDialog>
          )}
        </div>
      </div>
    </div>
  )
}
