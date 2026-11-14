import "server-only";

import type {
  ActividadGrammarCompleta,
} from "./tipos";

// ======================================================
// INTERESTALK - GRAMMAR V2
// MOTOR DE CORRECCION V1
//
// Corrige las respuestas utilizando exclusivamente
// las soluciones privadas de la actividad.
//
// No utiliza Gemini.
// No modifica la actividad.
// No estima ni certifica nivel MCER.
// ======================================================

export type RespuestaAlumnoGrammar = {
  ejercicioId: string;
  respuesta: string;
};

export type ResultadoEjercicioGrammar = {
  ejercicioId: string;
  respuestaAlumno: string;
  respuestaCorrecta: string;
  correcto: boolean;
  explicacion: string;
};

export type EstadoAprendizajeGrammar =
  | "reforzar"
  | "practicar"
  | "consolidar";

export type ResultadoCorreccionGrammar = {
  actividadId: string;

  objetivoGrammar: string;

  nivelContenido:
    ActividadGrammarCompleta["publica"]["nivelContenido"];

  tipoActividad:
    ActividadGrammarCompleta["publica"]["tipoActividad"];

  total: number;
  aciertos: number;
  errores: number;
  porcentaje: number;

  resultados:
    ResultadoEjercicioGrammar[];

  estadoAprendizaje:
    EstadoAprendizajeGrammar;

  necesitaRefuerzo: boolean;

  completadoEn: string;
};

// ======================================================
// NORMALIZACION
//
// V1:
// - ignora mayusculas/minusculas;
// - elimina espacios exteriores;
// - compacta espacios repetidos.
//
// No intentamos interpretar respuestas semanticamente.
// ======================================================

function normalizarRespuesta(
  valor: string
): string {
  return valor
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

// ======================================================
// VALIDAR RESPUESTAS
// ======================================================

function validarRespuestas(
  actividad: ActividadGrammarCompleta,
  respuestas: RespuestaAlumnoGrammar[]
): void {
  if (!Array.isArray(respuestas)) {
    throw new Error(
      "Las respuestas no son validas."
    );
  }

  const ejercicios =
    actividad.publica.ejercicios;

  if (
    respuestas.length !==
    ejercicios.length
  ) {
    throw new Error(
      "Debe existir una respuesta por ejercicio."
    );
  }

  const ids =
    respuestas.map(
      (respuesta) =>
        respuesta.ejercicioId
    );

  if (
    new Set(ids).size !== ids.length
  ) {
    throw new Error(
      "Existen respuestas duplicadas."
    );
  }

  for (const respuesta of respuestas) {
    if (
      typeof respuesta.ejercicioId !==
        "string" ||
      !respuesta.ejercicioId.trim()
    ) {
      throw new Error(
        "Identificador de ejercicio no valido."
      );
    }

    if (
      typeof respuesta.respuesta !==
      "string"
    ) {
      throw new Error(
        "Respuesta del alumno no valida."
      );
    }

    const existe =
      ejercicios.some(
        (ejercicio) =>
          ejercicio.id ===
          respuesta.ejercicioId
      );

    if (!existe) {
      throw new Error(
        "La respuesta pertenece a un ejercicio inexistente."
      );
    }
  }

  for (const ejercicio of ejercicios) {
    const existeRespuesta =
      respuestas.some(
        (respuesta) =>
          respuesta.ejercicioId ===
          ejercicio.id
      );

    if (!existeRespuesta) {
      throw new Error(
        "Falta la respuesta de un ejercicio."
      );
    }
  }
}

// ======================================================
// ESTADO DE APRENDIZAJE
//
// V1 - regla explicita y determinista.
//
// 0-59  -> reforzar
// 60-79 -> practicar
// 80-100 -> consolidar
//
// Estos umbrales son de producto V1.
// No equivalen a nivel MCER.
// ======================================================

function calcularEstadoAprendizaje(
  porcentaje: number
): EstadoAprendizajeGrammar {
  if (porcentaje < 60) {
    return "reforzar";
  }

  if (porcentaje < 80) {
    return "practicar";
  }

  return "consolidar";
}

// ======================================================
// CORREGIR ACTIVIDAD
// ======================================================

export function corregirActividadGrammar(
  actividad: ActividadGrammarCompleta,
  respuestas: RespuestaAlumnoGrammar[]
): ResultadoCorreccionGrammar {
  validarRespuestas(
    actividad,
    respuestas
  );

  const resultados:
    ResultadoEjercicioGrammar[] = [];

  for (const ejercicio of
    actividad.publica.ejercicios) {
    const respuestaAlumno =
      respuestas.find(
        (respuesta) =>
          respuesta.ejercicioId ===
          ejercicio.id
      );

    const solucion =
      actividad.privada.soluciones.find(
        (item) =>
          item.ejercicioId ===
          ejercicio.id
      );

    if (!respuestaAlumno) {
      throw new Error(
        "No se ha encontrado la respuesta del alumno."
      );
    }

    if (!solucion) {
      throw new Error(
        "No se ha encontrado la solucion privada."
      );
    }

    const correcto =
      normalizarRespuesta(
        respuestaAlumno.respuesta
      ) ===
      normalizarRespuesta(
        solucion.respuestaCorrecta
      );

    resultados.push({
      ejercicioId:
        ejercicio.id,

      respuestaAlumno:
        respuestaAlumno.respuesta,

      respuestaCorrecta:
        solucion.respuestaCorrecta,

      correcto,

      explicacion:
        solucion.explicacion,
    });
  }

  const total =
    resultados.length;

  const aciertos =
    resultados.filter(
      (resultado) =>
        resultado.correcto
    ).length;

  const errores =
    total - aciertos;

  const porcentaje =
    total > 0
      ? Math.round(
          (aciertos / total) * 100
        )
      : 0;

  const estadoAprendizaje =
    calcularEstadoAprendizaje(
      porcentaje
    );

  return {
    actividadId:
      actividad.publica.actividadId,

    objetivoGrammar:
      actividad.publica.objetivoGrammar,

    nivelContenido:
      actividad.publica.nivelContenido,

    tipoActividad:
      actividad.publica.tipoActividad,

    total,
    aciertos,
    errores,
    porcentaje,

    resultados,

    estadoAprendizaje,

    necesitaRefuerzo:
      estadoAprendizaje !==
      "consolidar",

    completadoEn:
      new Date().toISOString(),
  };
}