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

type Fase = { titulo: string };
type Tarea = { titulo: string; tipo: string };

// Orientación según el tipo de TFM que el alumno haya indicado (opcional,
// ver migración 0004). Sin tipo indicado no se añade nada y la IA lo deduce
// del texto, como antes. "gestion" es el que más se aparta de la rúbrica
// por defecto (pensada para estudios empíricos), por eso es el más detallado.
const ORIENTACION_TIPO_TFM: Record<string, string> = {
  investigacion: "TIPO DE TFM indicado por el alumno: INVESTIGACIÓN (recoge y analiza datos propios). Aplica los criterios de un estudio empírico (pregunta PICO, diseño, muestra, variables, análisis, ética).",
  proyecto: "TIPO DE TFM indicado por el alumno: PROYECTO DE INTERVENCIÓN. Valora la necesidad detectada y la población diana; en Metodología, actividades, cronograma, recursos y plan de evaluación; en Resultados, el desarrollo de la intervención o los resultados esperados. No exijas tamaño muestral ni análisis estadístico de datos que aún no existen.",
  revision: "TIPO DE TFM indicado por el alumno: REVISIÓN BIBLIOGRÁFICA. Valora la pregunta PICO, la estrategia de búsqueda reproducible, los criterios de selección, la evaluación de la calidad de los estudios (PRISMA) y la síntesis de la evidencia.",
  gestion: "TIPO DE TFM indicado por el alumno: PROYECTO DE GESTIÓN (análisis de un servicio, unidad o área y plan de mejora). Su contenido es: análisis de situación del área (qué es, dónde encaja, servicios, recursos, usuarios), estructura y procesos (mapa de procesos, circuitos, responsables), análisis DAFO y líneas de mejora derivadas del DAFO, cada una con responsable, plazo e indicador de seguimiento. La memoria mantiene el formato académico: en Pregunta, valora la necesidad o el problema de gestión y el área concreta, no exijas PICO; en Metodología, valora las fuentes y técnicas (análisis documental, datos de actividad, entrevistas o reuniones con responsables, elaboración del mapa de procesos y del DAFO) y NO exijas tamaño muestral, análisis estadístico ni comité de ética salvo que de verdad proceda; en Resultados, acepta el análisis de situación, los procesos, el DAFO y las líneas de mejora (no es «interpretación» indebida: son el resultado del trabajo). Para los datos propios del área acepta como fuente documentación interna, registros y entrevistas, siempre que quede claro de dónde sale cada afirmación; exige bibliografía para el marco teórico y para comparar con otras experiencias. Insiste en acotar: mejor pocos procesos nucleares bien analizados que todos superficialmente. Recuerda que solo lees texto: si menciona un diagrama o mapa de procesos, valora su descripción escrita.",
};

function contextoTarea(fase: Fase, tarea: Tarea, numeroIntento: number, tipoTfm: string | null) {
  const orientacion = tipoTfm ? ORIENTACION_TIPO_TFM[tipoTfm] : undefined;
  const base = contextoTareaPorTipoDeTarea(fase, tarea, numeroIntento);
  return orientacion ? `${orientacion}\n\n${base}` : base;
}

// Portado literal de contextoTarea() (tutor-tfm.jsx líneas 308-323): mismo
// criterio de corrección por tipo de tarea, mismo texto en español. El tipo
// de TFM, si el alumno lo ha indicado, se antepone en contextoTarea(); si
// no, las variantes por tipo de estudio quedan como orientación dentro del
// propio texto, que la IA interpreta a partir de lo que el alumno describe.
function contextoTareaPorTipoDeTarea(fase: Fase, tarea: Tarea, numeroIntento: number) {
  const base = `Fase del TFM: ${fase.titulo}. Tarea: ${tarea.titulo}. Intento nº ${numeroIntento} del alumno en esta tarea.`;
  if (tarea.tipo === "tema") {
    return base + " El alumno describe su TEMA de TFM. Ayúdale a delimitarlo: señala si es demasiado amplio, vago o poco factible; valóralo con los criterios FINER; indica qué decisiones le faltan por tomar (población concreta, contexto, variable de interés) y hazle 2-3 preguntas que le ayuden a centrarlo. No le des el tema resuelto ni se lo elijas tú. IMPORTANTE: en esta fase basta con identificar población, contexto y variable de interés a nivel general; NO exijas todavía el instrumento de medida, el modelo teórico concreto (p.ej. un cuestionario o marco conceptual específico) ni el plan de análisis — eso corresponde a la fase de Metodología, más adelante.";
  }
  if (tarea.tipo === "pregunta") {
    return base + " El alumno formula su PREGUNTA DE INVESTIGACIÓN. Evalúa si es concreta, contestable con un TFM y coherente con su tipo de trabajo. En investigación o revisión, comprueba que estén bien identificados los componentes PICO a nivel general; en proyecto de intervención, que defina necesidad y población diana. Señala qué le falta o sobra a la pregunta y oriéntale para precisarla, sin formularla tú por completo. IMPORTANTE: no exijas todavía el instrumento de medida ni el modelo teórico concreto que usará — eso corresponde a la fase de Metodología, más adelante; aquí basta con que la pregunta sea clara y viable.";
  }
  if (tarea.tipo === "esquema") {
    return base + " El alumno propone una ESTRUCTURA/ESQUEMA. Evalúa si es adecuada para esta fase y este tipo de TFM: orden lógico, apartados que faltan o sobran. No le des la estructura resuelta; oriéntale para que la corrija él mismo.";
  }
  if (tarea.tipo === "objetivos") {
    return base + " Corrige el ENFOQUE de los objetivos (general vs. específicos, verbos en infinitivo, especificidad, medibilidad, coherencia) y mejora su redacción proponiendo una reformulación breve de cada uno como ejemplo.";
  }
  if (tarea.tipo === "referencias") {
    return base + " Revisa el FORMATO de las referencias según el estilo que indique el alumno, su pertinencia y actualidad aparente. No inventes ni completes referencias.";
  }
  return base + " Revisa la REDACCIÓN: señala mejoras concretas de claridad, precisión científica y estructura por párrafos SIN reescribir el texto. Para cada párrafo con afirmaciones sin referencia, pide explícitamente que aporte la referencia bibliográfica correspondiente.";
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
      .select("id, titulo, tipo, fase_id, fases_config(titulo, orden)")
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

    const fase = tarea.fases_config as unknown as { titulo: string; orden: number };

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

    const contexto = contextoPrevio + contextoTarea(fase, tarea, (intentosPrevios ?? 0) + 1, alumno.tipo_tfm ?? null);

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
