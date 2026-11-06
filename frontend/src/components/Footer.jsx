import { Link } from 'react-router-dom'
import { ANIO, CONTACTO, HAY_REDES, enlaceInstagram } from '../data/contacto'
import { play } from '../lib/sfx'

// Un enlace del footer. Si es interno usa Link; si es externo abre en otra pestaña.
function Enlace({ a, externo, children }) {
  if (externo) {
    return (
      <a href={a} target="_blank" rel="noopener noreferrer" onClick={() => play('blip')}>
        {children}
      </a>
    )
  }
  return <Link to={a} onClick={() => play('blip')}>{children}</Link>
}

export default function Footer() {
  const instagram = enlaceInstagram()

  return (
    <footer className="footer site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-marca">
            <span className="nav-logo-text">HEROW</span>
            <p className="footer-tagline">Portales del Futuro</p>
            <p className="footer-desc">
              Un juego donde chicas de 15 a 17 años descubren su futuro en ciencia y tecnología
              convirtiéndose en heroínas reales.
            </p>
            <p className="footer-sello">🔐 Sin chats abiertos · Sin contacto directo entre jugadoras</p>
          </div>

          <nav className="footer-col" aria-label="El juego">
            <h3>El juego</h3>
            <ul>
              <li><Enlace a="/#como-funciona">Cómo funciona</Enlace></li>
              <li><Enlace a="/#heroinas">Heroínas</Enlace></li>
              <li><Enlace a="/registro">Crear cuenta</Enlace></li>
              <li><Enlace a="/entrar">Entrar</Enlace></li>
            </ul>
          </nav>

          <nav className="footer-col" aria-label="Para aliados">
            <h3>Para aliados</h3>
            <ul>
              <li><Enlace a="/#sumate">Colegios</Enlace></li>
              <li><Enlace a="/#sumate">Empresas y becas</Enlace></li>
              <li><Enlace a="/#sumate">Ser mentora</Enlace></li>
              {CONTACTO.email && (
                <li><a href={`mailto:${CONTACTO.email}`}>Escríbenos</a></li>
              )}
            </ul>
          </nav>

          <nav className="footer-col" aria-label="Legal y seguridad">
            <h3>Legal</h3>
            <ul>
              <li><Enlace a="/privacidad">Política de privacidad</Enlace></li>
              <li><Enlace a="/terminos">Términos de uso</Enlace></li>
              <li><Enlace a="/seguridad">Seguridad para menores</Enlace></li>
              <li><Enlace a="/#sumate">Para apoderados</Enlace></li>
            </ul>
          </nav>
        </div>

        {HAY_REDES && (
          <div className="footer-redes">
            {instagram && (
              <a href={instagram} target="_blank" rel="noopener noreferrer" className="footer-red">
                📸 Instagram
              </a>
            )}
            {CONTACTO.linkedin && (
              <a href={CONTACTO.linkedin} target="_blank" rel="noopener noreferrer" className="footer-red">
                💼 LinkedIn
              </a>
            )}
          </div>
        )}

        <div className="footer-bottom">
          <p>
            © {ANIO} HEROW · Hecho con <span className="footer-heart">💜</span> por el equipo{' '}
            {CONTACTO.equipo}
            {CONTACTO.pais ? ` en ${CONTACTO.pais}` : ''}
          </p>
          <p className="footer-mini">
            Las heroínas están basadas en mujeres reales, con fines educativos.
          </p>
        </div>
      </div>
    </footer>
  )
}
