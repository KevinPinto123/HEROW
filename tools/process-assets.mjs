// Convierte las imágenes de ChatGPT (assets/raw/...) en pixel art real y limpio
// y las deja en frontend/public/assets/... listas para el juego.
//
//   npm run assets            procesa todo
//   npm run assets heroines   solo una categoría
//
// Qué hace:
//  1. Quita el fondo verde #00FF00 (si la imagen no vino transparente).
//  2. Recorta el espacio vacío alrededor del personaje.
//  3. Reduce a la resolución pixel real (p. ej. 64x96) → píxeles alineados, sin blur.
//  4. Limita la paleta de colores y vuelve a escalar x4 con "vecino más cercano".

import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RAW = join(ROOT, 'assets', 'raw')
const OUT = join(ROOT, 'frontend', 'public', 'assets')
const SCALE = 4

// width x height = resolución pixel "real" antes de escalar x4.
// canvas: true = todas del mismo tamaño (alineadas abajo); false = caben dentro respetando su forma.
const CATEGORIES = {
  backgrounds: { width: 384, height: 256, colors: 64, sprite: false },
  heroines: { width: 128, height: 192, colors: 48, sprite: true, canvas: true },
  portraits: { width: 96, height: 96, colors: 48, sprite: true, canvas: true },
  sprites: { width: 256, height: 192, colors: 48, sprite: true, canvas: false },
}

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp'])

// ¿La imagen ya trae fondo transparente? (>5% de píxeles sin opacidad)
function hasOwnTransparency(data) {
  let clear = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] < 10) clear++
  return clear / (data.length / 4) > 0.05
}

// Pinta transparente todo lo que sea verde croma.
// Solo se usa si la imagen no vino transparente, para no borrar efectos verdes del personaje.
function removeGreen(data) {
  if (hasOwnTransparency(data)) return data
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    if (g > 140 && g > r * 1.4 && g > b * 1.4) data[i + 3] = 0
  }
  return data
}

// Alpha binario: el pixel art no lleva bordes semitransparentes.
function hardAlpha(data) {
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] < 128 ? 0 : 255
  return data
}

async function processSprite(file, { width, height, colors, canvas }) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  // Alpha duro antes de recortar, para que los brillos tenues no cuenten como parte del personaje.
  const keyed = hardAlpha(removeGreen(data))

  const trimmed = await sharp(keyed, { raw: info })
    .trim({ threshold: 1 })
    .png()
    .toBuffer()
    .catch(() => sharp(keyed, { raw: info }).png().toBuffer()) // imagen vacía: sin recorte

  const small = await sharp(trimmed)
    .resize(width, height, {
      fit: canvas ? 'contain' : 'inside',
      position: 'bottom',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = hardAlpha(small.data)
  const quantized = await sharp(pixels, { raw: small.info })
    .png({ palette: true, colors, dither: 0 })
    .toBuffer()

  const { width: w, height: h } = small.info
  return sharp(quantized).resize(w * SCALE, h * SCALE, { kernel: 'nearest' }).png({ compressionLevel: 9 })
}

async function processBackground(file, { width, height, colors }) {
  const quantized = await sharp(file)
    .resize(width, height, { fit: 'cover', kernel: 'lanczos3' })
    .removeAlpha()
    .png({ palette: true, colors, dither: 0 })
    .toBuffer()
  return sharp(quantized).resize(width * SCALE, height * SCALE, { kernel: 'nearest' }).png({ compressionLevel: 9 })
}

async function run() {
  const only = process.argv[2]
  if (only && !CATEGORIES[only]) {
    console.error(`Categoría desconocida: ${only}. Usa: ${Object.keys(CATEGORIES).join(', ')}`)
    process.exit(1)
  }

  let done = 0
  let failed = 0
  for (const [category, options] of Object.entries(CATEGORIES)) {
    if (only && only !== category) continue
    const inDir = join(RAW, category)
    const outDir = join(OUT, category)
    if (!existsSync(inDir)) continue
    mkdirSync(outDir, { recursive: true })

    const files = readdirSync(inDir).filter(f => IMAGE_EXT.has(extname(f).toLowerCase()))
    for (const name of files) {
      const outName = `${basename(name, extname(name))}.png`
      try {
        const pipeline = options.sprite
          ? await processSprite(join(inDir, name), options)
          : await processBackground(join(inDir, name), options)
        await pipeline.toFile(join(outDir, outName))
        console.log(`  ✅ ${category}/${outName}`)
        done++
      } catch (err) {
        console.error(`  ❌ ${category}/${name}: ${err.message}`)
        failed++
      }
    }
  }

  console.log(done || failed ? `\n${done} procesadas, ${failed} con error.` : 'No hay imágenes en assets/raw/.')
  if (failed) process.exit(1)
}

run()
