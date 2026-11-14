"use client";

import { useState, useEffect } from "react";
import {
  DEFAULT_PRESET_INTERESTS,
  type UserLearningProfile,
  syncPerfilAprendizaje,
} from "@/lib/perfil-provisional";
import { getOrCreateClientUserId } from "@/lib/voice-client";

// ======================================================
// INTERESTALK - MODAL DE SELECCION Y PERSONALIZACION
// Permite elegir nivel (B1/B2), intereses por chips y
// temas personalizados libres.
// ======================================================

type InterestsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (profile: UserLearningProfile) => void;
  initialProfile?: UserLearningProfile | null;
};

export default function InterestsModal({
  isOpen,
  onClose,
  onSaved,
  initialProfile,
}: InterestsModalProps) {
  const [level, setLevel] = useState<"B1" | "B2">("B1");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialProfile) {
      setLevel(initialProfile.level || "B1");
      setSelectedInterests(initialProfile.interests || []);
      setCustomTopics(initialProfile.customTopics || []);
    } else {
      setSelectedInterests(["Tecnología", "Viajes"]);
      setCustomTopics([]);
    }
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  function toggleInterest(interest: string) {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) {
        if (prev.length <= 1 && customTopics.length === 0) return prev; // Mantener al menos 1
        return prev.filter((i) => i !== interest);
      }
      return [...prev, interest];
    });
  }

  function handleAddCustomTopic() {
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;
    if (!customTopics.includes(trimmed) && !selectedInterests.includes(trimmed)) {
      setCustomTopics((prev) => [...prev, trimmed]);
    }
    setNewTopicInput("");
  }

  function handleRemoveCustomTopic(topic: string) {
    setCustomTopics((prev) => prev.filter((t) => t !== topic));
  }

  async function handleSave() {
    setIsSaving(true);
    const userId = getOrCreateClientUserId();

    const mergedInterests = Array.from(
      new Set([...selectedInterests, ...customTopics])
    );

    const saved = await syncPerfilAprendizaje(userId, {
      level,
      interests: mergedInterests.length > 0 ? mergedInterests : ["Tecnología", "Viajes"],
      customTopics,
    });

    setIsSaving(false);
    onSaved(saved);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        {/* CABECERA MODAL */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-bold text-indigo-700">
              Personalización de aprendizaje
            </span>
            <h2 className="mt-1.5 text-xl font-extrabold text-slate-900 sm:text-2xl">
              Configura tus temas e intereses
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Todas tus conversaciones de Speaking y audios de Listening se adaptarán a estos temas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* CUERPO MODAL */}
        <div className="flex-1 space-y-6 overflow-y-auto py-5 pr-1">
          {/* SELECTOR DE NIVEL */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Nivel objetivo de práctica
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLevel("B1")}
                className={`flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition-all ${
                  level === "B1"
                    ? "border-indigo-600 bg-indigo-50/70 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-black text-slate-900">Nivel B1</span>
                  {level === "B1" && <span className="text-xs font-bold text-indigo-600">✓ Activo</span>}
                </div>
                <span className="mt-1 text-[11px] text-slate-500">
                  Intermedio · Vocabulario cotidiano, expresiones directas y fluidez práctica.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLevel("B2")}
                className={`flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition-all ${
                  level === "B2"
                    ? "border-indigo-600 bg-indigo-50/70 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-black text-slate-900">Nivel B2</span>
                  {level === "B2" && <span className="text-xs font-bold text-indigo-600">✓ Activo</span>}
                </div>
                <span className="mt-1 text-[11px] text-slate-500">
                  Intermedio alto · Matices, argumentación, vocabulario técnico y soltura.
                </span>
              </button>
            </div>
          </div>

          {/* CHIPS DE INTERESES PREESTABLECIDOS */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Selecciona tus pasiones principales
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                {selectedInterests.length} seleccionados
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {DEFAULT_PRESET_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span>{isSelected ? "✓" : "+"}</span>
                    <span>{interest}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TEMAS PERSONALIZADOS LIBRES */}
          <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-4">
            <label className="text-sm font-extrabold text-slate-900">
              ¿Tienes intereses específicos? Añádelos aquí
            </label>
            <p className="mt-1 text-xs text-slate-600">
              Ej. <em>"Crossfit Games", "Startups B2B", "Fotografía analógica", "Motos Ducati"</em>
            </p>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newTopicInput}
                onChange={(e) => setNewTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTopic();
                  }
                }}
                placeholder="Escribe un tema concreto..."
                className="min-h-11 flex-1 rounded-xl border border-purple-300 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={handleAddCustomTopic}
                disabled={!newTopicInput.trim()}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-40"
              >
                + Añadir
              </button>
            </div>

            {customTopics.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {customTopics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-900"
                  >
                    <span>✨ {topic}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomTopic(topic)}
                      className="ml-1 text-purple-400 hover:text-purple-700 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PIE DE MODAL */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || (selectedInterests.length === 0 && customTopics.length === 0)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-800 disabled:opacity-40"
          >
            {isSaving ? "Guardando..." : "Guardar preferencias de aprendizaje →"}
          </button>
        </div>
      </div>
    </div>
  );
}
