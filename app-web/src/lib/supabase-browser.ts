"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ======================================================
// INTERESTALK - CLIENTE DE SUPABASE PARA EL NAVEGADOR
// Maneja autenticación real del usuario (Supabase Auth / OTP).
// ======================================================

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  try {
    const parsedUrl = new URL(supabaseUrl);
    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      throw new Error();
    }
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL debe ser una URL HTTP(S) valida."
    );
  }

  browserClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
