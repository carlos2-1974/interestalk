import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { synthesizeSpeech, type Neural2Voice } from "@/lib/tts";
import {
  SYSTEM_POOL_USER_ID,
  getAuthenticatedSupabaseUser,
  incrementDailyTtsCharacters,
} from "@/lib/voice-quotas";

// ======================================================
// INTERESTALK - ENDPOINT POST /api/voice/listening
// Cache SHA-256 en Supabase Storage (bucket: listening-audio)
// para evitar regenerar audios repetidos en Google TTS.
// ======================================================

const MAX_BODY_BYTES = 16 * 1024;
const LISTENING_BUCKET = "listening-audio";

const listeningSchema = z.object({
  lessonId: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(5000),
  voice: z.enum(["en-US-Neural2-F", "en-GB-Neural2-B"]).optional(),
});

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function ensureListeningBucketExists(): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(LISTENING_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["audio/mpeg"],
  });

  if (
    error &&
    !error.message.toLowerCase().includes("already exists") &&
    !error.message.toLowerCase().includes("duplicate")
  ) {
    throw new Error(
      `No se pudo inicializar el bucket ${LISTENING_BUCKET}: ${error.message}`
    );
  }
}

async function checkCachedAudioExists(objectPath: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin.storage
      .from(LISTENING_BUCKET)
      .exists(objectPath);

    return Boolean(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (message.includes("bucket not found") || message.includes("not found")) {
      await ensureListeningBucketExists();
      return false;
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validar tamano y cuerpo JSON
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

    const validation = listeningSchema.safeParse(parsedBody);
    if (!validation.success) {
      return jsonNoStore(
        { error: "Parametros de listening no validos." },
        400
      );
    }

    const { lessonId, text, voice } = validation.data;
    const selectedVoice: Neural2Voice = voice ?? "en-US-Neural2-F";

    // 2. Calcular hash SHA-256 determinista de (lessonId + voice + text)
    const hash = createHash("sha256")
      .update(lessonId + selectedVoice + text, "utf8")
      .digest("hex");

    const objectPath = `${hash}.mp3`;

    // 3. Comprobar existencia en cache dentro de Supabase Storage
    const existsInCache = await checkCachedAudioExists(objectPath);

    if (existsInCache) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(LISTENING_BUCKET)
        .getPublicUrl(objectPath);

      return jsonNoStore({
        audioUrl: publicUrlData.publicUrl,
        cached: true,
      });
    }

    // 4. Cache miss: sintetizar MP3 con Google Cloud TTS Neural2 (<= 1.200 chars)
    const { audioBuffer, charactersConsumed } = await synthesizeSpeech(
      text,
      selectedVoice
    );

    // 5. Subir MP3 al bucket publico listening-audio
    let { error: uploadError } = await supabaseAdmin.storage
      .from(LISTENING_BUCKET)
      .upload(objectPath, audioBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "31536000",
        upsert: true,
      });

    if (
      uploadError &&
      uploadError.message.toLowerCase().includes("bucket not found")
    ) {
      await ensureListeningBucketExists();
      const retryUpload = await supabaseAdmin.storage
        .from(LISTENING_BUCKET)
        .upload(objectPath, audioBuffer, {
          contentType: "audio/mpeg",
          cacheControl: "31536000",
          upsert: true,
        });
      uploadError = retryUpload.error;
    }

    if (uploadError) {
      throw new Error(
        `Error subiendo audio a Supabase Storage: ${uploadError.message}`
      );
    }

    // 6. Sumar tts_characters del dia en daily_usage_quotas
    const user = await getAuthenticatedSupabaseUser(request);
    const quotaOwnerId = user?.id ?? SYSTEM_POOL_USER_ID;
    await incrementDailyTtsCharacters(quotaOwnerId, charactersConsumed);

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(LISTENING_BUCKET)
      .getPublicUrl(objectPath);

    return jsonNoStore({
      audioUrl: publicUrlData.publicUrl,
      cached: false,
    });
  } catch (error) {
    console.error("Error en POST /api/voice/listening:", error);
    return jsonNoStore(
      { error: "No se pudo obtener o sintetizar el audio de listening." },
      500
    );
  }
}
