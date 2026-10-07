// Tipos de TFM que puede indicar el alumno (columna alumnos.tipo_tfm, ver
// migración 0004). Es opcional: null = "sin indicar".
//
// Cada tipo usa uno de los itinerarios de fases (columna
// fases_config.itinerario, migración 0005): la memoria de gestión tiene sus
// propias fases (las de la plantilla de la memoria de jefatura); el resto
// comparte el itinerario académico de 8 fases.
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
    nombre: "Memoria de gestión (candidatura a jefatura)",
    descripcion: "Memoria para optar a la jefatura de un servicio, sección o unidad (p. ej. Máster en Dirección y Gestión Sanitaria): marco del sistema sanitario, análisis estratégico, DAFO/CAME, plan de actuación, cuadro de mando y currículum. Tiene su propio itinerario de fases.",
  },
];

export function nombreTipoTfm(id) {
  return TIPOS_TFM.find((t) => t.id === id)?.nombre ?? null;
}

export function itinerarioDeTipo(tipo) {
  return tipo === "gestion" ? "gestion" : "academico";
}
