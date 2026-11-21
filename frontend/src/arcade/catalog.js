// Catálogo del Arcade HEROW. Todos los juegos son originales de HEROW.
// console: opciones del modo consola (sin cuenta) · online: se puede jugar por internet (con cuenta)

export const ARCADE_GAMES = [
  {
    id: 'chispagota',
    name: 'Chispa y Gota',
    tagline: 'Aventura en equipo: fuego + agua',
    about: 'Chispa cruza la lava y Gota cruza el agua. Juntas recogen cristales, activan botones y llegan a sus puertas. ¡Solo cooperando se sale del laboratorio!',
    art: ['#FF6B35', '#3A86FF'],
    icon: '🔥💧',
    badge: 'Nuevo',
    players: '1–2 jugadoras',
    console: [
      { id: 'duo', label: '👭 2 jugadoras en este equipo', hint: 'Una con W A D, la otra con las flechas (o los botones en pantalla).' },
      { id: 'solo', label: '🙋 1 jugadora', hint: 'Controlas a las dos y cambias con Tab.' },
    ],
    online: false,
  },
  {
    id: 'cristales',
    name: 'Cristales STEM',
    tagline: 'Combina 3 y haz combos',
    about: 'Junta tres o más cristales iguales: átomos, ADN, ideas, cohetes, planetas y robots. Las cascadas multiplican tus puntos.',
    art: ['#A855F7', '#EC4899'],
    icon: '⚛️🧬',
    badge: 'Popular',
    players: '1 jugadora · duelo online',
    console: [{ id: 'solo', label: '⏱ Contrarreloj de 90 s', hint: 'Supera tu récord.' }],
    online: { label: 'Duelo de 90 s: el mismo tablero para las dos' },
  },
  {
    id: 'timbiriche',
    name: 'Timbiriche',
    tagline: 'Cierra más cuadritos que tu rival',
    about: 'Por turnos, cada una traza una línea entre dos puntos. Quien cierra un cuadrito se lo queda y vuelve a jugar. ¡Piensa antes de regalar el tercer lado!',
    art: ['#F59E0B', '#EF4444'],
    icon: '⬛✏️',
    players: '2 jugadoras',
    console: [
      { id: 'cpu-facil', label: '🙂 Contra la compu (fácil)' },
      { id: 'cpu-dificil', label: '🤖 Contra la compu (difícil)' },
      { id: 'local', label: '👭 2 jugadoras en este equipo' },
    ],
    online: { label: 'Partida 1 vs 1 por turnos' },
  },
  {
    id: 'michi',
    name: 'Michi',
    tagline: 'El clásico tres en raya',
    about: 'Tres en línea gana: horizontal, vertical o diagonal. En modo difícil la compu no se equivoca… ¿puedes empatarle?',
    art: ['#10B981', '#06B6D4'],
    icon: '✖️⭕',
    players: '2 jugadoras',
    console: [
      { id: 'cpu-facil', label: '🙂 Contra la compu (fácil)' },
      { id: 'cpu-dificil', label: '🤖 Contra la compu (imbatible)' },
      { id: 'local', label: '👭 2 jugadoras en este equipo' },
    ],
    online: { label: 'Partida 1 vs 1 por turnos' },
  },
  {
    id: 'conecta4',
    name: 'Conecta 4',
    tagline: 'Alinea 4 fichas antes que tu rival',
    about: 'Deja caer tus fichas en las columnas. Gana quien alinee cuatro en fila, columna o diagonal. Es pura estrategia (y un poco de matemática).',
    art: ['#3B82F6', '#8B5CF6'],
    icon: '🔴🔵',
    players: '2 jugadoras',
    console: [
      { id: 'cpu-facil', label: '🙂 Contra la compu (fácil)' },
      { id: 'cpu-dificil', label: '🤖 Contra la compu (difícil)' },
      { id: 'local', label: '👭 2 jugadoras en este equipo' },
    ],
    online: { label: 'Partida 1 vs 1 por turnos' },
  },
  {
    id: 'memoria',
    name: 'Memoria de Heroínas',
    tagline: 'Encuentra las parejas y conócelas',
    about: 'Voltea las cartas y encuentra a las científicas, ingenieras e inventoras de HEROW. Cada pareja te cuenta qué descubrió.',
    art: ['#E879F9', '#F97316'],
    icon: '🃏🌀',
    players: '1–2 jugadoras',
    console: [
      { id: 'solo', label: '🙋 1 jugadora', hint: 'Con la menor cantidad de intentos.' },
      { id: 'duo', label: '👭 2 jugadoras por turnos' },
    ],
    online: false,
  },
]

export const getArcadeGame = (id) => ARCADE_GAMES.find(g => g.id === id)
