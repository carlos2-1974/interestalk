import "server-only";

// ======================================================
// INTERESTALK - GRAMMAR V2
// ORQUESTADOR V1
//
// Fachada del backend Grammar.
//
// GENERACION:
// Solicitud pedagogica
// -> Gemini
// -> validaciones
// -> Quality Gate
// -> almacenamiento privado
// -> actividad publica
//
// CORRECCION:
// respuestas alumno
// -> recuperacion privada
// -> correccion determinista
// -> resultado pedagogico
//
// No contiene logica de interfaz.
// No expone soluciones.
// ======================================================

import {
  generarGrammarV2,
} from "./generar-grammar";

import {
  guardarActividadGrammar,
  obtenerActividadGrammarPublica,
  obtenerActividadGrammarPrivada,
} from "./actividades";

import {
  corregirActividadGrammar,
  type RespuestaAlumnoGrammar,
  type ResultadoCorreccionGrammar,
} from "./correccion";

import type {
  SolicitudGrammarV2,
  ActividadGrammarPublica,
} from "./tipos";

// ======================================================
// RESULTADO DE CREACION
// ======================================================

export type ResultadoCreacionGrammar = {
  actividad:
    ActividadGrammarPublica;

  expiraEn:
    string;
};

// ======================================================
// CREAR ACTIVIDAD
//
// Esta es la funcion que posteriormente utilizara
// la API para generar una actividad.
//
// IMPORTANTE:
// Solo devuelve la parte publica.
// ======================================================

export async function crearActividadGrammar(
  solicitud: SolicitudGrammarV2
): Promise<ResultadoCreacionGrammar> {

  // 1. Generar actividad completa.
  //
  // generarGrammarV2 ya ejecuta:
  // - Gemini;
  // - JSON estructurado;
  // - Zod;
  // - validacion contra solicitud;
  // - Quality Gate.

  const actividadCompleta =
    await generarGrammarV2(
      solicitud
    );

  // 2. Guardar actividad completa en servidor.

  const registro =
    guardarActividadGrammar(
      actividadCompleta
    );

  // 3. Recuperar exclusivamente la parte publica.

  const actividadPublica =
    obtenerActividadGrammarPublica(
      registro.actividadId
    );

  // 4. Devolver solo datos aptos para navegador.

  return {
    actividad:
      actividadPublica,

    expiraEn:
      registro.expiraEn,
  };
}

// ======================================================
// CONSULTAR ACTIVIDAD PUBLICA
//
// Permitira recuperar una actividad ya creada
// mientras siga activa.
//
// Nunca devuelve soluciones.
// ======================================================

export function consultarActividadGrammar(
  actividadId: string
): ActividadGrammarPublica {
  return obtenerActividadGrammarPublica(
    actividadId
  );
}

// ======================================================
// CORREGIR ACTIVIDAD
//
// Recupera internamente la actividad completa.
//
// El navegador aporta:
// - actividadId;
// - respuestas.
//
// Las soluciones nunca proceden del navegador.
// ======================================================

export function corregirGrammar(
  actividadId: string,
  respuestas: RespuestaAlumnoGrammar[]
): ResultadoCorreccionGrammar {

  const actividadCompleta =
    obtenerActividadGrammarPrivada(
      actividadId
    );

  return corregirActividadGrammar(
    actividadCompleta,
    respuestas
  );
}