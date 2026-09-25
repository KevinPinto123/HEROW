// Rutas de todas las imágenes y sonidos del juego (servidos desde frontend/public/assets).
// Si cambias un nombre de archivo, cámbialo solo aquí.

const A = '/assets'

export const BACKGROUNDS = {
  title: `${A}/backgrounds/bg_title.png`,
  awakening: `${A}/backgrounds/bg_awakening.png`,
  hub: `${A}/backgrounds/bg_hub.png`,
  dashboard: `${A}/backgrounds/bg_dashboard.png`,
  mission: `${A}/backgrounds/bg_mission.png`,
  map: `${A}/backgrounds/bg_map.png`,
  arena: {
    code: `${A}/backgrounds/bg_arena_code.png`,
    design: `${A}/backgrounds/bg_arena_design.png`,
    robotics: `${A}/backgrounds/bg_arena_robotics.png`,
    science: `${A}/backgrounds/bg_arena_science.png`,
  },
  boss: `${A}/backgrounds/bg_boss.png`,
  victory: `${A}/backgrounds/bg_victory.png`,
}

export const SPRITES = {
  yessenia: `${A}/sprites/yessenia.png`,
  nopuedo: `${A}/sprites/nopuedo.png`,
  nopuedoHurt: `${A}/sprites/nopuedo_hurt.png`,
}

export const heroineSprite = (id) => `${A}/heroines/hero_${id}.png`
export const heroinePortrait = (id) => `${A}/portraits/hero_${id}_portrait.png`

export const AUDIO = {
  music: {
    title: `${A}/audio/music/title.mp3`,
    hub: `${A}/audio/music/hub.mp3`,
    combat: `${A}/audio/music/combat.mp3`,
    boss: `${A}/audio/music/boss.mp3`,
    victory: `${A}/audio/music/victory.mp3`,
  },
}
