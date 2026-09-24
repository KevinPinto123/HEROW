import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ParticlesBg from '../components/ParticlesBg'

export default function Combat() {
  const navigate = useNavigate()
  const location = useLocation()
  const portalName = location.state?.portal || 'STEM'
  
  const [points, setPoints] = useState(85) // Start near 100 to show Boss transition quickly
  const [roundStep, setRoundStep] = useState(0) // 0=waiting, 1=question, 2=result
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [rivalAnswered, setRivalAnswered] = useState(false)

  // Simulation: Wait for rival
  useEffect(() => {
    if (roundStep === 0) {
      const timer = setTimeout(() => setRoundStep(1), 2000)
      return () => clearTimeout(timer)
    }
  }, [roundStep])

  // Simulation: Rival answers after a delay
  useEffect(() => {
    if (roundStep === 1) {
      const timer = setTimeout(() => setRivalAnswered(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [roundStep])

  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(index)
    
    setTimeout(() => {
      setRoundStep(2)
      setPoints(prev => prev + 10) // Win points!
    }, 1500)
  }

  const handleNext = () => {
    if (points >= 100) {
      navigate('/boss')
    } else {
      // Reset for next round
      setRoundStep(0)
      setSelectedAnswer(null)
      setRivalAnswered(false)
    }
  }

  return (
    <div className="combat-app-view">
      <ParticlesBg count={20} />
      
      {/* Header bar */}
      <div className="combat-header-bar">
        <button className="back-btn-small" onClick={() => navigate('/multiverso')}>← Abandonar</button>
        <div className="combat-portal-badge">🌀 Portal: {portalName}</div>
        <div className="combat-points-badge">🏆 {points} / 100 pts</div>
      </div>

      <div className="container combat-arena-container">
        {/* Waiting screen */}
        {roundStep === 0 && (
          <div className="combat-waiting slide-up">
            <div className="safety-spinner" style={{ width: '50px', height: '50px', margin: '0 auto 20px', borderWidth: '4px' }}></div>
            <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Buscando rival...</h2>
            <p className="section-subtitle">Preparando arena en el universo de {portalName}</p>
          </div>
        )}

        {/* Question screen */}
        {roundStep >= 1 && (
          <div className="combat-active-arena">
            {/* Visual Header */}
            <div className="combat-visual" style={{ marginTop: 0, marginBottom: '40px' }}>
              <div className="combat-player player-you" style={{ padding: '20px' }}>
                <div className="combat-player-avatar" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>🦸‍♀️</div>
                <div className="combat-player-name">Tú</div>
                <div style={{ fontSize: '0.8rem', color: selectedAnswer !== null ? 'var(--green-logro)' : 'var(--text-muted)' }}>
                  {selectedAnswer !== null ? '¡Respondido!' : 'Pensando...'}
                </div>
              </div>
              <div className="combat-vs">
                <div className="vs-text" style={{ fontSize: '1.5rem' }}>VS</div>
              </div>
              <div className="combat-player player-rival" style={{ padding: '20px' }}>
                <div className="combat-player-avatar" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>🦹‍♀️</div>
                <div className="combat-player-name">Rival (Nvl. 4)</div>
                <div style={{ fontSize: '0.8rem', color: rivalAnswered ? 'var(--pink-neon)' : 'var(--text-muted)' }}>
                  {rivalAnswered ? '¡Respondido!' : 'Pensando...'}
                </div>
              </div>
            </div>

            {/* Question card */}
            <div className={`combat-question-card ${roundStep === 2 ? 'fade-out-partial' : 'slide-up'}`}>
              <div className="combat-question-tag">🔍 Rápida: Elegir</div>
              <p className="combat-question-text">
                Estás diseñando una app para personas mayores. ¿Cuál es el primer principio de diseño que aplicarías?
              </p>
              
              <div className="combat-options">
                {[
                  'Usar colores neón para llamar su atención',
                  'Aumentar el contraste y tamaño de tipografía',
                  'Añadir muchas animaciones complejas',
                  'Ocultar los botones para que el diseño sea limpio'
                ].map((opt, i) => (
                  <button 
                    key={i}
                    className={`combat-option-btn ${selectedAnswer === i ? 'selected' : ''} ${roundStep === 2 && i === 1 ? 'correct' : ''} ${roundStep === 2 && selectedAnswer === i && i !== 1 ? 'incorrect' : ''}`}
                    onClick={() => handleAnswer(i)}
                    disabled={selectedAnswer !== null}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Result overlay */}
            {roundStep === 2 && (
              <div className="combat-result-overlay slide-up">
                <h3 className="combat-result-title" style={{ color: 'var(--green-logro)' }}>¡Ronda Ganada! +10 pts</h3>
                <p className="combat-result-desc">
                  ¡Excelente! La accesibilidad (contraste y tamaño) es vital para este público. 
                  Tu rival tardó un poco más en responder.
                </p>
                <div className="combat-progress" style={{ marginTop: '20px', marginBottom: '30px' }}>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${points}%` }}></div>
                  </div>
                  <div className="progress-label">
                    <span>{points} puntos</span>
                    <span>🎯 100 pts (Jefe)</span>
                  </div>
                </div>
                
                <button className="btn-primary btn-glow" onClick={handleNext} style={{ width: '100%' }}>
                  <span>{points >= 100 ? '👾 Enfrentar al NoPuedo' : 'Siguiente Ronda →'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
