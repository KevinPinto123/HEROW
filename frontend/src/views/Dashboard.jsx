import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameNav from '../components/GameNav'
import PixelDialog from '../components/PixelDialog'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS, SPRITES } from '../data/assets'
import { PORTALS, getHeroine } from '../data/heroines'
import { api } from '../lib/api'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const TYPE_ICON = { beca: '🎓', curso: '📚', programa: '🚀', evento: '📅', recurso: '🧰' }
const TYPE_LABEL = { beca: 'Beca', curso: 'Curso', programa: 'Programa', evento: 'Evento', recurso: 'Recurso' }
const COST_LABEL = { gratis: 'Gratis', pago: 'De pago', desconocido: 'Costo por confirmar' }
const OUTCOME = { win: { label: 'Ganaste', color: 'var(--green-logro)' }, lose: { label: 'Perdiste', color: '#FB7185' }, tie: { label: 'Empate', color: 'var(--gold)' } }

function timeAgo(date) {
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'hace un momento'
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`
  return `hace ${Math.round(s / 86400)} d`
}

// ───────── Nivel y misión ─────────
function LevelPanel({ state }) {
  const navigate = useNavigate()
  const { profile, next } = state
  if (!next) {
    return (
      <section className="pixel-panel dash-level">
        <h2 className="dash-h">⭐ Nivel {profile.level} · {profile.levelName}</h2>
        <p>¡Completaste todos los niveles! Sigue jugando para desbloquear heroínas y postula a tus oportunidades.</p>
      </section>
    )
  }
  const pct = Math.min(100, Math.round((profile.points / next.pointsNeeded) * 100))
  const steps = [
    { done: next.pointsDone, label: `Reunir ${next.pointsNeeded} puntos`, detail: `${profile.points} / ${next.pointsNeeded}` },
    { done: next.buildDone, label: next.mission.title, detail: next.lastBuild ? `Última revisión: ${next.lastBuild.score}/100` : 'La revisa YessenIA' },
    { done: next.realDone, label: next.mission.real.title, detail: 'Impacto en el mundo real' },
  ]
  let action
  if (next.ready) action = { label: '👾 Enfrentar al NoPuedo', to: '/boss', cls: 'gold' }
  else if (!next.buildDone) action = { label: '🎯 Hacer mi misión', to: '/mision', cls: 'gold' }
  else if (!next.realDone) action = { label: '🌎 Completar paso real', to: '/mision', cls: 'gold' }
  else action = { label: '⚔️ Jugar para sumar puntos', to: '/multiverso', cls: 'cyan' }

  return (
    <section className="pixel-panel dash-level">
      <div className="dash-level-head">
        <h2 className="dash-h">Nivel {profile.level} · {profile.levelName}</h2>
        <span className="pixel-tag">Siguiente: Nivel {next.targetLevel} · {next.targetName}</span>
      </div>
      <div className="pixel-bar" style={{ margin: '14px 0 6px' }}>
        <div className="pixel-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="dash-muted">🏆 {profile.points} de {next.pointsNeeded} puntos · 🔥 racha actual {profile.currentStreak} (mejor {profile.bestStreak})</p>
      <ul className="dash-checklist">
        {steps.map(s => (
          <li key={s.label} className={s.done ? 'done' : ''}>
            <span className="check">{s.done ? '✔' : '·'}</span>
            <span>
              <strong>{s.label}</strong>
              <small>{s.detail}</small>
            </span>
          </li>
        ))}
      </ul>
      <p className="dash-muted" style={{ marginBottom: 12 }}>
        Para subir de nivel necesitas las 3 cosas. Al final te espera el NoPuedo.
      </p>
      <button className={`pixel-btn ${action.cls}`} onClick={() => { play('confirm'); navigate(action.to) }}>{action.label}</button>
    </section>
  )
}

// ───────── Oportunidades ─────────
function OpportunityCard({ o, onStatus, busy }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="opp-card">
      <header className="opp-head">
        <span className="opp-type">{TYPE_ICON[o.type]} {TYPE_LABEL[o.type]}</span>
        <span className="opp-match" title="Qué tanto encaja contigo">{o.match}% para ti</span>
      </header>
      <h3 className="opp-title">{o.title}</h3>
      <p className="opp-source">{o.source}</p>
      {o.summary && <p className="opp-summary">{o.summary}</p>}
      <p className="opp-reason">💡 {o.reason}</p>
      <div className="opp-tags">
        <span>{COST_LABEL[o.cost]}</span>
        {o.closed && <span className="opp-closed">🔒 Convocatoria cerrada</span>}
        {o.deadline && <span>⏰ {o.deadline}</span>}
        {o.minAge != null && <span>Desde {o.minAge} años</span>}
        {o.portals.map(p => PORTALS[p] && <span key={p} style={{ color: PORTALS[p].color }}>{PORTALS[p].emoji} {PORTALS[p].name}</span>)}
      </div>
      {o.requirements.length > 0 && (
        <button className="opp-toggle" onClick={() => setOpen(v => !v)}>
          {open ? '▲ Ocultar requisitos' : `▼ Ver requisitos (${o.requirements.length})`}
        </button>
      )}
      {open && <ul className="opp-reqs">{o.requirements.map(r => <li key={r}>{r}</li>)}</ul>}
      <p className="opp-verified">✔ Enlace verificado {timeAgo(o.checkedAt)}</p>
      <div className="opp-actions">
        <a className="pixel-btn cyan small" href={o.url} target="_blank" rel="noreferrer noopener" onClick={() => play('blip')}>Ver ↗</a>
        {o.status !== 'interested' && o.status !== 'applied' && (
          <button className="pixel-btn small" disabled={busy} onClick={() => onStatus(o, 'interested')}>💜 Me interesa</button>
        )}
        {o.status !== 'applied' && (
          <button className="pixel-btn gold small" disabled={busy} onClick={() => onStatus(o, 'applied')}>✅ Postulé</button>
        )}
        {o.status && (
          <button className="pixel-btn ghost small" disabled={busy} onClick={() => onStatus(o, null)}>Quitar</button>
        )}
        {!o.status && (
          <button className="pixel-btn ghost small" disabled={busy} onClick={() => onStatus(o, 'dismissed')}>No me interesa</button>
        )}
      </div>
    </article>
  )
}

function OpportunitiesPanel({ opportunities, onStatus, busyId }) {
  const [tab, setTab] = useState('recommended')
  const tabs = [
    { id: 'recommended', label: 'Para ti' },
    { id: 'interested', label: 'Me interesan' },
    { id: 'applied', label: 'Postulé' },
  ]
  const list = opportunities[tab]
  const empty = {
    recommended: 'YessenIA está buscando oportunidades reales para ti. Juega unas rondas: con tu desempeño las ordena mejor.',
    interested: 'Aún no guardas oportunidades. Marca "Me interesa" en las que te llamen la atención.',
    applied: 'Cuando postules a algo, márcalo como "Postulé". ¡Es parte de tu misión de nivel 4!',
  }
  return (
    <section className="pixel-panel dash-opps">
      <div className="dash-level-head">
        <h2 className="dash-h">🎓 Tus oportunidades</h2>
        <div className="dash-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`pixel-btn small ${tab === t.id ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setTab(t.id) }}>
              {t.label} ({opportunities[t.id].length})
            </button>
          ))}
        </div>
      </div>
      <p className="dash-muted">Becas, cursos y programas reales que el agente revisa cada día y ordena según cómo juegas.</p>
      {list.length ? (
        <div className="opp-grid">
          {list.slice(0, 12).map(o => <OpportunityCard key={o.id} o={o} onStatus={onStatus} busy={busyId === o.id} />)}
        </div>
      ) : (
        <p className="dash-empty">{empty[tab]}</p>
      )}
    </section>
  )
}

// ───────── Habilidades ─────────
function SkillsPanel({ skills }) {
  return (
    <section className="pixel-panel">
      <h2 className="dash-h">📊 Tus habilidades</h2>
      <p className="dash-muted">El agente usa esto para elegir tus preguntas y recomendarte oportunidades.</p>
      <div className="skills">
        {skills.map(s => {
          const portal = PORTALS[s.portal]
          return (
            <div key={s.portal} className="skill" style={{ '--bar': portal.color }}>
              <div className="skill-head">
                <span>{portal.emoji} {portal.name}</span>
                <span>{s.accuracy === null ? 'Sin jugar' : `${s.accuracy}%`}</span>
              </div>
              <div className="pixel-bar thin"><div className="pixel-bar-fill" style={{ width: `${s.accuracy ?? 0}%` }} /></div>
              <small>{s.answered} rondas · {s.wins} victorias{s.avgSeconds ? ` · ${s.avgSeconds} s por respuesta` : ''}</small>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ───────── Colección de heroínas ─────────
function CollectionPanel({ collection, currentId, onUse, busy }) {
  const unlocked = collection.filter(h => h.unlocked).length
  return (
    <section className="pixel-panel dash-collection">
      <div className="dash-level-head">
        <h2 className="dash-h">⚡ Heroínas ({unlocked}/{collection.length})</h2>
      </div>
      <p className="dash-muted">Desbloquea más heroínas con logros. Toca una desbloqueada para jugar con ella.</p>
      <div className="collection-grid">
        {collection.map(h => {
          const hero = getHeroine(h.id)
          const portal = PORTALS[h.portal]
          const current = h.id === currentId
          return (
            <div key={h.id} className={`collect-card ${h.unlocked ? 'on' : 'off'} ${current ? 'current' : ''}`} style={{ '--aura': portal.color }}>
              <img src={hero.sprite} alt={h.unlocked ? h.name : 'Heroína bloqueada'} className="pixel-img" loading="lazy" />
              <div className="collect-name">{h.unlocked ? h.name : '???'}</div>
              {h.unlocked ? (
                current
                  ? <span className="collect-badge">Jugando</span>
                  : <button className="pixel-btn small ghost" disabled={busy} onClick={() => onUse(h)}>Usar</button>
              ) : (
                <>
                  <small className="collect-req">🔒 {h.requirement}</small>
                  <div className="pixel-bar thin"><div className="pixel-bar-fill" style={{ width: `${(h.progress / h.goal) * 100}%` }} /></div>
                  <small className="collect-req">{h.progress}/{h.goal}</small>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function RecentPanel({ recent }) {
  return (
    <section className="pixel-panel">
      <h2 className="dash-h">🕹️ Últimas rondas</h2>
      {recent.length ? (
        <ul className="recent">
          {recent.map((r, i) => (
            <li key={i}>
              <span style={{ color: OUTCOME[r.outcome].color }}>{OUTCOME[r.outcome].label} +{r.points}</span>
              <span>{PORTALS[r.portal_id]?.emoji} vs {getHeroine(r.rival_heroine)?.name ?? 'rival'}</span>
              <small>{timeAgo(r.created_at)}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dash-empty">Todavía no juegas. ¡Entra a un portal!</p>
      )}
    </section>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { setState } = usePlayer()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)

  const apply = useCallback((d) => {
    setData(d)
    setState(d)
    if (d.newlyUnlocked?.length) setToast(d.newlyUnlocked)
    // La guía personalizada con IA llega después, sin bloquear la pantalla.
    if (d.guidePending) {
      api.guide().then(g => setData(cur => (cur ? { ...cur, guide: g.guide, guidePending: false } : cur))).catch(() => {})
    }
  }, [setState])

  const load = () => {
    setError('')
    api.dashboard().then(apply).catch(err => setError(err.message))
  }

  useEffect(() => {
    let cancelled = false
    api.dashboard()
      .then(d => !cancelled && apply(d))
      .catch(err => !cancelled && setError(err.message))
    return () => { cancelled = true }
  }, [apply])

  const onStatus = async (o, status) => {
    play(status === 'applied' ? 'win' : 'select')
    setBusyId(o.id)
    try {
      const r = await api.setOpportunityStatus(o.id, status)
      setData(d => ({ ...d, ...r.state, opportunities: r.opportunities }))
      setState(r.state)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const onUse = async (h) => {
    play('select')
    setBusyId(h.id)
    try {
      const s = await api.setHeroine(h.id, h.portal)
      setData(d => ({ ...d, ...s }))
      setState(s)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (!data) {
    return (
      <div className="scene">
        <SceneBg src={BACKGROUNDS.dashboard} fallback={BACKGROUNDS.hub} dim={0.7} />
        <div className="scene-content" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
          {error
            ? <div className="pixel-panel"><p className="form-error">{error}</p><button className="pixel-btn gold" onClick={load}>Reintentar</button></div>
            : <p className="pixel-title" style={{ fontSize: '0.8rem' }}>Cargando tu base<span className="pixel-caret">▌</span></p>}
        </div>
      </div>
    )
  }

  const hero = getHeroine(data.profile.heroineId)
  const portal = PORTALS[hero.portal]

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.dashboard} fallback={BACKGROUNDS.hub} dim={0.72} />
      <div className="scene-content dash-wrap">
        <GameNav />

        {toast && (
          <div className="unlock-toast anim-pop" role="status" onClick={() => setToast(null)}>
            <span>🎉 ¡Desbloqueaste a {toast.map(id => getHeroine(id)?.name).join(', ')}!</span>
            <div className="unlock-sprites">
              {toast.map(id => <img key={id} src={getHeroine(id)?.sprite} alt="" className="pixel-img" />)}
            </div>
          </div>
        )}
        {error && <p className="form-error" role="alert" onClick={() => setError('')}>{error}</p>}

        <div className="dash-top">
          <section className="dash-guide" style={{ '--aura': portal.color }}>
            <div className="dash-guide-hero">
              <img src={hero.sprite} alt={hero.name} className="pixel-img" />
              <img src={SPRITES.yessenia} alt="" className="pixel-img dash-guide-orb" />
            </div>
            <div className="dash-guide-talk">
              <PixelDialog text={data.guide} speaker={`YessenIA · con ${hero.name}`} />
              <div className="dash-quick">
                <button className="pixel-btn gold" onClick={() => { play('confirm'); navigate('/multiverso') }}>⚔️ Jugar</button>
                <button className="pixel-btn" onClick={() => { play('confirm'); navigate('/mision') }}>🎯 Mi misión</button>
              </div>
            </div>
          </section>
          <LevelPanel state={data} />
        </div>

        <OpportunitiesPanel opportunities={data.opportunities} onStatus={onStatus} busyId={busyId} />

        <div className="dash-bottom">
          <SkillsPanel skills={data.skills} />
          <RecentPanel recent={data.recent} />
        </div>

        <CollectionPanel collection={data.collection} currentId={data.profile.heroineId} onUse={onUse} busy={Boolean(busyId)} />
      </div>
    </div>
  )
}
