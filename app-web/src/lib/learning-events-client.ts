"use client";

export type LearningSkill =
  | "grammar"
  | "listening"
  | "speaking"
  | "diagnostic";

export type LearningEventInput = {
  skill: LearningSkill;
  topic?: string | null;
  level?: string | null;
  score?: number | null;
  durationSeconds?: number;
  errorsDetected?: string[];
  metadata?: Record<string, unknown>;
};

export async function registerLearningEvent(
  userId: string,
  event: LearningEventInput
): Promise<void> {
  const response = await fetch("/api/learning/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-guest-user-id": userId,
    },
    cache: "no-store",
    body: JSON.stringify({ userId, ...event }),
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "No se pudo guardar la actividad en el historial educativo.";
    throw new Error(message);
  }
}
