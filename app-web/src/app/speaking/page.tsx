"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  leerPerfilProvisional,
  leerPerfilAprendizajeLocal,
  type PerfilProvisional,
} from "@/lib/perfil-provisional";
import {
  fetchSpeakingQuota,
  sendSpeakingTurn,
  fetchSpeakingReports,
  generateAndSaveReport,
  getOrCreateClientUserId,
  type SpeakingTurnResult,
  type SpeakingReport,
} from "@/lib/voice-client";

// ======================================================
// INTERESTALK - MODULO DE SPEAKING & CONVERSACION IA
// Selector de Duracion (5, 10, 15, 20 min), Manos Libres,
// Cierre Dual y Generacion + Historial de Informes.
// ======================================================

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  audioBase64?: string;
  timestamp: string;
  correction?: {
    correctedSentence: string;
    grammarTip: string;
  } | null;
};

type SessionPhase = "setup" | "active" | "report";

const TOTAL_DAILY_SECONDS = 1200; // 20 minutos (1.200 segundos max diarios)
const SILENCE_OPEN_THOUGHT_MS = 2600;
const SILENCE_THRESHOLD_FINAL_MS = 1450;
const SILENCE_THRESHOLD_INTERIM_MS = 1800;
const SPEECH_END_ACCELERATION_MS = 950;
const MAX_CONSECUTIVE_SILENCES = 3; // Límite de silencios antes de pausar

const DURATION_OPTIONS = [
  { minutes: 5, label: "5 min", badge: "Recomendado", desc: "Práctica ágil y focalizada" },
  { minutes: 10, label: "10 min", badge: "Equilibrado", desc: "Profundiza en tus intereses" },
  { minutes: 15, label: "15 min", badge: "Intenso", desc: "Entrenamiento inmersivo" },
  { minutes: 20, label: "20 min", badge: "Máximo diario", desc: "Completa tu cuota del día" },
];

const OPEN_CONNECTORS = new Set([
  "and", "but", "or", "so", "because", "if", "when", "that", "which", "who",
  "to", "for", "with", "in", "on", "at", "from", "of", "about",
  "the", "a", "an", "my", "your", "his", "her", "their", "our", "this", "these",
  "i", "you", "he", "she", "we", "they",
  "um", "uh", "er", "like", "well",
  "want", "wanted", "going", "have", "had", "would", "could", "should", "can",
  "will", "think", "thought", "mean", "really", "very", "just", "also", "then",
  "actually", "maybe", "usually", "always", "never", "is", "are", "was", "were",
]);

export function isOpenThought(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;
  if (/[.?!]$/.test(clean)) return false;

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z']/g, "");
  return OPEN_CONNECTORS.has(lastWord);
}

function b64toBlob(base64: string, mimeType = "audio/mpeg"): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.max(0, totalSeconds) % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SpeakingPage() {
  const [perfil, setPerfil] = useState<PerfilProvisional | null>(null);
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("setup");
  const [targetMinutes, setTargetMinutes] = useState<number>(5);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(0);
  const [selectedTopic, setSelectedTopic] = useState<string>("Tecnología");

  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [inputText, setInputText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TOTAL_DAILY_SECONDS);
  const [limitReached, setLimitReached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isThinkingPause, setIsThinkingPause] = useState(false);
  const [handsFree, setHandsFree] = useState(true);
  const [micPermissionNeeded, setMicPermissionNeeded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<"en-US-Neural2-F" | "en-GB-Neural2-B">(
    "en-US-Neural2-F"
  );

  // Estados de informes
  const [activeReport, setActiveReport] = useState<SpeakingReport | null>(null);
  const [activeReportNotice, setActiveReportNotice] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showReportsDrawer, setShowReportsDrawer] = useState(false);
  const [userReports, setUserReports] = useState<SpeakingReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Refs de sincronizacion
  const handsFreeRef = useRef(true);
  const isSendingRef = useRef(false);
  const isPlayingAudioRef = useRef(false);
  const isRecordingRef = useRef(false);
  const limitReachedRef = useRef(false);
  const remainingSecondsRef = useRef(TOTAL_DAILY_SECONDS);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveSilencesRef = useRef(0);
  const messagesRef = useRef<ChatTurn[]>([]);
  const perfilRef = useRef<PerfilProvisional | null>(null);
  const selectedVoiceRef = useRef(selectedVoice);
  const accumulatedSpeechRef = useRef("");
  const currentInterimRef = useRef("");
  const targetMinutesRef = useRef(5);
  const sessionElapsedRef = useRef(0);
  const isTerminatingSessionRef = useRef(false);
  const selectedTopicRef = useRef("Tecnología");
  const inFlightAbortRef = useRef<AbortController | null>(null);
  const inFlightTextRef = useRef("");
  const inFlightTurnIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedTopicRef.current = selectedTopic;
  }, [selectedTopic]);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  useEffect(() => {
    limitReachedRef.current = limitReached;
  }, [limitReached]);

  useEffect(() => {
    remainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    perfilRef.current = perfil;
  }, [perfil]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    targetMinutesRef.current = targetMinutes;
  }, [targetMinutes]);

  useEffect(() => {
    sessionElapsedRef.current = sessionElapsedSeconds;
  }, [sessionElapsedSeconds]);

  // Auto-scroll en el chat
  useEffect(() => {
    if (sessionPhase === "active") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, interimText, sessionPhase]);

  // Cronometro de sesion activa
  useEffect(() => {
    if (sessionPhase !== "active") return;

    const timer = setInterval(() => {
      setSessionElapsedSeconds((prev) => {
        const next = prev + 1;
        const totalTargetSeconds = targetMinutesRef.current * 60;

        // Si se acaba el bloque, finalizar
        if (next >= totalTargetSeconds && !isTerminatingSessionRef.current) {
          void handleFinishSession();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionPhase]);

  // Funciones de control de voz seguras
  function safeStartRecognition() {
    if (
      !recognitionRef.current ||
      isPlayingAudioRef.current ||
      isSendingRef.current ||
      limitReachedRef.current ||
      remainingSecondsRef.current <= 0 ||
      isTerminatingSessionRef.current
    ) {
      return;
    }

    try {
      recognitionRef.current.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setMicPermissionNeeded(false);
    } catch (e: any) {
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
        setMicPermissionNeeded(true);
      } else if (e?.name !== "InvalidStateError") {
        console.warn("Fallo al iniciar microfono:", e);
      }
    }
  }

  function safeStopRecognition() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    isRecordingRef.current = false;
    setIsRecording(false);
    setInterimText("");
    currentInterimRef.current = "";
    setIsThinkingPause(false);
  }

  function startRecognitionDuringRequest() {
    if (
      !recognitionRef.current ||
      !handsFreeRef.current ||
      !isSendingRef.current ||
      !inFlightAbortRef.current ||
      isPlayingAudioRef.current ||
      isTerminatingSessionRef.current
    ) {
      return;
    }

    try {
      recognitionRef.current.start();
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (error: unknown) {
      if (!(error instanceof DOMException) || error.name !== "InvalidStateError") {
        console.warn("Fallo al mantener el microfono activo durante la respuesta:", error);
      }
    }
  }

  // Reproduccion de voz con Blob y revocacion de URL
  function playAiResponse(audioBase64: string, onDoneCallback?: () => void) {
    if (!audioBase64) {
      isSendingRef.current = false;
      if (onDoneCallback) {
        onDoneCallback();
      } else if (handsFreeRef.current && !limitReachedRef.current && !isTerminatingSessionRef.current) {
        safeStartRecognition();
      }
      return;
    }

    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      isPlayingAudioRef.current = true;
      setIsAiSpeaking(true);
      safeStopRecognition();

      const blob = b64toBlob(audioBase64, "audio/mpeg");
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audioPlayerRef.current = audio;

      const handleAudioEnd = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}

        isPlayingAudioRef.current = false;
        setIsAiSpeaking(false);
        isSendingRef.current = false;

        if (onDoneCallback) {
          onDoneCallback();
          return;
        }

        if (
          handsFreeRef.current &&
          !limitReachedRef.current &&
          remainingSecondsRef.current > 0 &&
          !isTerminatingSessionRef.current
        ) {
          setTimeout(() => {
            if (handsFreeRef.current && !isPlayingAudioRef.current && !isSendingRef.current) {
              safeStartRecognition();
            }
          }, 300);
        }
      };

      audio.onended = handleAudioEnd;
      audio.onerror = handleAudioEnd;

      void audio.play().catch(() => {
        handleAudioEnd();
      });
    } catch {
      isPlayingAudioRef.current = false;
      setIsAiSpeaking(false);
      isSendingRef.current = false;
      if (onDoneCallback) {
        onDoneCallback();
      } else if (handsFreeRef.current && !limitReachedRef.current && !isTerminatingSessionRef.current) {
        safeStartRecognition();
      }
    }
  }

  // Ejecutar un turno conversacional
  async function executeTurn(textToSend: string) {
    const cleanText = textToSend.trim();
    if (
      !cleanText ||
      isSendingRef.current ||
      isPlayingAudioRef.current ||
      limitReachedRef.current ||
      remainingSecondsRef.current <= 0
    ) {
      return;
    }

    safeStopRecognition();
    isSendingRef.current = true;
    setIsLoading(true);
    setErrorMsg(null);
    setInfoNotice(null);
    setInputText("");
    accumulatedSpeechRef.current = "";

    const userTurn: ChatTurn = {
      id: window.crypto.randomUUID(),
      role: "user",
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const abortController = new AbortController();
    inFlightAbortRef.current = abortController;
    inFlightTextRef.current = cleanText;
    inFlightTurnIdRef.current = userTurn.id;
    setMessages((prev) => [...prev, userTurn]);

    const historyForBackend = messagesRef.current
      .slice(-5)
      .map((m) => ({ role: m.role, text: m.text }));

    const baseInterests =
      perfilRef.current?.intereses?.map((i) => i.nombre) ?? [
        "travel",
        "technology",
        "sports",
      ];
    const interestsList = Array.from(
      new Set([selectedTopicRef.current, ...baseInterests])
    ).filter(Boolean);
    const levelCode = perfilRef.current?.nivelDeclarado === "B2" ? "B2" : "B1";

    const totalTargetSeconds = targetMinutesRef.current * 60;
    const blockRemaining = totalTargetSeconds - sessionElapsedRef.current;
    const isAlmostUp = blockRemaining <= 45;

    const request = sendSpeakingTurn({
      message: cleanText,
      interests: interestsList,
      level: levelCode,
      voice: selectedVoiceRef.current,
      history: historyForBackend,
      isTimeAlmostUp: isAlmostUp,
    }, abortController.signal);

    startRecognitionDuringRequest();
    const result: SpeakingTurnResult = await request;
    if (abortController.signal.aborted) return;
    if (inFlightAbortRef.current === abortController) {
      inFlightAbortRef.current = null;
      inFlightTextRef.current = "";
      inFlightTurnIdRef.current = null;
    }

    setIsLoading(false);

    if (result.ok) {
      setRemainingSeconds(result.remainingSeconds);
      remainingSecondsRef.current = result.remainingSeconds;

      if (result.remainingSeconds <= 0) {
        setLimitReached(true);
        limitReachedRef.current = true;
        setHandsFree(false);
        handsFreeRef.current = false;
      }

      const assistantTurn: ChatTurn = {
        id: window.crypto.randomUUID(),
        role: "assistant",
        text: result.replyText,
        audioBase64: result.audioBase64,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        correction: result.correction || null,
      };

      setMessages((prev) => [...prev, assistantTurn]);

      // Si la IA determino fin de sesion (despedida o tiempo agotado)
      if (result.sessionEnded && !isTerminatingSessionRef.current) {
        isTerminatingSessionRef.current = true;
        playAiResponse(result.audioBase64, () => {
          void handleFinishSession();
        });
      } else {
        playAiResponse(result.audioBase64);
      }
    } else {
      isSendingRef.current = false;
      safeStopRecognition();

      if (result.status === 429 || result.errorCode === "DAILY_SPEAKING_LIMIT_REACHED") {
        setLimitReached(true);
        limitReachedRef.current = true;
        setRemainingSeconds(0);
        remainingSecondsRef.current = 0;
        setHandsFree(false);
        handsFreeRef.current = false;
        setErrorMsg("Has alcanzado tu límite diario de 20 minutos de speaking.");
        void handleFinishSession();
      } else {
        setErrorMsg(result.message);
        if (handsFreeRef.current && !limitReachedRef.current) {
          setTimeout(() => safeStartRecognition(), 800);
        }
      }
    }
  }

  // Cierre de sesion y generacion del informe pedagogico
  async function handleFinishSession() {
    // 1. Detener de inmediato manos libres, reconocimiento, audio y temporizadores
    setHandsFree(false);
    handsFreeRef.current = false;
    isTerminatingSessionRef.current = true;
    inFlightAbortRef.current?.abort();
    inFlightAbortRef.current = null;
    inFlightTextRef.current = "";
    inFlightTurnIdRef.current = null;
    isSendingRef.current = false;
    setIsLoading(false);
    safeStopRecognition();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch {}
    }
    isPlayingAudioRef.current = false;
    setIsAiSpeaking(false);

    // 2. Activar inmediatamente el estado visible isGeneratingReport = true
    setGeneratingReport(true);
    setActiveReportNotice(null);

    const userId = getOrCreateClientUserId();
    const primaryTopic =
      selectedTopicRef.current ||
      perfilRef.current?.intereses?.[0]?.nombre ||
      "Conversación en inglés";

    const currentTranscript = [...messagesRef.current];
    const duration = Math.max(sessionElapsedRef.current, 5);

    try {
      // 3. Llamar a POST /api/voice/reports
      const report = await generateAndSaveReport({
        userId,
        topic: primaryTopic,
        targetMinutes: targetMinutesRef.current,
        durationSeconds: duration,
        transcript: currentTranscript,
      });

      if (report) {
        setActiveReport(report);
      } else {
        throw new Error("No se pudo obtener informe del servidor");
      }
    } catch (err) {
      console.warn("[SPEAKING_REPORTS] Fallo llamada a API, usando informe local de respaldo:", err);
      // 4. Informe local de respaldo si la API falló
      const userTurns = currentTranscript.filter((m) => m.role === "user");
      const correctionsList = currentTranscript
        .filter((m) => m.role === "assistant" && m.correction)
        .map((m) => m.correction!)
        .filter(Boolean);

      const fallbackReport: SpeakingReport = {
        id: window.crypto.randomUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
        topic: primaryTopic,
        target_minutes: targetMinutesRef.current,
        duration_seconds: duration,
        turns_count: userTurns.length,
        strengths: [
          "Participación activa y fluidez comunicativa en inglés",
          "Excelente iniciativa para responder y mantener el ritmo",
        ],
        improvements: [
          "Seguir practicando estructuras verbales en pasado y conectores",
          "Consolidar la pronunciación fluida",
        ],
        corrections_log: correctionsList,
        summary_comment:
          "¡Gran trabajo completando tu sesión de speaking! Hemos registrado tus intervenciones y correcciones para que continúes progresando.",
      };

      setActiveReport(fallbackReport);
      setActiveReportNotice(
        "El informe se generó en modo local debido a una desconexión temporal con el servidor."
      );
    } finally {
      setGeneratingReport(false);
    }
  }

  // Cargar historial de informes
  async function openReportsDrawer() {
    setShowReportsDrawer(true);
    setLoadingReports(true);
    const userId = getOrCreateClientUserId();
    const reports = await fetchSpeakingReports(userId);
    setUserReports(reports);
    setLoadingReports(false);
  }

  // Iniciar sesion tras elegir duracion
  function startSpeakingSession() {
    setSessionPhase("active");
    setSessionElapsedSeconds(0);
    isTerminatingSessionRef.current = false;
    consecutiveSilencesRef.current = 0;

    const topic = selectedTopicRef.current || "General English Conversation";
    const welcomeText = `Hello! I see you want to practice speaking about ${topic}. What aspect of this topic interests you most today?`;

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    setTimeout(() => {
      safeStartRecognition();
    }, 400);
  }

  // 1. Cargar cuota inicial, perfil y parametro ?topic=
  useEffect(() => {
    const saved = leerPerfilProvisional();
    if (saved) {
      setPerfil(saved);
      perfilRef.current = saved;
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryTopic = params.get("topic");
      if (queryTopic?.trim()) {
        setSelectedTopic(queryTopic.trim());
        selectedTopicRef.current = queryTopic.trim();
      } else {
        const learning = leerPerfilAprendizajeLocal();
        if (learning && learning.interests && learning.interests.length > 0) {
          setSelectedTopic(learning.interests[0]);
          selectedTopicRef.current = learning.interests[0];
        }
      }
    }

    async function initQuota() {
      const quota = await fetchSpeakingQuota();
      if (quota) {
        setRemainingSeconds(quota.remainingSeconds);
        remainingSecondsRef.current = quota.remainingSeconds;
        if (quota.remainingSeconds <= 0) {
          setLimitReached(true);
          limitReachedRef.current = true;
          setHandsFree(false);
          handsFreeRef.current = false;
          safeStopRecognition();
        }
      }
    }

    void initQuota();
  }, []);

  // 2. Setup Web Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      if (isPlayingAudioRef.current || isTerminatingSessionRef.current) {
        return;
      }

      let currentFinal = "";
      let currentInterim = "";
      let hasFinalChunk = false;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          hasFinalChunk = true;
          currentFinal += transcript + " ";
        } else {
          currentInterim += transcript;
        }
      }

      const cleanInterim = currentInterim.trim();
      if (isSendingRef.current) {
        const resumedSpeech = `${currentFinal} ${cleanInterim}`.trim();
        const pendingRequest = inFlightAbortRef.current;
        if (!resumedSpeech || !pendingRequest) return;

        pendingRequest.abort();
        inFlightAbortRef.current = null;
        isSendingRef.current = false;
        setIsLoading(false);

        const interruptedTurnId = inFlightTurnIdRef.current;
        const previousText = inFlightTextRef.current;
        if (interruptedTurnId) {
          const remainingMessages = messagesRef.current.filter(
            (turn) => turn.id !== interruptedTurnId
          );
          messagesRef.current = remainingMessages;
          setMessages(remainingMessages);
        }
        inFlightTextRef.current = "";
        inFlightTurnIdRef.current = null;
        accumulatedSpeechRef.current = previousText;
        setInputText(previousText);
      }

      if (currentFinal) {
        accumulatedSpeechRef.current = (
          accumulatedSpeechRef.current + " " + currentFinal
        ).trim();
        setInputText(accumulatedSpeechRef.current);
      }

      setInterimText(cleanInterim);
      currentInterimRef.current = cleanInterim;

      const fullCandidate = (
        accumulatedSpeechRef.current + " " + cleanInterim
      ).trim();

      consecutiveSilencesRef.current = 0;

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      const words = fullCandidate.split(/\s+/).filter(Boolean);
      const hasEnoughContent = words.length >= 2 || fullCandidate.length > 6;
      const open = isOpenThought(fullCandidate);
      setIsThinkingPause(open);

      if (
        handsFreeRef.current &&
        hasEnoughContent &&
        !isPlayingAudioRef.current &&
        !isSendingRef.current &&
        !limitReachedRef.current &&
        !isTerminatingSessionRef.current
      ) {
        const endsWithPunctuation = /[.?!]\s*$/.test(fullCandidate);
        let dynamicSilenceMs: number;
        if (open) {
          dynamicSilenceMs = SILENCE_OPEN_THOUGHT_MS;
        } else {
          dynamicSilenceMs =
            hasFinalChunk || endsWithPunctuation
              ? SILENCE_THRESHOLD_FINAL_MS
              : SILENCE_THRESHOLD_INTERIM_MS;
        }

        silenceTimerRef.current = setTimeout(() => {
          setIsThinkingPause(false);
          const textToAutoSend = (
            accumulatedSpeechRef.current + " " + (currentInterimRef.current || "")
          ).trim();

          const finalWords = textToAutoSend.split(/\s+/).filter(Boolean);
          if (
            (finalWords.length >= 2 || textToAutoSend.length > 6) &&
            handsFreeRef.current &&
            !isPlayingAudioRef.current &&
            !isSendingRef.current
          ) {
            void executeTurn(textToAutoSend);
          }
        }, dynamicSilenceMs);
      }
    };

    recognition.onspeechend = () => {
      if (
        !handsFreeRef.current ||
        isPlayingAudioRef.current ||
        isSendingRef.current ||
        limitReachedRef.current ||
        isTerminatingSessionRef.current
      ) {
        return;
      }

      const fullCandidate = (
        accumulatedSpeechRef.current + " " + currentInterimRef.current
      ).trim();

      const words = fullCandidate.split(/\s+/).filter(Boolean);
      const hasEnoughContent = words.length >= 2 || fullCandidate.length > 6;

      if (hasEnoughContent) {
        const open = isOpenThought(fullCandidate);
        setIsThinkingPause(open);

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        const waitMs = open ? SILENCE_OPEN_THOUGHT_MS : SPEECH_END_ACCELERATION_MS;

        silenceTimerRef.current = setTimeout(() => {
          setIsThinkingPause(false);
          const textToAutoSend = (
            accumulatedSpeechRef.current + " " + currentInterimRef.current
          ).trim();

          const finalWords = textToAutoSend.split(/\s+/).filter(Boolean);
          if (
            (finalWords.length >= 2 || textToAutoSend.length > 6) &&
            handsFreeRef.current &&
            !isPlayingAudioRef.current &&
            !isSendingRef.current
          ) {
            void executeTurn(textToAutoSend);
          }
        }, waitMs);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        if (
          handsFreeRef.current &&
          !isPlayingAudioRef.current &&
          !isSendingRef.current &&
          !limitReachedRef.current &&
          !isTerminatingSessionRef.current
        ) {
          consecutiveSilencesRef.current += 1;

          if (consecutiveSilencesRef.current >= MAX_CONSECUTIVE_SILENCES) {
            setHandsFree(false);
            handsFreeRef.current = false;
            safeStopRecognition();
            setInfoNotice(
              "Conversación continua en pausa por inactividad (3 silencios consecutivos)."
            );
          }
        }
        return;
      }

      if (event.error === "aborted") return;

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicPermissionNeeded(true);
        isRecordingRef.current = false;
        setIsRecording(false);
        return;
      }

      console.warn("Speech warning:", event.error);
    };

    recognition.onend = () => {
      isRecordingRef.current = false;
      setIsRecording(false);

      if (
        handsFreeRef.current &&
        isSendingRef.current &&
        inFlightAbortRef.current &&
        !isPlayingAudioRef.current &&
        !isTerminatingSessionRef.current
      ) {
        setTimeout(() => startRecognitionDuringRequest(), 300);
        return;
      }

      if (
        handsFreeRef.current &&
        !isPlayingAudioRef.current &&
        !isSendingRef.current &&
        !limitReachedRef.current &&
        !isTerminatingSessionRef.current &&
        consecutiveSilencesRef.current < MAX_CONSECUTIVE_SILENCES
      ) {
        setTimeout(() => safeStartRecognition(), 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  function handleActivateMic() {
    if (limitReached) return;
    setMicPermissionNeeded(false);
    setErrorMsg(null);
    setInfoNotice(null);
    setHandsFree(true);
    handsFreeRef.current = true;
    consecutiveSilencesRef.current = 0;
    accumulatedSpeechRef.current = "";
    safeStartRecognition();
  }

  function toggleHandsFree() {
    if (limitReached || sessionPhase !== "active") return;
    const nextState = !handsFree;
    setHandsFree(nextState);
    handsFreeRef.current = nextState;
    consecutiveSilencesRef.current = 0;
    setErrorMsg(null);
    setInfoNotice(null);
    setMicPermissionNeeded(false);

    if (nextState) {
      accumulatedSpeechRef.current = "";
      safeStartRecognition();
    } else {
      safeStopRecognition();
    }
  }

  function toggleRecordingManual() {
    if (limitReached || sessionPhase !== "active") return;
    if (isRecording) {
      safeStopRecognition();
    } else {
      setErrorMsg(null);
      setInfoNotice(null);
      setMicPermissionNeeded(false);
      accumulatedSpeechRef.current = inputText;
      safeStartRecognition();
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = (inputText + " " + interimText).trim();
    if (candidate) {
      void executeTurn(candidate);
    }
  }

  function playManualAudio(audioBase64: string) {
    if (!audioBase64) return;
    try {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const blob = b64toBlob(audioBase64, "audio/mpeg");
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audioPlayerRef.current = audio;
      const cleanup = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      void audio.play();
    } catch (e) {
      console.warn("Fallo reproduciendo audio:", e);
    }
  }

  const quotaPercent = Math.min(
    100,
    Math.max(0, ((TOTAL_DAILY_SECONDS - remainingSeconds) / TOTAL_DAILY_SECONDS) * 100)
  );

  const blockTotalSeconds = targetMinutes * 60;
  const blockSecondsLeft = Math.max(0, blockTotalSeconds - sessionElapsedSeconds);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* CABECERA */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 font-bold text-white shadow-sm"
              aria-label="Volver al inicio"
            >
              I
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                  Tutor de Speaking IA
                </h1>
                {sessionPhase === "active" && handsFree && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
                    Manos Libres
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Práctica oral fluida · Nivel {perfil?.nivelDeclarado ?? "B1"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* BOTON MIS INFORMES */}
            <button
              type="button"
              onClick={openReportsDrawer}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Mis Informes</span>
            </button>

            {/* BOTON FINALIZAR SESION EN VIVO */}
            {sessionPhase === "active" && (
              <button
                type="button"
                onClick={() => void handleFinishSession()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
              >
                <span>⏹️</span>
                <span>Finalizar sesión</span>
              </button>
            )}

            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value as any)}
              aria-label="Seleccionar voz"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="en-US-Neural2-F">EE.UU. (Neural2-F)</option>
              <option value="en-GB-Neural2-B">Reino Unido (Neural2-B)</option>
            </select>

            <Link
              href="/"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Salir
            </Link>
          </div>
        </div>

        {/* BARRA DE CUOTA DIARIA (20 MIN) Y CRONOMETRO DE BLOQUE */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Cuota diaria:</span>
                <span
                  className={`font-mono font-bold ${
                    limitReached
                      ? "text-rose-600"
                      : remainingSeconds < 300
                      ? "text-amber-600"
                      : "text-indigo-700"
                  }`}
                >
                  {formatTime(remainingSeconds)} restantes
                </span>
                <span className="text-slate-400">/ 20:00 min</span>
              </div>

              {sessionPhase === "active" && (
                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                  <span className="font-semibold text-slate-700">Bloque actual:</span>
                  <span
                    className={`font-mono font-bold ${
                      blockSecondsLeft <= 45 ? "animate-pulse text-amber-600" : "text-emerald-700"
                    }`}
                  >
                    ⏱️ {formatTime(blockSecondsLeft)}
                  </span>
                  <span className="text-slate-400">({targetMinutes} min)</span>
                </div>
              )}
            </div>

            <div className="flex w-full max-w-[200px] items-center gap-2 sm:w-48">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    limitReached
                      ? "bg-rose-500"
                      : quotaPercent > 75
                      ? "bg-amber-500"
                      : "bg-indigo-600"
                  }`}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <span className="w-8 text-right text-[11px] font-medium text-slate-500">
                {Math.round(quotaPercent)}%
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        {/* ALERTA DE LIMITE ALCANZADO (429) */}
        {limitReached && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">
                🛑
              </span>
              <div>
                <h2 className="text-sm font-bold sm:text-base">
                  Límite diario de Speaking completado (20 minutos)
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-rose-700 sm:text-sm">
                  ¡Gran trabajo! Has completado tu práctica de 20 minutos de hoy. Tu cuota se
                  renovará mañana a las 00:00 UTC.
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={openReportsDrawer}
                    className="inline-flex rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800"
                  >
                    Ver mis informes anteriores →
                  </button>
                  <Link
                    href="/listening"
                    className="inline-flex rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                  >
                    Ir a Listening
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* FASE 1: SELECTOR DE DURACION DE SESION               */}
        {/* ==================================================== */}
        {sessionPhase === "setup" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <span className="inline-flex rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700">
              🎙️ Elige tu objetivo de hoy
            </span>

            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              ¿Cuánto tiempo deseas conversar hoy?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
              Selecciona la duración de tu bloque. La IA adaptará la profundidad del tema y
              cerrará la sesión de forma natural al completarse el tiempo.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = targetMinutes === opt.minutes;
                const canAfford = remainingSeconds >= opt.minutes * 60;

                return (
                  <button
                    key={opt.minutes}
                    type="button"
                    disabled={!canAfford}
                    onClick={() => setTargetMinutes(opt.minutes)}
                    className={`relative flex flex-col justify-between rounded-2xl border-2 p-5 text-left transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-400/30"
                        : canAfford
                        ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        : "cursor-not-allowed border-slate-100 bg-slate-50/70 opacity-40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {opt.badge}
                        </span>
                        {!canAfford && (
                          <span className="text-[10px] font-bold text-rose-600">
                            Excede cuota
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-2xl font-black text-slate-900">
                        {opt.label}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">{opt.desc}</p>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                      <span>{isSelected ? "✓ Seleccionado" : "Elegir"}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SELECTOR DE TEMA DE CONVERSACION */}
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Tema activo de la conversación:
                </span>
                <span className="text-[11px] font-medium text-indigo-700">
                  Pulsa un chip para cambiar de tema
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs">
                  <span>✨</span>
                  <span>{selectedTopic}</span>
                  <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.2">Activo</span>
                </span>

                {(perfil?.intereses?.map((i) => i.nombre) ?? ["Tecnología", "Viajes", "Deportes"])
                  .filter((t) => t !== selectedTopic)
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTopic(t)}
                      className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-900 shadow-2xs transition-colors hover:border-indigo-400 hover:bg-indigo-50"
                    >
                      {t}
                    </button>
                  ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
              <div className="text-xs text-slate-500">
                <span>Tema: </span>
                <span className="font-semibold text-slate-700">{selectedTopic}</span>
                <span className="mx-2 text-slate-300">·</span>
                <span>Nivel: </span>
                <span className="font-semibold text-indigo-700">{perfil?.nivelDeclarado ?? "B1"}</span>
              </div>

              <button
                type="button"
                disabled={remainingSeconds < targetMinutes * 60 || limitReached}
                onClick={startSpeakingSession}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-800 disabled:opacity-40 sm:w-auto"
              >
                <span>Comenzar sesión de {targetMinutes} min sobre {selectedTopic}</span>
                <span>→</span>
              </button>
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* FASE 2: CONVERSACION EN CURSO                        */}
        {/* ==================================================== */}
        {sessionPhase === "active" && (
          <div>
            {/* BANNER PROMINENTE SI FALTA GESTO DEL NAVEGADOR */}
            {micPermissionNeeded && !isRecording && !limitReached && (
              <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-indigo-100/80 p-5 shadow-md sm:flex-row text-center sm:text-left">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-700 text-2xl text-white shadow-sm">
                    🎙️
                  </span>
                  <div>
                    <h2 className="text-sm font-extrabold text-indigo-950 sm:text-base">
                      Modo Manos Libres preparado
                    </h2>
                    <p className="mt-0.5 text-xs text-indigo-700 sm:text-sm">
                      Toca el botón para autorizar el micrófono del navegador y hablar sin botones.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleActivateMic}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-800 hover:shadow-lg active:scale-95"
                >
                  <span>🎙️</span>
                  <span>Tocar para activar micrófono</span>
                </button>
              </div>
            )}

            {infoNotice && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
                <span>ℹ️ {infoNotice}</span>
                <button
                  onClick={() => setInfoNotice(null)}
                  className="ml-2 font-bold text-sky-600 hover:text-sky-900"
                >
                  ✕
                </button>
              </div>
            )}

            {errorMsg && !limitReached && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* AREA DE CHAT */}
            <div className="flex min-h-[460px] flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex flex-col ${
                      turn.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
                        turn.role === "user"
                          ? "rounded-tr-none bg-indigo-700 text-white"
                          : "rounded-tl-none border border-slate-200 bg-slate-50 text-slate-800"
                      }`}
                    >
                      <p>{turn.text}</p>

                      {turn.role === "assistant" && turn.correction && (
                        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/95 p-3 text-xs text-slate-900 shadow-xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900">
                            <span>💡</span>
                            <span>Repetición guiada · Repite en voz alta:</span>
                          </div>
                          <p className="mt-1.5 rounded-lg border border-amber-200 bg-white/90 px-2.5 py-1.5 font-mono text-xs font-semibold text-indigo-900">
                            “{turn.correction.correctedSentence}”
                          </p>
                          {turn.correction.grammarTip && (
                            <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800">
                              <span className="font-semibold text-amber-900">Regla:</span>{" "}
                              {turn.correction.grammarTip}
                            </p>
                          )}
                        </div>
                      )}

                      {turn.role === "assistant" && turn.audioBase64 && (
                        <button
                          onClick={() => playManualAudio(turn.audioBase64!)}
                          aria-label="Escuchar pronunciación"
                          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <span>🔊</span>
                          <span>Escuchar</span>
                        </button>
                      )}
                    </div>

                    <span className="mt-1 text-[10px] text-slate-400">
                      {turn.role === "user" ? "Tú" : "Tutor IA"} · {turn.timestamp}
                    </span>
                  </div>
                ))}

                {isRecording && (interimText || isThinkingPause) && (
                  <div className="flex flex-col items-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-none border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs text-indigo-900 shadow-sm animate-pulse">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          Escuchando en directo...
                        </span>
                        {isThinkingPause && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            ⏳ Tómate tu tiempo, te escucho...
                          </span>
                        )}
                      </div>
                      {interimText && <p>{interimText}</p>}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="rounded-2xl rounded-tl-none border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.4s]" />
                        <span className="ml-1 text-slate-600">Pensando y sintetizando voz...</span>
                      </span>
                    </div>
                  </div>
                )}

                {isAiSpeaking && (
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                      <span className="animate-spin text-sm">🎙️</span>
                      <span>Tutor hablando con voz Neural2 · Micrófono en pausa</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* CONTROLES INFERIORES */}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={toggleHandsFree}
                    disabled={limitReached}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      handsFree
                        ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    } disabled:opacity-40`}
                  >
                    <span className="relative flex h-2 w-2">
                      {handsFree && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-200 opacity-75" />
                      )}
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          handsFree ? "bg-white" : "bg-slate-400"
                        }`}
                      />
                    </span>
                    <span>Conversación continua: {handsFree ? "ON" : "OFF"}</span>
                  </button>

                  <div className="text-[11px] text-slate-400">
                    {blockSecondsLeft <= 45 ? (
                      <span className="font-bold text-amber-600">
                        ⚠️ Quedan menos de 45s. Despidiéndote de la sesión...
                      </span>
                    ) : handsFree ? (
                      isRecording ? (
                        <span className="font-semibold text-emerald-700">
                          🟢 Habla cuando quieras (detecta silencios)
                        </span>
                      ) : isAiSpeaking ? (
                        <span className="font-semibold text-amber-700">
                          🔈 Escuchando al tutor...
                        </span>
                      ) : (
                        <span>En pausa</span>
                      )
                    ) : (
                      <span>Modo manual</span>
                    )}
                  </div>
                </div>

                <form onSubmit={handleFormSubmit}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleRecordingManual}
                      disabled={limitReached || isLoading || isAiSpeaking}
                      aria-label={isRecording ? "Detener grabación" : "Grabar voz con micrófono"}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isRecording
                          ? "animate-pulse bg-rose-600 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      } disabled:opacity-50`}
                    >
                      {isRecording ? "🛑" : "🎙️"}
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        limitReached
                          ? "Límite de 20 min diarios alcanzado."
                          : handsFree
                          ? isRecording
                            ? "Habla en inglés... (envío automático dinámico)"
                            : "Modo Manos Libres activo..."
                          : isRecording
                          ? "Escuchando tu voz... (habla en inglés)"
                          : "Escribe tu respuesta en inglés o pulsa el micro..."
                      }
                      disabled={limitReached || isLoading}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />

                    <button
                      type="submit"
                      disabled={limitReached || isLoading || !inputText.trim()}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800 disabled:opacity-40"
                    >
                      Enviar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* FASE 3: INFORME DE FEEDBACK INSTANTANEO              */}
        {/* ==================================================== */}
        {sessionPhase === "report" && activeReport && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div>
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    ✓ Sesión completada con éxito
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
                    {activeReport.topic}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Objetivo: {activeReport.target_minutes} min · Tiempo hablado:{" "}
                    {formatTime(activeReport.duration_seconds)} · Turnos:{" "}
                    {activeReport.turns_count}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSessionPhase("setup");
                    setActiveReport(null);
                  }}
                  className="rounded-xl bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-800"
                >
                  Nueva sesión de Speaking →
                </button>
              </div>

              {activeReportNotice && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  ⚠️ {activeReportNotice}
                </div>
              )}

              {/* COMENTARIO MOTIVADOR */}
              <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-relaxed text-indigo-950 sm:p-5">
                <p className="font-semibold text-indigo-900">Comentario del tutor:</p>
                <p className="mt-1 text-slate-700">{activeReport.summary_comment}</p>
              </div>

              {/* FORTALEZAS Y MEJORAS */}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {/* FORTALEZAS */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <span>🌟</span>
                    <span>Fortalezas demostradas</span>
                  </h3>
                  <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
                    {activeReport.strengths?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-emerald-600">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AREAS DE MEJORA */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <span>🎯</span>
                    <span>Áreas concretas de mejora</span>
                  </h3>
                  <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
                    {activeReport.improvements?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-amber-600">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* LOG DE CORRECCIONES */}
              {activeReport.corrections_log && activeReport.corrections_log.length > 0 && (
                <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-900">
                    💡 Correcciones guiadas de la sesión ({activeReport.corrections_log.length})
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    {activeReport.corrections_log.map((cor, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                      >
                        <p className="font-mono font-semibold text-indigo-900">
                          “{cor.correctedSentence}”
                        </p>
                        {cor.grammarTip && (
                          <p className="mt-1 text-[11px] text-slate-600">{cor.grammarTip}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* ==================================================== */}
      {/* OVERLAY VISIBLE DE GENERACION INMEDIATA (Z-50)       */}
      {/* ==================================================== */}
      {generatingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl max-w-md w-full">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <h2 className="mt-4 text-base font-bold text-slate-900 sm:text-lg">
              ⏳ Analizando tu conversación y generando informe de feedback...
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Gemini está evaluando tus intervenciones, vocabulario y correcciones de la sesión.
            </p>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL PROMINENTE DEL INFORME ACTUAL (Z-50)           */}
      {/* ==================================================== */}
      {activeReport && !generatingReport && sessionPhase === "active" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                  ✓ Sesión de Speaking finalizada
                </span>
                <h2 className="mt-1.5 text-xl font-extrabold text-slate-900 sm:text-2xl">
                  {activeReport.topic}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Objetivo: {activeReport.target_minutes} min · Tiempo hablado:{" "}
                  {formatTime(activeReport.duration_seconds)} · Turnos: {activeReport.turns_count}
                </p>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar informe"
              >
                ✕
              </button>
            </div>

            {activeReportNotice && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                ⚠️ {activeReportNotice}
              </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1 text-slate-800">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs leading-relaxed sm:text-sm text-indigo-950">
                <p className="font-bold text-indigo-900">Comentario del tutor:</p>
                <p className="mt-1 text-slate-700">{activeReport.summary_comment}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    <span>🌟</span>
                    <span>Fortalezas demostradas</span>
                  </h3>
                  <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
                    {activeReport.strengths?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-bold text-emerald-600">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <span>🎯</span>
                    <span>Áreas concretas de mejora</span>
                  </h3>
                  <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
                    {activeReport.improvements?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-bold text-amber-600">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {activeReport.corrections_log && activeReport.corrections_log.length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    💡 Correcciones guiadas ({activeReport.corrections_log.length})
                  </h3>
                  <div className="mt-2.5 space-y-2">
                    {activeReport.corrections_log.map((cor, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs">
                        <p className="font-mono font-semibold text-indigo-900">“{cor.correctedSentence}”</p>
                        {cor.grammarTip && (
                          <p className="mt-0.5 text-[11px] text-slate-600">{cor.grammarTip}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setActiveReport(null);
                  openReportsDrawer();
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                📋 Ver todos mis informes
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReport(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver conversación
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveReport(null);
                    setSessionPhase("setup");
                    setMessages([]);
                  }}
                  className="rounded-xl bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-800"
                >
                  Nueva sesión →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* DRAWER / MODAL: HISTORIAL DE MIS INFORMES           */}
      {/* ==================================================== */}
      {showReportsDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h2 className="text-lg font-bold text-slate-900">
                  Historial de Informes de Speaking
                </h2>
              </div>
              <button
                onClick={() => setShowReportsDrawer(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar modal de informes"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
              {loadingReports ? (
                <div className="flex items-center justify-center py-12 text-xs text-slate-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-2" />
                  Cargando informes guardados...
                </div>
              ) : userReports.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Aún no tienes informes guardados. Completa tu primera sesión para ver tu feedback.
                </p>
              ) : (
                userReports.map((rep) => (
                  <article
                    key={rep.id}
                    className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-indigo-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                          {rep.topic}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">
                          Sesión de {rep.target_minutes} min ({formatTime(rep.duration_seconds)} hablados)
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rep.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {rep.summary_comment}
                    </p>

                    {rep.strengths && rep.strengths.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {rep.strengths.slice(0, 2).map((s, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-100"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 text-right">
              <button
                type="button"
                onClick={() => setShowReportsDrawer(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
