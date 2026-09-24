import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticlesBg from '../components/ParticlesBg'

export default function Niveles() {
  const navigate = useNavigate()
  const [activePath, setActivePath] = useState('codigo')
  const [selectedNode, setSelectedNode] = useState(null)

  const paths = {
    codigo: {
      id: 'codigo',
      title: 'Código y Datos',
      color: 'var(--purple-portal)',
      glow: 'var(--purple-glow)',
      bgPath: 'rgba(139, 92, 246, 0.1)',
      mentor: {
        name: 'Mariana Costa',
        role: 'Laboratoria',
        avatar: '👩🏽‍💻',
        bg: 'linear-gradient(135deg, var(--purple-portal), var(--pink-neon))'
      },
      nodes: [
        { id: 1, title: 'El Despertar', desc: 'Descubre tu poder lógico. Crea tu avatar y prepárate.', status: 'completed', icon: '1', x: 15, y: 80 },
        { id: 2, title: 'Algoritmos', desc: 'Combate de Lógica. Resuelve problemas rápidos.', status: 'active', icon: '2', x: 45, y: 65 },
        { id: 3, title: 'Bases de Datos', desc: 'Domina la información. Estructura el conocimiento.', status: 'locked', icon: '3', x: 75, y: 45 },
        { id: 4, title: 'El "NoPuedo"', desc: 'Jefe Final: El Impostor. Véncelo con ayuda.', status: 'locked', icon: '👾', isBoss: true, x: 50, y: 25 },
        { id: 5, title: 'Heroína del Código', desc: '¡Recompensa! Beca AWS Cloud.', status: 'locked', icon: '🏆', x: 20, y: 10 }
      ]
    },
    espacio: {
      id: 'espacio',
      title: 'Robótica y Espacio',
      color: 'var(--cyan-future)',
      glow: 'var(--cyan-glow)',
      bgPath: 'rgba(34, 211, 238, 0.1)',
      mentor: {
        name: 'Katya Echazarreta',
        role: 'Ing. Espacial',
        avatar: '👩🏻‍🚀',
        bg: 'linear-gradient(135deg, var(--cyan-future), var(--purple-portal))'
      },
      nodes: [
        { id: 1, title: 'El Despertar', desc: 'Encuentra tu centro. Preparación de vuelo.', status: 'completed', icon: '1', x: 15, y: 80 },
        { id: 2, title: 'Circuitos', desc: 'Combate de Hardware. Ensambla y programa.', status: 'active', icon: '2', x: 45, y: 65 },
        { id: 3, title: 'Motores', desc: 'Ensamblaje Robótico. Da vida a tus ideas.', status: 'locked', icon: '3', x: 75, y: 45 },
        { id: 4, title: 'Falla del Sistema', desc: 'Jefe: Miedo al error. Reinicia el sistema.', status: 'locked', icon: '👾', isBoss: true, x: 50, y: 25 },
        { id: 5, title: 'Heroína Espacial', desc: '¡Recompensa! Pase a Laboratorio STEM.', status: 'locked', icon: '🏆', x: 20, y: 10 }
      ]
    },
    diseno: {
      id: 'diseno',
      title: 'Diseño Creativo',
      color: 'var(--pink-neon)',
      glow: 'var(--pink-glow)',
      bgPath: 'rgba(232, 121, 249, 0.1)',
      mentor: {
        name: 'Diana Trujillo',
        role: 'NASA',
        avatar: '🎨',
        bg: 'linear-gradient(135deg, var(--pink-neon), var(--purple-deep))'
      },
      nodes: [
        { id: 1, title: 'El Despertar', desc: 'Desata tu visión. Conceptualiza tu idea.', status: 'completed', icon: '1', x: 15, y: 80 },
        { id: 2, title: 'UX Research', desc: 'Entiende al usuario. Combate de empatía.', status: 'active', icon: '2', x: 45, y: 65 },
        { id: 3, title: 'UI Design', desc: 'Crea interfaces mágicas. Domina el color.', status: 'locked', icon: '3', x: 75, y: 45 },
        { id: 4, title: 'El Bloqueo', desc: 'Jefe: "No soy creativa". Supéralo creando.', status: 'locked', icon: '👾', isBoss: true, x: 50, y: 25 },
        { id: 5, title: 'Heroína Diseñadora', desc: '¡Recompensa! Certificación Figma.', status: 'locked', icon: '🏆', x: 20, y: 10 }
      ]
    }
  }

  const currentPath = paths[activePath]

  // Select the first active node by default when path changes
  useEffect(() => {
    const activeNode = currentPath.nodes.find(n => n.status === 'active') || currentPath.nodes[0]
    setSelectedNode(activeNode)
  }, [activePath])

  // Build points for SVG path
  const polylinePoints = currentPath.nodes.map(n => `${n.x},${n.y}`).join(' ')

  return (
    <div className="map-game-view">
      <ParticlesBg count={30} />
      
      <button className="back-btn" onClick={() => navigate('/multiverso')} style={{ zIndex: 100 }}>
        ← Volver
      </button>

      {/* Main Layout: Left (Map) / Right (Info Card) */}
      <div className="map-layout">
        
        {/* LEFT AREA: MAP */}
        <div className="map-area">
          <div className="map-header">
            <h2 className="map-title">Mapa de <span className="gradient-text">Misiones</span></h2>
            
            {/* Constellation Tabs */}
            <div className="map-tabs">
              {Object.values(paths).map(p => (
                <button 
                  key={p.id}
                  className={`map-tab ${activePath === p.id ? 'active' : ''}`}
                  onClick={() => setActivePath(p.id)}
                  style={{ 
                    borderColor: activePath === p.id ? p.color : 'transparent',
                    color: activePath === p.id ? p.color : 'var(--text-muted)'
                  }}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          <div className="map-board-container">
            <div className="map-board" style={{ background: currentPath.bgPath }}>
              
              {/* Path SVG */}
              <svg className="map-svg-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Background thicker line */}
                <polyline 
                  points={polylinePoints} 
                  fill="none" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="6"
                  strokeLinejoin="round"
                />
                {/* Glowing line */}
                <polyline 
                  points={polylinePoints} 
                  fill="none" 
                  stroke={currentPath.color} 
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  strokeLinejoin="round"
                  className="animated-dash"
                />
              </svg>

              {/* Nodes */}
              {currentPath.nodes.map((node) => (
                <div 
                  key={node.id} 
                  className={`map-circle-node ${node.status} ${selectedNode?.id === node.id ? 'selected' : ''}`}
                  style={{ 
                    left: `${node.x}%`, 
                    top: `${node.y}%`,
                    borderColor: node.status === 'locked' ? 'rgba(255,255,255,0.2)' : currentPath.color,
                    boxShadow: selectedNode?.id === node.id ? `0 0 20px ${currentPath.glow}` : (node.status === 'active' ? `0 0 10px ${currentPath.color}` : 'none')
                  }}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="map-circle-icon" style={{ 
                    background: node.status === 'active' ? currentPath.color : (node.status === 'completed' ? 'var(--green-logro)' : 'rgba(0,0,0,0.6)')
                  }}>
                    {node.icon}
                  </div>
                  {node.status === 'completed' && <div className="node-check">⭐</div>}
                  {node.status === 'locked' && <div className="node-lock">🔒</div>}
                  
                  {/* Floating label */}
                  <span className="map-circle-label">{node.title}</span>
                </div>
              ))}

              {/* Decor: Mentor in the map */}
              <div className="map-mentor-deco" style={{ top: '70%', left: '10%' }}>
                <div className="mentor-mini-avatar" style={{ background: currentPath.mentor.bg }}>
                  {currentPath.mentor.avatar}
                </div>
                <div className="mentor-mini-bubble">
                  {currentPath.mentor.name} te guía
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT AREA: INFO CARD */}
        <div className="info-area">
          {selectedNode ? (
            <div className="info-card slide-up" style={{ borderColor: currentPath.color }}>
              <div className="info-card-header">
                <span className={`info-status-badge ${selectedNode.status}`}>
                  {selectedNode.status === 'completed' ? '✅ COMPLETADO' : selectedNode.status === 'active' ? '🔥 ACTIVO' : '🔒 BLOQUEADO'}
                </span>
                <span className="info-level-badge" style={{ color: currentPath.color }}>NIVEL {selectedNode.id}</span>
              </div>

              <div className="info-icon-large" style={{ background: selectedNode.status === 'active' ? currentPath.color : 'rgba(255,255,255,0.1)' }}>
                {selectedNode.icon}
              </div>

              <h2 className="info-title">{selectedNode.title}</h2>
              <p className="info-desc">{selectedNode.desc}</p>
              
              <div className="info-rewards">
                <h4>Recompensas posibles:</h4>
                <ul>
                  <li>+100 Puntos de Experiencia</li>
                  {selectedNode.isBoss && <li>Desbloqueo de Beca Exclusiva</li>}
                  {!selectedNode.isBoss && <li>Medalla de {currentPath.title}</li>}
                </ul>
              </div>

              <div className="info-actions">
                {selectedNode.status === 'active' && (
                  <button 
                    className="btn-primary btn-glow btn-xl" 
                    onClick={() => navigate(selectedNode.isBoss ? '/boss' : '/combate')}
                    style={{ width: '100%', background: currentPath.color }}
                  >
                    <span>{selectedNode.isBoss ? '⚔️ ENFRENTAR AL JEFE' : '🚀 EMPEZAR NIVEL'}</span>
                  </button>
                )}
                
                {selectedNode.status === 'completed' && (
                  <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate(selectedNode.isBoss ? '/boss' : '/combate')}>
                    Repetir Nivel
                  </button>
                )}

                {selectedNode.status === 'locked' && (
                  <button className="btn-secondary" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
                    Bloqueado
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="info-empty">
              Selecciona un nivel en el mapa
            </div>
          )}
        </div>

      </div>

      <style>{`
        .map-game-view {
          min-height: 100vh;
          padding: 40px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-layout {
          display: flex;
          width: 100%;
          max-width: 1200px;
          height: 80vh;
          min-height: 600px;
          gap: 40px;
          position: relative;
          z-index: 10;
        }

        /* --- MAP AREA --- */
        .map-area {
          flex: 2;
          display: flex;
          flex-direction: column;
          background: rgba(15, 10, 46, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 30px;
          padding: 30px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }

        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .map-title {
          font-family: var(--font-display);
          font-size: 1.5rem;
        }

        .map-tabs {
          display: flex;
          background: rgba(0,0,0,0.4);
          border-radius: 20px;
          padding: 4px;
        }

        .map-tab {
          background: transparent;
          border: 1px solid transparent;
          color: white;
          padding: 8px 16px;
          border-radius: 16px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.3s;
          font-family: var(--font-display);
        }

        .map-tab.active {
          background: rgba(255,255,255,0.1);
        }

        .map-board-container {
          flex: 1;
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background: #0f172a;
          border: 2px solid rgba(255,255,255,0.05);
        }

        .map-board {
          position: absolute;
          inset: 0;
          transition: background 1s ease;
        }

        .map-svg-path {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .animated-dash {
          animation: map-dash 10s linear infinite;
        }

        @keyframes map-dash {
          to { stroke-dashoffset: -100; }
        }

        /* NODES */
        .map-circle-node {
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid;
          transform: translate(-50%, -50%);
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 5;
        }

        .map-circle-node:hover {
          transform: translate(-50%, -50%) scale(1.1);
        }

        .map-circle-node.selected {
          transform: translate(-50%, -50%) scale(1.2);
          z-index: 10;
        }

        .map-circle-icon {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          color: white;
          font-family: var(--font-display);
          font-weight: bold;
        }

        .node-check, .node-lock {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          background: var(--night-deep);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .map-circle-label {
          position: absolute;
          top: 50px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          background: rgba(0,0,0,0.8);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .map-circle-node.selected .map-circle-label,
        .map-circle-node:hover .map-circle-label {
          opacity: 1;
        }

        /* Mentor Deco */
        .map-mentor-deco {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 12px;
          pointer-events: none;
          animation: float 5s infinite;
        }
        .mentor-mini-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        .mentor-mini-bubble {
          background: rgba(0,0,0,0.7);
          padding: 6px 12px;
          border-radius: 12px 12px 12px 0;
          font-size: 0.7rem;
          border: 1px solid rgba(255,255,255,0.1);
        }

        /* --- INFO AREA --- */
        .info-area {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .info-card {
          flex: 1;
          background: rgba(15, 10, 46, 0.9);
          backdrop-filter: blur(20px);
          border: 2px solid;
          border-radius: 30px;
          padding: 40px 30px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .info-empty {
          flex: 1;
          background: rgba(15, 10, 46, 0.4);
          border: 2px dashed rgba(255,255,255,0.1);
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-style: italic;
        }

        .info-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .info-status-badge {
          font-size: 0.75rem;
          font-weight: bold;
          padding: 6px 12px;
          border-radius: 12px;
        }
        .info-status-badge.completed { background: rgba(52, 211, 153, 0.2); color: var(--green-logro); }
        .info-status-badge.active { background: rgba(255,255,255,0.1); color: white; }
        .info-status-badge.locked { background: rgba(0,0,0,0.5); color: var(--text-muted); }

        .info-level-badge {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1rem;
        }

        .info-icon-large {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          margin: 0 auto 24px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
          color: white;
        }

        .info-title {
          font-family: var(--font-display);
          font-size: 1.8rem;
          text-align: center;
          margin-bottom: 12px;
        }

        .info-desc {
          color: var(--text-secondary);
          text-align: center;
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .info-rewards {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: auto;
        }
        .info-rewards h4 {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .info-rewards ul {
          list-style: none;
          padding: 0;
          font-size: 0.9rem;
          color: var(--text-primary);
        }
        .info-rewards li {
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .info-rewards li::before {
          content: '🎁';
        }

        .info-actions {
          margin-top: 30px;
        }

        @media (max-width: 900px) {
          .map-layout {
            flex-direction: column;
            height: auto;
          }
          .map-area {
            min-height: 500px;
          }
        }
      `}</style>
    </div>
  )
}
