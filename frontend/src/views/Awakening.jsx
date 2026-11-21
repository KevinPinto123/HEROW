import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import HeroineCard from '../components/HeroineCard'
import PixelDialog from '../components/PixelDialog'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS, SPRITES } from '../data/assets'
import { QUESTIONS, portalFromAnswers } from '../data/diagnosis'
import { PORTALS, heroinesByPortal } from '../data/heroines'
import { api } from '../lib/api'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const KEYS = ['A', 'B', 'C', 'D']

export default function Awakening() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('intro') // intro | quiz | analyzing | reveal
  const [portalId, setPortalId] = useState(null)
  const [picked, setPicked] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { state, setState, logout } = usePlayer()

  const current = QUESTIONS[answers.length]

  const answer = (portal) => {
    play('select')
    const next = [...answers, portal]
    setAnswers(next)
    if (next.length === QUESTIONS.length) {
      setPhase('analyzing')
      play('portal')
      setTimeout(() => {
        setPortalId(portalFromAnswers(next))
        setPhase('reveal')
        play('win')
      }, 2200)
    }
  }

  const choosePortal = (id) => {
    play('blip')
    setPortalId(id)
    setPicked(null)
  }

  const confirm = async () => {
    play('confirm')
    setSaving(true)
    setError('')
    try {
      setState(await api.setHeroine(picked.id, portalId))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const portal = portalId && PORTALS[portalId]

  // Ya eligió su heroína inicial: las demás se desbloquean jugando.
  if (state?.profile?.heroineId && !saving) return <Navigate to="/dashboard" replace />

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.awakening} dim={phase === 'reveal' ? 0.6 : 0.3} />
      <div className="hud">
        <button className="pixel-btn ghost small" onClick={async () => { await logout(); navigate('/') }}>◀ Salir</button>
        {phase !== 'reveal' && (
          <button className="pixel-btn ghost small" onClick={() => { setPortalId('code'); setPhase('reveal') }}>
            ▶▶ Saltar diagnóstico
          </button>
        )}
      </div>

      <div className="scene-content awaken-wrap">
        {phase === 'intro' && (
          <>
            <img src={SPRITES.yessenia} alt="YessenIA" className="pixel-img awaken-orb" />
            <PixelDialog text={'¡Hola, heroína! Soy YessenIA 🌀\nTe haré 3 preguntas sobre situaciones reales. No hay respuestas incorrectas: solo quiero conocer cómo piensas.'}>
              <button className="pixel-btn gold" onClick={() => { play('confirm'); setPhase('quiz') }}>▶ Estoy lista</button>
            </PixelDialog>
          </>
        )}

        {phase === 'quiz' && current && (
          <div key={answers.length} className="anim-pop">
            <div className="quiz-progress">
              {QUESTIONS.map((_, i) => <span key={i} className={i <= answers.length ? 'on' : ''} />)}
            </div>
            <PixelDialog text={current.text} />
            <div className="quiz-options">
              {current.options.map((o, i) => (
                <button key={o.portal} className="quiz-option" onClick={() => answer(o.portal)} onMouseEnter={() => play('blip')}>
                  <span className="key">{KEYS[i]}</span>
                  <span>{o.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'analyzing' && (
          <div className="center">
            <img src={SPRITES.yessenia} alt="" className="pixel-img awaken-orb" style={{ width: 200 }} />
            <h2 className="pixel-title" style={{ fontSize: '1rem', margin: '16px 0' }}>Abriendo tu portal…</h2>
            <div className="pixel-bar" style={{ maxWidth: 420, margin: '0 auto', '--bar': 'var(--cyan-future)' }}>
              <div className="pixel-bar-fill" style={{ width: '100%', transition: 'width 2s steps(16)' }} />
            </div>
          </div>
        )}

        {phase === 'reveal' && portal && (
          <div className="screen-warp" style={{ '--aura': portal.color }}>
            <div className="reveal-portal">
              <span className="pixel-tag" style={{ borderColor: portal.color, color: portal.color }}>Tu portal</span>
              <h2 className="pixel-title" style={{ marginTop: 14 }}>{portal.emoji} {portal.name}</h2>
            </div>
            <PixelDialog text="Estas mujeres reales abrieron este portal antes que tú. Elige a la heroína que quieres ser en tu aventura." />
            <div className="heroine-pick">
              {heroinesByPortal(portalId).map(h => (
                <HeroineCard
                  key={h.id}
                  heroine={h}
                  selected={picked?.id === h.id}
                  onSelect={(hero) => { play('select'); setPicked(hero) }}
                />
              ))}
            </div>
            <div className="center">
              <button className="pixel-btn gold big" disabled={!picked || saving} onClick={confirm}>
                {saving ? 'Guardando…' : picked ? `▶ Ser ${picked.name}` : 'Elige una heroína'}
              </button>
              {error && <p className="form-error" role="alert">{error}</p>}
              <p style={{ margin: '14px 0 0', color: 'var(--text-secondary)' }}>
                Empiezas con ella. Las demás heroínas se desbloquean con logros.
              </p>
              <p style={{ margin: '24px 0 8px', color: 'var(--text-muted)' }}>¿Te llama otro portal?</p>
              <div className="other-portals">
                {Object.values(PORTALS).filter(p => p.id !== portalId).map(p => (
                  <button key={p.id} className="pixel-btn ghost small" onClick={() => choosePortal(p.id)}>
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
