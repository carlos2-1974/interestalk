import "server-only";
import { createClient } from "@supabase/supabase-js";

// ======================================================
// INTERESTALK - CLIENTE ADMINISTRATIVO DE SUPABASE
// Exclusivo para entorno de servidor (Service Role).
// ======================================================

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!rawSupabaseUrl) {
  throw new Error(
    "Error de configuracion en arranque: falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL."
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "Error de configuracion en arranque: falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY."
  );
}

// Asegurar URL base sin sufijo /rest/v1 para que Auth, Storage y RPC operen correctamente
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "");

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
