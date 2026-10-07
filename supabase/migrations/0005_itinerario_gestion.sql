-- Itinerario propio para la memoria de gestión (candidatura a una jefatura).
--
-- En el Máster en Dirección y Gestión Sanitaria el TFM individual no sigue
-- la estructura académica (introducción, objetivos, metodología,
-- resultados, discusión…) sino la de una memoria para optar a la jefatura
-- de un servicio, sección o unidad, con plantilla obligatoria: introducción
-- y propósito, marco del sistema sanitario, análisis estratégico (externo,
-- interno, DAFO/CAME), plan de actuación con cuadro de mando, currículum
-- del candidato y bibliografía. Las 8 fases académicas no le sirven, así
-- que cada fase pertenece ahora a un itinerario:
--   * 'academico': las 8 fases de siempre (investigación, proyecto de
--     intervención, revisión, o tipo sin indicar);
--   * 'gestion': las fases de la memoria de jefatura (alumnos con
--     tipo_tfm = 'gestion').
-- Todas las fases existentes quedan en 'academico' por el default.
--
-- El contenido es editable después desde el panel de administración, como
-- el resto del itinerario. Se puede ejecutar más de una vez sin duplicar.

alter table public.fases_config
  add column if not exists itinerario text not null default 'academico'
  check (itinerario in ('academico', 'gestion'));

insert into public.fases_config (id, itinerario, orden, titulo, explicacion) values
(
  'g-proposito', 'gestion', 1, 'Introducción y propósito',
$$La memoria de gestión es el documento con el que presentas tu candidatura a la jefatura de un servicio, sección o unidad (o a la coordinación de un centro, una dirección…). No es un trabajo de investigación: no hay pregunta PICO, hipótesis ni análisis estadístico. Lo que se valora es que conozcas a fondo el entorno y la unidad, y que tu plan de actuación se derive de ese análisis y sea factible.
En la introducción presenta a qué puesto optas, en qué unidad e institución, por qué presentas esta memoria y qué propones en líneas generales. Usa la plantilla obligatoria del Aula Virtual. Extensión total del trabajo individual: entre 50 y 100 páginas, sin contar portada, índices ni anexos. La rúbrica pide que todos los apartados estén desarrollados de forma equilibrada: no priorices uno a costa de los demás.$$
),
(
  'g-marco', 'gestion', 2, 'Marco general del sistema sanitario',
$$Describe el sistema sanitario en el que se sitúa tu unidad: marco legal del sector sanitario, características del sistema en tu país, cómo se organiza en tu comunidad o área de salud, situación poblacional y presupuesto del que dispone. Va de lo general (país) a lo concreto (tu área). Usa fuentes oficiales actualizadas (ministerio, consejería, institutos de estadística, memorias del centro) y cítalas. Extensión orientativa: 12-15 páginas.$$
),
(
  'g-externo', 'gestion', 3, 'Análisis externo',
$$Analiza el entorno de tu unidad: datos demográficos del área, situación geográfica, recursos sanitarios (estructurales, humanos…), recursos sociales y comunitarios, actividad asistencial del área, y si existe un plan estratégico, planes de liderazgo o de desarrollo de la investigación y la docencia. Diferencia cada ítem en su propio apartado. La información debe estar actualizada y ser completa: es lo que la rúbrica llama «información del contexto». Extensión orientativa: unas 20 páginas.$$
),
(
  'g-interno', 'gestion', 4, 'Análisis interno de la unidad',
$$Describe por dentro la unidad a la que optas: estructura orgánica dentro de la organización, estructura funcional, recursos humanos y materiales, cartera de servicios, a qué se dedica el personal, reparto de la actividad diaria (y de las guardias, si las hay), datos de funcionamiento, actividad asistencial de los últimos años y, si es posible, previsión de la demanda (por ejemplo, qué recursos hará falta si la población envejece). Los datos propios del servicio (memorias, registros, cuadros de mando existentes) son fuentes válidas: indica de dónde sale cada dato. Extensión orientativa: 15-20 páginas.$$
),
(
  'g-dafo', 'gestion', 5, 'Matriz DAFO/CAME',
$$El DAFO resume el análisis: debilidades y fortalezas (internas, salen del análisis interno), amenazas y oportunidades (externas, salen del análisis externo). Cada elemento debe poder rastrearse hasta un dato de los apartados anteriores; si no, es una opinión. El CAME convierte el DAFO en estrategias: Corregir debilidades, Afrontar amenazas, Mantener fortalezas y Explotar oportunidades. De estas estrategias saldrán las líneas estratégicas del plan de actuación.$$
),
(
  'g-plan', 'gestion', 6, 'Plan de actuación',
$$Es el núcleo de tu candidatura: qué harás con la unidad si obtienes la jefatura. Incluye misión, visión y valores; líneas estratégicas y factores clave de éxito; objetivos asistenciales, financieros y de sostenibilidad para cada línea; mapa de procesos (estratégicos, operativos y de soporte); calidad y seguridad del paciente; atención centrada en el paciente (cómo medirás la satisfacción); relación con otros proveedores y servicios (atención primaria, especializada…); guías clínicas y rutas asistenciales; gestión del conocimiento e innovación; docencia y formación continuada; y actividad investigadora. El plan debe basarse en el análisis previo (DAFO/CAME) y ser factible: la rúbrica penaliza un plan que no se apoye en el contexto.$$
),
(
  'g-cuadro', 'gestion', 7, 'Cuadro de mando e indicadores',
$$La monitorización del plan de gestión es muy importante, porque es lo que permite comprobar que todo lo anterior se cumple. Define un cuadro de mando con indicadores económicos, de clientes (tiempos de espera, encuestas de satisfacción…), de formación (programas puestos en marcha, profesionales formados) y de procesos internos. Para cada indicador: fórmula, fuente del dato, periodicidad, estándar o meta, y a qué objetivo del plan responde.$$
),
(
  'g-cv', 'gestion', 8, 'Currículum del candidato',
$$Presenta tu perfil profesional como candidato/a: formación, trayectoria, experiencia en gestión, docencia e investigación, ordenado cronológicamente y con datos de contacto actualizados. Incluye también las funciones del jefe/a de la unidad a la que optas. Cuenta un 10 % en la rúbrica: no lo dejes para el final.$$
),
(
  'g-referencias', 'gestion', 9, 'Bibliografía, anexos y acrónimos',
$$Las referencias acreditan las fuentes de tu memoria: normativa, documentos oficiales, planes estratégicos, memorias del centro y literatura sobre gestión sanitaria. Usa el estilo que indique la plantilla y comprueba que toda cita del texto aparece en la lista y viceversa. Los anexos recogen el material de apoyo (tablas extensas, organigramas…) y el índice de acrónimos completa la memoria.$$
)
on conflict (id) do nothing;

insert into public.tareas_config (fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo)
select v.fase_id, v.slug, v.orden, v.titulo, v.instruccion, v.tipo, v.permite_archivo
from (values
  ('g-proposito', 'redaccion', 1, 'Redacta la introducción y el propósito',
   $$Indica a qué puesto optas, de qué unidad e institución, por qué presentas esta memoria y qué aportará tu proyecto. Cierra con un párrafo que anticipe la estructura de la memoria.$$,
   'redaccion', true),
  ('g-marco', 'esquema', 1, 'Propón la estructura del apartado',
   $$Escribe los subapartados que tendrá tu marco general (marco legal, sistema sanitario del país, organización en tu área, población, presupuesto…) e indica en una línea qué contará cada uno y de qué fuente sacarás los datos.$$,
   'esquema', false),
  ('g-marco', 'redaccion', 2, 'Redacta el marco general',
   $$Pega el texto del apartado (o una parte). Indica la fuente de cada dato.$$,
   'redaccion', true),
  ('g-externo', 'esquema', 1, 'Propón la estructura del apartado',
   $$Enumera los ítems del análisis externo (demografía, geografía, recursos sanitarios, recursos sociales y comunitarios, actividad asistencial del área, planes estratégicos, de liderazgo, de investigación y docencia…) y qué datos y fuentes usarás en cada uno.$$,
   'esquema', false),
  ('g-externo', 'redaccion', 2, 'Redacta el análisis externo',
   $$Pega el texto del apartado (o una parte). Cada ítem en su propio subapartado y con la fuente de cada dato.$$,
   'redaccion', true),
  ('g-interno', 'esquema', 1, 'Propón la estructura del apartado',
   $$Enumera los subapartados del análisis interno (estructura orgánica y funcional, recursos humanos y materiales, cartera de servicios, organización de la actividad, datos de funcionamiento, evolución de la actividad, previsión de la demanda…) y de dónde sacarás los datos.$$,
   'esquema', false),
  ('g-interno', 'redaccion', 2, 'Redacta el análisis interno',
   $$Pega el texto del apartado (o una parte). Indica la fuente de cada dato del servicio (memoria anual, registros, cuadro de mando…).$$,
   'redaccion', true),
  ('g-dafo', 'redaccion', 1, 'Elabora tu DAFO y tu CAME',
   $$Escribe tu matriz DAFO (debilidades, amenazas, fortalezas, oportunidades) indicando para cada elemento de qué dato del análisis sale, y debajo las estrategias CAME que derivas de ella.$$,
   'redaccion', true),
  ('g-plan', 'mision', 1, 'Misión, visión, valores y líneas estratégicas',
   $$Redacta la misión, la visión y los valores de la unidad, y las líneas estratégicas con sus factores clave de éxito. Indica de qué estrategias CAME sale cada línea.$$,
   'redaccion', true),
  ('g-plan', 'objetivos', 2, 'Objetivos asistenciales, financieros y de sostenibilidad',
   $$Escribe los objetivos de cada línea estratégica, distinguiendo asistenciales, financieros y de sostenibilidad. Deben ser concretos, medibles y con plazo.$$,
   'objetivos', false),
  ('g-plan', 'procesos', 3, 'Mapa de procesos',
   $$Enumera los procesos de la unidad clasificados en estratégicos, operativos y de soporte, y describe brevemente los principales (quién interviene, entradas, salidas). Si tienes un diagrama, descríbelo por escrito: la IA solo lee texto.$$,
   'redaccion', true),
  ('g-plan', 'desarrollo', 4, 'Resto de apartados del plan',
   $$Desarrolla qué propones en: calidad y seguridad del paciente; atención centrada en el paciente; relación con otros proveedores y servicios; guías clínicas y rutas asistenciales; gestión del conocimiento e innovación; docencia y formación continuada; actividad investigadora. Puedes enviarlos de uno en uno.$$,
   'redaccion', true),
  ('g-cuadro', 'indicadores', 1, 'Define tu cuadro de mando',
   $$Escribe tus indicadores agrupados (económicos, de clientes, de formación, de procesos internos). Para cada uno: fórmula, fuente, periodicidad, meta y objetivo del plan al que responde.$$,
   'redaccion', true),
  ('g-cv', 'redaccion', 1, 'Redacta tu currículum y las funciones del puesto',
   $$Escribe tu perfil profesional como candidato/a y, a continuación, las funciones del jefe/a de la unidad a la que optas.$$,
   'redaccion', true),
  ('g-referencias', 'redaccion', 1, 'Aporta tu bibliografía',
   $$Pega tu lista de referencias en el estilo que exige la plantilla (indica cuál es). La IA revisará el formato y la pertinencia, no inventará referencias.$$,
   'referencias', true)
) as v(fase_id, slug, orden, titulo, instruccion, tipo, permite_archivo)
where not exists (
  select 1 from public.tareas_config t where t.fase_id = v.fase_id and t.slug = v.slug
);
