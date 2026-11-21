import { heroinePortrait, heroineSprite } from './assets'

// Portales del juego. El color es el aura de las heroínas de ese portal.
export const PORTALS = {
  code: { id: 'code', name: 'Código y Datos', color: '#8B5CF6', emoji: '💻' },
  robotics: { id: 'robotics', name: 'Robótica y Espacio', color: '#22D3EE', emoji: '🚀' },
  design: { id: 'design', name: 'Diseño e Invención', color: '#E879F9', emoji: '🎨' },
  science: { id: 'science', name: 'Ciencia', color: '#34D399', emoji: '🔬' },
}

// Mujeres reales. living: true = persona viva; se usa como carta de inspiración,
// nunca como personaje que "habla" con la jugadora.
const RAW = [
  { id: 'curie', name: 'Marie Curie', years: '1867–1934', country: 'Polonia / Francia', portal: 'science',
    power: 'Radiactividad',
    bio: 'Descubrió el polonio y el radio. Es la única persona con Premio Nobel en dos ciencias distintas: Física (1903) y Química (1911).' },
  { id: 'franklin', name: 'Rosalind Franklin', years: '1920–1958', country: 'Reino Unido', portal: 'science',
    power: 'Visión de rayos X',
    bio: 'Sus imágenes de difracción de rayos X, como la famosa Foto 51, fueron clave para descubrir la estructura de doble hélice del ADN.' },
  { id: 'shady', name: 'Ruth Shady', country: 'Perú', portal: 'science', living: true,
    power: 'Memoria ancestral',
    bio: 'Arqueóloga que investigó Caral, la ciudad más antigua de América, con unos 5000 años de antigüedad.' },

  { id: 'lovelace', name: 'Ada Lovelace', years: '1815–1852', country: 'Reino Unido', portal: 'code',
    power: 'Algoritmo primigenio',
    bio: 'En 1843 publicó lo que se considera el primer algoritmo pensado para una máquina: la Máquina Analítica de Charles Babbage.' },
  { id: 'hopper', name: 'Grace Hopper', years: '1906–1992', country: 'Estados Unidos', portal: 'code',
    power: 'Compilador',
    bio: 'Creó uno de los primeros compiladores y ayudó a crear COBOL. Popularizó la historia del primer "bug": una polilla atrapada en una computadora.' },
  { id: 'johnson', name: 'Katherine Johnson', years: '1918–2020', country: 'Estados Unidos', portal: 'code',
    power: 'Cálculo orbital',
    bio: 'Matemática de la NASA. Calculó trayectorias de vuelo y verificó a mano los cálculos del vuelo orbital de John Glenn en 1962.' },
  { id: 'costa', name: 'Mariana Costa Checa', country: 'Perú', portal: 'code', living: true,
    power: 'Código colectivo',
    bio: 'Cofundó Laboratoria, que forma a mujeres de Latinoamérica como programadoras y las conecta con empleos en tecnología.' },

  { id: 'hamilton', name: 'Margaret Hamilton', country: 'Estados Unidos', portal: 'robotics', living: true,
    power: 'Software lunar',
    bio: 'Dirigió el equipo que creó el software de vuelo de las misiones Apolo que llegaron a la Luna. Popularizó el término "ingeniería de software".' },
  { id: 'tereshkova', name: 'Valentina Tereshkova', country: 'Rusia', portal: 'robotics', living: true,
    power: 'Órbita pionera',
    bio: 'En 1963 se convirtió en la primera mujer en viajar al espacio, a bordo de la nave Vostok 6.' },
  { id: 'jemison', name: 'Mae Jemison', country: 'Estados Unidos', portal: 'robotics', living: true,
    power: 'Ciencia en órbita',
    bio: 'Médica e ingeniera. En 1992 fue la primera mujer afroamericana en viajar al espacio, a bordo del transbordador Endeavour.' },
  { id: 'ochoa', name: 'Ellen Ochoa', country: 'Estados Unidos', portal: 'robotics', living: true,
    power: 'Melodía estelar',
    bio: 'En 1993 fue la primera mujer hispana en ir al espacio. Después llegó a dirigir el Centro Espacial Johnson de la NASA.' },
  { id: 'quispe', name: 'Aracely Quispe Neira', country: 'Perú', portal: 'robotics', living: true,
    power: 'Mirada del Webb',
    bio: 'Ingeniera peruana en la NASA. Participó en la misión del telescopio espacial James Webb.' },

  { id: 'lamarr', name: 'Hedy Lamarr', years: '1914–2000', country: 'Austria / Estados Unidos', portal: 'design',
    power: 'Salto de frecuencia',
    bio: 'Actriz e inventora. En 1942 patentó un sistema de salto de frecuencia, precursor de tecnologías como el WiFi y el Bluetooth.' },
  { id: 'reiche', name: 'María Reiche', years: '1903–1998', country: 'Alemania / Perú', portal: 'design',
    power: 'Geometría de Nazca',
    bio: 'Matemática que dedicó más de 50 años a estudiar, medir y proteger las Líneas de Nazca.' },
  { id: 'hadid', name: 'Zaha Hadid', years: '1950–2016', country: 'Irak / Reino Unido', portal: 'design',
    power: 'Curvas imposibles',
    bio: 'Arquitecta de formas curvas y futuristas. En 2004 fue la primera mujer en ganar el Premio Pritzker de arquitectura.' },
]

export const HEROINES = RAW.map(h => ({
  living: false,
  ...h,
  sprite: heroineSprite(h.id),
  portrait: heroinePortrait(h.id),
}))

export const heroinesByPortal = (portalId) => HEROINES.filter(h => h.portal === portalId)
export const getHeroine = (id) => HEROINES.find(h => h.id === id)
