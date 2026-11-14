import "server-only";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase-admin";

// ======================================================
// INTERESTALK - AUTENTICACION Y CUOTAS DE VOZ (SERVIDOR)
// ======================================================

export const DAILY_SPEAKING_LIMIT_SECONDS = 1200; // 20 minutos exactos
export const SYSTEM_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";

export function getTodayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function tryExtractTokenFromCookieValue(rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  let decoded = trimmed;

  if (decoded.startsWith("base64-")) {
    try {
      decoded = Buffer.from(decoded.slice(7), "base64").toString("utf8");
    } catch {
      return null;
    }
  } else if (decoded.startsWith("%")) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // Continuar con valor original
    }
  }

  if (decoded.startsWith("{") || decoded.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(decoded);
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        "access_token" in parsed &&
        typeof (parsed as { access_token?: unknown }).access_token === "string"
      ) {
        return (parsed as { access_token: string }).access_token;
      }

      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        return parsed[0];
      }
    } catch {
      return null;
    }
  }

  // Posible JWT directo (tres segmentos separados por punto)
  if (decoded.split(".").length === 3) {
    return decoded;
  }

  return null;
}

export function extractSupabaseAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  const directCookie = request.cookies.get("sb-access-token")?.value;
  if (directCookie) {
    const token = tryExtractTokenFromCookieValue(directCookie);
    if (token) return token;
  }

  const allCookies = request.cookies.getAll();
  const baseAuthCookie = allCookies.find((c) =>
    /^sb-[a-z0-9_-]+-auth-token$/i.test(c.name)
  );

  if (baseAuthCookie) {
    const token = tryExtractTokenFromCookieValue(baseAuthCookie.value);
    if (token) return token;
  }

  // Soporte para cookies fragmentadas (@supabase/ssr: sb-<ref>-auth-token.0, .1, ...)
  const chunkPrefixMatch = allCookies
    .map((c) => c.name.match(/^(sb-[a-z0-9_-]+-auth-token)\.\d+$/i))
    .find((m) => m !== null);

  if (chunkPrefixMatch?.[1]) {
    const prefix = chunkPrefixMatch[1];
    const combined = allCookies
      .filter((c) => c.name.startsWith(`${prefix}.`))
      .sort((a, b) => {
        const idxA = Number(a.name.slice(prefix.length + 1));
        const idxB = Number(b.name.slice(prefix.length + 1));
        return idxA - idxB;
      })
      .map((c) => c.value)
      .join("");

    const token = tryExtractTokenFromCookieValue(combined);
    if (token) return token;
  }

  return null;
}

export async function getAuthenticatedSupabaseUser(
  request: NextRequest
): Promise<User | null> {
  const accessToken = extractSupabaseAccessToken(request);
  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getDailySpeakingSecondsUsed(
  userId: string
): Promise<number> {
  const today = getTodayUtcDate();

  const { data, error } = await supabaseAdmin
    .from("daily_usage_quotas")
    .select("speaking_seconds")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (error) {
    throw new Error(`Error consultando cuota diaria de voz: ${error.message}`);
  }

  return data?.speaking_seconds ?? 0;
}

export type IncrementSpeakingResult =
  | {
      allowed: true;
      remainingSeconds: number;
    }
  | {
      allowed: false;
      remainingSeconds: 0;
    };

export async function incrementDailySpeakingSeconds(
  userId: string,
  secondsToAdd: number
): Promise<IncrementSpeakingResult> {
  const safeSeconds = Math.max(0, Math.round(secondsToAdd));

  const { data, error } = await supabaseAdmin.rpc(
    "increment_speaking_seconds",
    {
      p_user_id: userId,
      p_seconds: safeSeconds,
    }
  );

  if (error) {
    const message = `${error.message ?? ""} ${error.details ?? ""}`;
    if (
      error.code === "P0001" ||
      message.includes("DAILY_SPEAKING_LIMIT_REACHED")
    ) {
      return {
        allowed: false,
        remainingSeconds: 0,
      };
    }

    throw new Error(
      `Error actualizando segundos de speaking en Supabase: ${error.message}`
    );
  }

  const remaining =
    typeof data === "number" && Number.isFinite(data)
      ? Math.max(0, data)
      : 0;

  return {
    allowed: true,
    remainingSeconds: remaining,
  };
}

export async function incrementDailyTtsCharacters(
  userId: string,
  charactersConsumed: number
): Promise<void> {
  const safeChars = Math.max(0, Math.round(charactersConsumed));
  if (safeChars === 0) return;

  const { error: rpcError } = await supabaseAdmin.rpc(
    "increment_tts_characters",
    {
      p_user_id: userId,
      p_characters: safeChars,
    }
  );

  if (!rpcError) {
    return;
  }

  // Fallback seguro si solo se desplego la tabla y la RPC principal
  const today = getTodayUtcDate();
  const { data: current, error: selectError } = await supabaseAdmin
    .from("daily_usage_quotas")
    .select("speaking_seconds, tts_characters")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (selectError) {
    throw new Error(
      `Error leyendo cuota TTS diaria en Supabase: ${selectError.message}`
    );
  }

  const nextChars = (current?.tts_characters ?? 0) + safeChars;
  const currentSpeaking = current?.speaking_seconds ?? 0;

  const { error: upsertError } = await supabaseAdmin
    .from("daily_usage_quotas")
    .upsert(
      {
        user_id: userId,
        usage_date: today,
        speaking_seconds: currentSpeaking,
        tts_characters: nextChars,
      },
      { onConflict: "user_id,usage_date" }
    );

  if (upsertError) {
    throw new Error(
      `Error registrando caracteres TTS en Supabase: ${upsertError.message}`
    );
  }
}
