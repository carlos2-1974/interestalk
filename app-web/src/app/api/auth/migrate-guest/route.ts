import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ======================================================
// INTERESTALK - MIGRACION DE INVITADO A USUARIO SUPABASE
// Reasigna perfiles, informes y cuotas del guestId al authId real.
// ======================================================

const migrateSchema = z.object({
  guestUserId: z.string().trim().uuid(),
  authUserId: z.string().trim().uuid(),
  email: z.string().trim().email().optional(),
});

type LearningProfile = {
  user_id: string;
  level: string;
  interests: unknown;
  custom_topics: unknown;
};

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mergeStringArrays(first: unknown, second: unknown): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const value of [...stringArray(first), ...stringArray(second)]) {
    const key = value.trim().toLocaleLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(value.trim());
    }
  }

  return merged;
}

function throwOnDatabaseError(
  operation: string,
  error: { message: string } | null
): void {
  if (error) {
    throw new Error(`${operation}: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json();
    const validation = migrateSchema.safeParse(rawBody);

    if (!validation.success) {
      return jsonNoStore({ error: "Parámetros de migración no válidos." }, 400);
    }

    const { guestUserId, authUserId } = validation.data;

    const authorization = request.headers.get("authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!bearerToken) {
      return jsonNoStore({ error: "Se requiere una sesión autenticada." }, 401);
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(bearerToken);
    if (authError || authData.user?.id !== authUserId) {
      return jsonNoStore({ error: "La sesión no coincide con el usuario destino." }, 403);
    }

    if (guestUserId === authUserId) {
      return jsonNoStore({ success: true, message: "Mismo identificador, no requiere migración." });
    }

    // 1. Combinar el perfil sin reemplazar el nivel ni las preferencias del destino.
    const { data: guestProfileData, error: guestProfileError } = await supabaseAdmin
      .from("user_learning_profiles")
      .select("user_id,level,interests,custom_topics")
      .eq("user_id", guestUserId)
      .maybeSingle();
    throwOnDatabaseError("Leyendo perfil invitado", guestProfileError);

    if (guestProfileData) {
      const guestProfile = guestProfileData as LearningProfile;
      const { data: authProfileData, error: authProfileError } = await supabaseAdmin
        .from("user_learning_profiles")
        .select("user_id,level,interests,custom_topics")
        .eq("user_id", authUserId)
        .maybeSingle();
      throwOnDatabaseError("Leyendo perfil autenticado", authProfileError);

      const authProfile = authProfileData as LearningProfile | null;
      const { error: profileUpsertError } = await supabaseAdmin
        .from("user_learning_profiles")
        .upsert(
          {
            user_id: authUserId,
            level: authProfile?.level ?? guestProfile.level,
            interests: mergeStringArrays(
              authProfile?.interests,
              guestProfile.interests
            ),
            custom_topics: mergeStringArrays(
              authProfile?.custom_topics,
              guestProfile.custom_topics
            ),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      throwOnDatabaseError("Guardando perfil combinado", profileUpsertError);

      const { error: profileDeleteError } = await supabaseAdmin
        .from("user_learning_profiles")
        .delete()
        .eq("user_id", guestUserId);
      throwOnDatabaseError("Eliminando perfil invitado migrado", profileDeleteError);
    }

    // 2. Reasignar informes de Speaking.
    const { error: reportsError } = await supabaseAdmin
      .from("speaking_reports")
      .update({ user_id: authUserId })
      .eq("user_id", guestUserId);
    throwOnDatabaseError("Migrando informes de Speaking", reportsError);

    // 3. Mover y combinar cuotas diarias. El esquema actual denomina esta tabla
    // daily_usage_quotas y tiene una clave única por user_id y usage_date.
    const { data: guestQuotas, error: guestQuotasError } = await supabaseAdmin
      .from("daily_usage_quotas")
      .select("usage_date,speaking_seconds,tts_characters")
      .eq("user_id", guestUserId);
    throwOnDatabaseError("Leyendo cuotas de invitado", guestQuotasError);

    for (const quota of guestQuotas ?? []) {
      const { data: authQuota, error: authQuotaError } = await supabaseAdmin
        .from("daily_usage_quotas")
        .select("speaking_seconds,tts_characters")
        .eq("user_id", authUserId)
        .eq("usage_date", quota.usage_date)
        .maybeSingle();
      throwOnDatabaseError("Leyendo cuota de destino", authQuotaError);

      if (authQuota) {
        const { error: quotaUpsertError } = await supabaseAdmin
          .from("daily_usage_quotas")
          .upsert(
            {
              user_id: authUserId,
              usage_date: quota.usage_date,
              speaking_seconds: Math.min(
                1200,
                authQuota.speaking_seconds + quota.speaking_seconds
              ),
              tts_characters: authQuota.tts_characters + quota.tts_characters,
            },
            { onConflict: "user_id,usage_date" }
          );
        throwOnDatabaseError("Combinando cuota diaria", quotaUpsertError);

        const { error: quotaDeleteError } = await supabaseAdmin
          .from("daily_usage_quotas")
          .delete()
          .eq("user_id", guestUserId)
          .eq("usage_date", quota.usage_date);
        throwOnDatabaseError("Eliminando cuota de invitado migrada", quotaDeleteError);
      } else {
        const { error: quotaMoveError } = await supabaseAdmin
          .from("daily_usage_quotas")
          .update({ user_id: authUserId })
          .eq("user_id", guestUserId)
          .eq("usage_date", quota.usage_date);
        throwOnDatabaseError("Reasignando cuota diaria", quotaMoveError);
      }
    }

    return jsonNoStore({
      success: true,
      migratedTo: authUserId,
    });
  } catch (error) {
    console.error("[MIGRATE_GUEST_ERROR]", error);
    return jsonNoStore({ error: "No se pudo completar la migración de datos." }, 500);
  }
}
