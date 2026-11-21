// ============================================================
//  ALIADOS — el carrusel de logos de la landing
//
//  Para añadir uno: pon el SVG en frontend/public/assets/logos/
//  y agrégalo a la lista. El carrusel se adapta solo.
//
//  `escala` ajusta el tamaño de un logo concreto (1 = normal).
//  Úsalo solo si alguno se ve demasiado grande o pequeño.
//  `url` vacío = el logo no es clicable.
// ============================================================

const L = '/assets/logos'

/** El título de la sección. Cámbialo si la relación no es de patrocinio. */
export const ALIADOS_TITULO = 'Nos apoyan'

export const ALIADOS = [
  { id: 'aws', nombre: 'Amazon Web Services', logo: `${L}/aws.png`, url: '', escala: 1 },
  { id: 'google-cloud', nombre: 'Google Cloud', logo: `${L}/google-cloud.png`, url: '', escala: 1 },
  { id: 'cisco', nombre: 'Cisco', logo: `${L}/cisco.svg`, url: '', escala: 0.95 },
  {
    id: 'gwtc',
    nombre: 'Global Women in Technology Council',
    logo: `${L}/global-women-in-technology-council.svg`,
    url: '',
    escala: 1,
  },
  { id: 'movilmax', nombre: 'MovilMax', logo: `${L}/movilmax.svg`, url: '', escala: 1 },
  { id: 'santa-elena', nombre: 'Santa Elena', logo: `${L}/santa-elena.svg`, url: '', escala: 1.15 },
]
