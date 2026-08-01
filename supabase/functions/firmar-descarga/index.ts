// Supabase Edge Function: firmar-descarga
//
// Genera una URL firmada de corta duración para descargar el .docx original
// de un envío. La autorización cruza la tabla vinculos_docente_alumno (el
// propio alumno, un docente vinculado a él, o un admin), algo que la RLS de
// Storage no puede consultar cómodamente sobre storage.objects, así que se
// resuelve aquí con service-role tras comprobar el permiso a mano.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const callerId = userData.user.id;

    const { envio_id } = await req.json();
    if (!envio_id) return jsonResponse({ error: "Falta envio_id" }, 400);

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: envio, error: envioError } = await adminClient
      .from("envios")
      .select("alumno_id, docx_path")
      .eq("id", envio_id)
      .single();
    if (envioError || !envio) return jsonResponse({ error: "Envío no encontrado" }, 404);
    if (!envio.docx_path) return jsonResponse({ error: "Este envío no tiene un archivo .docx adjunto" }, 404);

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    let autorizado = callerId === envio.alumno_id || callerProfile?.role === "admin";
    if (!autorizado && callerProfile?.role === "docente") {
      const { data: vinculo } = await adminClient
        .from("vinculos_docente_alumno")
        .select("docente_id")
        .eq("docente_id", callerId)
        .eq("alumno_id", envio.alumno_id)
        .maybeSingle();
      autorizado = !!vinculo;
    }
    if (!autorizado) return jsonResponse({ error: "No tienes permiso para descargar este archivo" }, 403);

    const { data: signed, error: signError } = await adminClient.storage
      .from("docx")
      .createSignedUrl(envio.docx_path, 60);
    if (signError || !signed) {
      return jsonResponse({ error: `No se pudo generar el enlace: ${signError?.message}` }, 500);
    }

    return jsonResponse({ url: signed.signedUrl });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
