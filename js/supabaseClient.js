// Versión fijada (no un rango como "@2") y "?bundle": empaqueta el SDK y
// sus dependencias internas (auth-js, postgrest-js, storage-js...) en un
// solo archivo en vez de disparar más de una decena de peticiones sueltas
// a esm.sh en cada carga de página.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.6?bundle";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
