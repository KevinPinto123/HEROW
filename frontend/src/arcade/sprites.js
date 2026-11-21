// Pixel art del Arcade, dibujado con la paleta de HEROW (sin emojis).
// Cada sprite es una lista de filas; cada letra es un color de PALETTE y "." es transparente.

export const PALETTE = {
  N: '#0F0A2E', // noche cósmica
  P: '#8B5CF6', // morado portal
  D: '#5B21B6', // morado profundo
  L: '#C4B5FD', // lila claro
  C: '#22D3EE', // cian futuro
  K: '#E879F9', // rosa neón
  G: '#FBBF24', // oro heroína
  R: '#FB7185', // coral (fuego)
  O: '#F97316', // naranja (fuego)
  B: '#3B82F6', // azul (agua)
  E: '#34D399', // verde logro
  W: '#FFFFFF',
}

export const SPRITES = {
  // ── Miniaturas de los juegos (16×16) ──
  chispagota: [
    '................',
    '................',
    '...O.......B....',
    '...OO......B....',
    '..OOO.....BBB...',
    '..OGOO....BBB...',
    '.OOGGO...BBBBB..',
    '.OGGGOO..BWBBB..',
    '.OGGGGO.BWWBBBB.',
    '.OGWGGO.BWBBBBB.',
    '.OOGGOO.BBBBBBB.',
    '..OOOO...BBBBB..',
    '...OO.....BBB...',
    '................',
    'PPPPPPPPPPPPPPPP',
    'DDDDDDDDDDDDDDDD',
  ],
  cristales: [
    '................',
    '................',
    '..KKKK....CCCC..',
    '.KWKKKK..CWCCCC.',
    '.KKKKKK..CCCCCC.',
    '..KKKK....CCCC..',
    '...KK......CC...',
    '................',
    '.....GGGGGG.....',
    '....GWGGGGGG....',
    '....GGGGGGGG....',
    '.....GGGGGG.....',
    '......GGGG......',
    '.......GG.......',
    '................',
    '................',
  ],
  timbiriche: [
    '................',
    '................',
    '..WKKKKWCCCCW...',
    '..KDDDDK....C...',
    '..KDKKDK....C...',
    '..KDKKDK....C...',
    '..KDDDDK....C...',
    '..WKKKKW....W...',
    '..C.........K...',
    '..C.........K...',
    '..C.........K...',
    '..C.........K...',
    '..WCCCCW....W...',
    '................',
    '................',
    '................',
  ],
  michi: [
    '.....P....P.....',
    '.K.K.P....P.CCC.',
    '..K..P....P.C.C.',
    '.K.K.P....P.CCC.',
    '.....P....P.....',
    'PPPPPPPPPPPPPPPP',
    '.....P.CC.P.....',
    '.....PC..CP.....',
    '.....PC..CP.....',
    '.....P.CC.P.....',
    'PPPPPPPPPPPPPPPP',
    '.....P....P.....',
    '.....P....P.K.K.',
    '.....P....P..K..',
    '.....P....P.K.K.',
    '.....P....P.....',
  ],
  conecta4: [
    '................',
    '................',
    '.DDDDDDDDDDDDDD.',
    '.DNNDNNDNNDKKDD.',
    '.DNNDNNDNNDKKDD.',
    '.DDDDDDDDDDDDDD.',
    '.DDDDDDDDDDDDDD.',
    '.DNNDKKDCCDCCDD.',
    '.DNNDKKDCCDCCDD.',
    '.DDDDDDDDDDDDDD.',
    '.DDDDDDDDDDDDDD.',
    '.DCCDKKDKKDCCDD.',
    '.DCCDKKDKKDCCDD.',
    '.DDDDDDDDDDDDDD.',
    '.DD..........DD.',
    '................',
  ],
  memoria: [
    '................',
    '.PPPPPPP........',
    '.PDDDDDP........',
    '.PDGGGDP........',
    '.PDGDGDPWWWWWWW.',
    '.PDGGGDPWLLLLLW.',
    '.PDDDDDPWLKLKLW.',
    '.PDDDDDPWLKKKLW.',
    '.PPPPPPPWLLKLLW.',
    '........WLLLLLW.',
    '........WLLLLLW.',
    '........WWWWWWW.',
    '................',
    '................',
    '................',
    '................',
  ],

  // ── Íconos (8×8) ──
  star: ['...GG...', '...GG...', 'GGGGGGGG', '.GGGGGG.', '..GGGG..', '.GGGGGG.', '.GG..GG.', 'G......G'],
  heart: ['........', '.KK..KK.', 'KKKKKKKK', 'KWKKKKKK', 'KKKKKKKK', '.KKKKKK.', '..KKKK..', '...KK...'],
  flame: ['...O....', '...OO...', '..OOO.O.', '..OOGOO.', '.OOGGOO.', '.OGGGGO.', '.OGGGGO.', '..OOOO..'],
  drop: ['...B....', '...BB...', '..BBBB..', '.BBBBBB.', '.BWBBBB.', '.BWBBBB.', '.BBBBBB.', '..BBBB..'],
  bolt: ['....CCC.', '...CCC..', '..CCC...', '.CCCCCC.', '...CCC..', '..CCC...', '.CCC....', '.CC.....'],
  trophy: ['GGGGGGGG', 'G.GGGG.G', 'G.GGGG.G', '.GGGGGG.', '..GGGG..', '...GG...', '..GGGG..', '.GGGGGG.'],
  smile: ['..EEEE..', '.EEEEEE.', 'EENEENEE', 'EEEEEEEE', 'ENEEEENE', 'EENNNNEE', '.EEEEEE.', '..EEEE..'],
  clock: ['..WWWW..', '.W....W.', 'W...W..W', 'W...W..W', 'W...WW.W', 'W......W', '.W....W.', '..WWWW..'],
  pad: ['........', '.WWWWWW.', 'WW.WWWWW', 'W...W.WW', 'WW.WWW.W', 'WWWWWWWW', 'WW....WW', '........'],
  online: ['..CCCC..', '.C....C.', 'C..CC..C', '..C..C..', '...CC...', '........', '...CC...', '...CC...'],
  flag: ['.R......', '.RRRR...', '.RRRRRR.', '.RRRR...', '.R......', '.R......', '.R......', '.R......'],
  live: ['........', '..EEEE..', '.EEEEEE.', '.EEEEEE.', '.EEEEEE.', '.EEEEEE.', '..EEEE..', '........'],
  wait: ['........', '..GGGG..', '.GGGGGG.', '.GGGGGG.', '.GGGGGG.', '.GGGGGG.', '..GGGG..', '........'],

  // ── Cristales del juego "Cristales" (8×8): forma + color distintos ──
  gemDiamond: ['...PP...', '..PWPP..', '.PWPPPP.', 'PPPPPPPP', '.PPPPPP.', '..PPPP..', '...PP...', '........'],
  gemHeart: ['........', '.KK..KK.', 'KWKKKKKK', 'KKKKKKKK', 'KKKKKKKK', '.KKKKKK.', '..KKKK..', '...KK...'],
  gemStar: ['...GG...', '...GG...', 'GGGWGGGG', '.GGGGGG.', '..GGGG..', '.GGGGGG.', '.GG..GG.', 'G......G'],
  gemSquare: ['........', '.CCCCCC.', '.CWCCCC.', '.CWCCCC.', '.CCCCCC.', '.CCCCCC.', '.CCCCCC.', '........'],
  gemCircle: ['..OOOO..', '.OWOOOO.', 'OWOOOOOO', 'OOOOOOOO', 'OOOOOOOO', 'OOOOOOOO', '.OOOOOO.', '..OOOO..'],
  gemTriangle: ['...EE...', '...EE...', '..EWEE..', '..EEEE..', '.EEEEEE.', '.EEEEEE.', 'EEEEEEEE', '........'],

  // ── Marcas del michi (7×7) ──
  markX: ['KK...KK', 'KKK.KKK', '.KKKKK.', '..KKK..', '.KKKKK.', 'KKK.KKK', 'KK...KK'],
  markO: ['..CCC..', '.CCCCC.', 'CC...CC', 'CC...CC', 'CC...CC', '.CCCCC.', '..CCC..'],
}

// Las reacciones viajan con un código fijo (lista permitida del servidor) y se dibujan en pixel.
export const REACTION_SPRITES = { '👏': 'star', '💜': 'heart', '🔥': 'flame', '😮': 'bolt', '💪': 'trophy', '🤝': 'smile' }

/** Dibuja un sprite en un canvas 2D (para Chispa y Gota). */
export function drawSprite(ctx, name, x, y, scale = 2) {
  const rows = SPRITES[name]
  if (!rows) return
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const color = PALETTE[row[rx]]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale)
    }
  })
}
