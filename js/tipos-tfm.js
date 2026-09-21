// Tipos de TFM: no configurables desde administración (decisión explícita).
// El id de cada tipo coincide con el valor permitido por el CHECK de
// alumnos.tipo_tfm (migración 0004). Contenido porteado tal cual de
// TIPOS_DEFECTO en el prototipo tutor-tfm.jsx.
//
// adaptaciones[faseId].explicacion: texto adicional que ve el alumno bajo la
// explicación general de esa fase («En tu TFM · [tipo]»).
// adaptaciones[faseId].instrucciones[tareaSlug]: sustituye el enunciado
// general de esa tarea concreta.
export const TIPOS_TFM = [
  {
    id: "investigacion",
    nombre: "Investigación empírica",
    descripcion: "Estudio observacional, experimental o cualitativo que se ejecuta: con recogida y análisis de datos reales.",
    adaptaciones: {},
  },
  {
    id: "protocolo-investigacion",
    nombre: "Protocolo de investigación",
    descripcion: "Diseño completo de un estudio de investigación que no se llega a ejecutar (o solo como piloto).",
    adaptaciones: {
      pregunta: {
        explicacion:
          "Un protocolo de investigación es el diseño completo de un estudio que no llegarás a ejecutar dentro del TFM (como mucho, un pilotaje). Por eso la pregunta sí sigue el formato PICO (o PECO si estudias una exposición) y debe poder contestarse con el diseño que propongas y con recursos realistas. No lo confundas con un protocolo asistencial, que estandariza una actuación clínica.",
        instrucciones: {
          preguntaInv:
            "Formula tu pregunta en una sola frase, en formato PICO/PECO. Indica debajo los componentes (Población, Intervención/exposición, Comparación, Outcome).",
        },
      },
      introduccion: {
        explicacion:
          "La introducción es igual que en cualquier investigación: del problema general a la laguna de conocimiento que tu estudio vendría a cubrir. Aporta además argumentos de factibilidad: que en tu entorno existen la población, los datos o los recursos necesarios.",
      },
      objetivos: {
        explicacion:
          "Los objetivos son los del estudio que propones, no los del TFM: «diseñar un protocolo» no es un objetivo válido, sino lo que el estudio pretende averiguar (por ejemplo, «determinar la incidencia de…», «evaluar la efectividad de…»). Si el diseño es analítico o experimental, formula también la hipótesis.",
      },
      metodologia: {
        explicacion:
          "Es el núcleo del trabajo y debe ser lo bastante detallada para que otro investigador pudiera ejecutar el estudio: diseño; ámbito y periodo; población, criterios de inclusión y exclusión; cálculo del tamaño muestral con sus parámetros y tipo de muestreo; variables con su definición operativa (idealmente en tabla); instrumentos de medida y su validación; procedimiento de recogida de datos; plan de análisis estadístico por objetivo; aspectos éticos (comité de ética de la investigación, consentimiento informado, protección de datos); cronograma; recursos y presupuesto; y limitaciones previstas. Sigue la guía de referencia de tu diseño (SPIRIT para ensayos, STROBE para observacionales).",
      },
      resultados: {
        explicacion:
          "Como el estudio no se ejecuta, no hay resultados reales. Consulta las normas de tu máster; habitualmente este apartado se sustituye por: resultados esperados, tablas ficticias (vacías) que muestran cómo se presentarán los datos de cada objetivo, y plan de difusión. Nunca inventes datos.",
      },
      discusion: {
        explicacion:
          "En un protocolo, la discusión suele centrarse en: limitaciones y sesgos previstos del diseño y cómo se minimizarán, aplicabilidad e impacto esperado en la práctica clínica, y comparación del diseño con estudios similares publicados.",
      },
      conclusiones: {
        explicacion:
          "No hay conclusiones de resultados. Según tu máster, se sustituyen por consideraciones finales: qué aportaría el estudio, su factibilidad y los próximos pasos para ejecutarlo.",
      },
    },
  },
  {
    id: "proyecto",
    nombre: "Proyecto de intervención",
    descripcion: "Diseño de una intervención (educativa, asistencial, organizativa) para una necesidad detectada.",
    adaptaciones: {},
  },
  {
    id: "revision",
    nombre: "Revisión bibliográfica",
    descripcion: "Revisión sistemática, de alcance o narrativa de la evidencia sobre una pregunta concreta.",
    adaptaciones: {},
  },
  {
    id: "riesgos",
    nombre: "Mapa de riesgos",
    descripcion: "Identificación, análisis y priorización de los riesgos de un proceso asistencial (AMFE, matriz de riesgos).",
    adaptaciones: {
      pregunta: {
        explicacion:
          "En un mapa de riesgos no se usa el formato PICO. Tu punto de partida es un proceso asistencial concreto (por ejemplo, la administración de medicación en una unidad de hospitalización) y la pregunta es qué riesgos tiene, cuáles son más graves o probables y qué medidas los reducirían. Delimita bien el alcance: dónde empieza y termina el proceso, en qué unidad y en qué periodo.",
        instrucciones: {
          preguntaInv:
            "Formula tu pregunta en una frase e indica debajo: el proceso analizado, dónde empieza y termina, la unidad o servicio, y por qué has elegido ese proceso (incidentes notificados, alto riesgo, cambios recientes…).",
        },
      },
      introduccion: {
        explicacion:
          "La introducción debe justificar por qué analizar este proceso: magnitud de los eventos adversos asociados según la literatura y, si existen, datos locales (notificaciones, indicadores); el marco de la gestión de riesgos (norma UNE 179003, ISO 31000, estrategias de seguridad del paciente); y antecedentes de mapas de riesgos o AMFE en procesos similares.",
      },
      objetivos: {
        explicacion:
          "Los objetivos siguen la lógica de la gestión de riesgos: describir el proceso, identificar los riesgos o modos de fallo, evaluarlos y priorizarlos, y proponer medidas de mejora. No se plantean hipótesis estadísticas.",
      },
      metodologia: {
        explicacion:
          "Describe: diseño (análisis prospectivo de riesgos), ámbito y periodo; composición del equipo multidisciplinar; descripción del proceso con diagrama de flujo; técnica de identificación de riesgos (tormenta de ideas, grupo nominal, Delphi, revisión de notificaciones o historias); herramienta de análisis (AMFE con número de prioridad de riesgo, o matriz probabilidad-impacto); definición de las escalas de puntuación; umbral de priorización; y método para proponer medidas.",
      },
      resultados: {
        explicacion:
          "Los resultados son el propio mapa: diagrama de flujo, tabla de riesgos o modos de fallo con causas, efectos y puntuaciones, matriz o mapa de calor y listado priorizado. Incluye las medidas propuestas para los riesgos prioritarios, con responsable e indicador de seguimiento.",
      },
      discusion: {
        explicacion:
          "Compara tus riesgos prioritarios con los de otros mapas o AMFE publicados en procesos similares, analiza la factibilidad de las medidas y el riesgo residual esperado, y reconoce limitaciones: subjetividad de las puntuaciones, composición del equipo, ausencia de validación prospectiva.",
      },
    },
  },
  {
    id: "protocolo",
    nombre: "Protocolo asistencial",
    descripcion: "Elaboración de un protocolo clínico o de cuidados basado en la evidencia para estandarizar una actuación.",
    adaptaciones: {
      pregunta: {
        explicacion:
          "Un protocolo nace de un problema asistencial: variabilidad en la práctica, ausencia de pauta escrita, resultados mejorables o nueva evidencia. Tu pregunta debe concretar qué situación clínica, en qué pacientes y en qué ámbito quieres estandarizar, y qué quieres mejorar con ello. Ojo: si lo que quieres es diseñar un estudio que no llegarás a ejecutar, eso es un protocolo de investigación, no asistencial.",
        instrucciones: {
          preguntaInv:
            "Formula en una frase la necesidad que justifica el protocolo. Indica debajo: situación clínica, población diana, ámbito de aplicación, profesionales que lo usarán y problema que quieres resolver.",
        },
      },
      introduccion: {
        explicacion:
          "Justifica la necesidad: magnitud del problema clínico, evidencia sobre su manejo, guías de práctica clínica existentes y por qué no bastan o deben adaptarse al contexto local, y datos de variabilidad o resultados en tu centro si los tienes.",
      },
      objetivos: {
        explicacion:
          "El objetivo general es elaborar (y, si procede, validar) el protocolo. Los específicos suelen incluir revisar la evidencia, formular recomendaciones, diseñar el algoritmo de actuación y definir indicadores para evaluar su implantación.",
      },
      metodologia: {
        explicacion:
          "Describe cómo se elabora: grupo elaborador multidisciplinar; búsqueda y selección de evidencia (bases de datos, guías, criterios); evaluación de la calidad y graduación de las recomendaciones (por ejemplo, GRADE, y AGREE II para las guías de referencia); método de consenso si lo hay; revisión externa o validación por expertos; y plan de difusión, implantación y actualización.",
      },
      resultados: {
        explicacion:
          "Aquí va el protocolo en sí: definiciones, población, recomendaciones con su nivel de evidencia, algoritmo de actuación, responsabilidades de cada profesional, registros, e indicadores de proceso y resultado con su fórmula y estándar.",
      },
      discusion: {
        explicacion:
          "Compara tu protocolo con guías y protocolos de otros centros, discute barreras y facilitadores de la implantación y los recursos necesarios, y reconoce limitaciones (calidad de la evidencia, ausencia de validación en la práctica).",
      },
    },
  },
  {
    id: "acr",
    nombre: "Análisis causa-raíz",
    descripcion: "Análisis sistémico de un evento adverso o incidente para identificar sus causas y proponer acciones.",
    adaptaciones: {
      pregunta: {
        explicacion:
          "Un análisis causa-raíz (ACR) parte de un evento adverso o incidente ya ocurrido (o de un conjunto de incidentes similares). La pregunta no es qué pasó, sino por qué pasó: qué factores del sistema contribuyeron y qué acciones evitarían que se repita. Anonimiza siempre el caso: nunca incluyas datos que identifiquen al paciente ni a los profesionales.",
        instrucciones: {
          preguntaInv:
            "Describe el evento de forma general y anonimizada (tipo de incidente, ámbito, consecuencias) y formula en una frase la pregunta que guiará el análisis.",
        },
      },
      introduccion: {
        explicacion:
          "Justifica el análisis: frecuencia e impacto de ese tipo de evento según la literatura, el enfoque sistémico del error y la cultura justa, y el papel del ACR en la gestión de eventos adversos y el aprendizaje organizacional.",
      },
      objetivos: {
        explicacion:
          "Objetivo general: analizar el evento para identificar sus causas raíz y factores contribuyentes y proponer acciones. Específicos habituales: reconstruir la cronología, identificar fallos activos y condiciones latentes, clasificar los factores contribuyentes, proponer acciones y definir su seguimiento.",
      },
      metodologia: {
        explicacion:
          "Describe: marco de análisis (Protocolo de Londres, RCA² u otro); equipo de análisis y su independencia respecto al evento; fuentes de información (historia clínica, entrevistas, protocolos, visita al lugar); reconstrucción cronológica; herramientas (diagrama de Ishikawa, cinco porqués, árbol de causas); clasificación de factores contribuyentes; criterio de priorización de acciones según su jerarquía de efectividad; y consideraciones éticas y de confidencialidad.",
      },
      resultados: {
        explicacion:
          "Presenta la cronología del evento, los fallos activos, los factores contribuyentes clasificados (paciente, tarea, individuo, equipo, entorno, organización), las causas raíz y el plan de acción: cada acción ligada a una causa, con su nivel de efectividad (fuerte, intermedia, débil), responsable, plazo e indicador.",
      },
      discusion: {
        explicacion:
          "Compara las causas encontradas con las descritas para ese tipo de evento en la literatura, valora la solidez de las acciones propuestas y reconoce limitaciones: sesgo retrospectivo y de resultado, información incompleta y dificultad de generalizar desde un caso.",
      },
    },
  },
];

export function tipoDe(tipoId) {
  return TIPOS_TFM.find((t) => t.id === tipoId) || null;
}

export function adaptacionDe(tipoId, faseId) {
  const tipo = tipoDe(tipoId);
  return (tipo && tipo.adaptaciones[faseId]) || null;
}

export function instruccionDe(tipoId, faseId, tareaSlug, instruccionGeneral) {
  const a = adaptacionDe(tipoId, faseId);
  const especifica = a && a.instrucciones && a.instrucciones[tareaSlug];
  return especifica && especifica.trim() ? especifica : instruccionGeneral;
}
