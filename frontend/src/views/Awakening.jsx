import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticlesBg from '../components/ParticlesBg'

export default function Awakening() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1 = question, 2 = analyzing, 3 = reveal
  const [answer, setAnswer] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSubmit = () => {
    if (!answer.trim()) return
    setStep(2) // Move to analyzing

    // Simulate AI analysis
    setTimeout(() => {
      setStep(3) // Reveal avatar
    }, 3000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="awakening-view">
      <ParticlesBg count={30} />
      
      {/* Back button */}
      <button className="back-btn" onClick={() => navigate('/onboarding')}>
        ← Volver
      </button>

      <div className="container awakening-container">
        {/* Skip Button for Exploration */}
        <button 
          onClick={() => navigate('/multiverso')}
          style={{
            background: 'transparent',
            border: '1px solid var(--cyan-future)',
            color: 'var(--cyan-future)',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            marginBottom: '40px',
            fontSize: '0.8rem',
            alignSelf: 'flex-end',
            position: 'absolute',
            top: '-50px',
            right: '0'
          }}
        >
          ⏭️ Explorar (Saltar Diagnóstico)
        </button>
        {step === 1 && (
          <div className="awakening-card slide-up">
            <div className="awakening-yessenia-header">
              <div className="safety-yessenia-orb small">
                <span className="safety-yessenia-face">🤖</span>
              </div>
              <h2 className="awakening-title">El Reto de YessenIA</h2>
            </div>
            
            <div className="awakening-question">
              <p>
                "Tu colegio se quedó sin internet y tienen que entregar un trabajo urgente. 
                ¿Cómo organizas a tu salón?"
              </p>
            </div>

            <div className="awakening-input-area">
              <textarea
                className="awakening-textarea"
                placeholder="Escribe cómo lo resolverías, no hay respuestas incorrectas..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
              ></textarea>
              
              <button 
                className="btn-primary btn-glow btn-xl awakening-submit" 
                onClick={handleSubmit}
                disabled={!answer.trim()}
              >
                <span>Enviar respuesta ✨</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="awakening-card analyzing">
            <div className="safety-yessenia-orb big pulse-glow">
              <span className="safety-yessenia-face">🤖</span>
            </div>
            <h2 className="awakening-title">Analizando tu respuesta...</h2>
            <p className="awakening-subtitle">Descubriendo tu talento oculto en el multiverso STEM</p>
            
            <div className="analyzing-progress">
              <div className="analyzing-bar"></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="awakening-card reveal slide-up">
            <div className="reveal-header">
              <div className="reveal-avatar-container glow-purple">
                <div className="reveal-avatar">🦸‍♀️</div>
              </div>
              <h2 className="reveal-title gradient-text">¡La Arquitecta de Soluciones!</h2>
            </div>
            
            <div className="reveal-analysis">
              <p className="yessenia-says">
                "Analicé tu respuesta. Tu forma de organizar equipos demuestra que tienes el poder del <strong>Liderazgo Técnico</strong>. Esta es tu Heroína."
              </p>
            </div>
            
            <div className="reveal-stats">
              <div className="reveal-stat">
                <span className="stat-value">95%</span>
                <span className="stat-label">Lógica</span>
              </div>
              <div className="reveal-stat">
                <span className="stat-value">80%</span>
                <span className="stat-label">Creatividad</span>
              </div>
              <div className="reveal-stat">
                <span className="stat-value">99%</span>
                <span className="stat-label">Liderazgo</span>
              </div>
            </div>

            <button 
              className="btn-primary btn-glow btn-xl" 
              onClick={() => navigate('/multiverso')}
            >
              <span>🌀 Entrar al Multiverso</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
