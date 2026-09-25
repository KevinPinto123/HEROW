import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HeroineCard from '../components/HeroineCard'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS, SPRITES } from '../data/assets'
import { HEROINES, PORTALS } from '../data/heroines'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const STEPS = [
  { img: SPRITES.yessenia, title: '1. Despierta', text: 'YessenIA te hace 3 preguntas de situaciones reales y descubre qué portal STEM va contigo.' },
  { img: '/assets/heroines/hero_curie.png', title: '2. Elige tu heroína', text: 'Juegas como una mujer real que cambió la ciencia y la tecnología: Marie Curie, Ada Lovelace, María Reiche…' },
  { img: SPRITES.nopuedo, title: '3. Sube de nivel de verdad', text: 'Suma puntos en combates, cumple misiones reales como crear tu perfil profesional o publicar tu primer post, y vence al NoPuedo.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { session } = usePlayer()
  const [scrolled, setScrolled] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const start = () => {
    play('confirm')
    navigate(session ? '/dashboard' : '/registro')
  }

  const heroines = filter === 'all' ? HEROINES : HEROINES.filter(h => h.portal === filter)

  return (
    <div className="landing-view landing-pixel">
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <a href="#" className="nav-logo">
            <span className="nav-logo-text">HEROW</span>
          </a>
          <ul className="nav-links">
            <li><a href="#como-funciona">Cómo funciona</a></li>
            <li><a href="#heroinas">Heroínas</a></li>
          </ul>
          <div style={{ display: 'flex', gap: 8 }}>
            {!session && <button className="nav-cta" style={{ background: 'transparent', border: '2px solid #fff' }} onClick={() => navigate('/entrar')}>Entrar</button>}
            <button className="nav-cta" onClick={start}>{session ? 'Mi base' : 'Jugar'}</button>
          </div>
        </div>
      </nav>

      <section className="title-hero">
        <SceneBg src={BACKGROUNDS.title} dim={0.25} />
        <div className="title-hero-inner">
          <img src={SPRITES.yessenia} alt="YessenIA" className="pixel-img title-yessenia anim-float" />
          <h1 className="title-logo">HEROW</h1>
          <p className="title-sub">PORTALES DEL FUTURO</p>
          <p className="title-desc">
            No adivines tu futuro: descúbrelo jugando. Conviértete en una heroína real de la ciencia
            y la tecnología, y vence al monstruo del <strong>No Puedo</strong>.
          </p>
          <div className="title-actions">
            <button className="pixel-btn gold big" onClick={start}>▶ Empezar aventura</button>
            <a className="pixel-btn ghost big" href="#heroinas" onClick={() => play('blip')}>Ver heroínas</a>
          </div>
          <p className="press-start">PARA CHICAS DE 15 A 17 AÑOS · 100% SEGURO</p>
        </div>
      </section>

      <section className="pixel-section" id="como-funciona">
        <div className="pixel-section-inner">
          <div className="center"><span className="pixel-tag">🎮 Así se juega</span></div>
          <h2>Tu aventura en 3 pasos</h2>
          <p className="lead">Nada de tests aburridos. Solo tú, tu heroína y portales que brillan con conocimiento.</p>
          <div className="steps-pixel">
            {STEPS.map(s => (
              <div key={s.title} className="pixel-panel step-pixel">
                <img src={s.img} alt="" className="pixel-img" />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pixel-section" id="heroinas">
        <div className="pixel-section-inner">
          <div className="center"><span className="pixel-tag">⚡ Mujeres reales</span></div>
          <h2>Elige quién quieres ser</h2>
          <p className="lead">Cada heroína existió de verdad. Su historia es tu poder dentro del juego.</p>
          <div className="portal-filter">
            <button className={`pixel-btn small ${filter === 'all' ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setFilter('all') }}>
              Todas
            </button>
            {Object.values(PORTALS).map(p => (
              <button
                key={p.id}
                className={`pixel-btn small ${filter === p.id ? 'gold' : 'ghost'}`}
                onClick={() => { play('blip'); setFilter(p.id) }}
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
          <div className="heroine-gallery">
            {heroines.map(h => <HeroineCard key={h.id} heroine={h} />)}
          </div>
          <div className="center" style={{ marginTop: 48 }}>
            <button className="pixel-btn gold big" onClick={start}>▶ Quiero ser una heroína</button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <p>Hecho con 💜 por el equipo HEROW · MusuqLab</p>
            <p style={{ marginTop: 8, fontSize: '0.8rem' }}>🔐 Sin chats abiertos · Sin contacto directo entre jugadoras</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
