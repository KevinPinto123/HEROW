// ============================================================
//  EL EQUIPO DETRÁS DE HEROW
//  Las fotos viven en frontend/public/assets/nosotros/
//  Para añadir el LinkedIn de alguien, llena su campo `linkedin`.
//  Si queda vacío, la tarjeta simplemente no muestra el enlace.
// ============================================================

const N = '/assets/nosotros'

export const PREMIO = {
  puesto: '1er puesto',
  categoria: 'Categoría Universidades',
  evento: 'IDEATECH AI Innovation Challenge',
  anio: '2026',
}

export const EQUIPO = [
  {
    id: 'alexandra',
    nombre: 'Alexandra Peralta Gil',
    rol: 'Full Stack · Producto y UX',
    detalle: 'Ingeniería de Sistemas en la UNI (Top 5%)',
    foto: `${N}/alexandra-peralta.webp`,
    linkedin: '',
  },
  {
    id: 'camila',
    nombre: 'Camila Galván Salvador',
    rol: 'Producto e impacto social',
    detalle: '1er premio global en la Huawei ICT Competition · PUCP',
    foto: `${N}/camila-galvan.webp`,
    linkedin: '',
  },
  {
    id: 'laura',
    nombre: 'Laura Valentina Rodríguez Oré',
    rol: 'Desarrollo y proyectos con IA',
    detalle: 'Salesforce Developer Jr. en NTT Data · UNMSM',
    foto: `${N}/laura-rodriguez.webp`,
    linkedin: '',
  },
  {
    id: 'kevin',
    nombre: 'Kevin Eduardo Pinto Acevedo',
    rol: 'Full-Stack · IA y Cloud',
    detalle: 'Ingeniería de Telecomunicaciones en la UNI',
    foto: `${N}/kevin-pinto.webp`,
    linkedin: '',
  },
]
