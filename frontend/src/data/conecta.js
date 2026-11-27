// Catálogos de HEROW Conecta (red de mentoras). Copia de server/src/data/conecta.js:
// una prueba (npm run test:conecta --prefix server) verifica que coincidan.

// Regiones del Perú: sirven para encontrar eventos presenciales cerca.
export const REGIONS = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco',
  'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto',
  'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
]

/** Dónde guarda la mentora su código de acceso en su dispositivo. */
export const MENTOR_CODE_KEY = 'herow:mentor-code'

export const EVENT_KINDS = ['charla', 'taller', 'visita', 'feria', 'mentoria_grupal']
export const MODALITIES = ['virtual', 'presencial', 'hibrido']

export const KIND_LABEL = {
  charla: { emoji: '🎤', label: 'Charla' },
  taller: { emoji: '🛠️', label: 'Taller' },
  visita: { emoji: '🏢', label: 'Visita guiada' },
  feria: { emoji: '🎪', label: 'Feria' },
  mentoria_grupal: { emoji: '👥', label: 'Mentoría grupal' },
}

export const MODALITY_LABEL = {
  virtual: '💻 Virtual',
  presencial: '📍 Presencial',
  hibrido: '🔀 Híbrido',
}

/** "sáb 6 dic · 4:00 p. m." en hora de Perú. */
export function formatEventDate(iso) {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    })
  } catch {
    return iso
  }
}
