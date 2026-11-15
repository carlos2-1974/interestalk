"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/AuthModal";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchPerfilAprendizaje,
  leerPerfilAprendizajeLocal,
  guardarPerfilAprendizajeLocal,
  type UserLearningProfile,
} from "@/lib/perfil-provisional";
import {
  getOrCreateClientUserId,
  fetchListeningAudio,
} from "@/lib/voice-client";

// ======================================================
// INTERESTALK - DIAGNOSTICO ADAPTATIVO INTEGRAL V3
// 3 Pasos: 1. Gramática exprés -> 2. Audio -> 3. Expresión
// Evaluación con Gemini y asignación de nivel CEFR B1/B2.
// ======================================================

type GrammarQuestion = {
  id: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
};

const GRAMMAR_QUESTIONS: GrammarQuestion[] = [
  {
    id: "g1",
    enunciado: "Last week, our team _____ a very productive meeting about new goals.",
    opciones: ["has had", "had", "have", "was having"],
    correcta: 1,
  },
  {
    id: "g2",
    enunciado: "If we _____ more time tomorrow, we could review the full report.",
    opciones: ["will have", "have", "had", "would have"],
    correcta: 2,
  },
  {
    id: "g3",
    enunciado: "She has been working in technology _____ more than eight years.",
    opciones: ["since", "for", "during", "from"],
    correcta: 1,
  },
];

const LISTENING_DATA = {
  lessonId: "diagnostic-capsule-25s",
  title: "Micro-cápsula: La importancia del enfoque diario",
  script:
    "Developing real fluency in a foreign language is not about spending three continuous hours on a Sunday. It is about twenty minutes of high focus every single day. When you engage with topics you genuinely care about, your brain naturally absorbs vocabulary and sentence patterns much faster.",
  questions: [
    {
      id: "l1",
      question: "According to the speaker, what is the key to developing real fluency?",
      options: [
        "Studying grammar rules for three hours on weekends.",
        "Twenty minutes of high focus every single day.",
        "Memorizing dictionary definitions every morning.",
      ],
      correcta: 1,
    },
  ],
};

type EvaluationResult = {
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

export default function DiagnosticoAdaptativoPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserLearningProfile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Pasos: 1 = Grammar, 2 = Listening, 3 = Speaking, 4 = Resultados
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Paso 1: Grammar
  const [grammarIndex, setGrammarIndex] = useState(0);
  const [grammarAnswers, setGrammarAnswers] = useState<Record<string, number>>({});

  // Paso 2: Listening
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [listeningAnswers, setListeningAnswers] = useState<Record<string, number>>({});

  // Paso 3: Speaking
  const [speakingTranscript, setSpeakingTranscript] = useState("");
  const [writtenResponseSelected, setWrittenResponseSelected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Estado de evaluacion final
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const writtenResponseRef = useRef<HTMLTextAreaElement | null>(null);

  // Cargar perfil
  useEffect(() => {
    const userId = getOrCreateClientUserId();
    const local = leerPerfilAprendizajeLocal();
    if (local?.userId === userId) {
      setProfile(local);
    } else {
      void fetchPerfilAprendizaje(userId, true).then(setProfile);
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => setAuthUser(data.user));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // Cargar audio de listening cuando llegue al paso 2
  useEffect(() => {
    if (currentStep === 2 && !audioUrl) {
      setLoadingAudio(true);
      void fetchListeningAudio({
        lessonId: LISTENING_DATA.lessonId,
        text: LISTENING_DATA.script,
        voice: "en-US-Neural2-F",
      }).then((res) => {
        setLoadingAudio(false);
        if (res.ok) {
          setAudioUrl(res.audioUrl);
        }
      });
    }
  }, [currentStep, audioUrl]);

  // Web Speech API en paso 3
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let full = "";
          for (let i = 0; i < event.results.length; ++i) {
            full += event.results[i][0].transcript + " ";
          }
          setSpeakingTranscript(full.trim());
        };

        recognition.onerror = () => {
          setIsRecording(false);
          recognitionRef.current = null;
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } catch {
        recognitionRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Manejo de grabacion en Paso 3
  function toggleRecording() {
    if (!recognitionRef.current) {
      setWrittenResponseSelected(true);
      writtenResponseRef.current?.focus();
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setRecordingSeconds(0);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        console.warn("Fallo al iniciar grabacion:", err);
        setIsRecording(false);
        recognitionRef.current = null;
      }
    }
  }

  async function playDiagnosticAudio() {
    try {
      await audioRef.current?.play();
    } catch (error) {
      console.warn("El navegador no pudo reproducir el audio diagnóstico:", error);
    }
  }

  // Avanzar en Paso 1 (Grammar)
  function handleSelectGrammarOption(optIdx: number) {
    const q = GRAMMAR_QUESTIONS[grammarIndex];
    setGrammarAnswers((prev) => ({ ...prev, [q.id]: optIdx }));

    if (grammarIndex < GRAMMAR_QUESTIONS.length - 1) {
      setGrammarIndex((prev) => prev + 1);
    } else {
      // Pasar a paso 2 (Listening)
      setCurrentStep(2);
    }
  }

  // Avanzar en Paso 2 (Listening)
  function handleSelectListeningOption(qId: string, optIdx: number) {
    setListeningAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  }

  // Finalizar evaluacion completa y llamar a Gemini
  async function handleFinishEvaluation() {
    if (isRecording) {
      toggleRecording();
    }

    setIsEvaluating(true);

    const userId = getOrCreateClientUserId();

    // Calcular aciertos grammar
    let grammarCorrect = 0;
    GRAMMAR_QUESTIONS.forEach((q) => {
      if (grammarAnswers[q.id] === q.correcta) {
        grammarCorrect += 1;
      }
    });

    // Calcular aciertos listening
    let listeningCorrect = 0;
    LISTENING_DATA.questions.forEach((q) => {
      if (listeningAnswers[q.id] === q.correcta) {
        listeningCorrect += 1;
      }
    });

    try {
      const res = await fetch("/api/diagnostico/evaluar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          interests: profile?.interests ?? ["Tecnología", "Viajes"],
          customTopics: profile?.customTopics ?? [],
          grammarScore: {
            correct: grammarCorrect,
            total: GRAMMAR_QUESTIONS.length,
          },
          listeningScore: {
            correct: listeningCorrect,
            total: LISTENING_DATA.questions.length,
          },
          speakingTranscript: speakingTranscript.trim(),
        }),
      });

      const data = (await res.json()) as {
        evaluation?: EvaluationResult;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar la evaluación.");
      }

      if (data?.evaluation) {
        // Guardar nivel resultante en local y sincronizar
        const currentLocal = leerPerfilAprendizajeLocal();
        const updatedProfile: UserLearningProfile = {
          userId,
          level: data.evaluation.overallLevel,
          interests: currentLocal?.interests ?? profile?.interests ?? ["Tecnología", "Viajes"],
          customTopics: currentLocal?.customTopics ?? profile?.customTopics ?? [],
          updatedAt: new Date().toISOString(),
          diagnosticCompleted: true,
        };
        guardarPerfilAprendizajeLocal(updatedProfile);
        setProfile(updatedProfile);
        setEvaluationError(null);
        setEvaluation(data.evaluation);
        setCurrentStep(4);
      } else {
        throw new Error("La evaluación no devolvió un nivel CEFR.");
      }
    } catch (err) {
      console.error("Error en evaluacion integral:", err);
      setEvaluationError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la evaluación. Inténtalo de nuevo."
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  const primaryInterest = profile?.interests?.[0] || "tus aficiones o trabajo";

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#F8FAFC] text-slate-900 pb-12">
      {/* CABECERA */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-black text-slate-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-700 text-base font-bold text-white shadow-2xs">
              I
            </span>
            <span className="text-base tracking-tight">
              INTERES<span className="text-indigo-700">TALK</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              Evaluación Inicial CEFR
            </span>
            <Link
              href="/"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Salir
            </Link>
          </div>
        </div>
      </header>

      {/* BARRA DE PROGRESO DE 3 PASOS */}
      {currentStep < 4 && (
        <div className="border-b border-slate-100 bg-white px-5 py-3">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-sm font-bold text-slate-800" aria-live="polite">
              Paso {currentStep}/3 · {currentStep === 1 ? "Gramática" : currentStep === 2 ? "Audio" : "Expresión"}
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Progreso de calibración"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={currentStep}
            >
              <div
                className="h-full rounded-full bg-indigo-700 transition-all"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* ==================================================== */}
        {/* PASO 1: USO DEL INGLES (GRAMATICA)                   */}
        {/* ==================================================== */}
        {currentStep === 1 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Paso 1 · Uso del inglés y gramática
              </span>
              <span className="font-mono text-xs font-semibold text-slate-400">
                Pregunta {grammarIndex + 1} de {GRAMMAR_QUESTIONS.length}
              </span>
            </div>

            <h2 className="mt-6 text-xl font-bold text-slate-900 leading-snug sm:text-2xl">
              {GRAMMAR_QUESTIONS[grammarIndex].enunciado}
            </h2>

            <div className="mt-6 space-y-3">
              {GRAMMAR_QUESTIONS[grammarIndex].opciones.map((opcion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectGrammarOption(idx)}
                  className="flex min-h-12 w-full items-center justify-between rounded-xl border-2 border-slate-200 p-4 text-left text-sm font-semibold text-slate-800 transition-all hover:border-indigo-600 hover:bg-indigo-50/50"
                >
                  <span>{opcion}</span>
                  <span className="text-xs text-slate-400">Seleccionar →</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* PASO 2: LISTENING DIAGNOSTICO                        */}
        {/* ==================================================== */}
        {currentStep === 2 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Paso 2 · Comprensión Auditiva (Listening)
              </span>
              <span className="font-mono text-xs font-semibold text-slate-400">
                Audio breve
              </span>
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
              Escucha el audio y responde a una pregunta
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Cápsula nativa con voz Neural2. Puedes escucharla las veces que necesites.
            </p>

            {/* REPRODUCTOR DE AUDIO */}
            <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
              {loadingAudio ? (
                <div className="flex items-center justify-center py-4 text-xs text-teal-800">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent mr-2" />
                  Cargando audio diagnóstico...
                </div>
              ) : audioUrl ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => void playDiagnosticAudio()}
                    className="min-h-12 w-full rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800"
                  >
                    ▶ Reproducir cápsula de audio
                  </button>
                  <audio
                    ref={audioRef}
                    controls
                    playsInline
                    preload="metadata"
                    src={audioUrl}
                    className="w-full"
                  >
                    Tu navegador no soporta el reproductor de audio.
                  </audio>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">
                  Cargando cápsula de audio...
                </p>
              )}
            </div>

            {/* PREGUNTAS DE LISTENING */}
            <div className="mt-6 space-y-6">
              {LISTENING_DATA.questions.map((q, qIdx) => (
                <div key={q.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-900">
                    {qIdx + 1}. {q.question}
                  </p>
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = listeningAnswers[q.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectListeningOption(q.id, optIdx)}
                          className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${
                            isSelected
                              ? "border-teal-600 bg-teal-50 font-bold text-teal-900 ring-1 ring-teal-400"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && <span className="font-bold text-teal-700">✓ Elegido</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                disabled={Object.keys(listeningAnswers).length < LISTENING_DATA.questions.length}
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-40"
              >
                <span>Continuar a Speaking</span>
                <span>→</span>
              </button>
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* PASO 3: SPEAKING DIAGNOSTICO                         */}
        {/* ==================================================== */}
        {currentStep === 3 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Paso 3 · Expresión Oral (Speaking)
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Grabación de 20 a 40 segundos
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Tu pregunta personalizada sobre {primaryInterest}:
              </span>
              <p className="mt-1 text-base font-bold text-slate-900 leading-relaxed sm:text-lg">
                “Could you share a memorable experience or project related to {primaryInterest}, and why it matters to you?”
              </p>
              <p className="mt-1.5 text-xs text-slate-600">
                Responde en inglés de forma natural. No te preocupes por cometer fallos; evaluamos tu fluidez e iniciativa.
              </p>
            </div>

            {/* BOTON DE GRABACION Y TEMPORIZADOR */}
            <div className="mt-6 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                  isRecording ? "animate-pulse bg-rose-600" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {isRecording ? "⏹️" : "🎙️"}
              </button>

              <span className="mt-3 text-center text-xs font-bold text-slate-700">
                {isRecording
                  ? `Grabando respuesta: ${recordingSeconds}s (pulsa para detener)`
                  : "Si el navegador permite el micrófono, puedes grabar aquí"}
              </span>

              {isRecording && (
                <span className="mt-1 text-[11px] font-semibold text-rose-600">
                  🔴 Micrófono activo · Habla en inglés
                </span>
              )}
            </div>

            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Tu respuesta en inglés (puedes editarla):
              </label>
              <textarea
                ref={writtenResponseRef}
                rows={3}
                value={speakingTranscript}
                onChange={(e) => setSpeakingTranscript(e.target.value)}
                placeholder="Aquí aparecerá lo que digas, o escribe tu respuesta..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-base text-slate-800 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setWrittenResponseSelected(true);
                  writtenResponseRef.current?.focus();
                }}
                className="min-h-12 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Ahora no puedo hablar (responder por escrito en 15 seg)
              </button>
              <button
                type="button"
                disabled={isEvaluating || !speakingTranscript.trim()}
                onClick={() => void handleFinishEvaluation()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-600 px-7 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-700 disabled:opacity-40"
              >
                <span>{isEvaluating ? "Evaluando con IA..." : writtenResponseSelected ? "Calcular mi nivel →" : "Finalizar y calcular mi nivel →"}</span>
              </button>
            </div>
            {evaluationError && (
              <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {evaluationError}
              </p>
            )}
          </section>
        )}

        {/* ==================================================== */}
        {/* PASO 4: RESULTADOS INTEGRALES (CEFR)                 */}
        {/* ==================================================== */}
        {currentStep === 4 && evaluation && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9 animate-fadeIn">
            <div className="text-center border-b border-slate-100 pb-6">
              <span className="inline-flex rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700">
                Evaluación inicial completada
              </span>

              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                Tu nivel asignado es{" "}
                <span className="text-indigo-700">{evaluation.overallLevel}</span>
              </h2>

              <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
                {evaluation.recommendation}
              </p>
            </div>

            {evaluationError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                {evaluationError}
              </p>
            )}

            {/* DESGLOSE POR COMPETENCIAS */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-center">
                <span className="text-2xl">📖</span>
                <h3 className="mt-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Uso del Inglés
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {evaluation.breakdown.grammar}
                </p>
              </div>

              <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 text-center">
                <span className="text-2xl">🎧</span>
                <h3 className="mt-2 text-xs font-bold uppercase tracking-wider text-teal-900">
                  Listening
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {evaluation.breakdown.listening}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-center">
                <span className="text-2xl">🎙️</span>
                <h3 className="mt-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                  Speaking
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {evaluation.breakdown.speaking}
                </p>
              </div>
            </div>

            {/* FORTALEZAS Y ENFOQUE */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <span>🌟</span>
                  <span>Tus fortalezas</span>
                </h4>
                <ul className="mt-2 space-y-1 text-xs text-slate-700">
                  {evaluation.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="font-bold text-emerald-600">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <span>🎯</span>
                  <span>Enfoque prioritario</span>
                </h4>
                <ul className="mt-2 space-y-1 text-xs text-slate-700">
                  {evaluation.focusAreas.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="font-bold text-amber-600">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {!authUser && (
              <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                <h3 className="text-base font-extrabold text-indigo-950">
                  Guarda tu progreso con tu email
                </h3>
                <p className="mt-1 text-sm text-indigo-900/80">
                  Crea una cuenta para conservar tu progreso y recuperarlo en otros dispositivos.
                  Revisa también Spam o Promociones para encontrar el código.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="mt-4 rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-800"
                >
                  Crear cuenta o iniciar sesión →
                </button>
                <Link
                  href="/"
                  className="ml-4 inline-flex text-xs font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
                >
                  Continuar como invitado y guardar más tarde
                </Link>
              </div>
            )}

            {/* ACCION FINAL */}
            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
              <p className="text-xs text-slate-500">
                Tu nivel y preferencias se han guardado en tu perfil.
              </p>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-800 sm:w-auto"
              >
                <span>Entrar a mi academia personalizada →</span>
              </button>
            </div>
          </section>
        )}
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => setAuthUser(user)}
      />
    </main>
  );
}
