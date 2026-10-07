// Tipos de TFM que puede indicar el alumno (columna alumnos.tipo_tfm, ver
// migración 0004). Es opcional: null = "sin indicar".
export const TIPOS_TFM = [
  {
    id: "investigacion",
    nombre: "Investigación",
    descripcion: "Recoges y analizas datos propios para responder una pregunta (estudio descriptivo, analítico, cualitativo…).",
  },
  {
    id: "proyecto",
    nombre: "Proyecto de intervención",
    descripcion: "Diseñas una intervención (programa de educación para la salud, protocolo de cuidados…) para dar respuesta a una necesidad detectada.",
  },
  {
    id: "revision",
    nombre: "Revisión bibliográfica",
    descripcion: "Buscas, seleccionas y sintetizas la evidencia publicada sobre una pregunta.",
  },
  {
    id: "gestion",
    nombre: "Proyecto de gestión",
    descripcion: "Analizas un servicio, unidad o área (situación, procesos, DAFO) y propones un plan de mejora con responsables, plazos e indicadores.",
  },
];

export function nombreTipoTfm(id) {
  return TIPOS_TFM.find((t) => t.id === id)?.nombre ?? null;
}
