// Supabase Edge Function: sugerir-tipo-tfm
//
// El tipo de TFM se retiró en su día (migración 0002) porque los alumnos lo
// elegían mal con frecuencia; se reintrodujo en la migración 0004, ahora con
// 4 tipos de calidad y seguridad además de los 3 originales, que sí exigen
// criterios de corrección muy distintos entre sí. Para no reproducir la
// fricción original, el alumno puede describir en 2-3 frases lo que va a
// hacer y esta función le sugiere el tipo más probable, con una breve
// justificación. Es una clasificación, no redacción del TFM: no contradice
// el principio de que la IA nunca escribe el trabajo por el alumno (§1 de
// las especificaciones). El alumno decide igualmente: puede aceptar la
// sugerencia o elegir otro tipo distinto.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
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

// Mismos 7 id que el CHECK de alumnos.tipo_tfm (migración 0004) y
// js/tipos-tfm.js. El texto de cada uno es el que ve la IA para clasificar;
// no hace falta que coincida palabra por palabra con la descripción que ve
// el alumno en el frontend.
const TIPOS = [
  { id: "investigacion", texto: "Investigación empírica: estudio observacional, experimental o cualitativo que SE EJECUTA, con recogida y análisis de datos reales." },
  { id: "protocolo-investigacion", texto: "Protocolo de investigación: diseño completo de un estudio de investigación que NO se llega a ejecutar (como mucho, un pilotaje)." },
  { id: "proyecto", texto: "Proyecto de intervención: diseño de una intervención (educativa, asistencial, organizativa) para una necesidad detectada." },
  { id: "revision", texto: "Revisión bibliográfica: revisión sistemática, de alcance o narrativa de la evidencia sobre una pregunta." },
  { id: "riesgos", texto: "Mapa de riesgos: identificación, análisis y priorización de los riesgos de un proceso asistencial delimitado (AMFE, matriz de riesgos)." },
  { id: "protocolo", texto: "Protocolo asistencial: elaboración de un protocolo clínico o de cuidados basado en la evidencia para ESTANDARIZAR una actuación (no es un estudio de investigación)." },
  { id: "acr", texto: "Análisis causa-raíz: análisis sistémico de UN EVENTO ADVERSO O INCIDENTE YA OCURRIDO, para identificar sus causas y proponer acciones." },
];
const IDS_VALIDOS = new Set(TIPOS.map((t) => t.id));

const SYSTEM = `Eres un clasificador que ayuda a un alumno de TFM en ciencias de la salud a identificar qué tipo de trabajo está describiendo, a partir de una breve descripción en lenguaje natural. No redactes contenido del TFM, no le hagas preguntas ni le des indicaciones sobre cómo escribirlo: solo clasifica.

Tipos posibles (usa exactamente uno de estos id):
${TIPOS.map((t) => `- ${t.id}: ${t.texto}`).join("\n")}

Responde ÚNICAMENTE con un JSON válido (sin bloque de código, sin texto antes ni después) con esta forma exacta:
{"tipo_id": "<uno de los id anteriores>", "justificacion": "<2-3 frases en español, dirigidas al alumno de tú a tú, explicando por qué encaja>"}

Si la descripción es ambigua entre dos tipos, elige el más probable y menciona la alternativa dentro de la justificación. Si la descripción es demasiado vaga para clasificar con una mínima confianza, elige igualmente el tipo más plausible y dilo en la justificación, pidiendo que lo confirme.`;

async function pedirSugerencia(descripcion: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: descripcion }],
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
  if (!texto) throw new Error("Claude no devolvió ninguna sugerencia");

  // Por si el modelo envuelve el JSON en un bloque de código a pesar de la
  // instrucción, se quitan las marcas ``` antes de parsear.
  const limpio = texto.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let parsed: { tipo_id?: string; justificacion?: string };
  try {
    parsed = JSON.parse(limpio);
  } catch {
    throw new Error("No se pudo interpretar la sugerencia de la IA");
  }
  if (!parsed.tipo_id || !IDS_VALIDOS.has(parsed.tipo_id) || !parsed.justificacion) {
    throw new Error("La sugerencia de la IA no tiene un formato válido");
  }
  return { tipo_id: parsed.tipo_id, justificacion: parsed.justificacion };
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

    const { descripcion } = await req.json();
    if (!descripcion || !String(descripcion).trim()) {
      return jsonResponse({ error: "Falta el campo obligatorio (descripcion)" }, 400);
    }
    if (String(descripcion).length > 2000) {
      return jsonResponse({ error: "La descripción es demasiado larga" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: alumno, error: alumnoError } = await adminClient
      .from("alumnos")
      .select("id")
      .eq("id", userData.user.id)
      .single();
    if (alumnoError || !alumno) {
      return jsonResponse({ error: "Solo un alumno puede pedir una sugerencia de tipo de TFM" }, 403);
    }

    const sugerencia = await pedirSugerencia(String(descripcion).trim());
    return jsonResponse(sugerencia);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
