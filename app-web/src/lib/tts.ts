import "server-only";

// ======================================================
// INTERESTALK - SERVICIO GOOGLE CLOUD TTS (NEURAL2)
// Usa estrictamente voces Neural2 via REST API v1 para
// mantenerse dentro del tramo gratuito (1M chars/mes).
// Prohibido usar modelos Gemini-TTS facturados por token.
// ======================================================

export type Neural2Voice = "en-US-Neural2-F" | "en-GB-Neural2-B";

export type SynthesizeSpeechResult = {
  audioBuffer: Buffer;
  charactersConsumed: number;
};

export const MAX_TTS_CHARS_PER_CALL = 1200;

const NEURAL2_VOICE_CONFIG: Record<
  Neural2Voice,
  { languageCode: "en-US" | "en-GB" }
> = {
  "en-US-Neural2-F": { languageCode: "en-US" },
  "en-GB-Neural2-B": { languageCode: "en-GB" },
};

/**
 * Normaliza y trunca de forma segura un texto a un maximo de 1.200 caracteres
 * (puntos de codigo Unicode) intentando cortar en limite de oracion o palabra.
 */
export function prepareTtsText(
  rawText: string,
  maxChars: number = MAX_TTS_CHARS_PER_CALL
): { text: string; characterCount: number } {
  if (typeof rawText !== "string") {
    throw new Error("El texto para TTS debe ser una cadena valida.");
  }

  const normalized = rawText.replace(/\s+/g, " ").trim();

  if (!normalized) {
    throw new Error("El texto para TTS no puede estar vacio.");
  }

  const codePoints = Array.from(normalized);

  if (codePoints.length <= maxChars && normalized.length <= maxChars) {
    return {
      text: normalized,
      characterCount: codePoints.length,
    };
  }

  let truncated = codePoints.slice(0, maxChars).join("");

  // Asegurar tambien limite UTF-16 por seguridad estricta
  while (truncated.length > maxChars) {
    truncated = Array.from(truncated).slice(0, -1).join("");
  }

  // Intentar corte limpio en fin de frase o espacio cercano al final
  const sentenceMatch = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  );

  if (sentenceMatch >= Math.floor(maxChars * 0.75)) {
    truncated = truncated.slice(0, sentenceMatch + 1).trim();
  } else {
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace >= Math.floor(maxChars * 0.85)) {
      truncated = truncated.slice(0, lastSpace).trim();
    } else {
      truncated = truncated.trim();
    }
  }

  if (!truncated) {
    throw new Error("El texto truncado para TTS quedo vacio.");
  }

  return {
    text: truncated,
    characterCount: Array.from(truncated).length,
  };
}

type GoogleTtsResponse = {
  audioContent?: string;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export async function synthesizeSpeech(
  text: string,
  voiceName: Neural2Voice = "en-US-Neural2-F"
): Promise<SynthesizeSpeechResult> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Error de configuracion: falta la variable de entorno GOOGLE_TTS_API_KEY."
    );
  }

  const voiceConfig = NEURAL2_VOICE_CONFIG[voiceName];

  if (!voiceConfig) {
    throw new Error(
      "Voz TTS no permitida. Solo se admiten voces Neural2 autorizadas."
    );
  }

  const { text: safeText, characterCount } = prepareTtsText(
    text,
    MAX_TTS_CHARS_PER_CALL
  );

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(
    apiKey
  )}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      input: {
        text: safeText,
      },
      voice: {
        languageCode: voiceConfig.languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 0.98,
      },
    }),
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errBody = (await response.json()) as GoogleTtsResponse;
      if (errBody?.error?.message) {
        errorDetail = `${errorDetail}: ${errBody.error.message}`;
      }
    } catch {
      // Ignorar fallo de parseo de cuerpo de error sin exponer la API key
    }

    throw new Error(`Fallo en Google Cloud TTS (${errorDetail}).`);
  }

  const payload = (await response.json()) as GoogleTtsResponse;

  if (!payload.audioContent || typeof payload.audioContent !== "string") {
    throw new Error("Google Cloud TTS no devolvio contenido de audio MP3.");
  }

  const audioBuffer = Buffer.from(payload.audioContent, "base64");

  if (audioBuffer.byteLength === 0) {
    throw new Error("El buffer MP3 devuelto por Google Cloud TTS esta vacio.");
  }

  return {
    audioBuffer,
    charactersConsumed: characterCount,
  };
}
