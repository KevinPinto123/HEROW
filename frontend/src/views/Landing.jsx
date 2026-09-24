import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ParticlesBg from '../components/ParticlesBg'

const TESTIMONIALS = [
  { text: '"Gracias a HEROW descubrí que me encanta la ciencia de datos. ¡Ahora estoy aprendiendo Python!"', name: 'Lucía, 16 años', emoji: '💻' },
  { text: '"El NoPuedo me decía que no era suficiente, pero lo vencí con ayuda de mi mentora."', name: 'Valentina, 17 años', emoji: '💪' },
  { text: '"Nunca pensé que diseñar apps pudiera ser mi futuro. HEROW me abrió los ojos."', name: 'Camila, 15 años', emoji: '🎨' },
]

const PARTNERS = [
  { name: 'Cisco Networking Academy', icon: '🌐' },
  { name: 'AWS Educate', icon: '☁️' },
  { name: 'Google for Education', icon: '📚' },
  { name: 'Laboratoria', icon: '💜' },
]

export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const scrollToTestimonials = () => {
    document.getElementById('conoce-mas')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-view">
      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <a href="#" className="nav-logo">
            <div className="nav-logo-icon">🌀</div>
            <span className="nav-logo-text">HEROW</span>
          </a>
          <ul className="nav-links">
            <li><a href="#conoce-mas">Conoce más</a></li>
            <li><a href="#como-funciona">Cómo funciona</a></li>
            <li><a href="#testimonios">Historias</a></li>
          </ul>
          <button className="nav-cta" onClick={() => navigate('/onboarding')}>
            Empezar
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
          <ParticlesBg count={35} />
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            ✨ Para chicas de 15 a 17 años
          </div>
          <h1 className="hero-title">
            <span className="line">No adivines tu futuro.</span>
            <span className="line gradient-text">Descúbrelo.</span>
          </h1>
          <p className="hero-description">
            Encuentra tu talento oculto, vence al monstruo del "No Puedo"
            y desbloquea becas reales en tecnología.
          </p>
          <div className="hero-cta-group">
            <button className="btn-primary btn-glow" onClick={() => navigate('/onboarding')}>
              <span>🌀 Empezar mi Aventura</span>
            </button>
            <button className="btn-secondary" onClick={scrollToTestimonials}>
              Conoce más ↓
            </button>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value gradient-text">3</div>
              <div className="hero-stat-label">Portales STEM</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value" style={{ color: 'var(--pink-neon)' }}>100%</div>
              <div className="hero-stat-label">Seguro para menores</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value" style={{ color: 'var(--cyan-future)' }}>∞</div>
              <div className="hero-stat-label">Posibilidades</div>
            </div>
          </div>
        </div>

        <div className="hero-scroll-indicator" onClick={scrollToTestimonials}>
          <span>Explora</span>
          <div className="scroll-arrow"></div>
        </div>
      </section>

      {/* CONOCE MÁS — HOW IT WORKS */}
      <section className="how-it-works" id="conoce-mas">
        <div className="container">
          <span className="section-tag tag-purple">🎮 Así funciona</span>
          <h2 className="section-title">
            Tu aventura en <span className="gradient-text">3 pasos</span>
          </h2>
          <p className="section-subtitle">
            Nada de formularios aburridos. Solo tú, tu heroína y portales que brillan con conocimiento.
          </p>
          <div className="steps-grid" id="como-funciona">
            <div className="step-card">
              <div className="step-number step-number-1">1</div>
              <div className="step-icon">🎭</div>
              <h3 className="step-title">Crea tu heroína</h3>
              <p className="step-description">
                YessenIA te hace 3 preguntas reales. La IA descubre tu talento oculto y
                te asigna un avatar épico como <strong>La Arquitecta de Soluciones</strong>.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number step-number-2">2</div>
              <div className="step-icon">🌀</div>
              <h3 className="step-title">Explora portales STEM</h3>
              <p className="step-description">
                Elige entre Código, Diseño o Robótica. Entra a combates de conocimiento,
                acumula puntos y desbloquea nuevos niveles.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number step-number-3">3</div>
              <div className="step-icon">🏆</div>
              <h3 className="step-title">Vence y desbloquea</h3>
              <p className="step-description">
                Llega a 100 pts, vence al Jefe Final <strong>NoPuedo</strong> y desbloquea
                becas reales en Cisco, AWS y más.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS + PARTNERS */}
      <section className="testimonials-section" id="testimonios">
        <div className="container">
          <span className="section-tag tag-pink">💜 Historias reales</span>
          <h2 className="section-title" style={{ textAlign: 'center' }}>
            Chicas que <span className="gradient-text">ya empezaron</span>
          </h2>

          <div className="testimonial-carousel">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`testimonial-card ${i === activeTestimonial ? 'active' : ''}`}
              >
                <span className="testimonial-emoji">{t.emoji}</span>
                <p className="testimonial-text">{t.text}</p>
                <span className="testimonial-name">{t.name}</span>
              </div>
            ))}
            <div className="testimonial-dots">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  className={`testimonial-dot ${i === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(i)}
                />
              ))}
            </div>
          </div>

          <div className="partners-section">
            <p className="partners-label">Oportunidades que puedes desbloquear</p>
            <div className="partners-grid">
              {PARTNERS.map((p, i) => (
                <div key={i} className="partner-card">
                  <span className="partner-icon">{p.icon}</span>
                  <span className="partner-name">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">
              <span className="gradient-text">Tu futuro</span> no se improvisa.
              <br />Se descubre jugando.
            </h2>
            <p className="cta-description">
              Únete a HEROW. Sin miedo. Sin incertidumbre. Solo tú y tu potencial.
            </p>
            <button className="btn-primary btn-glow btn-xl" onClick={() => navigate('/onboarding')}>
              <span>🌀 Empezar mi Aventura</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="nav-logo-icon">🌀</div>
              <span className="nav-logo-text">HEROW</span>
            </div>
            <ul className="footer-links">
              <li><a href="#conoce-mas">Cómo funciona</a></li>
              <li><a href="#testimonios">Historias</a></li>
            </ul>
          </div>
          <div className="footer-bottom">
            <p>Hecho con <span className="footer-heart">💜</span> por el equipo HEROW — Portales del Futuro</p>
            <p style={{ marginTop: '8px', fontSize: '0.7rem' }}>🔐 Plataforma segura para menores de edad</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
