import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { llamarConReintentos } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ======================================================
// INTERESTALK - INFORMES DE FEEDBACK DE SPEAKING
// Genera analisis pedagogico con Gemini y persiste en Supabase.
// ======================================================

const MAX_BODY_BYTES = 32 * 1024;

const transcriptItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(2000),
  correction: z
    .object({
      correctedSentence: z.string(),
      grammarTip: z.string(),
    })
    .nullable()
    .optional(),
});

const createReportSchema = z.object({
  userId: z.string().trim().min(1).max(200),
  topic: z.string().trim().min(1).max(200).optional(),
  targetMinutes: z.number().int().min(1).max(60),
  durationSeconds: z.number().int().min(0).max(7200),
  transcript: z.array(transcriptItemSchema),
});

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

type PedagogicalAnalysis = {
  detectedTopic: string;
  strengths: string[];
  improvements: string[];
  summaryComment: string;
};

async function analyzeTranscript(
  transcript: z.infer<typeof transcriptItemSchema>[],
  fallbackTopic?: string
): Promise<PedagogicalAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY.");
  }

  const fastModel =
    process.env.GEMINI_MODEL_FAST?.trim() || "gemini-3.5-flash-lite";

  const ai = new GoogleGenAI({ apiKey });

  const formattedConversation = transcript
    .map(
      (t) =>
        `${t.role === "user" ? "Alumno" : "Tutor"}: ${t.text}${
          t.correction ? ` [Corrección: ${t.correction.correctedSentence}]` : ""
        }`
    )
    .join("\n");

  const prompt = `
Transcripción de la sesión de speaking del alumno:
${formattedConversation}
`.trim();

  const systemInstruction = `
Eres un evaluador pedagógico experto en enseñanza de inglés como lengua extranjera (niveles MCER B1-B2).
Analiza la conversación del alumno y genera un informe de retroalimentación pedagógica en español.

REGLAS DE EVALUACIÓN:
1. detectedTopic: Un título temático conciso en español que resuma el tema central discutido (máx. 6 palabras, ej. "Tecnología y Trabajo Remoto", "Viajes y Cultura Gastronómica").
2. strengths: Un array de 2 o 3 fortalezas lingüísticas reales observadas (fluidez, riqueza léxica, coherencia, conectores).
3. improvements: Un array de 2 o 3 áreas de mejora concretas en español con un ejemplo o consejo práctico (ej. "Practica el uso del pasado simple con verbos irregulares como 'went' o 'bought'").
4. summaryComment: Un comentario motivador de cierre en español (2-3 frases) destacando su constancia y animándolo a seguir practicando.

Devuelve estrictamente un objeto JSON con este formato exacto:
{
  "detectedTopic": "string",
  "strengths": ["string", "string"],
  "improvements": ["string", "string"],
  "summaryComment": "string"
}
`.trim();

  try {
    const response = await llamarConReintentos(() =>
      ai.models.generateContent({
        model: fastModel,
        contents: prompt,
        config: {
          temperature: 0.4,
          maxOutputTokens: 450,
          responseMimeType: "application/json",
          systemInstruction,
        },
      })
    );

    const raw = response.text?.trim() ?? "";
    const clean = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: any = null;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Gemini no devolvió un objeto JSON válido");
    }

    return {
      detectedTopic:
        typeof parsed.detectedTopic === "string" && parsed.detectedTopic.trim()
          ? parsed.detectedTopic.trim()
          : fallbackTopic || "Conversación en inglés",
      strengths:
        Array.isArray(parsed.strengths) && parsed.strengths.length > 0
          ? parsed.strengths.filter((s: unknown) => typeof s === "string")
          : ["Participación activa y fluidez comunicativa en inglés"],
      improvements:
        Array.isArray(parsed.improvements) && parsed.improvements.length > 0
          ? parsed.improvements.filter((s: unknown) => typeof s === "string")
          : ["Seguir practicando estructuras verbales en pasado y conectores"],
      summaryComment:
        typeof parsed.summaryComment === "string" && parsed.summaryComment.trim()
          ? parsed.summaryComment.trim()
          : "Buen trabajo completando tu sesión de práctica.",
    };
  } catch (error) {
    console.error("[REPORTS_API_ERROR] Error generando análisis pedagógico:", error);
    return {
      detectedTopic: fallbackTopic || "Conversación en inglés",
      strengths: ["Participación activa y fluidez comunicativa en inglés"],
      improvements: ["Seguir practicando estructuras verbales en pasado y conectores"],
      summaryComment: "Buen trabajo completando tu sesión de práctica.",
    };
  }
}

// GET: Recuperar los ultimos 20 informes del usuario
export async function GET(request: NextRequest) {
  try {
    const userId =
      request.nextUrl.searchParams.get("userId") ||
      request.headers.get("x-user-id") ||
      request.cookies.get("interestalk-guest-id")?.value;

    if (!userId) {
      return jsonNoStore({ reports: [] });
    }

    const { data: reports, error } = await supabaseAdmin
      .from("speaking_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[REPORTS_API_ERROR] Error consultando speaking_reports:", error);
      return jsonNoStore({ reports: [] });
    }

    return jsonNoStore({
      reports: reports ?? [],
    });
  } catch (error) {
    console.error("[REPORTS_API_ERROR] Error en GET /api/voice/reports:", error);
    return jsonNoStore({ reports: [] });
  }
}

// POST: Generar informe y guardar en Supabase
export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return jsonNoStore({ error: "Solicitud demasiado grande." }, 413);
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return jsonNoStore({ error: "Solicitud demasiado grande." }, 413);
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return jsonNoStore({ error: "JSON no válido." }, 400);
    }

    const validation = createReportSchema.safeParse(parsedBody);
    if (!validation.success) {
      return jsonNoStore(
        { error: "Parámetros de informe no válidos." },
        400
      );
    }

    const { userId, topic, targetMinutes, durationSeconds, transcript } =
      validation.data;

    const userTurns = transcript.filter((t) => t.role === "user");

    let analysis: PedagogicalAnalysis;
    if (userTurns.length === 0) {
      analysis = {
        detectedTopic: topic || "Sesión de inicio",
        strengths: ["Sesión iniciada correctamente"],
        improvements: ["Participa con más intervenciones de voz para evaluar tu discurso"],
        summaryComment:
          "Sesión breve de contacto. En la próxima conversación, anímate a hablar durante todo el tiempo seleccionado.",
      };
    } else {
      analysis = await analyzeTranscript(transcript, topic);
    }

    const correctionsLog = transcript
      .filter((t) => t.role === "assistant" && t.correction)
      .map((t) => t.correction);

    let savedReport: any = null;

    try {
      const { data, error: insertError } = await supabaseAdmin
        .from("speaking_reports")
        .insert({
          user_id: userId,
          topic: analysis.detectedTopic,
          target_minutes: targetMinutes,
          duration_seconds: durationSeconds,
          turns_count: userTurns.length,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          corrections_log: correctionsLog,
          summary_comment: analysis.summaryComment,
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "[REPORTS_API_ERROR] Error guardando informe en Supabase:",
          insertError
        );
      } else {
        savedReport = data;
      }
    } catch (dbErr) {
      console.error("[REPORTS_API_ERROR] Excepción insertando informe en Supabase:", dbErr);
    }

    // Si la insercion en Supabase fallo por cualquier motivo, retornar informe en memoria con HTTP 200
    const finalReport = savedReport || {
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      topic: analysis.detectedTopic,
      target_minutes: targetMinutes,
      duration_seconds: durationSeconds,
      turns_count: userTurns.length,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      corrections_log: correctionsLog,
      summary_comment: analysis.summaryComment,
    };

    const errorsDetected = transcript.flatMap((turn) =>
      turn.role === "assistant" && turn.correction
        ? [turn.correction.grammarTip.trim().slice(0, 500)]
        : []
    );
    const { error: eventError } = await supabaseAdmin
      .from("learning_events")
      .insert({
        user_id: userId,
        skill: "speaking",
        topic: analysis.detectedTopic,
        level: null,
        score: null,
        duration_seconds: durationSeconds,
        errors_detected: errorsDetected,
        metadata: {
          reportId: savedReport?.id ?? null,
          turnsCount: userTurns.length,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
        },
      });

    if (eventError) {
      console.error(
        "[REPORTS_API_ERROR] Error guardando evento de Speaking:",
        eventError
      );
    }

    return jsonNoStore({
      report: finalReport,
      persisted: Boolean(savedReport),
      learningEventSaved: !eventError,
    }, 200);
  } catch (error) {
    console.error("[REPORTS_API_ERROR] Error en POST /api/voice/reports:", error);

    // Fallback completo garantizado: nunca dejar al usuario sin informe con HTTP 200
    const fallbackReport = {
      id: crypto.randomUUID(),
      user_id: "guest",
      created_at: new Date().toISOString(),
      topic: "Práctica de Speaking",
      target_minutes: 5,
      duration_seconds: 60,
      turns_count: 1,
      strengths: ["Participación activa y fluidez comunicativa en inglés"],
      improvements: ["Seguir practicando estructuras verbales en pasado y conectores"],
      summary_comment: "Buen trabajo completando tu sesión de práctica.",
      corrections_log: [],
    };

    return jsonNoStore({
      report: fallbackReport,
      persisted: false,
      learningEventSaved: false,
    }, 200);
  }
}
