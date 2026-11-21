// Fuentes públicas para las recomendaciones de YessenIA.
// Solo sitios que permiten ser leídos (se respeta robots.txt en cada consulta).
// portals: a qué portales del juego aplica: code | robotics | design | science
// keywords: palabras que debe tener el texto de un enlace para considerarlo recomendación.

// direct: true = la página en sí es la oportunidad (no se buscan enlaces dentro).
export const SOURCES = [
  {
    id: 'pronabec-becas',
    name: 'Pronabec (becas del Estado peruano)',
    url: 'https://www.pronabec.gob.pe/becas/',
    portals: ['code', 'robotics', 'design', 'science'],
    type: 'beca',
    keywords: ['beca'],
  },
  {
    id: 'technovation',
    name: 'Technovation Girls',
    url: 'https://www.technovationchallenge.org/',
    portals: ['code', 'design'],
    type: 'programa',
    keywords: [],
    direct: true,
  },
  {
    id: 'pronabec',
    name: 'Pronabec (becas del Estado peruano)',
    url: 'https://www.pronabec.gob.pe/',
    portals: ['code', 'robotics', 'design', 'science'],
    type: 'beca',
    keywords: ['beca', 'convocatoria', 'crédito', 'postula'],
  },
  {
    id: 'coursera-code',
    name: 'Coursera (programación para empezar)',
    url: 'https://www.coursera.org/courses?query=programming',
    portals: ['code'],
    type: 'curso',
    keywords: ['python', 'program', 'datos', 'data', 'intro', 'fundament'],
  },
  {
    id: 'coursera-design',
    name: 'Coursera (diseño UX)',
    url: 'https://www.coursera.org/courses?query=ux%20design',
    portals: ['design'],
    type: 'curso',
    keywords: ['ux', 'diseño', 'design', 'ui'],
  },
  {
    id: 'coursera-robotics',
    name: 'Coursera (robótica y electrónica)',
    url: 'https://www.coursera.org/courses?query=robotics',
    portals: ['robotics'],
    type: 'curso',
    keywords: ['robot', 'arduino', 'electr', 'iot', 'space', 'espacio'],
  },
  {
    id: 'coursera-science',
    name: 'Coursera (ciencia y biología)',
    url: 'https://www.coursera.org/courses?query=biology',
    portals: ['science'],
    type: 'curso',
    keywords: ['biolog', 'science', 'ciencia', 'genétic', 'genetic', 'química', 'chem', 'adn', 'dna'],
  },
]
