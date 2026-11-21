// Catálogo del Arcade HEROW. Todos los juegos son originales de HEROW.
// category: sección del arcade · howTo: instrucciones cortas que se ven al entrar
// console: modos sin cuenta · online: se puede jugar por internet (con cuenta)

export const CATEGORIES = [
  { id: 'aventura', name: 'Aventura y acción', color: '#F97316' },
  { id: 'aprende', name: 'Aprende jugando', color: '#22D3EE' },
  { id: 'estrategia', name: 'Estrategia', color: '#8B5CF6' },
  { id: 'mente', name: 'Mente y memoria', color: '#E879F9' },
]

const SOLO = [{ id: 'solo', label: 'Jugar' }]

export const ARCADE_GAMES = [
  {
    id: 'chispagota',
    category: 'aventura',
    name: 'Chispa y Gota',
    color: '#F97316',
    howTo: [
      'Chispa cruza la lava. Gota cruza el agua. El ácido verde apaga a las dos.',
      'Recojan sus cristales y lleguen juntas a su puerta.',
      'Chispa: W A D. Gota: flechas. Con 1 jugadora, Tab cambia de heroína.',
    ],
    console: [
      { id: 'duo', label: '2 jugadoras' },
      { id: 'solo', label: '1 jugadora' },
    ],
    online: false,
  },
  {
    id: 'cristales',
    category: 'mente',
    name: 'Cristales',
    color: '#E879F9',
    howTo: [
      'Desliza un cristal hacia su vecino para juntar 3 o más iguales.',
      'Las cascadas multiplican tus puntos.',
      'Tienes 90 segundos.',
    ],
    console: [{ id: 'solo', label: 'Contrarreloj' }],
    online: { label: 'Duelo de 90 s con el mismo tablero' },
  },
  {
    id: 'timbiriche',
    category: 'estrategia',
    name: 'Timbiriche',
    color: '#FBBF24',
    howTo: [
      'Por turnos, traza una línea entre dos puntos.',
      'Si cierras un cuadrito, es tuyo y vuelves a jugar.',
      'Gana quien cierre más cuadritos.',
    ],
    console: [
      { id: 'cpu-facil', label: 'Vs compu · fácil' },
      { id: 'cpu-dificil', label: 'Vs compu · difícil' },
      { id: 'local', label: '2 jugadoras' },
    ],
    online: { label: '1 vs 1 por turnos' },
  },
  {
    id: 'michi',
    category: 'estrategia',
    name: 'Michi',
    color: '#22D3EE',
    howTo: [
      'Por turnos, marca una casilla.',
      'Gana quien haga 3 en línea.',
    ],
    console: [
      { id: 'cpu-facil', label: 'Vs compu · fácil' },
      { id: 'cpu-dificil', label: 'Vs compu · imbatible' },
      { id: 'local', label: '2 jugadoras' },
    ],
    online: { label: '1 vs 1 por turnos' },
  },
  {
    id: 'conecta4',
    category: 'estrategia',
    name: 'Conecta 4',
    color: '#8B5CF6',
    howTo: [
      'Por turnos, suelta una ficha en una columna.',
      'Gana quien alinee 4: en fila, columna o diagonal.',
    ],
    console: [
      { id: 'cpu-facil', label: 'Vs compu · fácil' },
      { id: 'cpu-dificil', label: 'Vs compu · difícil' },
      { id: 'local', label: '2 jugadoras' },
    ],
    online: { label: '1 vs 1 por turnos' },
  },
  {
    id: 'memoria',
    category: 'mente',
    name: 'Memoria',
    color: '#34D399',
    howTo: [
      'Voltea dos cartas por turno.',
      'Si son la misma heroína, es pareja y conoces su historia.',
    ],
    console: [
      { id: 'solo', label: '1 jugadora' },
      { id: 'duo', label: '2 jugadoras' },
    ],
    online: false,
  },
  {
    id: 'orbita',
    category: 'aventura',
    name: 'Satélite',
    color: '#8B5CF6',
    howTo: [
      'Guía al satélite para recoger las estrellas de datos.',
      'Cada estrella alarga su señal y lo hace más rápido.',
      'No choques con el borde ni con tu propia señal. Flechas, WASD o desliza.',
    ],
    console: [{ id: 'solo', label: 'Despegar' }],
    online: false,
  },
  {
    id: 'robot',
    category: 'aprende',
    name: 'Código Robot',
    color: '#22D3EE',
    howTo: [
      'Arma un programa con bloques: avanzar, girar a la izquierda o a la derecha.',
      'Toca Ejecutar y mira si el robot llega a la estrella sin chocar.',
      'Mientras menos bloques uses, más estrellas ganas.',
    ],
    console: SOLO,
    online: false,
  },
  {
    id: 'circuito',
    category: 'aprende',
    name: 'Circuito',
    color: '#FBBF24',
    howTo: [
      'Toca una pieza para girarla.',
      'Conecta todos los cables a la batería rosada sin dejar puntas sueltas.',
      'Cuando el circuito está completo, se encienden todos los focos.',
    ],
    console: SOLO,
    online: false,
  },
  {
    id: 'binario',
    category: 'aprende',
    name: 'Binario',
    color: '#34D399',
    howTo: [
      'Enciende los bits que suman el número que aparece.',
      'Cada bit vale el doble que el de su derecha: 1, 2, 4, 8…',
      'Así guardan los números las computadoras. Tienes 60 segundos.',
    ],
    console: SOLO,
    online: false,
  },
  {
    id: 'flash',
    category: 'aprende',
    name: 'Ciencia Flash',
    color: '#F97316',
    howTo: [
      'Lee el dato y decide: ¿verdadero o falso?',
      'Si fallas, aprendes la respuesta correcta.',
      'Tienes 60 segundos. Las rachas suman más puntos.',
    ],
    console: SOLO,
    online: false,
  },
  {
    id: 'mates',
    category: 'aprende',
    name: 'Mente Rápida',
    color: '#E879F9',
    howTo: [
      'Elige el resultado correcto lo más rápido que puedas.',
      'Cada 5 aciertos, las operaciones se ponen más difíciles.',
      'Un error resta 3 segundos. Tienes 60.',
    ],
    console: SOLO,
    online: false,
  },
  {
    id: 'secuencia',
    category: 'mente',
    name: 'Secuencia',
    color: '#22D3EE',
    howTo: [
      'Mira qué portales se encienden y en qué orden.',
      'Repite la secuencia tocándolos igual.',
      'Cada ronda suma un portal más.',
    ],
    console: SOLO,
    online: false,
  },
]

export const getArcadeGame = (id) => ARCADE_GAMES.find(g => g.id === id)

export const gamesIn = (category) => ARCADE_GAMES.filter(g => g.category === category)
