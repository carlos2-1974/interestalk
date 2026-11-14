"use client";

// ======================================================
// INTERESTALK - CLIENTE DE VOZ Y CUOTAS (NAVEGADOR)
// Gestiona el identificador de usuario (autenticado o invitado)
// y las llamadas a los endpoints de Speaking y Listening.
// ======================================================

const GUEST_STORAGE_KEY = "interestalk.guest-user-id.v1";
let guestUserIdInMemory: string | null = null;

function createClientUserId(): string {
  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  if (typeof window.crypto?.getRandomValues === "function") {
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function getOrCreateClientUserId(): string {
  if (typeof window === "undefined") {
    return "00000000-0000-0000-0000-000000000000";
  }

  let id = guestUserIdInMemory;
  try {
    id = window.localStorage.getItem(GUEST_STORAGE_KEY) || id;
  } catch {
    // Use the in-memory identifier when storage is disabled.
  }
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    id = createClientUserId();
  }
  guestUserIdInMemory = id;
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, id);
  } catch {
    // Keep the identifier available for this page session.
  }

  // Establecer cookie para que el servidor la reciba en SSR / API
  try {
    document.cookie = `interestalk-guest-id=${id}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Silencioso en entornos con restricciones de cookies
  }

  return id;
}

export type SpeakingQuotaResponse = {
  totalSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
};

export async function fetchSpeakingQuota(): Promise<SpeakingQuotaResponse | null> {
  const userId = getOrCreateClientUserId();

  try {
    const res = await fetch("/api/voice/speaking", {
      method: "GET",
      headers: {
        "x-guest-user-id": userId,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as SpeakingQuotaResponse;
  } catch {
    return null;
  }
}

export type SpeakingTurnRequest = {
  message: string;
  interests?: string[];
  level?: "B1" | "B2";
  voice?: "en-US-Neural2-F" | "en-GB-Neural2-B";
  durationSeconds?: number;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  isTimeAlmostUp?: boolean;
};

export type GrammarCorrection = {
  correctedSentence: string;
  grammarTip: string;
};

export type SpeakingTurnSuccess = {
  ok: true;
  replyText: string;
  audioBase64: string;
  remainingSeconds: number;
  correction?: GrammarCorrection | null;
  sessionEnded?: boolean;
};

export type SpeakingTurnError = {
  ok: false;
  status: number;
  errorCode: string;
  remainingSeconds?: number;
  message: string;
};

export type SpeakingTurnResult = SpeakingTurnSuccess | SpeakingTurnError;

export async function sendSpeakingTurn(
  params: SpeakingTurnRequest,
  signal?: AbortSignal
): Promise<SpeakingTurnResult> {
  const userId = getOrCreateClientUserId();

  try {
    const res = await fetch("/api/voice/speaking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-user-id": userId,
      },
      cache: "no-store",
      signal,
      body: JSON.stringify(params),
    });

    const data: unknown = await res.json();

    if (!res.ok) {
      const errPayload = data as { error?: string; remainingSeconds?: number };
      return {
        ok: false,
        status: res.status,
        errorCode: errPayload?.error ?? `HTTP_${res.status}`,
        remainingSeconds: errPayload?.remainingSeconds,
        message:
          res.status === 429
            ? "Has alcanzado tu límite diario de 20 minutos de speaking. Tu cuota se renovará mañana."
            : "No se pudo procesar la conversación en este momento.",
      };
    }

    const successData = data as {
      replyText: string;
      audioBase64: string;
      remainingSeconds: number;
      correction?: GrammarCorrection | null;
      sessionEnded?: boolean;
    };

    return {
      ok: true,
      replyText: successData.replyText,
      audioBase64: successData.audioBase64,
      remainingSeconds: successData.remainingSeconds,
      correction: successData.correction ?? null,
      sessionEnded: Boolean(successData.sessionEnded),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        status: 0,
        errorCode: "ABORTED",
        message: "La petición se canceló para continuar escuchando.",
      };
    }
    return {
      ok: false,
      status: 0,
      errorCode: "NETWORK_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Error de conexión con el servidor de voz.",
    };
  }
}

export type SpeakingReport = {
  id: string;
  user_id: string;
  created_at: string;
  topic: string;
  target_minutes: number;
  duration_seconds: number;
  turns_count: number;
  strengths: string[];
  improvements: string[];
  corrections_log: GrammarCorrection[];
  summary_comment: string;
};

export async function fetchSpeakingReports(
  userId: string
): Promise<SpeakingReport[]> {
  try {
    const res = await fetch(`/api/voice/reports?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { reports?: SpeakingReport[] };
    return data.reports ?? [];
  } catch {
    return [];
  }
}

export async function generateAndSaveReport(params: {
  userId: string;
  topic?: string;
  targetMinutes: number;
  durationSeconds: number;
  transcript: Array<{
    role: "user" | "assistant";
    text: string;
    correction?: GrammarCorrection | null;
  }>;
}): Promise<SpeakingReport | null> {
  try {
    const res = await fetch("/api/voice/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(params),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      report?: SpeakingReport;
      persisted?: boolean;
    };
    if (data.persisted === false) return null;
    return data.report ?? null;
  } catch {
    return null;
  }
}

export type ListeningAudioResult =
  | {
      ok: true;
      audioUrl: string;
      cached: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export async function fetchListeningAudio(params: {
  lessonId: string;
  text: string;
  voice?: "en-US-Neural2-F" | "en-GB-Neural2-B";
}): Promise<ListeningAudioResult> {
  const userId = getOrCreateClientUserId();

  try {
    const res = await fetch("/api/voice/listening", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-user-id": userId,
      },
      cache: "no-store",
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        ok: false,
        message: err.error ?? "No se pudo cargar el audio de listening.",
      };
    }

    const data = (await res.json()) as { audioUrl: string; cached: boolean };
    return {
      ok: true,
      audioUrl: data.audioUrl,
      cached: data.cached,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Error de red al conectar con el servicio de listening.",
    };
  }
}
