// Las 3 preguntas de YessenIA en El Despertar. Cada opción suma un voto a un portal.

export const QUESTIONS = [
  {
    text: 'El internet del colegio se cayó y tu equipo tiene que entregar un trabajo urgente. ¿Qué haces?',
    options: [
      { portal: 'code', text: 'Comparto datos del celular y armo un sistema para que todos suban sus partes' },
      { portal: 'design', text: 'Diseño la presentación tan clara que se entienda aunque no haya internet' },
      { portal: 'robotics', text: 'Reviso el router y los cables hasta encontrar la falla' },
      { portal: 'science', text: 'Investigo por qué se cayó y pruebo hipótesis una por una' },
    ],
  },
  {
    text: 'En la feria de ciencias te dan libertad total. ¿Qué presentas?',
    options: [
      { portal: 'code', text: 'Una app que responde las dudas de mis compañeras' },
      { portal: 'design', text: 'Un invento tan bonito y fácil de usar que todos lo quieren' },
      { portal: 'robotics', text: 'Un robot que se mueve solo y esquiva obstáculos' },
      { portal: 'science', text: 'Un experimento con un resultado que nadie esperaba' },
    ],
  },
  {
    text: 'Es domingo y tienes una hora libre. ¿Qué video ves completo sin aburrirte?',
    options: [
      { portal: 'code', text: 'Cómo una IA aprendió a jugar videojuegos sola' },
      { portal: 'design', text: 'Cómo se diseñó a tu personaje favorito de videojuego' },
      { portal: 'robotics', text: 'El lanzamiento de un cohete, en vivo' },
      { portal: 'science', text: 'Qué pasa dentro de una célula cuando te enfermas' },
    ],
  },
]

/** answers: array de portal ids. En empate gana el que se eligió más recientemente. */
export function portalFromAnswers(answers) {
  const votes = {}
  answers.forEach((portal, i) => {
    votes[portal] = (votes[portal] ?? 0) + 1 + i * 0.01
  })
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0]
}
