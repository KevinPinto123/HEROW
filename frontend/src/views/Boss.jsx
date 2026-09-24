import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticlesBg from '../components/ParticlesBg'

export default function Boss() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=boss appears, 2=call mentor, 3=victory

  return (
    <div className="boss-view">
      <ParticlesBg count={30} />
      
      <div className="container">
        {step === 1 && (
          <div className="boss-arena slide-up">
            <span className="section-tag" style={{ background: 'rgba(159,18,57,0.2)', border: '1px solid rgba(251,113,133,0.4)', color: '#FB7185', marginBottom: '40px' }}>
              ⚠️ ALERTA DE JEFE FINAL
            </span>
            
            <div className="boss-monster-huge">👾</div>
            
            <h2 className="boss-huge-title">¡El NoPuedo ha aparecido!</h2>
            
            <div className="boss-phrases-container">
              <div className="boss-phrase-float float-1">"La tecnología es muy difícil para ti"</div>
              <div className="boss-phrase-float float-2">"Eres muy chica para esto"</div>
              <div className="boss-phrase-float float-3">"Nadie te va a tomar en serio"</div>
            </div>

            <div className="boss-health-bar">
              <div className="boss-health-fill" style={{ width: '100%' }}></div>
              <span className="boss-health-text">VIDA: 100%</span>
            </div>

            <div className="boss-action-card">
              <p className="yessenia-says" style={{ color: 'var(--cyan-future)', marginBottom: '20px' }}>
                🤖 YessenIA advierte: "Este monstruo se alimenta del síndrome del impostor. Tus ataques normales solo le quitan la mitad de la vida. ¡Es hora de llamar a la caballería!"
              </p>
              
              <button 
                className="btn-primary btn-glow btn-xl" 
                style={{ background: 'linear-gradient(135deg, var(--gold-heroina), #F59E0B)', width: '100%' }}
                onClick={() => setStep(2)}
              >
                <span style={{ color: '#000', fontWeight: '900' }}>✨🛡️ PEDIR AYUDA A UNA MENTORA 🛡️✨</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mentor-arena slide-up">
            <div className="mentor-summon glow-purple">
              <div className="mentor-avatar">👩‍💻</div>
            </div>
            
            <h2 className="section-title gradient-text" style={{ marginTop: '30px' }}>¡Mentora Mariana conectada!</h2>
            
            <div className="mentor-message">
              <p>
                "¡Hola heroína! Escuché que el NoPuedo te está molestando. A mí me dijo lo mismo cuando empecé a programar a los 16 años. 
                Juntas vamos a estructurar tu idea y vencerlo."
              </p>
            </div>

            <div className="boss-health-bar damaged">
              <div className="boss-health-fill" style={{ width: '0%', transition: 'width 2s' }}></div>
              <span className="boss-health-text">VIDA: 0%</span>
            </div>

            <button 
              className="btn-primary btn-glow btn-xl" 
              style={{ width: '100%', marginTop: '30px' }}
              onClick={() => setStep(3)}
            >
              <span>💥 ¡Ataque Combinado Definitivo! 💥</span>
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="victory-arena slide-up">
            <div className="victory-icon pulse-glow">🏆</div>
            <h1 className="hero-title" style={{ marginTop: '20px', marginBottom: '10px' }}>
              <span className="gradient-text">¡VICTORIA!</span>
            </h1>
            <p className="section-subtitle" style={{ fontSize: '1.2rem', color: 'var(--green-logro)' }}>
              Has derrotado al monstruo del "No Puedo"
            </p>

            <div className="rewards-card">
              <h3 style={{ marginBottom: '20px', fontFamily: 'var(--font-display)' }}>Tus recompensas han sido desbloqueadas:</h3>
              
              <div className="reward-item">
                <span className="reward-icon">📜</span>
                <div>
                  <div className="reward-title">Certificado de Heroína</div>
                  <div className="reward-desc">Respaldado por MusuqLab</div>
                </div>
              </div>
              
              <div className="reward-item">
                <span className="reward-icon">🌐</span>
                <div>
                  <div className="reward-title">Beca Cisco Networking Academy</div>
                  <div className="reward-desc">Acceso a curso "Intro a Ciberseguridad"</div>
                </div>
              </div>

              <div className="reward-item">
                <span className="reward-icon">💜</span>
                <div>
                  <div className="reward-title">Pase Directo a Comunidad</div>
                  <div className="reward-desc">Únete al Discord seguro de mentoras</div>
                </div>
              </div>
            </div>

            <button 
              className="btn-secondary btn-xl" 
              style={{ width: '100%', marginTop: '20px' }}
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
