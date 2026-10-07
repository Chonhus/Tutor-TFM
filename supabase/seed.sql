-- Contenido inicial del itinerario: portado literal de FASES_DEFECTO e
-- INSTRUCCIONES_IA_DEFECTO del prototipo tutor-tfm.jsx (§8 de las
-- especificaciones: "reutilizarlos tal cual como contenido inicial").
-- Editable después desde el panel de administración.

-- ============================================================
-- Fase 1: Tema y pregunta de investigación
-- ============================================================
insert into public.fases_config (id, orden, titulo, explicacion) values (
  'pregunta', 1, 'Tema y pregunta de investigación',
$$Todo TFM nace de una pregunta bien formulada: de ella saldrán después los objetivos y la introducción, no al revés. El primer paso es delimitar el tema: pasar de un área amplia («la diabetes», «los cuidados paliativos») a un aspecto concreto en una población y un contexto definidos. Una buena pregunta cumple los criterios FINER: Factible (con tus recursos y tiempo), Interesante, Novedosa, Ética y Relevante para la práctica. En investigación empírica y revisiones, la pregunta se estructura con el formato PICO: Población (¿en quién?), Intervención o exposición (¿qué se estudia?), Comparación (¿frente a qué, si procede?) y Outcome o resultado (¿qué se mide?). En un proyecto de intervención, la pregunta se transforma en la necesidad detectada: ¿qué problema tiene qué población y qué se propone para abordarlo? Dedica tiempo a esta fase: una pregunta precisa te ahorrará meses de trabajo desenfocado.$$
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'pregunta', 'tema', 1, 'Delimita tu tema',
$$Describe en 4-6 líneas: tu área de interés, qué aspecto concreto quieres abordar, en qué población o contexto, y por qué te interesa o qué problema detectas.$$,
  'tema', false
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'pregunta', 'preguntaInv', 2, 'Formula tu pregunta de investigación',
$$Escribe tu pregunta en una sola frase. Si tu TFM es de investigación o revisión, identifica debajo los componentes PICO (Población, Intervención/exposición, Comparación, Outcome). Si es un proyecto de intervención, indica la necesidad detectada y la población diana.$$,
  'pregunta', false
);

-- ============================================================
-- Fase 2: Introducción y justificación
-- ============================================================
insert into public.fases_config (id, orden, titulo, explicacion) values (
  'introduccion', 2, 'Introducción y justificación',
$$La introducción sitúa al lector en el tema y justifica por qué merece ser estudiado. En ciencias de la salud suele seguir un embudo: parte del contexto general (magnitud del problema, datos epidemiológicos), avanza hacia lo que ya se sabe (antecedentes y estado actual del conocimiento), identifica lo que no se sabe o no se resuelve bien (la laguna de conocimiento o necesidad asistencial) y desemboca en la justificación de tu trabajo. Cada afirmación debe apoyarse en una referencia bibliográfica actualizada, preferiblemente de los últimos 5-10 años. En un TFM de investigación, la introducción termina justificando la pregunta de investigación; en un proyecto de intervención, la necesidad de intervenir; en una revisión, la necesidad de sintetizar la evidencia disponible.$$
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'introduccion', 'esquema', 1, 'Propón tu estructura',
$$Escribe un esquema con los apartados o párrafos que tendrá tu introducción, de lo general a lo concreto, indicando en una línea qué contará cada uno.$$,
  'esquema', false
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'introduccion', 'redaccion', 2, 'Redacta la introducción',
$$Redacta la introducción siguiendo tu esquema corregido. Indica entre paréntesis la referencia que apoya cada afirmación (autor, año). Si aún no tienes alguna referencia, escribe (REF PENDIENTE).$$,
  'redaccion', true
);

-- ============================================================
-- Fase 3: Objetivos (e hipótesis)
-- ============================================================
insert into public.fases_config (id, orden, titulo, explicacion) values (
  'objetivos', 3, 'Objetivos (e hipótesis)',
$$Los objetivos concretan qué pretendes conseguir. Se formulan con un verbo en infinitivo (analizar, determinar, evaluar, diseñar…), deben ser específicos, medibles, alcanzables y coherentes con la pregunta de investigación o la necesidad detectada. Se distingue un objetivo general (uno solo, amplio, que resume la finalidad del trabajo) y varios objetivos específicos (habitualmente 2-4) que descomponen el general en pasos evaluables. En estudios analíticos se añade la hipótesis: una afirmación comprobable sobre la relación esperada entre variables. En proyectos de intervención los objetivos describen los resultados esperados de la intervención; en revisiones, qué aspecto de la evidencia se va a sintetizar.$$
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'objetivos', 'redaccion', 1, 'Redacta tus objetivos',
$$Escribe tu objetivo general y tus objetivos específicos (y la hipótesis, si tu diseño la requiere). Numéralos.$$,
  'objetivos', false
);

-- ============================================================
-- Fase 4: Metodología
-- ============================================================
insert into public.fases_config (id, orden, titulo, explicacion) values (
  'metodologia', 4, 'Metodología',
$$La metodología describe con detalle cómo vas a realizar el trabajo, de forma que otra persona pudiera reproducirlo. En un estudio de investigación incluye: diseño del estudio, ámbito y periodo, población y muestra (criterios de inclusión/exclusión, cálculo del tamaño muestral), variables, instrumentos de medida, procedimiento de recogida de datos, análisis estadístico previsto y consideraciones éticas (comité de ética, consentimiento informado, protección de datos). En un proyecto de intervención: población diana, cronograma, actividades, recursos y plan de evaluación. En una revisión: estrategia de búsqueda (bases de datos, descriptores, operadores booleanos), criterios de selección, diagrama de flujo y método de evaluación de la calidad de los estudios.$$
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'metodologia', 'esquema', 1, 'Propón tu esquema metodológico',
$$Enumera los subapartados que tendrá tu metodología según tu tipo de TFM, indicando brevemente qué incluirás en cada uno.$$,
  'esquema', false
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'metodologia', 'redaccion', 2, 'Redacta la metodología',
$$Redacta la metodología completa siguiendo tu esquema corregido. Justifica las decisiones metodológicas con referencias cuando proceda.$$,
  'redaccion', true
);

-- ============================================================
-- Fase 5: Resultados / Desarrollo
-- ============================================================
insert into public.fases_config (id, orden, titulo, explicacion) values (
  'resultados', 5, 'Resultados / Desarrollo',
$$En un estudio de investigación, los resultados presentan los hallazgos sin interpretarlos: primero la descripción de la muestra, después los resultados ordenados según los objetivos, apoyados en tablas y figuras que no dupliquen el texto. En un proyecto de intervención, este apartado desarrolla la intervención propuesta (sesiones, materiales, cronograma detallado) o los resultados esperados. En una revisión, presenta los estudios incluidos (diagrama de flujo PRISMA, tabla de características) y la síntesis de sus hallazgos. Escribe en pasado, con precisión numérica (valores, intervalos de confianza, valores p cuando proceda) y sin valorar todavía lo que significan los datos.$$
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'resultados', 'redaccion', 1, 'Redacta los resultados o el desarrollo',
$$Redacta este apartado según tu tipo de TFM. Describe también qué tablas o figuras incluirás y qué mostrará cada una.$$,
  'redaccion', true
);

-- ============================================================
-- Fase 6: Discusión
-- ============================================================
insert into public.fases_config (id, orden, titulo, explicacion) values (
  'discusion', 6, 'Discusión',
$$La discusión interpreta los resultados y los pone en diálogo con la literatura. Estructura habitual: resumen del hallazgo principal, comparación con estudios previos (¿coinciden?, ¿difieren?, ¿por qué?), explicación de los resultados, implicaciones para la práctica clínica o la gestión, limitaciones del trabajo (sesgos, tamaño muestral, generalización) y líneas futuras. Es el apartado más exigente intelectualmente: no repitas resultados, interprétalos. Cada comparación con otros trabajos requiere su referencia bibliográfica. Reconocer las limitaciones con honestidad da solidez al TFM, no se la quita.$$
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'discusion', 'redaccion', 1, 'Redacta la discusión',
$$Redacta la discusión contrastando tus resultados (o los esperados) con la bibliografía. Incluye un párrafo de limitaciones. Cita las referencias que uses en cada comparación.$$,
  'redaccion', true
);

-- ============================================================
-- Fase 7: Conclusiones
-- ============================================================
insert into public.fases_config (id, orden, titulo, explicacion) values (
  'conclusiones', 7, 'Conclusiones',
$$Las conclusiones responden directamente a los objetivos planteados: debe haber correspondencia entre cada objetivo y una conclusión. Son afirmaciones breves, concretas y derivadas exclusivamente de tus resultados, sin introducir ideas ni datos nuevos y sin citas bibliográficas. Evita conclusiones vagas del tipo «se necesita más investigación» como única aportación; si la incluyes, concreta qué habría que investigar y por qué.$$
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'conclusiones', 'redaccion', 1, 'Redacta las conclusiones',
$$Escribe una conclusión por cada objetivo específico, numeradas en el mismo orden que los objetivos.$$,
  'redaccion', false
);

-- ============================================================
-- Fase 8: Referencias bibliográficas
-- ============================================================
insert into public.fases_config (id, orden, titulo, explicacion) values (
  'referencias', 8, 'Referencias bibliográficas',
$$Las referencias acreditan las fuentes usadas y permiten localizarlas. En ciencias de la salud el estilo más habitual es Vancouver (numeración por orden de aparición), aunque algunas universidades usan APA. Comprueba las normas de tu centro. Toda cita del texto debe aparecer en la lista y viceversa. Prioriza fuentes primarias, revistas indexadas y documentos de organismos oficiales (OMS, ministerios, sociedades científicas), con antigüedad preferente menor de 10 años salvo obras de referencia. Un gestor bibliográfico (Zotero, Mendeley) te ahorrará errores.$$
);

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo) values (
  'referencias', 'redaccion', 1, 'Aporta tu lista de referencias',
$$Pega tu lista de referencias en el estilo que exige tu universidad (indica cuál es). La IA revisará el formato y la pertinencia, no inventará referencias.$$,
  'referencias', true
);

-- ============================================================
-- Instrucciones del tutor IA
-- ============================================================
update public.config set instrucciones_ia =
$$Eres un tutor académico de TFM en ciencias de la salud. Tu función es GUIAR, nunca hacer el trabajo por el alumno. Normas estrictas: (1) En el primer intento de una tarea, nunca redactes párrafos completos ni estructuras resueltas por el alumno: señala qué mejorar y por qué. A partir del segundo intento, si persiste el mismo problema, sí puedes incluir un ejemplo breve y concreto (una frase o un fragmento corto, nunca la tarea entera) que ilustre cómo abordarlo, dejando claro que es solo orientativo y que debe adaptarlo con su propio criterio. (2) Exige que cada afirmación relevante tenga su fuente: referencia bibliográfica para el marco teórico y la comparación con otros trabajos; en los datos propios de un centro, servicio o área (habituales en proyectos de gestión), acepta como fuente documentación interna, registros o entrevistas, siempre que se identifiquen. Cuando falte la fuente, pídela indicando el párrafo. Nunca inventes referencias ni se las proporciones. (3) Sé exigente pero proporcionado: si el alumno ya ha delimitado razonablemente población, contexto, variable o periodo (por ejemplo, un rango de edad, un servicio concreto, un año de estudio), da ese punto por resuelto y no vuelvas a pedir más concreción sobre él. Respeta también los límites de cada fase: no exijas en "Tema y pregunta de investigación" ni en "Introducción" detalles que corresponden a "Metodología" (instrumento de medida, modelo teórico concreto, plan de análisis) — eso se revisa cuando llegue esa fase. Prioriza los 2-3 aspectos que más importen, no acumules objeciones menores. (4) Usa un tono cercano y motivador pero exigente. (5) Estructura tu respuesta en: ✔ Puntos fuertes, ✎ Aspectos a mejorar (máximo 3 puntos), ➜ Próximo paso. (6) Sé conciso: toda tu respuesta no debe superar las 300 palabras. Responde siempre en español.$$
where id = true;
