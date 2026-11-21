// ============================================================
//  DATOS DE CONTACTO — el único archivo que tienes que editar
// ============================================================
//  Lo que dejes vacío ('') simplemente NO aparece en la web.
//  Nada se rompe: el footer y las páginas legales se adaptan solos.
// ============================================================

export const CONTACTO = {
  /** ⚠️ PENDIENTE: tu correo. Sale en el footer y en las páginas legales. */
  email: '',

  /** Usuario de Instagram, SIN la @. Ej: 'herow.app' */
  instagram: '',

  /** Enlace completo de LinkedIn. Ej: 'https://www.linkedin.com/in/kevin-pinto' */
  linkedin: '',

  /** Quién está detrás del proyecto. Sale en el aviso legal. */
  equipo: 'MusuqLab',

  /** País donde se opera. Define qué ley de datos aplica. */
  pais: 'Perú',
}

/** Año actual, para el © del footer. */
export const ANIO = new Date().getFullYear()

/** ¿Hay al menos una red para mostrar el bloque de redes? */
export const HAY_REDES = Boolean(CONTACTO.instagram || CONTACTO.linkedin)

/** Enlace listo para usar en un href, o null si no está configurado. */
export const enlaceInstagram = () =>
  CONTACTO.instagram ? `https://instagram.com/${CONTACTO.instagram.replace(/^@/, '')}` : null

/** Cómo se escribe a HEROW. Si no hay correo, se usa el formulario de la landing. */
export const canalDeContacto = () =>
  CONTACTO.email
    ? { tipo: 'correo', texto: CONTACTO.email, href: `mailto:${CONTACTO.email}` }
    : { tipo: 'formulario', texto: 'el formulario de la página principal', href: '/#sumate' }
