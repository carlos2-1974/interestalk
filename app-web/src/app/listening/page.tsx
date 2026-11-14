"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchListeningAudio,
  getOrCreateClientUserId,
  type ListeningAudioResult,
} from "@/lib/voice-client";
import {
  leerPerfilAprendizajeLocal,
  type UserLearningProfile,
} from "@/lib/perfil-provisional";
import { registerLearningEvent } from "@/lib/learning-events-client";

// ======================================================
// INTERESTALK - MODULO DE LISTENING PERSONALIZADO
// Lecciones ordenadas segun tus intereses + Generador custom
// con cache en Supabase Storage (0 costes redundantes).
// ======================================================

type Lesson = {
  id: string;
  topic: string;
  title: string;
  level: "B1" | "B2";
  durationLabel: string;
  script: string;
  isCustom?: boolean;
  questions: Array<{
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
};

const BASE_LESSONS: Lesson[] = [
  {
    id: "listening-ai-trends-b1",
    topic: "Inteligencia Artificial",
    title: "AI in Everyday Workplace Tools",
    level: "B1",
    durationLabel: "3 min",
    script:
      "Artificial intelligence is rapidly changing how we manage our daily tasks at work. From automated email summaries to smart scheduling assistants, these modern tools allow professionals to save hours each week. However, experts emphasize that human communication, empathy, and critical thinking remain the most essential skills in any team.",
    questions: [
      {
        id: 1,
        question: "What is the main benefit of modern AI workplace tools mentioned?",
        options: [
          "They completely replace all managers.",
          "They help professionals save hours each week.",
          "They only work for computer programmers.",
        ],
        correctIndex: 1,
        explanation: "The speaker states that automated tools allow professionals to save hours each week.",
      },
      {
        id: 2,
        question: "Which skills remain essential according to experts?",
        options: [
          "Human communication, empathy, and critical thinking.",
          "Typing as fast as possible.",
          "Memorizing complex software manuals.",
        ],
        correctIndex: 0,
        explanation: "The script explicitly highlights human communication, empathy, and critical thinking.",
      },
    ],
  },
  {
    id: "listening-crossfit-b1",
    topic: "CrossFit & Fitness",
    title: "High-Intensity Training & Consistency",
    level: "B1",
    durationLabel: "3 min",
    script:
      "High intensity functional training requires discipline, progressive overload, and intelligent recovery. Athletes who prioritize mobility and post-workout nutrition recover significantly faster. Consistency in training builds not only cardiovascular endurance, but also deep mental resilience.",
    questions: [
      {
        id: 1,
        question: "What helps athletes recover significantly faster?",
        options: [
          "Eating junk food before training.",
          "Prioritizing mobility and post-workout nutrition.",
          "Skipping hydration completely.",
        ],
        correctIndex: 1,
        explanation: "The speaker highlights mobility and post-workout nutrition as keys for faster recovery.",
      },
    ],
  },
  {
    id: "listening-motor-bikes-b2",
    topic: "Motor & Motos",
    title: "Aerodynamics in Modern Superbikes",
    level: "B2",
    durationLabel: "4 min",
    script:
      "Modern motorcycle engineering has seen a massive evolution in aerodynamic winglets and electronic traction control. Manufacturers design carbon-fiber fairings that generate substantial downforce at high cornering speeds, providing stability that allows riders to brake later and exit apexes with maximum acceleration.",
    questions: [
      {
        id: 1,
        question: "What is the purpose of carbon-fiber winglets on modern bikes?",
        options: [
          "To reduce the weight of the fuel tank.",
          "To generate downforce and improve cornering stability.",
          "To make the motorcycle completely silent.",
        ],
        correctIndex: 1,
        explanation: "Winglets generate downforce, enhancing stability during cornering and high speeds.",
      },
    ],
  },
  {
    id: "listening-business-b1",
    topic: "Negocios & Ventas",
    title: "Client Communication & Negotiation",
    level: "B1",
    durationLabel: "3 min",
    script:
      "Successful business development is based on active listening rather than aggressive pitching. When meeting prospective clients, asking open questions about their real operational pain points creates genuine trust. Value proposition always wins over discounting prices.",
    questions: [
      {
        id: 1,
        question: "What creates genuine trust when meeting prospective clients?",
        options: [
          "Offering 90% discounts immediately.",
          "Asking open questions about operational pain points.",
          "Speaking without listening to the client.",
        ],
        correctIndex: 1,
        explanation: "Understanding their operational pain points through active listening builds trust.",
      },
    ],
  },
  {
    id: "listening-travel-sustainable-b2",
    topic: "Viajes",
    title: "Sustainable Travel & Cultural Immersion",
    level: "B2",
    durationLabel: "4 min",
    script:
      "Sustainable tourism is not just an environmental trend; it is a profound way to connect with local traditions. When travelers choose family-run accommodations and community food markets, they directly support the regional economy while gaining authentic cultural perspectives that standard tourist packages can never offer.",
    questions: [
      {
        id: 1,
        question: "Why does the speaker recommend family-run accommodations?",
        options: [
          "Because they are always completely free.",
          "Because they support the regional economy and offer authentic perspectives.",
          "Because standard packages are illegal.",
        ],
        correctIndex: 1,
        explanation: "They directly support the local economy and foster authentic cultural perspectives.",
      },
    ],
  },
  {
    id: "listening-finance-b2",
    topic: "Finanzas",
    title: "Compounding Interest & Wealth Preservation",
    level: "B2",
    durationLabel: "3 min",
    script:
      "Compound interest is often called the mathematical wonder of finance. By reinvesting dividends over long horizons, capital grows exponentially. Seasoned investors emphasize that emotional discipline during market corrections is far more critical than trying to time the perfect market entry.",
    questions: [
      {
        id: 1,
        question: "What is critical for long-term investors during market corrections?",
        options: [
          "Panic selling every asset.",
          "Emotional discipline rather than market timing.",
          "Ignoring all economic information.",
        ],
        correctIndex: 1,
        explanation: "Emotional discipline over time outperforms emotional market timing.",
      },
    ],
  },
];

export default function ListeningPage() {
  const [profile, setProfile] = useState<UserLearningProfile | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>(BASE_LESSONS);
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(BASE_LESSONS[0]);
  const [selectedVoice, setSelectedVoice] = useState<"en-US-Neural2-F" | "en-GB-Neural2-B">(
    "en-US-Neural2-F"
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isCached, setIsCached] = useState<boolean | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [learningEventError, setLearningEventError] = useState<string | null>(
    null
  );
  const [answersLessonId, setAnswersLessonId] = useState(BASE_LESSONS[0].id);

  // Generador custom
  const [customTopicInput, setCustomTopicInput] = useState("");
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activityStartedAtRef = useRef(0);
  const loggedAttemptRef = useRef<string | null>(null);

  // 1. Cargar perfil y ordenar lecciones segun afinidad
  useEffect(() => {
    const local = leerPerfilAprendizajeLocal();
    if (local) {
      setProfile(local);
      const userInterests = (local.interests || []).map((i) => i.toLowerCase());

      const sorted = [...BASE_LESSONS].sort((a, b) => {
        const aMatches = userInterests.some((ui) =>
          a.topic.toLowerCase().includes(ui) || ui.includes(a.topic.toLowerCase())
        );
        const bMatches = userInterests.some((ui) =>
          b.topic.toLowerCase().includes(ui) || ui.includes(b.topic.toLowerCase())
        );
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });

      setLessons(sorted);
      setSelectedLesson(sorted[0]);
    }
  }, []);

  // 2. Cargar audio al seleccionar leccion o voz
  useEffect(() => {
    let cancelado = false;

    async function loadAudio() {
      activityStartedAtRef.current = Date.now();
      loggedAttemptRef.current = null;
      setAnswersLessonId(selectedLesson.id);
      setLoadingAudio(true);
      setErrorMsg(null);
      setLearningEventError(null);
      setAudioUrl(null);
      setIsCached(null);
      setSelectedAnswers({});

      const result: ListeningAudioResult = await fetchListeningAudio({
        lessonId: selectedLesson.id,
        text: selectedLesson.script,
        voice: selectedVoice,
      });

      if (cancelado) return;
      setLoadingAudio(false);

      if (result.ok) {
        setAudioUrl(result.audioUrl);
        setIsCached(result.cached);
      } else {
        setErrorMsg(result.message);
      }
    }

    void loadAudio();

    return () => {
      cancelado = true;
    };
  }, [selectedLesson, selectedVoice]);

  useEffect(() => {
    if (
      answersLessonId !== selectedLesson.id ||
      selectedLesson.questions.length === 0 ||
      selectedLesson.questions.some(
        (question) => selectedAnswers[question.id] === undefined
      )
    ) {
      return;
    }

    const attemptId = `${selectedLesson.id}:${activityStartedAtRef.current}`;
    if (loggedAttemptRef.current === attemptId) return;
    loggedAttemptRef.current = attemptId;

    const correctCount = selectedLesson.questions.filter(
      (question) => selectedAnswers[question.id] === question.correctIndex
    ).length;
    const errorsDetected = selectedLesson.questions
      .filter(
        (question) => selectedAnswers[question.id] !== question.correctIndex
      )
      .map((question) => `${selectedLesson.topic}: ${question.question}`);

    void registerLearningEvent(getOrCreateClientUserId(), {
      skill: "listening",
      topic: selectedLesson.topic,
      level: selectedLesson.level || profile?.level || "B1",
      score: Math.round(
        (correctCount / selectedLesson.questions.length) * 100
      ),
      durationSeconds: Math.max(
        0,
        Math.round((Date.now() - activityStartedAtRef.current) / 1000)
      ),
      errorsDetected,
      metadata: {
        lessonId: selectedLesson.id,
        questionCount: selectedLesson.questions.length,
        correctCount,
        incorrectCount: errorsDetected.length,
      },
    }).catch((eventError: unknown) => {
      console.error("[LISTENING_TELEMETRY_ERROR]", eventError);
      setLearningEventError(
        "La actividad terminó, pero no se pudo guardar en tu historial educativo."
      );
    });
  }, [answersLessonId, profile?.level, selectedAnswers, selectedLesson]);

  function handleSpeedChange(speed: number) {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }

  function handleSelectOption(questionId: number, optionIdx: number) {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  }

  // Generar capsula customizada para un tema propio
  async function handleCreateCustomPill(topicName: string) {
    if (!topicName.trim()) return;
    setIsGeneratingCustom(true);
    setErrorMsg(null);

    const safeTopic = topicName.trim();
    const lessonId = `custom-listening-${safeTopic.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    // Guion adaptado al nivel B1/B2
    const generatedScript = `Today we are exploring key insights into ${safeTopic}. Developing practical expertise in this area requires both continuous curiosity and structured daily practice. People who master ${safeTopic} consistently focus on fundamental principles before moving into advanced techniques. Remember to observe how specialized vocabulary connects naturally to real-world situations.`;

    const newLesson: Lesson = {
      id: lessonId,
      topic: safeTopic,
      title: `${safeTopic}: Audio Briefing & Vocabulary`,
      level: profile?.level || "B1",
      durationLabel: "2 min",
      script: generatedScript,
      isCustom: true,
      questions: [
        {
          id: 1,
          question: `According to the speaker, what is key to mastering ${safeTopic}?`,
          options: [
            "Skipping all fundamental principles.",
            "Continuous curiosity and focusing on fundamental principles.",
            "Only reading without practicing.",
          ],
          correctIndex: 1,
          explanation: "Mastery requires continuous curiosity and solid fundamental principles.",
        },
      ],
    };

    setLessons((prev) => [newLesson, ...prev.filter((l) => l.id !== lessonId)]);
    setSelectedLesson(newLesson);
    setShowTranscript(false);
    setIsGeneratingCustom(false);
    setCustomTopicInput("");
  }

  const userInterests = (profile?.interests || []).map((i) => i.toLowerCase());

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* CABECERA */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 font-bold text-white shadow-sm"
              aria-label="Volver al inicio"
            >
              I
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                  Módulo de Listening
                </h1>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                  Nivel {profile?.level || "B1"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Audios personalizados con almacenamiento en Supabase Storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Salir
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        {/* SECCION DE CREAR O ELEGIR CAPSULA PERSONALIZADA */}
        <div className="mb-6 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                ✨ Generador de cápsula auditiva
              </span>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                ¿Quieres entrenar el oído sobre un tema concreto?
              </h2>
              <p className="text-xs text-slate-500">
                Haz clic en uno de tus intereses o introduce un tema libre:
              </p>
              {learningEventError && (
                <p role="alert" className="mt-2 text-xs text-amber-800">
                  {learningEventError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {profile?.interests?.slice(0, 3).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleCreateCustomPill(item)}
                  className="rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 shadow-2xs hover:bg-teal-50"
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateCustomPill(customTopicInput);
                }
              }}
              placeholder="Escribe otro tema (ej. 'Crypto Trading', 'Ciclismo de montaña')..."
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs placeholder-slate-400 focus:border-teal-600 focus:outline-none"
            />
            <button
              type="button"
              disabled={isGeneratingCustom || !customTopicInput.trim()}
              onClick={() => void handleCreateCustomPill(customTopicInput)}
              className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 disabled:opacity-40"
            >
              {isGeneratingCustom ? "Generando..." : "Crear cápsula"}
            </button>
          </div>
        </div>

        {/* SELECTOR DE LECCIONES AUDITIVAS */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Píldoras auditivas ordenadas por afinidad
            </p>
            <span className="text-[11px] text-slate-400">
              {lessons.length} cápsulas disponibles
            </span>
          </div>

          <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => {
              const isSelected = lesson.id === selectedLesson.id;
              const isAffinity = userInterests.some((ui) =>
                lesson.topic.toLowerCase().includes(ui) || ui.includes(lesson.topic.toLowerCase())
              );

              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setSelectedLesson(lesson);
                    setShowTranscript(false);
                  }}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-teal-600 bg-teal-50/70 shadow-sm ring-1 ring-teal-400/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                        {lesson.topic}
                      </span>
                      {isAffinity && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          🔥 Para ti
                        </span>
                      )}
                      {lesson.isCustom && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                          ✨ Custom
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2.5 text-sm font-bold text-slate-900 leading-snug">
                      {lesson.title}
                    </h2>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>⏱️ {lesson.durationLabel}</span>
                    <span className="font-mono text-teal-700 font-semibold">{lesson.level}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* REPRODUCTOR Y CACHE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
                {selectedLesson.topic} · {selectedLesson.level}
              </span>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                {selectedLesson.title}
              </h2>
            </div>

            {/* SELECCION DE VOZ */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Voz:</span>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value as any)}
                aria-label="Voz para listening"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="en-US-Neural2-F">EE.UU. (Femenina Neural2)</option>
                <option value="en-GB-Neural2-B">Reino Unido (Masculina Neural2)</option>
              </select>
            </div>
          </div>

          {/* INDICADOR DE CACHE DE SUPABASE STORAGE */}
          <div className="mt-4">
            {loadingAudio && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                <span>Comprobando audio en Supabase Storage...</span>
              </div>
            )}

            {!loadingAudio && isCached === true && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                <span>⚡</span>
                <span>Audio servido al instante desde la caché de Supabase Storage (0 caracteres TTS consumidos)</span>
              </div>
            )}

            {!loadingAudio && isCached === false && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
                <span>🎙️</span>
                <span>Audio sintetizado con Google Cloud TTS Neural2 y almacenado en Supabase Storage</span>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                ⚠️ {errorMsg}
              </div>
            )}
          </div>

          {/* REPRODUCTOR DE AUDIO HTML5 */}
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
            {audioUrl ? (
              <div className="space-y-3">
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="w-full"
                  onPlay={() => {
                    if (audioRef.current) {
                      audioRef.current.playbackRate = playbackSpeed;
                    }
                  }}
                >
                  Tu navegador no soporta el elemento de audio.
                </audio>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-500">Velocidad:</span>
                    {[0.8, 1, 1.2].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`rounded px-2 py-0.5 font-mono text-xs font-semibold transition-colors ${
                          playbackSpeed === s
                            ? "bg-teal-700 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowTranscript((prev) => !prev)}
                    className="font-medium text-teal-700 underline hover:text-teal-900"
                  >
                    {showTranscript ? "Ocultar transcripción" : "👁️ Revelar transcripción de apoyo"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400">
                {loadingAudio ? "Preparando audio..." : "No se pudo cargar el audio."}
              </p>
            )}
          </div>

          {/* TRANSCRIPCION REVELABLE */}
          {showTranscript && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4 animate-fadeIn">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Transcripción completa (English)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-800">
                {selectedLesson.script}
              </p>
            </div>
          )}

          {/* PREGUNTAS DE COMPRENSION */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-base font-bold text-slate-900">
              Preguntas de comprensión auditiva
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Escucha con atención y valida tu entendimiento.
            </p>

            <div className="mt-4 space-y-5">
              {selectedLesson.questions.map((q, qIndex) => {
                const answered = selectedAnswers[q.id] !== undefined;
                const userChoice = selectedAnswers[q.id];
                const isCorrect = userChoice === q.correctIndex;

                return (
                  <div key={q.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {qIndex + 1}. {q.question}
                    </p>

                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, optIdx) => {
                        let btnStyle =
                          "border-slate-200 bg-white hover:bg-slate-50 text-slate-700";

                        if (answered) {
                          if (optIdx === q.correctIndex) {
                            btnStyle =
                              "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold";
                          } else if (optIdx === userChoice) {
                            btnStyle =
                              "border-rose-400 bg-rose-50 text-rose-900 line-through";
                          } else {
                            btnStyle = "border-slate-100 bg-slate-50 text-slate-400";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={answered}
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-xs transition-colors ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {answered && optIdx === q.correctIndex && (
                              <span className="font-bold text-emerald-600">✓ Correcta</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {answered && (
                      <div
                        className={`mt-3 rounded-lg p-3 text-xs ${
                          isCorrect
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-amber-50 text-amber-900"
                        }`}
                      >
                        <p className="font-semibold">
                          {isCorrect ? "¡Excelente comprensión!" : "Atención:"}
                        </p>
                        <p className="mt-0.5">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
