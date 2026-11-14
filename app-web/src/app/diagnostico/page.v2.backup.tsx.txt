"use client";

import { useEffect, useState } from "react";

// =====================================================
// INTERESTALK - PLACEMENT TEST V2
// Pantalla conectada a la API de diagnostico
// =====================================================

type Competencia = "grammar" | "vocabulary" | "reading";

type PreguntaPublica = {
  id: string;
  idioma: string;
  nivel: string;
  competencia: Competencia;
  enunciado: string;
  contexto?: string;
  opciones: string[];
};

type ResultadoPregunta = {
  preguntaId: string;
  competencia: Competencia;
  nivel: string;
  correcta: boolean;
};

type ResultadoDiagnostico = {
  total: number;
  aciertos: number;
  porcentaje: number;
  detalle: ResultadoPregunta[];
};

type RespuestaAPI = {
  estado: string;
  idioma: string;
  resultado: ResultadoDiagnostico;
  mensaje: string;
};

const NOMBRES_COMPETENCIAS: Record<Competencia, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading",
};

export default function DiagnosticoPage() {
  const [iniciado, setIniciado] = useState(false);
  const [preguntas, setPreguntas] = useState<PreguntaPublica[]>([]);
  const [indice, setIndice] = useState(0);

  const [respuestas, setRespuestas] = useState<
    Record<string, number>
  >({});

  const [resultado, setResultado] =
    useState<ResultadoDiagnostico | null>(null);

  const [cargando, setCargando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [error, setError] = useState("");

  // Idioma fijo para esta primera demostracion.
  // La conexion con el onboarding se incorporara despues.
  const idioma = "en";

  useEffect(() => {
    if (!iniciado || resultado) return;

    const controlador = new AbortController();

    async function cargarPreguntas() {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(
          "/api/diagnostico?idioma=en",
          {
            method: "GET",
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        if (!respuesta.ok) {
          throw new Error(
            "No se pudieron cargar las preguntas."
          );
        }

        const datos = await respuesta.json();

        if (
          !Array.isArray(datos.preguntas) ||
          datos.preguntas.length === 0
        ) {
          throw new Error(
            "No hay preguntas disponibles."
          );
        }

        setPreguntas(datos.preguntas);
      } catch (err) {
        if (controlador.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar el diagnóstico."
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarPreguntas();

    return () => controlador.abort();
  }, [iniciado, resultado]);

  const pregunta = preguntas[indice];
  const seleccion = pregunta
    ? respuestas[pregunta.id]
    : undefined;

  const total = preguntas.length;
  const progreso =
    total > 0 ? ((indice + 1) / total) * 100 : 0;

  function comenzar() {
    setPreguntas([]);
    setRespuestas({});
    setIndice(0);
    setResultado(null);
    setError("");
    setIniciado(true);
  }

  function seleccionarRespuesta(opcion: number) {
    if (!pregunta || corrigiendo) return;

    setRespuestas((anteriores) => ({
      ...anteriores,
      [pregunta.id]: opcion,
    }));
  }

  async function continuar() {
    if (!pregunta || seleccion === undefined) return;

    if (indice < total - 1) {
      setIndice((actual) => actual + 1);
      return;
    }

    await finalizar();
  }

  async function finalizar() {
    if (corrigiendo) return;

    if (Object.keys(respuestas).length !== total) {
      setError("Debes responder todas las preguntas.");
      return;
    }

    setCorrigiendo(true);
    setError("");

    try {
      const respuesta = await fetch("/api/diagnostico", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          idioma,
          respuestas,
        }),
      });

      if (!respuesta.ok) {
        throw new Error(
          "No se pudo corregir la evaluación."
        );
      }

      const datos: RespuestaAPI = await respuesta.json();

      if (
        !datos.resultado ||
        typeof datos.resultado.porcentaje !== "number"
      ) {
        throw new Error(
          "El servidor devolvió un resultado inválido."
        );
      }

      setResultado(datos.resultado);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al corregir la evaluación."
      );
    } finally {
      setCorrigiendo(false);
    }
  }

  function reiniciar() {
    setIniciado(false);
    setPreguntas([]);
    setIndice(0);
    setRespuestas({});
    setResultado(null);
    setCargando(false);
    setCorrigiendo(false);
    setError("");
  }

  const competencias = resultado
    ? (["grammar", "vocabulary", "reading"] as const).map(
        (competencia) => {
          const items = resultado.detalle.filter(
            (item) => item.competencia === competencia
          );

          return {
            competencia,
            total: items.length,
            aciertos: items.filter((item) => item.correcta)
              .length,
          };
        }
      )
    : [];

  return (
    <main className="min-h-screen bg-[#090b12] text-white">
      <div className="mx-auto min-h-screen max-w-6xl px-6 py-8 lg:px-12">

        {/* CABECERA */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="text-2xl font-black tracking-tight">
            INTERES
            <span className="text-violet-400">TALK</span>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-gray-300">
            PLACEMENT TEST
          </div>
        </header>

        <div className="mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center py-12">

          {/* BIENVENIDA */}
          {!iniciado && !resultado && (
            <section className="w-full text-center">

              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-400/30 bg-violet-500/10 text-4xl text-violet-300">
                ✦
              </div>

              <div className="mb-5 inline-flex rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
                TU PUNTO DE PARTIDA
              </div>

              <h1 className="text-4xl font-bold tracking-tight lg:text-6xl">
                Descubramos
                <br />
                tu nivel.
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
                Queremos conocer cómo utilizas el idioma
                para ofrecerte una experiencia adaptada
                a tus conocimientos.
              </p>

              <div className="mt-10 grid grid-cols-3 gap-3">
                {[
                  ["01", "Grammar"],
                  ["02", "Vocabulary"],
                  ["03", "Reading"],
                ].map(([numero, titulo]) => (
                  <div
                    key={numero}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <span className="text-xs text-violet-400">
                      {numero}
                    </span>
                    <p className="mt-2 font-medium">
                      {titulo}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-sm text-gray-500">
                Demostración inicial · 5 preguntas
                · Sin certificación oficial
              </p>

              <button
                type="button"
                onClick={comenzar}
                className="mt-8 w-full rounded-2xl bg-violet-600 px-6 py-4 font-semibold transition-colors hover:bg-violet-500 sm:w-auto sm:min-w-72"
              >
                Comenzar evaluación →
              </button>
            </section>
          )}

          {/* CARGA */}
          {iniciado && cargando && (
            <section
              className="w-full text-center"
              role="status"
            >
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-violet-500" />

              <h2 className="mt-8 text-2xl font-semibold">
                Preparando tu evaluación
              </h2>

              <p className="mt-3 text-gray-400">
                Estamos cargando las preguntas.
              </p>
            </section>
          )}

          {/* PREGUNTAS */}
          {iniciado &&
            !cargando &&
            !resultado &&
            pregunta && (
              <section className="w-full">

                <div className="mb-6 flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    Pregunta {indice + 1} de {total}
                  </span>

                  <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-300">
                    {NOMBRES_COMPETENCIAS[
                      pregunta.competencia
                    ]}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{ width: progreso + "%" }}
                  />
                </div>

                <div className="mt-12">

                  <p className="mb-4 text-sm font-medium text-violet-400">
                    CHOOSE THE CORRECT ANSWER
                  </p>

                  {pregunta.contexto && (
                    <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 leading-relaxed text-gray-300">
                      {pregunta.contexto}
                    </div>
                  )}

                  <h2 className="text-2xl font-bold leading-relaxed lg:text-3xl">
                    {pregunta.enunciado}
                  </h2>

                  <div className="mt-9 grid gap-3">
                    {pregunta.opciones.map(
                      (opcion, numero) => {
                        const activa = seleccion === numero;

                        return (
                          <button
                            key={numero}
                            type="button"
                            aria-pressed={activa}
                            disabled={corrigiendo}
                            onClick={() =>
                              seleccionarRespuesta(numero)
                            }
                            className={
                              "flex items-center gap-4 rounded-2xl border p-5 text-left transition-all " +
                              (activa
                                ? "border-violet-400 bg-violet-600/20"
                                : "border-white/10 bg-white/5 hover:border-violet-400/40 hover:bg-white/10")
                            }
                          >
                            <span
                              className={
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold " +
                                (activa
                                  ? "border-violet-400 bg-violet-600"
                                  : "border-white/20 bg-white/5")
                              }
                            >
                              {String.fromCharCode(
                                65 + numero
                              )}
                            </span>

                            <span className="font-medium">
                              {opcion}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="mt-10 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={
                        indice === 0 || corrigiendo
                      }
                      onClick={() =>
                        setIndice((actual) => actual - 1)
                      }
                      className="rounded-2xl border border-white/20 px-6 py-4 font-medium disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ← Anterior
                    </button>

                    <button
                      type="button"
                      disabled={
                        seleccion === undefined ||
                        corrigiendo
                      }
                      onClick={continuar}
                      className="rounded-2xl bg-violet-600 px-8 py-4 font-semibold transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {corrigiendo
                        ? "Corrigiendo..."
                        : indice === total - 1
                          ? "Finalizar prueba"
                          : "Siguiente →"}
                    </button>
                  </div>
                </div>
              </section>
            )}

          {/* RESULTADOS */}
          {resultado && (
            <section className="w-full text-center">

              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-400/30 bg-violet-500/10 text-4xl text-violet-300">
                ✓
              </div>

              <h2 className="text-4xl font-bold">
                ¡Evaluación completada!
              </h2>

              <p className="mt-4 text-gray-400">
                Estos son los resultados de tu prueba inicial.
              </p>

              <div className="mt-9 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-gray-400">
                    Respuestas correctas
                  </p>

                  <p className="mt-3 text-4xl font-bold text-violet-300">
                    {resultado.aciertos}/{resultado.total}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-gray-400">
                    Puntuación
                  </p>

                  <p className="mt-3 text-4xl font-bold text-violet-300">
                    {resultado.porcentaje}%
                  </p>
                </div>
              </div>

              <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
                <h3 className="text-lg font-semibold">
                  Resultados por competencia
                </h3>

                <div className="mt-5 space-y-4">
                  {competencias.map((item) => (
                    <div
                      key={item.competencia}
                      className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0"
                    >
                      <span className="text-gray-300">
                        {NOMBRES_COMPETENCIAS[
                          item.competencia
                        ]}
                      </span>

                      <span className="font-semibold">
                        {item.aciertos}/{item.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-7 text-sm leading-relaxed text-gray-500">
                Esta prueba de cinco preguntas es una
                demostración técnica. Todavía no permite
                determinar un nivel MCER fiable.
              </p>

              <button
                type="button"
                onClick={reiniciar}
                className="mt-8 rounded-2xl bg-violet-600 px-8 py-4 font-semibold hover:bg-violet-500"
              >
                Repetir demostración
              </button>
            </section>
          )}

          {/* ERRORES */}
          {error && (
            <div
              role="alert"
              className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-red-500/30 bg-[#29151c] p-5 text-center text-sm text-red-200 shadow-xl"
            >
              <p>{error}</p>

              <button
                type="button"
                onClick={reiniciar}
                className="mt-3 rounded-xl border border-red-400/30 px-4 py-2 hover:bg-white/10"
              >
                Volver al inicio
              </button>
            </div>
          )}

        </div>

        <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-500">
          INTERESTALK · Learn what you love.
          · Evaluación orientativa, no certificación oficial
        </footer>
      </div>
    </main>
  );
}