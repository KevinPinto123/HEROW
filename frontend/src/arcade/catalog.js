// Catálogo del Arcade HEROW. Todos los juegos son originales de HEROW.
// howTo: instrucciones cortas que se ven al entrar al juego.
// console: modos sin cuenta · online: se puede jugar por internet (con cuenta)

export const ARCADE_GAMES = [
  {
    id: 'chispagota',
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
]

export const getArcadeGame = (id) => ARCADE_GAMES.find(g => g.id === id)
