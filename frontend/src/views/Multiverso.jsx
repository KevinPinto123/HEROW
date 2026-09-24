import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticlesBg from '../components/ParticlesBg'

export default function Multiverso() {
  const navigate = useNavigate()
  const [activePortal, setActivePortal] = useState(null)

  const handleEnterPortal = (portal) => {
    navigate('/combate', { state: { portal } })
  }

  return (
    <div className="multiverse-view">
      <ParticlesBg count={40} />
      
      {/* Back button */}
      <button className="back-btn" onClick={() => navigate('/despertar')}>
        ← Volver
      </button>

      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: '60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span className="section-tag tag-cyan">🌀 El Multiverso</span>
          <h2 className="section-title">
            Elige tu <span className="gradient-text">Universo STEM</span>
          </h2>
          <p className="section-subtitle">
            Cada portal es una puerta dimensional a un mundo de conocimiento.
            Nadie te obliga. Tú decides qué explorar. Eso es autonomía real 💜
          </p>
          <button 
            className="btn-secondary" 
            onClick={() => navigate('/niveles')}
            style={{ marginTop: '20px', padding: '10px 24px' }}
          >
            🗺️ Ver mi mapa de niveles
          </button>
        </div>

        <div className="portals-grid">
          <div 
            className={`portal-card portal-code ${activePortal === 'code' ? 'active' : ''}`}
            onMouseEnter={() => setActivePortal('code')}
            onMouseLeave={() => setActivePortal(null)}
            onClick={() => handleEnterPortal('Código y Datos')}
          >
            <div className="portal-orb">💻</div>
            <h3 className="portal-title">Código y Datos</h3>
            <p className="portal-subtitle">Programación • IA • Ciencia de Datos</p>
            <div className="portal-topics">
              <span className="portal-topic">Python</span>
              <span className="portal-topic">Machine Learning</span>
              <span className="portal-topic">Datos</span>
            </div>
            
            <button className="btn-primary" style={{ marginTop: '24px', width: '100%', padding: '12px' }}>
              <span>Entrar al portal</span>
            </button>
          </div>

          <div 
            className={`portal-card portal-design ${activePortal === 'design' ? 'active' : ''}`}
            onMouseEnter={() => setActivePortal('design')}
            onMouseLeave={() => setActivePortal(null)}
            onClick={() => handleEnterPortal('Diseño y Creatividad')}
          >
            <div className="portal-orb">🎨</div>
            <h3 className="portal-title">Diseño y Creatividad</h3>
            <p className="portal-subtitle">UX/UI • Innovación • Arte Digital</p>
            <div className="portal-topics">
              <span className="portal-topic">UX Research</span>
              <span className="portal-topic">Figma</span>
              <span className="portal-topic">Branding</span>
            </div>
            
            <button className="btn-primary" style={{ marginTop: '24px', width: '100%', padding: '12px' }}>
              <span>Entrar al portal</span>
            </button>
          </div>

          <div 
            className={`portal-card portal-robotics ${activePortal === 'robotics' ? 'active' : ''}`}
            onMouseEnter={() => setActivePortal('robotics')}
            onMouseLeave={() => setActivePortal(null)}
            onClick={() => handleEnterPortal('Robótica y Sistemas')}
          >
            <div className="portal-orb">🤖</div>
            <h3 className="portal-title">Robótica y Sistemas</h3>
            <p className="portal-subtitle">Hardware • Lógica • Electrónica</p>
            <div className="portal-topics">
              <span className="portal-topic">Arduino</span>
              <span className="portal-topic">IoT</span>
              <span className="portal-topic">Circuitos</span>
            </div>
            
            <button className="btn-primary" style={{ marginTop: '24px', width: '100%', padding: '12px' }}>
              <span>Entrar al portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
