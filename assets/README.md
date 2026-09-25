# Imágenes del juego

## Flujo

1. Genera la imagen en ChatGPT y descárgala en **PNG** (nunca JPG).
2. Ponla en `assets/raw/<categoría>/` con el **nombre exacto** de la tabla.
3. Desde la raíz del proyecto ejecuta `npm run assets`.
4. La versión pixelada queda en `frontend/public/assets/<categoría>/` y el juego la usa sola.

Los originales de `assets/raw/` no se suben a git (pesan mucho); los procesados sí.
Si una imagen ya viene perfecta y no quieres procesarla, ponla directo en `frontend/public/assets/<categoría>/`.

## Qué va en cada carpeta

### `raw/backgrounds/` → horizontal 1536×1024 (resultado: 384×256 pixel, escalado x4)

| Archivo | Escena |
|---|---|
| `bg_title.png` | Portada: Lima futurista con portal chakana |
| `bg_awakening.png` | Cámara inca-laboratorio de YessenIA |
| `bg_hub.png` | Plaza flotante con los portales |
| `bg_map.png` | Mapa del Perú visto desde arriba |
| `bg_arena_code.png` | Arena del portal Código y Datos |
| `bg_arena_design.png` | Arena del portal Diseño e Invención |
| `bg_arena_robotics.png` | Arena del portal Robótica y Espacio |
| `bg_arena_science.png` | Arena del portal Ciencia |
| `bg_boss.png` | Cueva del NoPuedo |
| `bg_victory.png` | Amanecer en Machu Picchu futurista |

### `raw/heroines/` → cuadrado 1024×1024, fondo transparente o verde #00FF00 (resultado: 64×96)

`hero_<id>.png`, con estos id:

| Portal | id |
|---|---|
| 💻 Código y Datos | `lovelace`, `hopper`, `johnson`, `costa` |
| 🚀 Robótica y Espacio | `hamilton`, `tereshkova`, `jemison`, `ochoa`, `quispe` |
| 🎨 Diseño e Invención | `lamarr`, `reiche`, `hadid` |
| 🔬 Ciencia | `curie`, `franklin`, `shady` |

Ejemplo: `hero_curie.png`.

### `raw/portraits/` → retrato de busto, mismo fondo (resultado: 64×64)

`hero_<id>_portrait.png`. Ejemplo: `hero_curie_portrait.png`. Opcional.

### `raw/sprites/` → mismo fondo (resultado: 128×128)

| Archivo | Qué es |
|---|---|
| `yessenia.png` | Orbe guía YessenIA |
| `nopuedo.png` | Jefe NoPuedo |
| `nopuedo_hurt.png` | Jefe NoPuedo derrotándose |

### Audio (sin procesar) → directo en `frontend/public/assets/audio/`

`music/title.mp3`, `music/hub.mp3`, `music/combat.mp3`, `music/boss.mp3`, `music/victory.mp3`.
Los efectos de sonido se generan por código. Todo es opcional.

Las rutas que usa el juego están en `frontend/src/data/assets.js`.
