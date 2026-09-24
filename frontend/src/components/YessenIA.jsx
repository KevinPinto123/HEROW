import { useState, useRef, useEffect } from 'react'

const YESSENIA_RESPONSES = {
  greeting: '¡Hola! 🌀 Soy YessenIA, tu guía en HEROW. ¿En qué puedo ayudarte?',
  age: 'Esta aventura es para chicas de 15 a 17 años. ¡Si estás en ese rango, esta experiencia es para ti! 💜',
  portals: 'Tenemos 3 portales: 💻 Código y Datos, 🎨 Diseño y Creatividad, y 🤖 Robótica. ¡Tú eliges cuál explorar!',
  nopuedo: 'El NoPuedo es ese monstruo que te dice "no puedes". Pero juntas, lo vamos a derrotar. Pedir ayuda es la estrategia más poderosa. 💪',
  safety: 'Tu seguridad es lo primero. No hay chats abiertos, no hay contacto directo. Todo pasa por sistemas seguros supervisados por mí. 🔐',
  default: 'Mmm, interesante pregunta. En HEROW, todo es posible. ¿Quieres saber más sobre los portales, el NoPuedo, o cómo funciona tu seguridad?'
}

function getResponse(message) {
  const lower = message.toLowerCase()
  if (lower.includes('hola') || lower.includes('hi') || lower.includes('hey')) return YESSENIA_RESPONSES.greeting
  if (lower.includes('edad') || lower.includes('año') || lower.includes('vieja')) return YESSENIA_RESPONSES.age
  if (lower.includes('portal') || lower.includes('stem') || lower.includes('universo')) return YESSENIA_RESPONSES.portals
  if (lower.includes('nopuedo') || lower.includes('no puedo') || lower.includes('miedo') || lower.includes('monstruo')) return YESSENIA_RESPONSES.nopuedo
  if (lower.includes('segur') || lower.includes('padres') || lower.includes('menor')) return YESSENIA_RESPONSES.safety
  return YESSENIA_RESPONSES.default
}

export default function YessenIA() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'yessenia', text: '¡Hola! 🌀 Soy YessenIA. Estoy aquí para guiarte. ¿Tienes alguna duda?', time: new Date() }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pulse, setPulse] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Pulse animation stops after first open
  useEffect(() => {
    if (isOpen) setPulse(false)
  }, [isOpen])

  const handleSend = () => {
    if (!input.trim()) return

    const userMsg = { from: 'user', text: input, time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const response = getResponse(input)
      setMessages(prev => [...prev, { from: 'yessenia', text: response, time: new Date() }])
      setIsTyping(false)
    }, 800 + Math.random() * 1200)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating Orb Button */}
      <button
        className={`yessenia-float-btn ${pulse ? 'pulse' : ''} ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir chat con YessenIA"
      >
        {isOpen ? (
          <span className="yessenia-float-icon">✕</span>
        ) : (
          <>
            <span className="yessenia-float-icon">🤖</span>
            <span className="yessenia-float-label">YessenIA</span>
          </>
        )}
      </button>

      {/* Chat Window */}
      <div className={`yessenia-chat-window ${isOpen ? 'open' : ''}`}>
        <div className="yessenia-chat-header">
          <div className="yessenia-chat-header-avatar">🤖</div>
          <div>
            <div className="yessenia-chat-header-name">YessenIA</div>
            <div className="yessenia-chat-header-status">
              <span className="yessenia-status-dot"></span> Tu guía IA
            </div>
          </div>
        </div>

        <div className="yessenia-chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`yessenia-msg ${msg.from}`}>
              {msg.from === 'yessenia' && <span className="yessenia-msg-avatar">🤖</span>}
              <div className="yessenia-msg-bubble">{msg.text}</div>
            </div>
          ))}
          {isTyping && (
            <div className="yessenia-msg yessenia">
              <span className="yessenia-msg-avatar">🤖</span>
              <div className="yessenia-msg-bubble yessenia-typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="yessenia-chat-suggestions">
          {['¿Qué son los portales?', '¿Es seguro?', '¿Qué es el NoPuedo?'].map((q, i) => (
            <button
              key={i}
              className="yessenia-suggestion"
              onClick={() => { setInput(q); setTimeout(() => { setInput(q); handleSend() }, 50) }}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="yessenia-chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
          />
          <button onClick={handleSend} className="yessenia-send-btn" disabled={!input.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
