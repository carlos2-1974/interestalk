import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type LearningProfileRow = {
  user_id: string;
  diagnostic_completed: boolean | null;
  interests: unknown;
  custom_topics: unknown;
};

type LearningEventRow = {
  user_id: string;
  skill: string;
  duration_seconds: number | null;
  created_at: string;
  errors_detected: unknown;
};

type SpeakingReportRow = {
  user_id: string;
  duration_seconds: number | null;
  created_at: string;
};

type DailyQuotaRow = {
  user_id: string;
  usage_date: string;
  speaking_seconds: number | null;
};

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function getAllRows<T>(
  table: "user_learning_profiles" | "learning_events" | "speaking_reports",
  columns: string
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`No se pudo consultar ${table}: ${error.message}`);
    }

    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function getErrorConcepts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): string[] => {
    if (typeof item === "string" && item.trim()) return [item.trim()];
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const label = record.concept ?? record.label ?? record.error;
      if (typeof label === "string" && label.trim()) return [label.trim()];
    }
    return [];
  });
}

function getStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function getDay(value: string): string {
  return value.slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return jsonNoStore({ error: "FORBIDDEN" }, 403);
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(tokenMatch[1]);
    if (
      error ||
      !data.user ||
      !adminEmail ||
      data.user.email?.trim().toLowerCase() !== adminEmail
    ) {
      return jsonNoStore({ error: "FORBIDDEN" }, 403);
    }
  } catch {
    return jsonNoStore({ error: "FORBIDDEN" }, 403);
  }

  try {
    const [profiles, events, reports] = await Promise.all([
      getAllRows<LearningProfileRow>(
        "user_learning_profiles",
        "user_id,diagnostic_completed,interests,custom_topics"
      ),
      getAllRows<LearningEventRow>(
        "learning_events",
        "user_id,skill,duration_seconds,created_at,errors_detected"
      ),
      getAllRows<SpeakingReportRow>(
        "speaking_reports",
        "user_id,duration_seconds,created_at"
      ),
    ]);

    const registeredIdentifiers = new Set<string>();
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) throw new Error(`No se pudieron consultar usuarios: ${error.message}`);
      for (const user of data.users) {
        registeredIdentifiers.add(user.id);
        if (user.email) registeredIdentifiers.add(user.email.toLowerCase());
      }
      if (data.users.length < 1000) break;
    }

    const quotas: DailyQuotaRow[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("daily_usage_quotas")
        .select("user_id,usage_date,speaking_seconds")
        .range(from, from + pageSize - 1);
      if (error) {
        throw new Error(`No se pudieron consultar las cuotas diarias: ${error.message}`);
      }
      const page = (data ?? []) as DailyQuotaRow[];
      quotas.push(...page);
      if (page.length < pageSize) break;
    }

    const registeredUsers = profiles.filter(
      (profile) =>
        registeredIdentifiers.has(profile.user_id) ||
        registeredIdentifiers.has(profile.user_id.toLowerCase())
    ).length;
    const totalProfiles = profiles.length;
    const guestUsers = totalProfiles - registeredUsers;
    const completedDiagnostics = profiles.filter(
      (profile) => profile.diagnostic_completed === true
    ).length;

    const minutesInSeconds: Record<string, number> = {
      speaking: 0,
      listening: 0,
      grammar: 0,
      diagnostic: 0,
    };
    const reportSecondsByDay = new Map<string, number>();
    for (const report of reports) {
      const key = `${report.user_id}:${getDay(report.created_at)}`;
      reportSecondsByDay.set(
        key,
        (reportSecondsByDay.get(key) ?? 0) +
          Math.max(0, report.duration_seconds ?? 0)
      );
    }

    const quotaSecondsByDay = new Map<string, number>();
    for (const quota of quotas) {
      const key = `${quota.user_id}:${quota.usage_date}`;
      quotaSecondsByDay.set(
        key,
        (quotaSecondsByDay.get(key) ?? 0) +
          Math.max(0, quota.speaking_seconds ?? 0)
      );
    }
    const speakingDays = new Set([
      ...reportSecondsByDay.keys(),
      ...quotaSecondsByDay.keys(),
    ]);
    for (const key of speakingDays) {
      minutesInSeconds.speaking += Math.max(
        reportSecondsByDay.get(key) ?? 0,
        quotaSecondsByDay.get(key) ?? 0
      );
    }

    const errorCounts = new Map<string, { concept: string; count: number }>();
    const interestCounts = new Map<string, { interest: string; count: number }>();

    for (const event of events) {
      if (Object.hasOwn(minutesInSeconds, event.skill)) {
        minutesInSeconds[event.skill] += Math.max(0, event.duration_seconds ?? 0);
      }

      const uniqueConcepts = new Map(
        getErrorConcepts(event.errors_detected).map((concept) => [
          concept.toLocaleLowerCase(),
          concept,
        ])
      );
      for (const [key, concept] of uniqueConcepts) {
        const current = errorCounts.get(key);
        errorCounts.set(key, {
          concept: current?.concept ?? concept,
          count: (current?.count ?? 0) + 1,
        });
      }
    }

    for (const profile of profiles) {
      const uniqueTopics = new Map(
        [...getStringList(profile.interests), ...getStringList(profile.custom_topics)]
          .map((topic) => [topic.toLocaleLowerCase(), topic.trim()])
      );
      for (const [key, interest] of uniqueTopics) {
        if (!interest) continue;
        const current = interestCounts.get(key);
        interestCounts.set(key, {
          interest: current?.interest ?? interest,
          count: (current?.count ?? 0) + 1,
        });
      }
    }

    const totalMinutes = (seconds: number) => Number((seconds / 60).toFixed(1));

    return jsonNoStore({
      generatedAt: new Date().toISOString(),
      totalProfiles,
      registeredUsers,
      guestUsers,
      diagnosticCompletedCount: completedDiagnostics,
      minutesBySkill: {
        speaking: totalMinutes(minutesInSeconds.speaking),
        listening: totalMinutes(minutesInSeconds.listening),
        grammar: totalMinutes(minutesInSeconds.grammar),
        diagnostic: totalMinutes(minutesInSeconds.diagnostic),
      },
      topInterests: Array.from(interestCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topRecurringErrors: Array.from(errorCounts.values())
        .filter((item) => item.count > 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    });
  } catch (error) {
    console.error("[ADMIN_STATS_API_ERROR]", error);
    return jsonNoStore({ error: "No se pudieron cargar las estadísticas." }, 500);
  }
}
