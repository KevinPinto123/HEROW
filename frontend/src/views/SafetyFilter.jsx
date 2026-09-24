import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticlesBg from '../components/ParticlesBg'

export default function SafetyFilter() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=age, 2=parent, 3=confirmed
  const [birthDate, setBirthDate] = useState({ day: '', month: '', year: '' })
  const [ageResult, setAgeResult] = useState(null) // null, 'valid', 'invalid'
  const [parentContact, setParentContact] = useState('')
  const [contactType, setContactType] = useState('email') // 'email' or 'whatsapp'
  const [isAnimating, setIsAnimating] = useState(false)
  const [showMessage, setShowMessage] = useState(false)

  const calculateAge = () => {
    if (!birthDate.day || !birthDate.month || !birthDate.year) return

    setIsAnimating(true)
    setTimeout(() => {
      // Para el prototipo, siempre dejamos pasar para mostrar el flujo completo
      setAgeResult('valid')
      setIsAnimating(false)
    }, 1500)
  }

  const handleParentSubmit = () => {
    if (!parentContact.trim()) return
    setIsAnimating(true)
    setStep(3)

    setTimeout(() => {
      setShowMessage(true)
      setIsAnimating(false)
    }, 2000)
  }

  const goToAwakening = () => {
    navigate('/despertar')
  }

  // Generate year options (only relevant years for 15-17 range)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 13 - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <div className="safety-view">
      <ParticlesBg count={20} />

      {/* Back button */}
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Volver
      </button>

      <div className="safety-container">
        {/* Skip Button for Demo */}
        <button 
          onClick={goToAwakening}
          style={{
            background: 'transparent',
            border: '1px solid var(--purple-portal)',
            color: 'var(--purple-light)',
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
          ⏭️ Omitir (Modo Demo)
        </button>

        {/* YessenIA Avatar */}
        <div className="safety-yessenia">
          <div className="safety-yessenia-orb">
            <span className="safety-yessenia-face">🤖</span>
          </div>
          <div className="safety-yessenia-rings">
            <div className="safety-ring ring-1"></div>
            <div className="safety-ring ring-2"></div>
          </div>
        </div>

        {/* STEP 1: Age Verification */}
        {step === 1 && (
          <div className={`safety-card ${isAnimating ? 'animating' : ''}`}>
            <div className="safety-yessenia-speech">
              <p className="yessenia-says">
                {ageResult === null
                  ? '¡Hola! 🌀 Para empezar esta aventura segura, necesitamos confirmar un par de datos.'
                  : ageResult === 'valid'
                    ? '¡Genial! 🎉 Tienes la edad perfecta para esta aventura. ¡Vamos al siguiente paso!'
                    : '😊 Actualmente esta aventura está diseñada para heroínas de 4to y 5to de secundaria. ¡Pero pronto abriremos nuevos niveles!'}
              </p>
            </div>

            <h2 className="safety-title">
              <span className="safety-shield">🛡️</span> Verificación de edad
            </h2>
            <p className="safety-description">
              HEROW está diseñado para chicas de <strong>15 a 17 años</strong>.
              Ingresa tu fecha de nacimiento para continuar.
            </p>

            <div className="date-picker">
              <div className="date-select-group">
                <label>Día</label>
                <select
                  value={birthDate.day}
                  onChange={e => setBirthDate({ ...birthDate, day: e.target.value })}
                  className="date-select"
                >
                  <option value="">--</option>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="date-select-group">
                <label>Mes</label>
                <select
                  value={birthDate.month}
                  onChange={e => setBirthDate({ ...birthDate, month: e.target.value })}
                  className="date-select"
                >
                  <option value="">--</option>
                  {months.map(m => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('es', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="date-select-group">
                <label>Año</label>
                <select
                  value={birthDate.year}
                  onChange={e => setBirthDate({ ...birthDate, year: e.target.value })}
                  className="date-select"
                >
                  <option value="">--</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {ageResult === null && (
              <button
                className="btn-primary"
                onClick={calculateAge}
                disabled={!birthDate.day || !birthDate.month || !birthDate.year}
              >
                <span>Verificar mi edad</span>
              </button>
            )}

            {ageResult === 'valid' && (
              <button className="btn-primary btn-glow" onClick={() => setStep(2)}>
                <span>✨ Continuar</span>
              </button>
            )}

            {ageResult === 'invalid' && (
              <div className="safety-invalid">
                <button className="btn-secondary" onClick={() => navigate('/')}>
                  Volver al inicio
                </button>
              </div>
            )}

            {isAnimating && (
              <div className="safety-loading">
                <div className="safety-spinner"></div>
                <p>YessenIA está verificando...</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Parent/Guardian Notification */}
        {step === 2 && (
          <div className="safety-card">
            <div className="safety-yessenia-speech">
              <p className="yessenia-says">
                Perfecto 🌟 Como eres menor de edad, cuidamos tu seguridad. Necesitamos
                avisar a tu mamá, papá o apoderado que estás iniciando tu ruta profesional.
              </p>
            </div>

            <h2 className="safety-title">
              <span className="safety-shield">👨‍👩‍👧</span> Notificación a tu tutor/a
            </h2>
            <p className="safety-description">
              Ingresa el contacto de tu mamá, papá o apoderado legal.
              Les enviaremos un mensaje informando que estás en una actividad educativa segura.
            </p>

            <div className="contact-type-selector">
              <button
                className={`contact-type-btn ${contactType === 'email' ? 'active' : ''}`}
                onClick={() => setContactType('email')}
              >
                📧 Correo electrónico
              </button>
              <button
                className={`contact-type-btn ${contactType === 'whatsapp' ? 'active' : ''}`}
                onClick={() => setContactType('whatsapp')}
              >
                📱 WhatsApp
              </button>
            </div>

            <div className="parent-input-group">
              <input
                type={contactType === 'email' ? 'email' : 'tel'}
                className="parent-input"
                placeholder={contactType === 'email' ? 'correo@ejemplo.com' : '+51 999 999 999'}
                value={parentContact}
                onChange={e => setParentContact(e.target.value)}
              />
            </div>

            <div className="safety-notice">
              <span className="safety-notice-icon">🔐</span>
              <p>
                <strong>Tu seguridad es nuestra prioridad.</strong> El mensaje solo informa
                que estás en una actividad educativa. No compartimos datos personales con terceros.
              </p>
            </div>

            <button
              className="btn-primary btn-glow"
              onClick={handleParentSubmit}
              disabled={!parentContact.trim()}
            >
              <span>✅ Confirmar y Crear mi Heroína</span>
            </button>
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {step === 3 && (
          <div className="safety-card">
            {!showMessage ? (
              <div className="safety-loading">
                <div className="safety-spinner"></div>
                <p>Enviando notificación a tu tutor/a...</p>
              </div>
            ) : (
              <div className="safety-confirmed">
                <div className="safety-check-animation">
                  <div className="safety-check-circle">✅</div>
                </div>
                <h2 className="safety-title" style={{ color: 'var(--green-logro)' }}>
                  ¡Todo listo!
                </h2>
                <div className="safety-yessenia-speech">
                  <p className="yessenia-says">
                    Ya avisé a tu tutor/a. 🎉 Ahora sí, ¡es hora de descubrir tu heroína interior!
                    Prepárate para mis 3 preguntas...
                  </p>
                </div>

                <div className="safety-summary">
                  <div className="summary-item">
                    <span className="summary-icon">🛡️</span>
                    <span>Edad verificada</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">👨‍👩‍👧</span>
                    <span>Tutor/a notificado/a</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">🔐</span>
                    <span>Entorno seguro activado</span>
                  </div>
                </div>

                <button className="btn-primary btn-glow btn-xl" onClick={goToAwakening}>
                  <span>🎭 Descubrir mi Heroína</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Progress indicator */}
        <div className="safety-progress">
          <div className={`safety-progress-step ${step >= 1 ? 'active' : ''}`}>
            <span>🛡️</span>
            <p>Edad</p>
          </div>
          <div className="safety-progress-line"></div>
          <div className={`safety-progress-step ${step >= 2 ? 'active' : ''}`}>
            <span>👨‍👩‍👧</span>
            <p>Tutor/a</p>
          </div>
          <div className="safety-progress-line"></div>
          <div className={`safety-progress-step ${step >= 3 ? 'active' : ''}`}>
            <span>✅</span>
            <p>¡Lista!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
