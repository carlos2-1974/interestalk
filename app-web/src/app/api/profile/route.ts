import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase-admin";

// ======================================================
// INTERESTALK - API DE PERFIL DE APRENDIZAJE E INTERESES
// Sincroniza nivel e intereses en Supabase (user_learning_profiles).
// ======================================================

const profileSchema = z.object({
  userId: z.string().trim().min(1).max(200),
  level: z.enum(["B1", "B2"]),
  interests: z.array(z.string().trim().min(1).max(100)).max(20),
  customTopics: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
});

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

const DEFAULT_PROFILE = {
  level: "B1",
  interests: ["Tecnología", "Viajes", "Deportes"],
  custom_topics: [],
};

export async function GET(request: NextRequest) {
  try {
    const userId =
      request.nextUrl.searchParams.get("userId") ||
      request.headers.get("x-user-id") ||
      request.cookies.get("interestalk-guest-id")?.value;

    if (!userId) {
      return jsonNoStore({
        profile: {
          user_id: "guest",
          ...DEFAULT_PROFILE,
          updated_at: new Date().toISOString(),
        },
      });
    }

    const { data, error } = await supabaseAdmin
      .from("user_learning_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[PROFILE_API_ERROR] Error leyendo user_learning_profiles:", error);
      return jsonNoStore({
        profile: {
          user_id: userId,
          ...DEFAULT_PROFILE,
          updated_at: new Date().toISOString(),
        },
      });
    }

    if (!data) {
      return jsonNoStore({
        profile: {
          user_id: userId,
          ...DEFAULT_PROFILE,
          updated_at: new Date().toISOString(),
        },
        isNew: true,
      });
    }

    return jsonNoStore({
      profile: data,
      isNew: false,
    });
  } catch (error) {
    console.error("[PROFILE_API_ERROR] Error en GET /api/profile:", error);
    return jsonNoStore({ error: "Error consultando perfil de aprendizaje." }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json();
    const validation = profileSchema.safeParse(rawBody);

    if (!validation.success) {
      return jsonNoStore(
        { error: "Datos de perfil no válidos.", details: validation.error.format() },
        400
      );
    }

    const { userId, level, interests, customTopics } = validation.data;

    const { data: currentProfile, error: profileReadError } = await supabaseAdmin
      .from("user_learning_profiles")
      .select("diagnostic_completed,custom_topics")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileReadError) {
      console.error(
        "[PROFILE_API_ERROR] Error leyendo estado del diagnóstico:",
        profileReadError
      );
      return jsonNoStore(
        { error: "No se pudo consultar el estado del perfil." },
        500
      );
    }

    const { data, error } = await supabaseAdmin
      .from("user_learning_profiles")
      .upsert(
        {
          user_id: userId,
          level,
          interests,
          custom_topics: customTopics ?? currentProfile?.custom_topics ?? [],
          diagnostic_completed: currentProfile?.diagnostic_completed ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[PROFILE_API_ERROR] Error al guardar en Supabase:", error);
      return jsonNoStore({ error: "No se pudo actualizar el perfil en base de datos." }, 500);
    }

    return jsonNoStore({
      profile: data,
      success: true,
    });
  } catch (error) {
    console.error("[PROFILE_API_ERROR] Error en POST /api/profile:", error);
    return jsonNoStore({ error: "Error interno al actualizar perfil." }, 500);
  }
}
