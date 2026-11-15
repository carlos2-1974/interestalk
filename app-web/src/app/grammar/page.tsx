"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  fetchPerfilAprendizaje,
  guardarPerfilProvisional,
  leerPerfilProvisional,
  type PerfilProvisional,
} from "@/lib/perfil-provisional";
import { getOrCreateClientUserId } from "@/lib/voice-client";
import { registerLearningEvent } from "@/lib/learning-events-client";

import {
  guardarContinuidadGrammarCliente,
  leerContinuidadGrammarCliente,
} from "@/lib/grammar/continuidad-cliente";

// ======================================================
// INTERESTALK - GRAMMAR V2
// PANTALLA ALUMNO V1
//
// Flujo:
//
// continuidad + perfil personal
// -> API Grammar
// -> actividad publica
// -> respuestas alumno
// -> correccion servidor
// -> feedback
//
// Nunca recibe soluciones antes de corregir.
// ======================================================

type TipoEjercicio =
  | "opcion_multiple"
  | "completar"
  | "transformar";

type EjercicioPublico = {
  id: string;
  tipo: TipoEjercicio;
  enunciado: string;
  opciones: string[] | null;
};

type ActividadPublica = {
  version: 1;
  actividadId: string;
  objetivoGrammar: string;
  nivelContenido:
    | "A1"
    | "A2"
    | "B1"
    | "B2"
    | "C1"
    | "C2";
  tipoActividad:
    | "refuerzo"
    | "consolidacion";
  titulo: string;
  introduccion: string;
  explicacion: string;
  regla: string;
  ejemplos: string[];
  erroresFrecuentes: string[];
  ejercicios: EjercicioPublico[];
  aplicacionPractica: string;
};

type RespuestaGeneracion = {
  estado: "actividad_generada";
  actividad: ActividadPublica;
  expiraEn: string;
};

type ResultadoEjercicio = {
  ejercicioId: string;
  respuestaAlumno: string;
  respuestaCorrecta: string;
  correcto: boolean;
  explicacion: string;
};

type ResultadoCorreccion = {
  actividadId: string;
  objetivoGrammar: string;
  nivelContenido: string;
  tipoActividad:
    | "refuerzo"
    | "consolidacion";
  total: number;
  aciertos: number;
  errores: number;
  porcentaje: number;
  resultados: ResultadoEjercicio[];
  estadoAprendizaje:
    | "reforzar"
    | "practicar"
    | "consolidar";
  necesitaRefuerzo: boolean;
  completadoEn: string;
};

type RespuestaCorreccion = {
  estado: "actividad_corregida";
  resultado: ResultadoCorreccion;
};

// ======================================================
// UTILIDADES
// ======================================================

async function leerJSON(
  respuesta: Response
): Promise<unknown> {
  const datos: unknown =
    await respuesta.json();

  if (!respuesta.ok) {
    if (
      datos &&
      typeof datos === "object" &&
      "error" in datos &&
      typeof (
        datos as {
          error?: unknown;
        }
      ).error === "string"
    ) {
      throw new Error(
        (
          datos as {
            error: string;
          }
        ).error
      );
    }

    throw new Error(
      "No se pudo completar la operacion."
    );
  }

  return datos;
}

function nombreObjetivo(
  objetivo: string
): string {
  const nombres:
    Record<string, string> = {
    "verb-to-be":
      "Verbo to be",

    "present-simple":
      "Present Simple",

    "past-simple":
      "Past Simple",

    "present-continuous":
      "Present Continuous",

    "present-perfect":
      "Present Perfect",

    "past-perfect":
      "Past Perfect",

    comparatives:
      "Comparatives",

    "second-conditional":
      "Second Conditional",

    "relative-clauses":
      "Relative Clauses",

    inversion:
      "Inversion",

    "passive-voice":
      "Passive Voice",

    "advanced-inversion":
      "Advanced Inversion",

    subjunctive:
      "Subjunctive",

    "mixed-conditionals":
      "Mixed Conditionals",

    "complex-inversion":
      "Complex Inversion",

    "formal-conditionals":
      "Formal Conditionals",

    "advanced-concession":
      "Advanced Concession",
  };

  return (
    nombres[objetivo] ??
    objetivo
      .replace(/-/g, " ")
      .replace(
        /\b\w/g,
        (letra) =>
          letra.toUpperCase()
      )
  );
}

function textoEstado(
  estado:
    ResultadoCorreccion["estadoAprendizaje"]
): {
  titulo: string;
  descripcion: string;
} {
  if (
    estado ===
    "consolidar"
  ) {
    return {
      titulo:
        "Objetivo consolidado",

      descripcion:
        "Has resuelto esta actividad con un resultado sólido. " +
        "El siguiente paso será consolidar el aprendizaje " +
        "y aplicarlo en contextos nuevos.",
    };
  }

  if (
    estado ===
    "practicar"
  ) {
    return {
      titulo:
        "Buen progreso",

      descripcion:
        "Ya tienes parte del objetivo controlado, pero todavía " +
        "conviene practicarlo antes de avanzar.",
    };
  }

  return {
    titulo:
      "Vamos a reforzarlo",

    descripcion:
      "Este contenido necesita algo más de práctica. " +
      "Interestalk utilizará este resultado para orientar " +
      "las siguientes actividades.",
  };
}

// ======================================================
// COMPONENTE
// ======================================================

export default function GrammarPage() {
  const router = useRouter();
  const [accessReady, setAccessReady] = useState(false);
  const [
    perfil,
    setPerfil,
  ] =
    useState<
      PerfilProvisional | null
    >(null);

  const [
    actividad,
    setActividad,
  ] =
    useState<
      ActividadPublica | null
    >(null);

  const [
    respuestas,
    setRespuestas,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    resultado,
    setResultado,
  ] =
    useState<
      ResultadoCorreccion | null
    >(null);

  const [
    cargando,
    setCargando,
  ] =
    useState(true);

  const [
    corrigiendo,
    setCorrigiendo,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [learningEventError, setLearningEventError] = useState("");
  const activityStartedAtRef = useRef(0);
  const generacionIniciadaRef =
    useRef(false);

  useEffect(() => {
    let active = true;

    async function verifyDiagnostic() {
      const userId = getOrCreateClientUserId();
      const profile = await fetchPerfilAprendizaje(userId, true);

      if (!active) return;
      if (!profile.diagnosticCompleted) {
        router.replace("/");
        return;
      }

      setAccessReady(true);
    }

    void verifyDiagnostic();
    return () => {
      active = false;
    };
  }, [router]);

  // ====================================================
  // GENERAR ACTIVIDAD AL ENTRAR
  // ====================================================

  useEffect(() => {
    if (!accessReady) return;
    if (generacionIniciadaRef.current) {
      return;
    }
    generacionIniciadaRef.current = true;

    async function cargar() {
      setCargando(true);
      setError("");

      try {
        let perfilGuardado =
          leerPerfilProvisional();

        let continuidad =
          leerContinuidadGrammarCliente();

        if (!perfilGuardado) {
          const perfilPrueba: PerfilProvisional = {
            version: 1,
            idiomaApoyo: "es",
            idiomaAprendizaje: "en",
            nivelDeclarado: "B1",
            objetivo: "Mejorar fluidez y gramatica",
            intereses: [
              { id: "viajes", nombre: "viajes" },
              { id: "tecnologia", nombre: "tecnologia" },
            ],
            interesPrincipalId: "viajes",
            creadoEn: Date.now(),
          };

          guardarPerfilProvisional(perfilPrueba);
          perfilGuardado = perfilPrueba;
        }

        if (!continuidad) {
          const expiraEn = new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString();

          guardarContinuidadGrammarCliente(
            "demo-continuidad-b1",
            expiraEn
          );

          continuidad = leerContinuidadGrammarCliente() || {
            version: 1,
            continuidadId: "demo-continuidad-b1",
            expiraEn,
            creadoEn: Date.now(),
          };
        }

        setPerfil(
          perfilGuardado
        );

        const respuesta =
          await fetch(
            "/api/grammar",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              cache:
                "no-store",

              body:
                JSON.stringify({
                  accion:
                    "generar",

                  continuidadId:
                    continuidad
                      .continuidadId,

                  perfil:
                    perfilGuardado,
                }),
            }
          );

        const datos =
          await leerJSON(
            respuesta
          ) as RespuestaGeneracion;

        setActividad(
          datos.actividad
        );
        activityStartedAtRef.current = Date.now();

        const iniciales:
          Record<
            string,
            string
          > = {};

        for (
          const ejercicio of
          datos.actividad
            .ejercicios
        ) {
          iniciales[
            ejercicio.id
          ] = "";
        }

        setRespuestas(
          iniciales
        );

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo preparar la actividad."
        );

      } finally {
        setCargando(false);
      }
    }

    void cargar();
  }, [accessReady]);

  // ====================================================
  // ACTUALIZAR RESPUESTA
  // ====================================================

  function cambiarRespuesta(
    ejercicioId: string,
    valor: string
  ) {
    if (resultado) {
      return;
    }

    setRespuestas(
      (actuales) => ({
        ...actuales,
        [ejercicioId]:
          valor,
      })
    );
  }

  // ====================================================
  // TODAS RESPONDIDAS
  // ====================================================

  const todasRespondidas =
    actividad !== null &&
    actividad.ejercicios.every(
      (ejercicio) =>
        (
          respuestas[
            ejercicio.id
          ] ?? ""
        ).trim().length > 0
    );

  // ====================================================
  // CORREGIR
  // ====================================================

  async function corregir() {
    if (
      !actividad ||
      !todasRespondidas ||
      corrigiendo ||
      resultado
    ) {
      return;
    }

    setCorrigiendo(true);
    setError("");

    try {
      const respuesta =
        await fetch(
          "/api/grammar",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            cache:
              "no-store",

            body:
              JSON.stringify({
                accion:
                  "corregir",

                actividadId:
                  actividad
                    .actividadId,

                respuestas:
                  actividad
                    .ejercicios
                    .map(
                      (
                        ejercicio
                      ) => ({
                        ejercicioId:
                          ejercicio.id,

                        respuesta:
                          respuestas[
                            ejercicio.id
                          ] ?? "",
                      })
                    ),
              }),
          }
        );

      const datos =
        await leerJSON(
          respuesta
        ) as RespuestaCorreccion;

      const resultadoActividad = datos.resultado;
      setResultado(resultadoActividad);

      try {
        await registerLearningEvent(getOrCreateClientUserId(), {
          skill: "grammar",
          topic: resultadoActividad.objetivoGrammar,
          level: resultadoActividad.nivelContenido,
          score: resultadoActividad.porcentaje,
          durationSeconds: Math.max(
            0,
            Math.round((Date.now() - activityStartedAtRef.current) / 1000)
          ),
          errorsDetected:
            resultadoActividad.errores > 0
              ? [resultadoActividad.objetivoGrammar]
              : [],
          metadata: {
            activityId: resultadoActividad.actividadId,
            total: resultadoActividad.total,
            correct: resultadoActividad.aciertos,
            incorrect: resultadoActividad.errores,
            errorDetails: resultadoActividad.resultados
              .filter((item) => !item.correcto)
              .map((item) => item.explicacion),
            learningState: resultadoActividad.estadoAprendizaje,
            needsReinforcement: resultadoActividad.necesitaRefuerzo,
          },
        });
      } catch (eventError) {
        console.error("[GRAMMAR_TELEMETRY_ERROR]", eventError);
        setLearningEventError(
          "El resultado se corrigió, pero no se pudo guardar en tu historial educativo."
        );
      }

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo corregir la actividad."
      );

    } finally {
      setCorrigiendo(false);
    }
  }

  // ====================================================
  // ESTADO CARGANDO
  // ====================================================

  if (!accessReady) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[#F8FAFC] px-5 text-slate-600">
        Comprobando tu calibración...
      </main>
    );
  }

  if (cargando) {
    return (
      <main className="min-h-[100dvh] overflow-x-hidden bg-[#F8FAFC] text-slate-900">
        <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-5 py-6 sm:px-8">
          <header className="flex items-center justify-between border-b border-slate-200 pb-5">
            <Link
              href="/"
              className="text-2xl font-black tracking-tight"
            >
              INTERES
              <span className="text-indigo-700">
                TALK
              </span>
            </Link>

            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700">
              GRAMMAR
            </span>
          </header>

          <div className="flex flex-1 items-center justify-center py-16 text-center">
            <div>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl text-indigo-700">
                ✦
              </div>

              <h1 className="mt-6 text-3xl font-bold">
                Preparando tu actividad
              </h1>

              <p className="mt-3 text-slate-600">
                Estamos utilizando tu diagnóstico y tus intereses
                para crear una práctica personalizada.
              </p>

              <div className="mx-auto mt-7 h-2 w-48 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-teal-500" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ====================================================
  // ERROR SIN ACTIVIDAD
  // ====================================================

  if (
    error &&
    !actividad
  ) {
    return (
      <main className="min-h-[100dvh] overflow-x-hidden bg-[#F8FAFC] text-slate-900">
        <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-5 py-6 sm:px-8">
          <header className="border-b border-slate-200 pb-5">
            <Link
              href="/"
              className="text-2xl font-black tracking-tight"
            >
              INTERES
              <span className="text-indigo-700">
                TALK
              </span>
            </Link>
          </header>

          <div className="flex flex-1 items-center justify-center py-16">
            <section className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-700">
                !
              </div>

              <h1 className="mt-6 text-3xl font-bold">
                No podemos preparar la actividad
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-slate-600">
                {error}
              </p>

              <Link
                href="/diagnostico-adaptativo"
                className="mt-8 inline-flex rounded-2xl bg-indigo-700 px-7 py-4 font-semibold text-white hover:bg-indigo-800"
              >
                Ir al diagnóstico
              </Link>
            </section>
          </div>
        </div>
      </main>
    );
  }

  if (!actividad) {
    return null;
  }

  const estado =
    resultado
      ? textoEstado(
          resultado
            .estadoAprendizaje
        )
      : null;

  // ====================================================
  // ACTIVIDAD
  // ====================================================

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#F8FAFC] text-slate-900">
      <div className="mx-auto min-h-[100dvh] max-w-5xl px-5 py-6 sm:px-8 lg:px-12">

        {/* HEADER */}

        <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <Link
            href="/"
            className="text-2xl font-black tracking-tight"
          >
            INTERES
            <span className="text-indigo-700">
              TALK
            </span>
          </Link>

          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700">
            GRAMMAR · {actividad.nivelContenido}
          </span>
        </header>

        <div className="mx-auto max-w-3xl py-10 sm:py-14">

          {/* CABECERA */}

          <section>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800">
                {actividad.tipoActividad ===
                "refuerzo"
                  ? "REFUERZO PERSONALIZADO"
                  : "CONSOLIDACIÓN"}
              </span>

              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700">
                {nombreObjetivo(
                  actividad.objetivoGrammar
                )}
              </span>
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              {actividad.titulo}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              {actividad.introduccion}
            </p>

            {perfil && (
              <p className="mt-4 text-sm text-slate-500">
                Personalizada para tu objetivo:{" "}
                <span className="font-medium text-slate-700">
                  {perfil.objetivo}
                </span>
              </p>
            )}
          </section>

          {/* EXPLICACION */}

          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold tracking-wider text-indigo-700">
              COMPRENDE LA REGLA
            </p>

            <p className="mt-4 leading-7 text-slate-700">
              {actividad.explicacion}
            </p>

            <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-xs font-semibold text-indigo-700">
                REGLA
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {actividad.regla}
              </p>
            </div>
          </section>

          {/* EJEMPLOS */}

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">
              Ejemplos
            </h2>

            <div className="mt-5 space-y-3">
              {actividad.ejemplos.map(
                (
                  ejemplo,
                  indice
                ) => (
                  <div
                    key={
                      indice
                    }
                    className="flex gap-4 rounded-2xl bg-slate-50 p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                      {indice + 1}
                    </span>

                    <p className="leading-7 text-slate-700">
                      {ejemplo}
                    </p>
                  </div>
                )
              )}
            </div>
          </section>

          {/* ERRORES FRECUENTES */}

          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <h2 className="font-bold text-amber-950">
              Errores que conviene evitar
            </h2>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-950">
              {actividad.erroresFrecuentes.map(
                (
                  errorFrecuente,
                  indice
                ) => (
                  <li
                    key={
                      indice
                    }
                    className="flex gap-3"
                  >
                    <span className="font-bold">
                      ·
                    </span>

                    <span>
                      {errorFrecuente}
                    </span>
                  </li>
                )
              )}
            </ul>
          </section>

          {/* EJERCICIOS */}

          <section className="mt-12">
            <div>
              <p className="text-xs font-bold tracking-wider text-indigo-700">
                AHORA TE TOCA A TI
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Practica lo aprendido
              </h2>

              <p className="mt-3 text-slate-600">
                Responde los cinco ejercicios. Verás las
                soluciones y explicaciones después de enviar.
              </p>
            </div>

            <div className="mt-8 space-y-6">
              {actividad.ejercicios.map(
                (
                  ejercicio,
                  indice
                ) => {
                  const correccion =
                    resultado
                      ?.resultados
                      .find(
                        (
                          item
                        ) =>
                          item.ejercicioId ===
                          ejercicio.id
                      );

                  return (
                    <article
                      key={
                        ejercicio.id
                      }
                      className={
                        "rounded-3xl border bg-white p-6 shadow-sm sm:p-7 " +
                        (
                          correccion
                            ? correccion.correcto
                              ? "border-teal-300"
                              : "border-red-300"
                            : "border-slate-200"
                        )
                      }
                    >
                      <div className="flex gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">
                          {indice + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-7">
                            {ejercicio.enunciado}
                          </p>

                          {ejercicio.tipo ===
                            "opcion_multiple" &&
                            ejercicio.opciones && (
                              <div className="mt-5 grid gap-3">
                                {ejercicio.opciones.map(
                                  (
                                    opcion,
                                    opcionIndice
                                  ) => {
                                    const seleccionada =
                                      respuestas[
                                        ejercicio.id
                                      ] ===
                                      opcion;

                                    return (
                                      <button
                                        key={
                                          opcionIndice
                                        }
                                        type="button"
                                        disabled={
                                          Boolean(
                                            resultado
                                          )
                                        }
                                        onClick={() =>
                                          cambiarRespuesta(
                                            ejercicio.id,
                                            opcion
                                          )
                                        }
                                        className={
                                          "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all disabled:cursor-default " +
                                          (
                                            seleccionada
                                              ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200"
                                              : "border-slate-200 hover:border-indigo-300"
                                          )
                                        }
                                      >
                                        <span
                                          className={
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold " +
                                            (
                                              seleccionada
                                                ? "border-indigo-700 bg-indigo-700 text-white"
                                                : "border-slate-300 bg-slate-50 text-slate-700"
                                            )
                                          }
                                        >
                                          {String.fromCharCode(
                                            65 +
                                              opcionIndice
                                          )}
                                        </span>

                                        <span>
                                          {opcion}
                                        </span>
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            )}

                          {ejercicio.tipo !==
                            "opcion_multiple" && (
                              <input
                                type="text"
                                disabled={
                                  Boolean(
                                    resultado
                                  )
                                }
                                value={
                                  respuestas[
                                    ejercicio.id
                                  ] ?? ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  cambiarRespuesta(
                                    ejercicio.id,
                                    event.target
                                      .value
                                  )
                                }
                                placeholder={
                                  ejercicio.tipo ===
                                  "completar"
                                    ? "Escribe la respuesta..."
                                    : "Escribe la frase transformada..."
                                }
                                className="mt-5 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base outline-none transition-colors focus:border-indigo-600 disabled:bg-slate-50"
                              />
                            )}

                          {correccion && (
                            <div
                              className={
                                "mt-5 rounded-2xl border p-5 " +
                                (
                                  correccion.correcto
                                    ? "border-teal-200 bg-teal-50"
                                    : "border-red-200 bg-red-50"
                                )
                              }
                            >
                              <p
                                className={
                                  "font-semibold " +
                                  (
                                    correccion.correcto
                                      ? "text-teal-900"
                                      : "text-red-900"
                                  )
                                }
                              >
                                {correccion.correcto
                                  ? "Correcto"
                                  : "Vamos a revisarlo"}
                              </p>

                              {!correccion.correcto && (
                                <p className="mt-3 text-sm text-slate-700">
                                  <span className="font-semibold">
                                    Respuesta correcta:{" "}
                                  </span>

                                  {
                                    correccion.respuestaCorrecta
                                  }
                                </p>
                              )}

                              <p className="mt-3 text-sm leading-6 text-slate-700">
                                {
                                  correccion.explicacion
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>

          {/* APLICACION */}

          <section className="mt-8 rounded-3xl border border-indigo-100 bg-indigo-50 p-6 sm:p-8">
            <p className="text-xs font-bold tracking-wider text-indigo-700">
              LLÉVALO A UNA SITUACIÓN REAL
            </p>

            <p className="mt-3 leading-7 text-slate-700">
              {actividad.aplicacionPractica}
            </p>
          </section>

          {/* ENVIAR */}

          {!resultado && (
            <button
              type="button"
              disabled={
                !todasRespondidas ||
                corrigiendo
              }
              onClick={
                corregir
              }
              className="mt-8 w-full rounded-2xl bg-indigo-700 px-8 py-4 font-semibold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {corrigiendo
                ? "Corrigiendo..."
                : todasRespondidas
                  ? "Comprobar mis respuestas →"
                  : "Responde los 5 ejercicios"}
            </button>
          )}

          {/* RESULTADO */}

          {resultado &&
            estado && (
              <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9">
                <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800">
                  ACTIVIDAD COMPLETADA
                </span>

                <p className="mt-6 text-5xl font-black text-indigo-700">
                  {resultado.porcentaje}%
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {resultado.aciertos}/
                  {resultado.total} respuestas correctas
                </p>

                <h2 className="mt-6 text-2xl font-bold">
                  {estado.titulo}
                </h2>

                <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
                  {estado.descripcion}
                </p>

                <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-left">
                  <p className="text-xs font-semibold text-slate-500">
                    SIGUIENTE DECISIÓN PEDAGÓGICA
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {resultado.estadoAprendizaje ===
                    "consolidar"
                      ? "Consolidar este objetivo con nuevos contextos."
                      : resultado.estadoAprendizaje ===
                          "practicar"
                        ? "Practicar de nuevo antes de consolidar."
                        : "Reforzar este objetivo con una nueva explicación y práctica."}
                  </p>
                </div>

                <p className="mt-6 text-xs text-slate-500">
                  Esta decisión orienta las siguientes actividades.
                  No representa una certificación MCER.
                </p>
              </section>
            )}

          {learningEventError && (
            <p role="alert" className="mt-4 text-sm text-amber-800">
              {learningEventError}
            </p>
          )}

          {/* ERROR DURANTE CORRECCION */}

          {error &&
            actividad && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
              >
                {error}
              </div>
            )}

        </div>

        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          INTERESTALK · Learn what you love.
        </footer>
      </div>
    </main>
  );
}