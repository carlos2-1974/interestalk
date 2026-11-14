import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { llamarConReintentos } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ======================================================
// INTERESTALK - EVALUACION INTEGRAL DE NIVEL (CEFR)
// Evalua Grammar, Listening y Speaking con Gemini y
// persiste el nivel objetivo en user_learning_profiles.
// ======================================================

const MAX_BODY_BYTES = 16 * 1024;

const evaluacionInputSchema = z.object({
  userId: z.string().trim().min(1).max(200),
  interests: z.array(z.string().trim().min(1).max(100)).optional(),
  grammarScore: z.object({
    correct: z.number().int().min(0).max(20),
    total: z.number().int().min(1).max(20),
  }),
  listeningScore: z.object({
    correct: z.number().int().min(0).max(10),
    total: z.number().int().min(1).max(10),
  }),
  speakingTranscript: z.string().trim().max(3000),
});

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

type EvaluacionResult = {
  overallLevel: "B1" | "B2";
  breakdown: {
    grammar: string;
    listening: string;
    speaking: string;
  };
  strengths: string[];
  focusAreas: string[];
  recommendation: string;
};

async function evaluarConGemini(params: {
  interests: string[];
  grammarScore: { correct: number; total: number };
  listeningScore: { correct: number; total: number };
  speakingTranscript: string;
}): Promise<EvaluacionResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY.");
  }

  const fastModel =
    process.env.GEMINI_MODEL_FAST?.trim() || "gemini-3.5-flash-lite";

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Resultados del estudiante en la evaluación inicial:
- Gramática y Uso del Inglés: ${params.grammarScore.correct} de ${params.grammarScore.total} preguntas correctas.
- Comprensión Auditiva (Listening): ${params.listeningScore.correct} de ${params.listeningScore.total} preguntas correctas.
- Expresión Oral (Speaking Transcript): "${params.speakingTranscript || "(No proporcionó audio de voz)"}"
- Temas de interés del alumno: ${params.interests.join(", ") || "Tecnología, viajes"}.
`.trim();

  const systemInstruction = `
Eres un asesor pedagógico de inglés para adultos según el MCER (Marco Común Europeo).
Analiza las 3 competencias evaluadas y determina su nivel de partida para comenzar las sesiones de práctica.

REGLAS DE EVALUACIÓN:
1. overallLevel: Debe ser estrictamente "B1" o "B2". Asigna "B2" únicamente si el alumno demuestra coherencia oral sólida, vocabulario variado y buenos aciertos en gramática/listening; en caso contrario, asigna "B1" para construir una base firme de confianza.
2. breakdown:
   - grammar: Nivel estimado y comentario breve (ej. "B1 - Buen dominio de tiempos verbales principales").
   - listening: Nivel estimado y comentario breve (ej. "B1 - Comprensión adecuada de ideas centrales").
   - speaking: Nivel estimado evaluando fluidez léxica y estructura de su respuesta grabada.
3. strengths: Array de 2 fortalezas en español.
4. focusAreas: Array de 2 áreas de mejora prioritarias en español.
5. recommendation: Consejo pedagógico motivador en español (2 frases breves).

Devuelve estrictamente un objeto JSON:
{
  "overallLevel": "B1" | "B2",
  "breakdown": {
    "grammar": "string",
    "listening": "string",
    "speaking": "string"
  },
  "strengths": ["string", "string"],
  "focusAreas": ["string", "string"],
  "recommendation": "string"
}
`.trim();

  try {
    const response = await llamarConReintentos(() =>
      ai.models.generateContent({
        model: fastModel,
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 350,
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

    const parsed = JSON.parse(clean);

    const level: "B1" | "B2" = parsed?.overallLevel === "B2" ? "B2" : "B1";

    return {
      overallLevel: level,
      breakdown: {
        grammar:
          typeof parsed?.breakdown?.grammar === "string"
            ? parsed.breakdown.grammar
            : `${level} - Uso práctico del idioma`,
        listening:
          typeof parsed?.breakdown?.listening === "string"
            ? parsed.breakdown.listening
            : `${level} - Comprensión general de ideas`,
        speaking:
          typeof parsed?.breakdown?.speaking === "string"
            ? parsed.breakdown.speaking
            : `${level} - Capacidad comunicativa funcional`,
      },
      strengths: Array.isArray(parsed?.strengths) && parsed.strengths.length > 0
        ? parsed.strengths.filter((s: unknown) => typeof s === "string")
        : ["Iniciativa comunicativa constante", "Buena comprensión auditiva"],
      focusAreas: Array.isArray(parsed?.focusAreas) && parsed.focusAreas.length > 0
        ? parsed.focusAreas.filter((s: unknown) => typeof s === "string")
        : ["Consolidar conectores discursivos", "Mayor precisión en tiempos verbales"],
      recommendation:
        typeof parsed?.recommendation === "string"
          ? parsed.recommendation
          : "Te recomendamos comenzar con sesiones de Speaking de 5 o 10 minutos para ganar agilidad sin saturarte.",
    };
  } catch (error) {
    console.error("[DIAGNOSTICO_EVALUAR_ERROR] Error en Gemini:", error);

    // Fallback determinista seguro
    const grammarRatio = params.grammarScore.correct / Math.max(1, params.grammarScore.total);
    const listeningRatio = params.listeningScore.correct / Math.max(1, params.listeningScore.total);
    const hasLongSpeech = params.speakingTranscript.length > 80;

    const assignedLevel: "B1" | "B2" =
      grammarRatio >= 0.8 && listeningRatio >= 0.8 && hasLongSpeech ? "B2" : "B1";

    return {
      overallLevel: assignedLevel,
      breakdown: {
        grammar: `${assignedLevel} - Nivel funcional en estructuras clave`,
        listening: `${assignedLevel} - Adecuada captura de información principal`,
        speaking: `${assignedLevel} - Expresión directa orientada a tus intereses`,
      },
      strengths: [
        "Buena base para la comunicación cotidiana",
        "Disposición activa para expresarse en inglés",
      ],
      focusAreas: [
        "Afianzar concordancia en descripciones más complejas",
        "Practicar la fluidez en turnos orales continuos",
      ],
      recommendation:
        "Tu nivel es ideal para aprovechar la práctica activa. Enfócate en sesiones diarias cortas para automatizar tu habla.",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return jsonNoStore({ error: "Solicitud demasiado grande." }, 413);
    }

    const rawBody: unknown = await request.json();
    const validation = evaluacionInputSchema.safeParse(rawBody);

    if (!validation.success) {
      return jsonNoStore(
        { error: "Datos de diagnóstico no válidos.", details: validation.error.format() },
        400
      );
    }

    const { userId, interests = ["Tecnología", "Viajes"], grammarScore, listeningScore, speakingTranscript } =
      validation.data;

    // 1. Evaluar las 3 destrezas con Gemini
    const evaluation = await evaluarConGemini({
      interests,
      grammarScore,
      listeningScore,
      speakingTranscript,
    });

    // 2. Persistir el nivel, el estado del diagnóstico y la evidencia inicial.
    const { error: profileError } = await supabaseAdmin
      .from("user_learning_profiles")
      .upsert(
        {
          user_id: userId,
          level: evaluation.overallLevel,
          interests: interests.length > 0 ? interests : ["Tecnología", "Viajes"],
          diagnostic_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      console.error(
        "[DIAGNOSTICO_EVALUAR_ERROR] Error guardando perfil:",
        profileError
      );
      return jsonNoStore(
        { error: "No se pudo guardar el nivel del alumno." },
        500
      );
    }

    const diagnosticScore = Math.round(
      (
        (grammarScore.correct / grammarScore.total) * 100 +
        (listeningScore.correct / listeningScore.total) * 100
      ) / 2
    );
    const { error: eventError } = await supabaseAdmin
      .from("learning_events")
      .insert({
        user_id: userId,
        skill: "diagnostic",
        topic: "Evaluación inicial",
        level: evaluation.overallLevel,
        score: diagnosticScore,
        duration_seconds: 0,
        errors_detected: evaluation.focusAreas,
        metadata: {
          grammar: grammarScore,
          listening: listeningScore,
          breakdown: evaluation.breakdown,
          strengths: evaluation.strengths,
          focusAreas: evaluation.focusAreas,
          recommendation: evaluation.recommendation,
        },
      });

    if (eventError) {
      console.error(
        "[DIAGNOSTICO_EVALUAR_ERROR] Error guardando evento diagnóstico:",
        eventError
      );
      return jsonNoStore(
        { error: "No se pudo guardar la evidencia del diagnóstico." },
        500
      );
    }

    return jsonNoStore({
      success: true,
      evaluation,
    });
  } catch (error) {
    console.error("[DIAGNOSTICO_EVALUAR_ERROR] Error general:", error);
    return jsonNoStore({ error: "No se pudo procesar la evaluación integral." }, 500);
  }
}
