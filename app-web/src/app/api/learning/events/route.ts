import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedSupabaseUser } from "@/lib/voice-quotas";

const skillSchema = z.enum([
  "grammar",
  "listening",
  "speaking",
  "diagnostic",
]);

const eventSchema = z.object({
  userId: z.string().trim().min(1).max(200),
  skill: skillSchema,
  topic: z.string().trim().max(200).nullable().optional(),
  level: z.string().trim().max(20).nullable().optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  errorsDetected: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const MAX_EVENTS = 100;
type LearningSkill = z.infer<typeof skillSchema>;

type LearningEvent = {
  id: string;
  user_id: string;
  skill: LearningSkill;
  topic: string | null;
  level: string | null;
  score: number | null;
  duration_seconds: number;
  errors_detected: unknown;
  metadata: unknown;
  created_at: string;
};

type LearningEventSummaryRow = Pick<
  LearningEvent,
  "skill" | "duration_seconds" | "errors_detected"
>;

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function resolveRequestUserId(
  request: NextRequest
): Promise<string | null> {
  const authenticatedUser = await getAuthenticatedSupabaseUser(request);
  if (authenticatedUser?.id) return authenticatedUser.id;

  const guestId =
    request.headers.get("x-guest-user-id") ||
    request.headers.get("x-user-id") ||
    request.cookies.get("interestalk-guest-id")?.value;

  return guestId?.trim() || null;
}

function getErrorStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0
  );
}

function summarizeEvents(events: LearningEventSummaryRow[]) {
  const durationSecondsBySkill: Record<
    LearningSkill,
    number
  > = {
    grammar: 0,
    listening: 0,
    speaking: 0,
    diagnostic: 0,
  };
  const errorCounts = new Map<string, { concept: string; count: number }>();

  for (const event of events) {
    durationSecondsBySkill[event.skill] += event.duration_seconds || 0;
    const errorsForEvent = new Map(
      getErrorStrings(event.errors_detected).map((value) => [
        value.trim().toLocaleLowerCase(),
        value.trim(),
      ])
    );
    for (const [key, concept] of errorsForEvent) {
      const existing = errorCounts.get(key);
      errorCounts.set(key, {
        concept: existing?.concept ?? concept,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  const recurrentErrors = Array.from(errorCounts.values())
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    eventCount: events.length,
    durationSecondsBySkill,
    recurrentErrors,
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json();
    const validation = eventSchema.safeParse(rawBody);

    if (!validation.success) {
      return jsonNoStore(
        { error: "Datos del evento de aprendizaje no válidos." },
        400
      );
    }

    const { userId, skill, topic, level, score, durationSeconds, errorsDetected, metadata } =
      validation.data;
    const requestUserId = await resolveRequestUserId(request);

    if (!requestUserId) {
      return jsonNoStore({ error: "Se requiere identificar al usuario." }, 401);
    }
    if (requestUserId !== userId) {
      return jsonNoStore(
        { error: "El usuario del evento no coincide con la solicitud." },
        403
      );
    }

    const { data, error } = await supabaseAdmin
      .from("learning_events")
      .insert({
        user_id: userId,
        skill,
        topic: topic ?? null,
        level: level ?? null,
        score: score ?? null,
        duration_seconds: durationSeconds ?? 0,
        errors_detected: errorsDetected ?? [],
        metadata: metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      console.error("[LEARNING_EVENTS_API_ERROR] Error guardando evento:", error);
      return jsonNoStore(
        { error: "No se pudo guardar el evento de aprendizaje." },
        500
      );
    }

    return jsonNoStore({ event: data }, 201);
  } catch (error) {
    console.error("[LEARNING_EVENTS_API_ERROR] Error en POST:", error);
    return jsonNoStore(
      { error: "No se pudo procesar el evento de aprendizaje." },
      500
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const requestedUserId =
      request.nextUrl.searchParams.get("userId")?.trim() || null;
    const requestUserId = await resolveRequestUserId(request);

    if (!requestUserId) {
      return jsonNoStore({ error: "Se requiere identificar al usuario." }, 401);
    }
    if (requestedUserId && requestedUserId !== requestUserId) {
      return jsonNoStore(
        { error: "El usuario solicitado no coincide con la sesión." },
        403
      );
    }

    const eventsResult = await supabaseAdmin
      .from("learning_events")
      .select(
        "id,user_id,skill,topic,level,score,duration_seconds,errors_detected,metadata,created_at"
      )
      .eq("user_id", requestUserId)
      .order("created_at", { ascending: false })
      .limit(MAX_EVENTS);

    if (eventsResult.error) {
      console.error(
        "[LEARNING_EVENTS_API_ERROR] Error leyendo eventos:",
        eventsResult.error
      );
      return jsonNoStore(
        { error: "No se pudieron consultar los eventos de aprendizaje." },
        500
      );
    }

    const events = (eventsResult.data ?? []) as LearningEvent[];
    const summaryEvents: LearningEventSummaryRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin
        .from("learning_events")
        .select("skill,duration_seconds,errors_detected")
        .eq("user_id", requestUserId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + 999);

      if (error) {
        console.error(
          "[LEARNING_EVENTS_API_ERROR] Error agregando historial:",
          error
        );
        return jsonNoStore(
          { error: "No se pudo agregar el historial de aprendizaje." },
          500
        );
      }

      summaryEvents.push(...((data ?? []) as LearningEventSummaryRow[]));
      if (!data || data.length < 1000) break;
    }

    return jsonNoStore({
      events,
      summary: summarizeEvents(summaryEvents),
    });
  } catch (error) {
    console.error("[LEARNING_EVENTS_API_ERROR] Error en GET:", error);
    return jsonNoStore(
      { error: "No se pudieron consultar los eventos de aprendizaje." },
      500
    );
  }
}
