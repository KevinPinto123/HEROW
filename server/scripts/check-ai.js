// Verifica que la IA responda JSON válido para las 3 tareas del agente:
// revisar misiones, generar preguntas y analizar oportunidades.
//   npm run check:ai
import { z } from 'zod'
import { MISSIONS } from '../src/data/game.js'
import { aiAvailable, generateJSON } from '../src/services/ai.js'

if (!aiAvailable()) {
  console.error('❌ No hay GEMINI_API_KEY ni OPENAI_API_KEY en server/.env')
  process.exit(1)
}

const review = z.object({
  approved: z.boolean(),
  score: z.number().int().min(0).max(100),
  feedback: z.string(),
  personal_data_found: z.boolean().default(false),
})
const rubric = MISSIONS.perfil.rubric.join('\n- ')
const samples = {
  bueno:
    'Titular: Estudiante de 5to de secundaria · Futura ingeniera de robótica\n' +
    'Sobre mí: Me apasiona construir cosas que se mueven. Este año armé un robot seguidor de línea con Arduino ' +
    'en el club de ciencias y aprendí a leer sensores y ajustar la velocidad en las curvas. Quiero estudiar mecatrónica.\n' +
    'Habilidades: Arduino básico, Python básico, trabajo en equipo\n' +
    'Heroína: Margaret Hamilton, porque su software llevó al Apolo a la Luna.\n' +
    'Meta: Terminar un curso gratuito de Python y presentar un robot en la feria escolar de noviembre.',
  'con datos personales':
    'Titular: hola\nSobre mí: soy buena. mi celular es 987654321 y vivo en Av. Los Pinos 123\n' +
    'Habilidades: todo\nHeroína: no sé\nMeta: ser rica',
}

let failed = false
for (const [name, text] of Object.entries(samples)) {
  const t = Date.now()
  try {
    const r = await generateJSON({
      system: 'Eres YessenIA, mentora de chicas en STEM. Si hay teléfono o dirección, personal_data_found=true.',
      prompt: `Rúbrica:\n- ${rubric}\nAprueba solo si score>=70. Formato: {"approved","score","feedback","personal_data_found"}\n\nTRABAJO:\n${text}`,
      schema: review,
    })
    console.log(`✅ Misión (${name}): aprobado=${r.approved} · puntaje=${r.score} · datos personales=${r.personal_data_found} · ${Date.now() - t} ms`)
    console.log(`   "${r.feedback.slice(0, 150)}"`)
  } catch (err) {
    failed = true
    console.error(`❌ Misión (${name}): ${err.message}`)
  }
}

try {
  const q = await generateJSON({
    system: 'Docente STEM para chicas de 15 a 17 años.',
    prompt: 'Crea 2 preguntas difíciles de Robótica y Espacio. Formato {"questions":[{"type":"elegir|ordenar|error|decidir","text","options":[4 opciones],"answer":0-3,"explain"}]}',
    schema: z.object({
      questions: z.array(z.object({
        type: z.enum(['elegir', 'ordenar', 'error', 'decidir']),
        text: z.string(),
        options: z.array(z.string()).length(4),
        answer: z.number().int().min(0).max(3),
        explain: z.string(),
      })).min(1),
    }),
  })
  console.log('✅ Preguntas generadas:')
  for (const x of q.questions) console.log(`   [${x.type}] ${x.text.slice(0, 80)} → ${x.options[x.answer]}`)
} catch (err) {
  failed = true
  console.error(`❌ Preguntas: ${err.message}`)
}

process.exit(failed ? 1 : 0)
