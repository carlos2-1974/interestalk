import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { llamarConReintentos } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { synthesizeSpeech, type Neural2Voice } from "@/lib/tts";
import {
  DAILY_SPEAKING_LIMIT_SECONDS,
  getAuthenticatedSupabaseUser,
  getDailySpeakingSecondsUsed,
  incrementDailySpeakingSeconds,
  incrementDailyTtsCharacters,
} from "@/lib/voice-quotas";

// ======================================================
// INTERESTALK - ENDPOINT POST /api/voice/speaking
// Limite diario estricto: 1.200 segundos (20 min) / dia.
// Conversacion B1-B2 adaptada a intereses (max 45 palabras)
// con GEMINI_MODEL_FAST + Google Cloud TTS Neural2.
// ======================================================

const MAX_BODY_BYTES = 16 * 1024;

const speakingSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  interests: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(5)
    .optional(),
  level: z.enum(["B1", "B2"]).optional(),
  voice: z.enum(["en-US-Neural2-F", "en-GB-Neural2-B"]).optional(),
  durationSeconds: z.number().int().min(1).max(300).optional(),
  isTimeAlmostUp: z.boolean().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(800),
      })
    )
    .max(6)
    .optional(),
});

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function sanitizeAndCapReplyWords(rawReply: string, maxWords: number): string {
  // Limpiar formato Markdown para que TTS pronuncie texto natural
  const plain = rawReply
    .replace(/[*_`#~>]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) {
    return "That sounds really interesting! Could you tell me a little more about what you think?";
  }

  const words = plain.split(" ");
  if (words.length <= maxWords) {
    return plain;
  }

  const capped = words.slice(0, maxWords).join(" ");
  const lastSentenceEnd = Math.max(
    capped.lastIndexOf("."),
    capped.lastIndexOf("!"),
    capped.lastIndexOf("?")
  );

  if (lastSentenceEnd >= Math.floor(capped.length * 0.55)) {
    return capped.slice(0, lastSentenceEnd + 1).trim();
  }

  const cleanedEnd = capped.replace(/[,;:\-]+$/, "").trim();
  return /[.!?]$/.test(cleanedEnd) ? cleanedEnd : `${cleanedEnd}.`;
}

function estimateSpeakingSeconds(
  userMessage: string,
  replyText: string,
  reportedDurationSeconds?: number
): number {
  const userWords = userMessage.trim().split(/\s+/).filter(Boolean).length;
  const replyWords = replyText.trim().split(/\s+/).filter(Boolean).length;

  // ~145 palabras por minuto (~2.4 palabras/seg) a speakingRate 0.98
  const estimatedReplySeconds = Math.max(2, Math.ceil(replyWords / 2.4));
  const estimatedUserSeconds = Math.max(2, Math.ceil(userWords / 2.4));
  const estimatedTurnSeconds = estimatedUserSeconds + estimatedReplySeconds;

  if (typeof reportedDurationSeconds === "number") {
    return Math.max(reportedDurationSeconds, estimatedReplySeconds);
  }

  return estimatedTurnSeconds;
}

type SpeakingAiResponse = {
  replyText: string;
  hasError: boolean;
  correctedSentence: string | null;
  grammarTip: string | null;
  sessionEnded: boolean;
};

function getErrorLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0
  );
}

async function getRecentLearningFocus(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("learning_events")
    .select("skill,errors_detected")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error(
      "[SPEAKING_API_ERROR] Error consultando memoria educativa:",
      error
    );
    throw new Error("No se pudo consultar la memoria educativa reciente.");
  }

  const counts = new Map<string, { label: string; count: number }>();
  for (const event of data ?? []) {
    const eventLabels = new Map(
      getErrorLabels(event.errors_detected).map((value) => [
        `${event.skill}: ${value.trim()}`.toLocaleLowerCase(),
        `${event.skill}: ${value.trim()}`,
      ])
    );
    for (const [key, label] of eventLabels) {
      const current = counts.get(key);
      counts.set(key, {
        label: current?.label ?? label,
        count: (current?.count ?? 0) + 1,
      });
    }
  }

  const ordered = Array.from(counts.values()).sort(
    (a, b) => b.count - a.count
  );
  const recurrent = ordered.filter((item) => item.count > 1);
  return (recurrent.length > 0 ? recurrent : ordered)
    .slice(0, 5)
    .map((item) => item.label);
}

async function generateSpeakingReply(params: {
  message: string;
  interests: string[];
  level: "B1" | "B2";
  history: Array<{ role: "user" | "assistant"; text: string }>;
  recentLearningFocus: string[];
  isTimeAlmostUp?: boolean;
}): Promise<SpeakingAiResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta la variable de entorno GEMINI_API_KEY.");
  }

  const fastModel =
    process.env.GEMINI_MODEL_FAST?.trim() || "gemini-3.5-flash-lite";

  const ai = new GoogleGenAI({ apiKey });

  const historyBlock =
    params.history.length > 0
      ? params.history
          .map(
            (turn) =>
              `${turn.role === "user" ? "Student" : "Tutor"}: ${turn.text}`
          )
          .join("\n")
      : "No prior turns.";

  const prompt = `
Recent conversation context:
${historyBlock}

Student's latest message:
${params.message}
`.trim();

  const systemInstruction = `
You are Interestalk's live English tutor.
Target CEFR level: ${params.level} (intermediate B1-B2).
Student interests: ${params.interests.join(", ")}.
Recent learning evidence to reinforce gently: ${
    params.recentLearningFocus.join("; ") ||
    "No recurring learning errors have been recorded yet."
  }.

PEDAGOGICAL & EVALUATION RULES:
1. Carefully evaluate the student's latest message. Ignore minor punctuation or voice-transcription glitches. Never correct the student or ask them to repeat a sentence that appears incomplete or cut off mid-thought; respond naturally and give them room to continue.
   When relevant, naturally reinforce the recent learning evidence above without forcing the topic or correcting a correct sentence.
2. If NO significant grammar, structural, verb tense, or vocabulary error is present (hasError: false):
   - replyText: Respond warmly, naturally, and concisely (30-40 words maximum) connecting to their interests and ending with ONE short follow-up question.
   - correctedSentence: null
   - grammarTip: null
3. If there is a CLEAR grammar, tense, or structural error (hasError: true):
   - replyText: Warmly provide the natural phrasing and ask them to repeat it aloud (maximum 45 words, plain text without Markdown or asterisks).
     Example: "Nice idea! A quick tip: instead of 'I go yesterday', say: 'I went yesterday.' Can you repeat that sentence?"
   - correctedSentence: The natural, correct full sentence in English.
   - grammarTip: An ultra-brief Spanish explanation of the rule (maximum 12 words, e.g. "Usa el pasado simple ('went') para acciones finalizadas.").
   - Repetition loop: If the previous tutor turn already asked for a repetition and the student repeated it properly, praise them warmly ("Great job!") and transition back to the conversational topic (hasError: false).
4. SESSION CLOSING (sessionEnded):
   - If isTimeAlmostUp (${params.isTimeAlmostUp ? "YES" : "NO"}) is true or the student is saying farewell/goodbye:
     Conclude warmly in 25-35 words, praise their speaking practice today, say goodbye, do NOT ask any more questions, and set sessionEnded: true.
5. Plain spoken text ONLY in replyText: no asterisks, no bullet points, no emojis, no quotes.
6. Output valid JSON matching the schema.
`.trim();

  let response: any;
  try {
    response = await llamarConReintentos(() =>
      ai.models.generateContent({
        model: fastModel,
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 300,
          responseMimeType: "application/json",
          systemInstruction,
        },
      })
    );
  } catch (err) {
    console.error("[SPEAKING_API_ERROR] Error al llamar a Gemini:", err);
    throw err;
  }

  const rawText = response?.text?.trim() ?? "";
  const cleanedText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    // Si vino con texto adicional alrededor, intentar extraer el primer bloque JSON
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = null;
      }
    }
  }

  // Fallback seguro sin caída: si el JSON no es válido, usar el texto limpio directamente
  if (!parsed || typeof parsed !== "object") {
    console.warn(
      "[SPEAKING_API_ERROR] Gemini no devolvio JSON valido, aplicando fallback suave:",
      rawText
    );
    const fallbackText = sanitizeAndCapReplyWords(
      cleanedText || "That is really interesting! Could you tell me a little more?",
      40
    );
    const isFarewellFallback =
      /\b(bye|goodbye|see you|have to go|gotta go|talk to you later|have a good day|have a nice day|good night)\b/i.test(
        params.message
      );
    return {
      replyText: fallbackText,
      hasError: false,
      correctedSentence: null,
      grammarTip: null,
      sessionEnded: Boolean(params.isTimeAlmostUp) || isFarewellFallback,
    };
  }

  const cap = parsed?.hasError ? 45 : 40;
  const replyText = sanitizeAndCapReplyWords(
    parsed?.replyText || "That sounds interesting! Could you tell me a little more?",
    cap
  );

  const isFarewell =
    /\b(bye|goodbye|see you|have to go|gotta go|talk to you later|have a good day|have a nice day|good night)\b/i.test(
      params.message
    );
  const sessionEnded =
    Boolean(parsed?.sessionEnded) || Boolean(params.isTimeAlmostUp) || isFarewell;

  return {
    replyText,
    hasError: Boolean(parsed?.hasError),
    correctedSentence:
      parsed?.hasError && typeof parsed?.correctedSentence === "string"
        ? parsed.correctedSentence.trim()
        : null,
    grammarTip:
      parsed?.hasError && typeof parsed?.grammarTip === "string"
        ? parsed.grammarTip.trim()
        : null,
    sessionEnded,
  };
}

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const user = await getAuthenticatedSupabaseUser(request);
  if (user?.id) {
    return user.id;
  }

  const guestHeader = request.headers.get("x-guest-user-id");
  if (guestHeader && z.string().uuid().safeParse(guestHeader).success) {
    return guestHeader;
  }

  const guestCookie = request.cookies.get("interestalk-guest-id")?.value;
  if (guestCookie && z.string().uuid().safeParse(guestCookie).success) {
    return guestCookie;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return jsonNoStore({ error: "UNAUTHORIZED" }, 401);
    }

    const usedSeconds = await getDailySpeakingSecondsUsed(userId);
    const remainingSeconds = Math.max(
      0,
      DAILY_SPEAKING_LIMIT_SECONDS - usedSeconds
    );

    return jsonNoStore({
      totalSeconds: DAILY_SPEAKING_LIMIT_SECONDS,
      usedSeconds,
      remainingSeconds,
    });
  } catch (error) {
    console.error("Error en GET /api/voice/speaking:", error);
    return jsonNoStore(
      { error: "No se pudo consultar la cuota de speaking." },
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar sesion del usuario en Supabase (o invitado identificado con UUID)
    const userId = await resolveUserId(request);
    if (!userId) {
      return jsonNoStore(
        { error: "UNAUTHORIZED" },
        401
      );
    }

    // 2. Validar tamano y estructura de la solicitud
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return jsonNoStore(
        { error: "Solicitud demasiado grande." },
        413
      );
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return jsonNoStore(
        { error: "Solicitud demasiado grande." },
        413
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return jsonNoStore({ error: "JSON no valido." }, 400);
    }

    const validation = speakingSchema.safeParse(parsedBody);
    if (!validation.success) {
      return jsonNoStore(
        { error: "Parametros de speaking no validos." },
        400
      );
    }

    const {
      message,
      interests = ["daily life", "technology", "travel"],
      level = "B1",
      voice = "en-US-Neural2-F",
      durationSeconds,
      isTimeAlmostUp,
      history = [],
    } = validation.data;

    // 3. Comprobar cuota diaria antes de invocar Gemini o Google TTS
    const usedSeconds = await getDailySpeakingSecondsUsed(userId);

    if (
      usedSeconds >= DAILY_SPEAKING_LIMIT_SECONDS ||
      (durationSeconds !== undefined &&
        usedSeconds + durationSeconds > DAILY_SPEAKING_LIMIT_SECONDS)
    ) {
      return jsonNoStore(
        {
          error: "DAILY_SPEAKING_LIMIT_REACHED",
          remainingSeconds: 0,
        },
        429
      );
    }

    const recentLearningFocus = await getRecentLearningFocus(userId);

    // 4. Generar respuesta conversacional con evaluacion pedagogica y correccion guiada
    const aiResult = await generateSpeakingReply({
      message,
      interests,
      level,
      history,
      recentLearningFocus,
      isTimeAlmostUp,
    });

    const secondsToCharge = estimateSpeakingSeconds(
      message,
      aiResult.replyText,
      durationSeconds
    );

    // 5. Incrementar speaking_seconds de forma atomica antes de consumir cuota TTS
    const quotaUpdate = await incrementDailySpeakingSeconds(
      userId,
      secondsToCharge
    );

    if (!quotaUpdate.allowed) {
      return jsonNoStore(
        {
          error: "DAILY_SPEAKING_LIMIT_REACHED",
          remainingSeconds: 0,
        },
        429
      );
    }

    // 6. Sintetizar audio MP3 con Google Cloud TTS Neural2
    const selectedVoice: Neural2Voice = voice;
    let audioBuffer: Buffer;
    let charactersConsumed: number;
    try {
      const ttsResult = await synthesizeSpeech(
        aiResult.replyText,
        selectedVoice
      );
      audioBuffer = ttsResult.audioBuffer;
      charactersConsumed = ttsResult.charactersConsumed;
    } catch (ttsErr) {
      console.error("[SPEAKING_API_ERROR] Error al sintetizar voz con Google TTS:", ttsErr);
      throw ttsErr;
    }

    // 7. Registrar caracteres TTS consumidos hoy en Supabase de forma asincrona para no anadir latencia de red
    void incrementDailyTtsCharacters(userId, charactersConsumed).catch((err) => {
      console.error("[SPEAKING_API_ERROR] Error en background incrementDailyTtsCharacters:", err);
    });

    return jsonNoStore({
      replyText: aiResult.replyText,
      audioBase64: audioBuffer.toString("base64"),
      remainingSeconds: quotaUpdate.remainingSeconds,
      sessionEnded: aiResult.sessionEnded,
      correction:
        aiResult.hasError && aiResult.correctedSentence
          ? {
              correctedSentence: aiResult.correctedSentence,
              grammarTip: aiResult.grammarTip || "",
            }
          : null,
    });
  } catch (error) {
    console.error("[SPEAKING_API_ERROR] Detalle completo del fallo en speaking/route.ts:", error);
    return jsonNoStore(
      { error: "No se pudo procesar el turno de conversacion." },
      500
    );
  }
}
