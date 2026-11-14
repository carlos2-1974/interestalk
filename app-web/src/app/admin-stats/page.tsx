"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import AuthModal from "@/components/AuthModal";

type AdminStats = {
  generatedAt: string;
  totalProfiles: number;
  registeredUsers: number;
  guestUsers: number;
  diagnosticCompletedCount: number;
  minutesBySkill: {
    speaking: number;
    listening: number;
    grammar: number;
    diagnostic: number;
  };
  topInterests: Array<{ interest: string; count: number }>;
  topRecurringErrors: Array<{ concept: string; count: number }>;
};

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function RankingTable({
  title,
  firstColumn,
  rows,
}: {
  title: string;
  firstColumn: string;
  rows: Array<{ label: string; count: number }>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Aún no hay datos suficientes.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">{firstColumn}</th>
                <th className="py-2 text-right">Registros</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-800">{row.label}</td>
                  <td className="py-3 text-right tabular-nums text-slate-600">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const loadStats = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as AdminStats | { error?: string };
      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error === "FORBIDDEN"
            ? "Esta cuenta no tiene permisos de administración."
            : "No se pudieron cargar las estadísticas."
        );
      }
      setStats(payload as AdminStats);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las estadísticas."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    const updateSession = (user: User | null, accessToken?: string) => {
      if (!active) return;
      setAuthUser(user);
      const authorized = Boolean(user?.email && user.email === adminEmail);
      setIsAdmin(authorized);
      if (!authorized) {
        setStats(null);
        setError(null);
        setLoading(false);
      } else if (accessToken) {
        void loadStats(accessToken);
      } else {
        setLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        if (active) {
          setIsAdmin(false);
          setLoading(false);
          setError("No se pudo comprobar la sesión de administración.");
        }
        return;
      }
      updateSession(data.session?.user ?? null, data.session?.access_token);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateSession(session?.user ?? null, session?.access_token);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [adminEmail, loadStats]);

  const refreshStats = useCallback(async () => {
    const { data, error: sessionError } =
      await getSupabaseBrowserClient().auth.getSession();
    if (sessionError) {
      setError("No se pudo comprobar la sesión de administración.");
      return;
    }
    const session = data.session;
    if (!session?.user?.email || session.user.email !== adminEmail) {
      setIsAdmin(false);
      setAuthUser(session?.user ?? null);
      setStats(null);
      return;
    }
    setIsAdmin(true);
    setAuthUser(session.user);
    await loadStats(session.access_token);
  }, [adminEmail, loadStats]);

  useEffect(() => {
    if (!isAdmin) return;
    const interval = window.setInterval(() => void refreshStats(), 60_000);
    return () => window.clearInterval(interval);
  }, [isAdmin, refreshStats]);

  const usageRows = stats
    ? [
        { label: "Speaking", minutes: stats.minutesBySkill.speaking },
        { label: "Listening", minutes: stats.minutesBySkill.listening },
        { label: "Grammar", minutes: stats.minutesBySkill.grammar },
        { label: "Diagnóstico", minutes: stats.minutesBySkill.diagnostic },
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-semibold text-indigo-700 hover:underline">
              ← Volver al Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Estadísticas del piloto</h1>
            <p className="mt-1 text-sm text-slate-600">
              Uso agregado actualizado automáticamente cada minuto.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => void refreshStats()}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? "Actualizando…" : "Actualizar"}
            </button>
          )}
        </header>

        {isAdmin === false ? (
          <section className="mx-auto mt-16 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="text-3xl" aria-hidden="true">🔒</span>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Acceso restringido a administración
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Inicia sesión con la cuenta autorizada para consultar estas estadísticas.
            </p>
            {authUser?.email && (
              <p className="mt-2 text-xs text-slate-500">
                Sesión actual: {authUser.email}
              </p>
            )}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="mt-5 rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-800"
            >
              Iniciar sesión / Crear cuenta
            </button>
          </section>
        ) : isAdmin === null ? (
          <p className="mt-10 text-sm text-slate-500">Comprobando sesión…</p>
        ) : (
          <>
            {error && (
              <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {error}
              </div>
            )}

            {loading && !stats ? (
              <p className="mt-10 text-sm text-slate-500">Cargando métricas…</p>
            ) : stats ? (
              <>
                <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard label="Perfiles" value={String(stats.totalProfiles)} detail={`${stats.registeredUsers} registrados · ${stats.guestUsers} invitados`} />
                  <MetricCard label="Diagnósticos completados" value={String(stats.diagnosticCompletedCount)} detail="Perfiles con evaluación finalizada" />
                  <MetricCard label="Última actualización" value={new Date(stats.generatedAt).toLocaleTimeString()} detail="Refresco automático cada minuto" />
                  <MetricCard label="Cuenta administradora" value="Verificada" detail={authUser?.email ?? ""} />
                </section>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">Minutos acumulados por competencia</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="border-b border-slate-100 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-2 pr-4">Competencia</th>
                          <th className="py-2 text-right">Minutos totales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageRows.map((row) => (
                          <tr key={row.label} className="border-b border-slate-50 last:border-0">
                            <td className="py-3 pr-4 font-semibold">{row.label}</td>
                            <td className="py-3 text-right tabular-nums">{row.minutes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="mt-8 grid gap-5 lg:grid-cols-2">
                  <RankingTable
                    title="Top Intereses"
                    firstColumn="Interés"
                    rows={stats.topInterests.map(({ interest, count }) => ({ label: interest, count }))}
                  />
                  <RankingTable
                    title="Top Errores Recurrentes"
                    firstColumn="Concepto"
                    rows={stats.topRecurringErrors.map(({ concept, count }) => ({ label: concept, count }))}
                  />
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setAuthUser(user);
          setIsAdmin(Boolean(user.email && user.email === adminEmail));
          if (!user.email || user.email !== adminEmail) setStats(null);
        }}
      />
    </main>
  );
}
