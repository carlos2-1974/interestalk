"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  leerPerfilAprendizajeLocal,
  fetchPerfilAprendizaje,
  type UserLearningProfile,
} from "@/lib/perfil-provisional";
import { getOrCreateClientUserId } from "@/lib/voice-client";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import InterestsModal from "@/components/InterestsModal";
import AuthModal from "@/components/AuthModal";

// ======================================================
// INTERESTALK - DASHBOARD PRINCIPAL CON AUTH & FLUJO GUIADO
// ======================================================

type Modulo = {
  nombre: string;
  descripcion: string;
  detalle: string;
  icono: string;
  color: string;
  fondo: string;
  href: string;
  badge: string;
  activo: boolean;
};

const MODULOS: Modulo[] = [
  {
    nombre: "Speaking",
    descripcion: "Practica hablando con tu tutor IA en tiempo real.",
    detalle: "5, 10, 15 o 20 min con voz Neural2 y feedback.",
    icono: "🎙️",
    color: "text-amber-800",
    fondo: "bg-amber-50",
    href: "/speaking",
    badge: "20 min/día",
    activo: true,
  },
  {
    nombre: "Listening",
    descripcion: "Entrena tu comprensión con audios adaptados.",
    detalle: "Caché instantánea en Supabase Storage.",
    icono: "🎧",
    color: "text-teal-700",
    fondo: "bg-teal-50",
    href: "/listening",
    badge: "Personalizado",
    activo: true,
  },
  {
    nombre: "Grammar",
    descripcion: "Comprende y utiliza mejor el inglés.",
    detalle: "Explicaciones claras y práctica contextual.",
    icono: "ABC",
    color: "text-indigo-700",
    fondo: "bg-indigo-50",
    href: "/grammar",
    badge: "Disponible",
    activo: true,
  },
  {
    nombre: "Reading",
    descripcion: "Lee, comprende y amplía tu vocabulario.",
    detalle: "Textos adaptados a tus intereses y nivel.",
    icono: "📖",
    color: "text-slate-700",
    fondo: "bg-slate-100",
    href: "/onboarding",
    badge: "Próximamente",
    activo: false,
  },
];

type ConversationalScenario = {
  id: string;
  topic: string;
  title: string;
  promptGoal: string;
  durationLabel: string;
  badge: string;
};

function generarEscenariosPorIntereses(
  intereses: string[],
  level: "B1" | "B2"
): ConversationalScenario[] {
  const list = intereses.length > 0 ? intereses : ["Tecnología", "Viajes", "Deportes"];

  const topicTemplates: Record<string, { title: string; promptGoal: string }> = {
    "CrossFit & Fitness": {
      title: "Optimizing High-Intensity Training & Nutrition",
      promptGoal: "Debate sobre rutinas exigentes, prevención de lesiones y suplementación.",
    },
    "Inteligencia Artificial": {
      title: "AI Tools Transforming Daily Workflows",
      promptGoal: "Comenta cómo automatizar tareas corporativas y el futuro del empleo.",
    },
    "Motor & Motos": {
      title: "Classic Motorcycles vs. Modern Superbikes",
      promptGoal: "Compara sensaciones de conducción mecánica frente a la electrónica moderna.",
    },
    "Negocios & Ventas": {
      title: "Pitching New Ideas to Demanding Clients",
      promptGoal: "Simula una propuesta comercial persuasiva destacando valor frente a precio.",
    },
    Viajes: {
      title: "Off-the-Beaten-Path Cultural Itineraries",
      promptGoal: "Describe destinos auténticos y anécdotas de viajes independientes.",
    },
    Tecnología: {
      title: "The Reality of Remote Work Productivity",
      promptGoal: "Analiza el equilibrio entre flexibilidad remota y colaboración en equipo.",
    },
    Finanzas: {
      title: "Personal Investment & Beating Inflation",
      promptGoal: "Explica estrategias sencillas para gestionar el ahorro a largo plazo.",
    },
    "Cine & Series": {
      title: "Plot Twists and Screenwriting Masterpieces",
      promptGoal: "Analiza tu película favorita y los recursos narrativos que la hacen única.",
    },
    "Salud & Nutrición": {
      title: "Sleep Optimization and Stress Management",
      promptGoal: "Discute hábitos diarios para mantener energía constante durante el día.",
    },
    Deportes: {
      title: "Mental Toughness in Competitive Athletes",
      promptGoal: "Debate sobre la preparación psicológica en momentos decisivos del partido.",
    },
  };

  const scenarios: ConversationalScenario[] = [];

  list.slice(0, 3).forEach((item, idx) => {
    const template = topicTemplates[item] || {
      title: `Exploring Perspectives on ${item}`,
      promptGoal: `Debate dinámico e intercambio de opiniones centrado en ${item}.`,
    };

    scenarios.push({
      id: `scen-${idx}`,
      topic: item,
      title: template.title,
      promptGoal: template.promptGoal,
      durationLabel: idx === 0 ? "5 min (Ágil)" : idx === 1 ? "10 min (Recomendado)" : "15 min (Intenso)",
      badge: idx === 0 ? "🔥 Máxima afinidad" : "🎯 Recomendado",
    });
  });

  return scenarios;
}

function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-3"
      aria-label="Interestalk - Inicio"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-700 text-xl font-black text-white shadow-xs">
        I
      </span>

      <span className="text-xl font-black tracking-tight text-slate-900">
        INTERES<span className="text-indigo-700">TALK</span>
      </span>
    </Link>
  );
}

function ModuloCard({ modulo }: { modulo: Modulo }) {
  const content = (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div
          className={
            "flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-bold " +
            modulo.fondo +
            " " +
            modulo.color
          }
          aria-hidden="true"
        >
          {modulo.icono}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            modulo.activo
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {modulo.badge}
        </span>
      </div>

      <h3 className="mt-6 text-xl font-bold text-slate-900">{modulo.nombre}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{modulo.descripcion}</p>
      <p className="mt-2 text-sm text-slate-500">{modulo.detalle}</p>

      {modulo.activo && (
        <span className="mt-4 inline-flex items-center text-xs font-bold text-indigo-700">
          Entrar al módulo →
        </span>
      )}
    </article>
  );

  if (modulo.activo) {
    return <Link href={modulo.href} className="block h-full">{content}</Link>;
  }

  return content;
}

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserLearningProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const continueToDiagnosticAfterSave = useRef(false);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    const userId = getOrCreateClientUserId();
    const local = leerPerfilAprendizajeLocal();

    if (local) {
      setProfile(local);
      if (local.interests.length === 0 && local.customTopics.length === 0) {
        setIsModalOpen(true);
      }
    } else {
      void fetchPerfilAprendizaje(userId).then((p) => {
        setProfile(p);
        if (!p || (p.interests.length === 0 && p.customTopics.length === 0)) {
          setIsModalOpen(true);
        }
      });
    }

    // Comprobar sesion Supabase Auth
    void supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setAuthUser(data.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAuthUser(null);
  }

  const activeInterests = Array.from(
    new Set([...(profile?.interests ?? []), ...(profile?.customTopics ?? [])])
  );
  const displayedInterests =
    activeInterests.length > 0 ? activeInterests : ["Tecnología", "Viajes", "Deportes"];

  const scenarios = generarEscenariosPorIntereses(displayedInterests, profile?.level || "B1");

  const hasCompletedDiagnostic = Boolean(profile?.diagnosticCompleted);
  const isAdmin =
    Boolean(authUser?.email) &&
    authUser?.email?.trim().toLowerCase() ===
      process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* CABECERA */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <Logo />

          <nav
            aria-label="Navegación principal"
            className="flex flex-wrap items-center gap-2.5 sm:gap-3"
          >
            <Link
              href="/speaking"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Speaking (20 min)
            </Link>

            <Link
              href="/listening"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Listening
            </Link>

            <Link
              href="/grammar"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Grammar
            </Link>

            <Link
              href="/diagnostico-adaptativo"
              className="rounded-xl px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              {hasCompletedDiagnostic ? "Repetir evaluación" : "Evaluación inicial (4 min)"}
            </Link>

            {/* ESTADO DE SESION SUPABASE AUTH */}
            {authUser ? (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="hidden max-w-48 truncate text-xs font-semibold text-slate-600 sm:inline" title={authUser.email}>
                  👤 {authUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
              >
                👤 Iniciar sesión / Crear cuenta
              </button>
            )}
            {isAdmin && (
              <Link
                href="/admin-stats"
                className="rounded-xl border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
              >
                Estadísticas
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* BARRA SUPERIOR DE PERSONALIZACION DE INTERESES */}
      <section className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-teal-50/70 px-5 py-3 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-indigo-900">Tus temas activos:</span>
            <span className="rounded-md bg-indigo-700 px-2 py-0.5 font-bold text-white">
              Nivel {profile?.level || "B1"}
            </span>
            {displayedInterests.map((interest) => (
              <span
                key={interest}
                className="rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 font-medium text-indigo-900 shadow-2xs"
              >
                {interest}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3.5 py-1.5 font-bold text-indigo-700 shadow-xs transition-colors hover:bg-indigo-50"
          >
            <span>✏️</span>
            <span>Personalizar mis intereses</span>
          </button>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        {/* HERO BIENVENIDA CON FLUJO GUIADO */}
        <section className="grid items-center gap-8 overflow-hidden rounded-[30px] border border-indigo-100 bg-white p-6 shadow-xs sm:p-9 lg:min-h-[500px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10 lg:p-12">
          <div className="relative z-10">
            <span className="inline-flex rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-indigo-700">
              Aprende inglés hablando de lo que te apasiona
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
              Tu inglés.
              <br />
              <span className="text-indigo-700">A tu manera.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Práctica oral inteligente adaptada a tus aficiones y proyectos. Di adiós a
              las lecciones genéricas de libro de texto.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {!hasCompletedDiagnostic ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      continueToDiagnosticAfterSave.current = true;
                      setIsModalOpen(true);
                    }}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white shadow-md hover:bg-indigo-800 transition-all hover:scale-102"
                  >
                    1. Configurar intereses y hacer prueba de nivel (4 min) →
                  </button>

                  <Link
                    href="/speaking"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Ir directo a Speaking (Nivel B1)
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/speaking"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-700 px-6 py-3 font-semibold text-white shadow-sm hover:bg-indigo-800"
                  >
                    Iniciar sesión de Speaking (20 min)
                    <span className="ml-3" aria-hidden="true">→</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-indigo-200 bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    Ajustar mis intereses
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="relative min-h-[310px] overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-50 to-teal-50 sm:min-h-[390px] lg:min-h-[430px]">
            <Image
              src="/interestalk-hero-v22.webp"
              alt="Alumna estudiando inglés con auriculares y ordenador"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-[73%_42%]"
            />
          </div>
        </section>

        {/* ESCENARIOS DE CONVERSACION RECOMENDADOS HOY */}
        <section className="mt-12 lg:mt-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Basado en tus preferencias actuales
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Tus escenarios de hoy
              </h2>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-indigo-700 hover:underline"
            >
              Cambiar temas →
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Escoge un escenario para entrar directamente a hablar con tu tutor IA sobre este tema:
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {scenarios.map((scen) => (
              <div
                key={scen.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                      {scen.topic}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {scen.durationLabel}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900">
                    {scen.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {scen.promptGoal}
                  </p>
                </div>

                <Link
                  href={`/speaking?topic=${encodeURIComponent(scen.topic)}`}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  Conversar sobre este tema →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* MODULOS FORMATIVOS */}
        <section className="mt-14 lg:mt-20" aria-labelledby="titulo-modulos">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">
            Tu academia
          </p>

          <h2 id="titulo-modulos" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Cuatro formas de aprender
          </h2>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {MODULOS.map((modulo) => (
              <ModuloCard key={modulo.nombre} modulo={modulo} />
            ))}
          </div>
        </section>
      </div>

      {/* PIE */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-3 px-5 py-7 text-center text-sm text-slate-500 md:flex-row sm:px-8 lg:px-12">
          <span>© {currentYear} Interestalk</span>
          <span>Learn what you love.</span>
          <span>Academia digital de inglés con IA</span>
        </div>
      </footer>

      {/* MODAL DE PERSONALIZACION DE INTERESES */}
      <InterestsModal
        isOpen={isModalOpen}
        initialProfile={profile}
        onClose={() => setIsModalOpen(false)}
        onSaved={(updated) => {
          setProfile(updated);
          if (continueToDiagnosticAfterSave.current) {
            continueToDiagnosticAfterSave.current = false;
            router.push("/diagnostico-adaptativo");
          }
        }}
      />

      {/* MODAL DE AUTENTICACION CON OTP */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setAuthUser(user);
        }}
      />
    </main>
  );
}
