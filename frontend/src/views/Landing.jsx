import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Aliados from '../components/Aliados'
import Footer from '../components/Footer'
import HeroineCard from '../components/HeroineCard'
import WaitlistForm from '../components/WaitlistForm'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS, SPRITES } from '../data/assets'
import { EQUIPO, PREMIO } from '../data/equipo'
import { HEROINES, PORTALS } from '../data/heroines'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const STEPS = [
  { img: SPRITES.yessenia, title: '1. Despierta', text: 'YessenIA te hace 3 preguntas de situaciones reales y descubre qué portal STEM va contigo.' },
  { img: '/assets/heroines/hero_curie.png', title: '2. Elige tu heroína', text: 'Juegas como una mujer real que cambió la ciencia y la tecnología: Marie Curie, Ada Lovelace, María Reiche…' },
  { img: SPRITES.nopuedo, title: '3. Sube de nivel de verdad', text: 'Suma puntos en combates, cumple misiones reales como crear tu perfil profesional o publicar tu primer post, y vence al NoPuedo.' },
]

// Para quien llega desde la feria: qué gana cada tipo de aliado.
const ALIANZAS = [
  {
    emoji: '🏫',
    title: 'Colegios',
    text: 'Lleva HEROW a 4to y 5to de secundaria como taller de orientación vocacional. Acompañamos la implementación y te damos el reporte de avance de tus estudiantes.',
  },
  {
    emoji: '🤝',
    title: 'Empresas y aliados',
    text: 'Conecta tus becas, programas y retos reales con chicas que ya están entrenando. Tu marca aparece dentro del juego como un portal de oportunidades.',
  },
  {
    emoji: '📚',
    title: 'Mentoras y docentes',
    text: 'Sé la heroína que a ellas les faltó ver. Buscamos mujeres en STEM para retos, charlas y contenido dentro del juego.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const { session } = usePlayer()
  const [scrolled, setScrolled] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Al volver desde una página legal con /#sumate, React Router cambia la URL
  // pero no mueve la página. Lo hacemos nosotros.
  useEffect(() => {
    if (!hash) return
    const destino = document.querySelector(hash)
    if (destino) destino.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

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
            <li><a href="#nosotros">Nosotros</a></li>
            <li><a href="#sumate">Súmate</a></li>
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
          <a className="title-aliados" href="#sumate" onClick={() => play('blip')}>
            ¿Vienes de un colegio, empresa u organización? Súmate aquí ▾
          </a>
        </div>
      </section>

      <Aliados />

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

      <section className="pixel-section nosotros-section" id="nosotros">
        <div className="pixel-section-inner">
          <div className="center"><span className="pixel-tag">👋 Quiénes somos</span></div>
          <h2>El equipo detrás de HEROW</h2>

          <div className="premio" role="note">
            <span className="premio-trofeo" aria-hidden="true">🏆</span>
            <div className="premio-texto">
              <strong>{PREMIO.puesto}</strong>
              <span>{PREMIO.categoria} · {PREMIO.evento} {PREMIO.anio}</span>
            </div>
          </div>

          <p className="lead">
            Somos cuatro estudiantes y profesionales peruanos de ingeniería que construimos HEROW
            para que ninguna chica descarte una carrera en ciencia o tecnología solo porque nunca
            vio a alguien como ella ahí.
          </p>

          <div className="equipo-grid">
            {EQUIPO.map(p => (
              <article key={p.id} className="pixel-panel equipo-card">
                <img
                  className="equipo-foto"
                  src={p.foto}
                  alt={`Foto de ${p.nombre}`}
                  width="440"
                  height="440"
                  loading="lazy"
                />
                <h3>{p.nombre}</h3>
                <p className="equipo-rol">{p.rol}</p>
                <p className="equipo-detalle">{p.detalle}</p>
                {p.linkedin && (
                  <a
                    className="equipo-linkedin"
                    href={p.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    💼 LinkedIn
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pixel-section waitlist-section" id="sumate">
        <div className="pixel-section-inner">
          <div className="center"><span className="pixel-tag">🌀 Construyamos esto juntas</span></div>
          <h2>Súmate al portal</h2>
          <p className="lead">
            HEROW ya funciona: se juega, se aprende y se mide. Lo que sigue es llegar a más colegios.
            Déjanos tu correo y te contamos cómo ser parte.
          </p>

          <div className="impact-strip">
            <div className="impact-item"><strong>{HEROINES.length}</strong><span>heroínas reales</span></div>
            <div className="impact-item"><strong>{Object.keys(PORTALS).length}</strong><span>portales STEM</span></div>
            <div className="impact-item"><strong>15-17</strong><span>años, 4to y 5to</span></div>
          </div>

          <div className="alianzas-grid">
            {ALIANZAS.map(a => (
              <div key={a.title} className="pixel-panel alianza-card">
                <span className="alianza-emoji" aria-hidden="true">{a.emoji}</span>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>

          <div className="waitlist-wrap">
            <WaitlistForm source="landing" />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
