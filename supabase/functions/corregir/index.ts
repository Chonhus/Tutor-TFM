// Supabase Edge Function: corregir
//
// Recibe la tarea (por id) y el texto que ha escrito un alumno, construye el
// contexto de corrección (lógica portada de contextoTarea() del prototipo
// tutor-tfm.jsx), pide a Claude que actúe como tutor y guarda el intento
// completo (texto + feedback) con la service-role key. El alumno nunca tiene
// permiso de insertar ni actualizar filas de "envios" directamente (ver
// migración 0001), así que no puede fabricar un feedback falso: la fila solo
// existe si esta función la crea, y solo la crea después de una respuesta
// real de Claude.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
// Haiku 4.5: la corrección sigue una rúbrica bastante cerrada por tipo de
// tarea (ver contextoTarea), así que no necesita el razonamiento de gama alta
// de Sonnet; a cambio es notablemente más barato y rápido. Si la calidad no
// convence en la práctica, volver a "claude-sonnet-5" aquí.
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Fase = { id: string; titulo: string };
type Tarea = { titulo: string; tipo: string };

// Tipos de TFM: no configurables desde administración (decisión explícita).
// Solo se necesita aquí el criterio de corrección por fase de los 4 tipos
// de calidad y seguridad, que son metodológicamente muy distintos de una
// investigación empírica (no piden PICO ni hipótesis, cambian resultados/
// discusión/conclusiones por apartados propios). Los 3 tipos originales
// (investigacion, proyecto, revision) no tienen criterios específicos: sus
// variantes ya quedan cubiertas por el criterio general de cada tarea. Debe
// mantenerse en sync con `js/tipos-tfm.js` (mismos id, mismo contenido).
const CRITERIOS_POR_TIPO: Record<string, { nombre: string; porFase: Record<string, string> }> = {
  "protocolo-investigacion": {
    nombre: "Protocolo de investigación",
    porFase: {
      pregunta: "Aplica PICO/PECO. Comprueba que la pregunta sea contestable con un diseño factible. Si el alumno plantea en realidad un protocolo asistencial (estandarizar una actuación clínica), señálaselo.",
      introduccion: "Comprueba que la introducción desemboque en una laguna de conocimiento concreta y referenciada que el estudio propuesto abordaría.",
      objetivos: "Los objetivos deben ser los del estudio propuesto, no los del TFM: si aparece «diseñar/elaborar un protocolo» como objetivo, corrígelo. Si el diseño es analítico o experimental, exige hipótesis.",
      metodologia: "Exige cálculo del tamaño muestral con parámetros explícitos, definición operativa de variables, plan de análisis ligado a cada objetivo, aspectos éticos concretos, cronograma y recursos. Señala lo que falte según la guía de su diseño (SPIRIT, STROBE).",
      resultados: "Avisa con firmeza si el alumno presenta datos como si fueran reales. Comprueba que las tablas ficticias correspondan a los objetivos y variables definidos.",
      discusion: "Exige análisis referenciado de sesgos previstos (selección, información, confusión) con estrategias para minimizarlos, y valoración de la aplicabilidad. No aceptes interpretaciones de resultados inexistentes.",
      conclusiones: "Avisa si formula conclusiones como si el estudio se hubiera realizado.",
    },
  },
  riesgos: {
    nombre: "Mapa de riesgos",
    porFase: {
      pregunta: "No exijas formato PICO. Comprueba que el proceso esté delimitado (inicio, fin, ámbito), que la pregunta combine identificación y priorización de riesgos y que el alcance sea abarcable en un TFM.",
      introduccion: "Comprueba que la justificación incluya datos referenciados de eventos adversos en ese proceso, el marco de gestión de riesgos y antecedentes de análisis similares.",
      objetivos: "Comprueba que los objetivos específicos cubran descripción del proceso, identificación, análisis y priorización, y propuesta de medidas. No pidas hipótesis de contraste estadístico.",
      metodologia: "Exige equipo multidisciplinar justificado, diagrama de flujo, técnica de identificación, herramienta de análisis con escalas definidas y umbral de priorización explícito. Señala lo que falte.",
      resultados: "Comprueba la coherencia entre puntuaciones y priorización, que cada riesgo prioritario tenga medida, responsable e indicador, y que tablas y figuras estén descritas.",
      discusion: "Exige comparación referenciada con otros análisis de riesgos y discusión de la subjetividad de las puntuaciones y del riesgo residual.",
      conclusiones: "Las conclusiones deben nombrar los riesgos prioritarios concretos y las medidas clave, una por objetivo.",
    },
  },
  protocolo: {
    nombre: "Protocolo asistencial",
    porFase: {
      pregunta: "No exijas formato PICO. Comprueba que estén definidos situación clínica, población, ámbito, profesionales usuarios y problema que se quiere resolver. Si el alumno plantea en realidad un protocolo de investigación, señálaselo.",
      introduccion: "Comprueba referencias a guías de práctica clínica y evidencia actual, y la justificación de la adaptación local.",
      objetivos: "Comprueba que los objetivos específicos cubran evidencia, recomendaciones, algoritmo e indicadores de evaluación.",
      metodologia: "Exige estrategia de búsqueda reproducible, sistema de graduación de la evidencia, método de consenso o validación, y plan de implantación y actualización.",
      resultados: "Comprueba que cada recomendación tenga nivel de evidencia y referencia, que exista algoritmo y que los indicadores sean medibles (fórmula y estándar).",
      discusion: "Exige comparación referenciada con otras guías o protocolos y análisis de barreras de implantación.",
    },
  },
  acr: {
    nombre: "Análisis causa-raíz",
    porFase: {
      pregunta: "No exijas formato PICO. Comprueba que el evento esté delimitado, que la pregunta se oriente a causas del sistema y no a buscar culpables, y avisa si aparecen datos identificativos.",
      introduccion: "Comprueba datos referenciados sobre el tipo de evento y la fundamentación del enfoque sistémico.",
      objetivos: "Comprueba que los objetivos cubran cronología, fallos y factores contribuyentes, acciones y seguimiento. No pidas hipótesis.",
      metodologia: "Exige marco de análisis explícito, fuentes de información, herramientas de análisis, clasificación de factores y garantías de confidencialidad.",
      resultados: "Comprueba que cada acción se vincule a una causa raíz, tenga nivel de efectividad, responsable, plazo e indicador. Señala si predominan acciones débiles (formación, recordatorios).",
      discusion: "Exige comparación referenciada y discusión de los sesgos propios del análisis retrospectivo.",
    },
  },
};

// Portado literal de contextoTarea() (tutor-tfm.jsx líneas 308-323): mismo
// criterio de corrección por tipo de tarea, mismo texto en español. A eso se
// añade, si el alumno tiene un tipo de TFM con criterios específicos para
// esta fase (ver CRITERIOS_POR_TIPO arriba), un bloque que prevalece sobre
// el criterio general si hay conflicto.
function contextoTarea(fase: Fase, tarea: Tarea, numeroIntento: number, tipoTfm: string | null) {
  const base = `Fase del TFM: ${fase.titulo}. Tarea: ${tarea.titulo}. Intento nº ${numeroIntento} del alumno en esta tarea.`;
  let contexto: string;
  if (tarea.tipo === "tema") {
    contexto = base + " El alumno describe su TEMA de TFM. Ayúdale a delimitarlo: señala si es demasiado amplio, vago o poco factible; valóralo con los criterios FINER; indica qué decisiones le faltan por tomar (población concreta, contexto, variable de interés) y hazle 2-3 preguntas que le ayuden a centrarlo. No le des el tema resuelto ni se lo elijas tú. IMPORTANTE: en esta fase basta con identificar población, contexto y variable de interés a nivel general; NO exijas todavía el instrumento de medida, el modelo teórico concreto (p.ej. un cuestionario o marco conceptual específico) ni el plan de análisis — eso corresponde a la fase de Metodología, más adelante.";
  } else if (tarea.tipo === "pregunta") {
    contexto = base + " El alumno formula su PREGUNTA DE INVESTIGACIÓN. Evalúa si es concreta, contestable con un TFM y coherente con su tipo de trabajo. En investigación o revisión, comprueba que estén bien identificados los componentes PICO a nivel general; en proyecto de intervención, que defina necesidad y población diana. Señala qué le falta o sobra a la pregunta y oriéntale para precisarla, sin formularla tú por completo. IMPORTANTE: no exijas todavía el instrumento de medida ni el modelo teórico concreto que usará — eso corresponde a la fase de Metodología, más adelante; aquí basta con que la pregunta sea clara y viable.";
  } else if (tarea.tipo === "esquema") {
    contexto = base + " El alumno propone una ESTRUCTURA/ESQUEMA. Evalúa si es adecuada para esta fase y este tipo de TFM: orden lógico, apartados que faltan o sobran. No le des la estructura resuelta; oriéntale para que la corrija él mismo.";
  } else if (tarea.tipo === "objetivos") {
    contexto = base + " Corrige el ENFOQUE de los objetivos (general vs. específicos, verbos en infinitivo, especificidad, medibilidad, coherencia) y mejora su redacción proponiendo una reformulación breve de cada uno como ejemplo.";
  } else if (tarea.tipo === "referencias") {
    contexto = base + " Revisa el FORMATO de las referencias según el estilo que indique el alumno, su pertinencia y actualidad aparente. No inventes ni completes referencias.";
  } else {
    contexto = base + " Revisa la REDACCIÓN: señala mejoras concretas de claridad, precisión científica y estructura por párrafos SIN reescribir el texto. Para cada párrafo con afirmaciones sin referencia, pide explícitamente que aporte la referencia bibliográfica correspondiente.";
  }

  const criterios = tipoTfm ? CRITERIOS_POR_TIPO[tipoTfm] : undefined;
  const especifico = criterios?.porFase[fase.id];
  if (especifico) {
    contexto += `\n\nCRITERIOS ESPECÍFICOS PARA EL TIPO «${criterios!.nombre}» (prevalecen sobre los generales si hay conflicto): ${especifico}`;
  }
  return contexto;
}

async function pedirFeedback(instrucciones: string, contexto: string, textoAlumno: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 800,
      system: instrucciones,
      messages: [{ role: "user", content: `${contexto}\n\nTEXTO DEL ALUMNO:\n${textoAlumno}` }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const texto = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n")
    .trim();
  if (!texto) throw new Error("Claude no devolvió ningún texto de corrección");
  return texto;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Falta cabecera Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Token inválido o expirado" }, 401);
    }
    const alumnoId = userData.user.id;

    const { tarea_id, texto, docx_path } = await req.json();
    if (!tarea_id || !texto || !String(texto).trim()) {
      return jsonResponse({ error: "Faltan campos obligatorios (tarea_id, texto)" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // El alumno debe existir y tener role='alumno'; se lee con service-role
    // para no depender de qué RLS vea el propio caller.
    const { data: alumno, error: alumnoError } = await adminClient
      .from("alumnos")
      .select("id, tipo_tfm")
      .eq("id", alumnoId)
      .single();
    if (alumnoError || !alumno) {
      return jsonResponse({ error: "Solo un alumno puede enviar tareas a corrección" }, 403);
    }

    // Nunca confiar en un título/tipo de tarea que mandara el cliente: se
    // leen del servidor para evitar que se pueda alterar el prompt del
    // tutor IA falsificando esos campos.
    const { data: tarea, error: tareaError } = await adminClient
      .from("tareas_config")
      .select("id, titulo, tipo, fase_id, fases_config(id, titulo, orden)")
      .eq("id", tarea_id)
      .single();
    if (tareaError || !tarea) return jsonResponse({ error: "Tarea no encontrada" }, 404);

    const { data: configRow, error: configError } = await adminClient
      .from("config")
      .select("instrucciones_ia")
      .single();
    if (configError || !configRow) return jsonResponse({ error: "No se pudo leer la configuración" }, 500);

    // Cuántos intentos previos tiene el alumno en esta misma tarea: a partir
    // del segundo intento las instrucciones del tutor le piden dar un
    // ejemplo concreto si persiste el mismo problema, en vez de repetir solo
    // preguntas orientativas.
    const { count: intentosPrevios } = await adminClient
      .from("envios")
      .select("id", { count: "exact", head: true })
      .eq("alumno_id", alumnoId)
      .eq("tarea_id", tarea_id);

    const fase = tarea.fases_config as unknown as { id: string; titulo: string; orden: number };

    // Contexto de fases anteriores: para que la IA pueda valorar coherencia
    // (p.ej. que Resultados responda a los Objetivos) sin tener que reenviar
    // todo el trabajo desde el frontend en cada corrección. Se recupera el
    // último envío guardado de cada tarea de una fase anterior (ya están en
    // la base de datos) en vez de generar un resumen con una llamada extra a
    // la IA: es más simple, no añade coste ni latencia, y es fiel a lo que
    // el alumno escribió de verdad. Las fases tempranas (pregunta) no tienen
    // nada anterior, así que no añaden nada aquí.
    let contextoPrevio = "";
    const { data: fasesAnteriores } = await adminClient
      .from("fases_config")
      .select("id, orden, titulo, tareas_config(id, titulo, orden)")
      .lt("orden", fase.orden)
      .order("orden")
      .order("orden", { foreignTable: "tareas_config" });

    const idsTareasAnteriores = (fasesAnteriores ?? []).flatMap(
      (f) => (f.tareas_config ?? []).map((t) => t.id),
    );

    if (idsTareasAnteriores.length > 0) {
      const { data: enviosPrevios } = await adminClient
        .from("envios")
        .select("tarea_id, texto, created_at")
        .eq("alumno_id", alumnoId)
        .in("tarea_id", idsTareasAnteriores)
        .order("created_at", { ascending: false });

      const ultimoPorTarea = new Map<string, string>();
      for (const e of enviosPrevios ?? []) {
        if (!ultimoPorTarea.has(e.tarea_id)) ultimoPorTarea.set(e.tarea_id, e.texto);
      }

      const bloques: string[] = [];
      for (const f of fasesAnteriores ?? []) {
        const partes: string[] = [];
        for (const t of f.tareas_config ?? []) {
          const textoPrevio = ultimoPorTarea.get(t.id);
          if (textoPrevio) partes.push(`- ${t.titulo}: ${textoPrevio}`);
        }
        if (partes.length > 0) bloques.push(`${f.titulo}:\n${partes.join("\n")}`);
      }

      if (bloques.length > 0) {
        contextoPrevio = `CONTEXTO DEL TRABAJO YA REALIZADO EN FASES ANTERIORES (para que valores coherencia con lo que el alumno escribe ahora; no lo corrijas, es solo referencia):\n${bloques.join("\n\n")}\n\n---\n\n`;
      }
    }

    const contexto = contextoPrevio + contextoTarea(fase, tarea, (intentosPrevios ?? 0) + 1, alumno.tipo_tfm);

    let feedback: string;
    try {
      feedback = await pedirFeedback(configRow.instrucciones_ia, contexto, String(texto));
    } catch (claudeErr) {
      return jsonResponse({ error: `No se pudo obtener la corrección: ${(claudeErr as Error).message}` }, 502);
    }

    const { data: envio, error: insertError } = await adminClient
      .from("envios")
      .insert({
        alumno_id: alumnoId,
        tarea_id,
        texto: String(texto),
        feedback_ia: feedback,
        docx_path: docx_path ?? null,
      })
      .select("id, created_at")
      .single();
    if (insertError || !envio) {
      return jsonResponse({ error: `No se pudo guardar el envío: ${insertError?.message}` }, 500);
    }

    return jsonResponse({ envio_id: envio.id, feedback, created_at: envio.created_at });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
