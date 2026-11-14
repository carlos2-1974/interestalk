
import "server-only";

// ======================================================
// INTERESTALK - GESTOR DE SESIONES V1.2
// Diagnostico adaptativo + informe + perfil pedagogico
//
// Exclusivamente para desarrollo local.
// No utilizar en produccion.
// ======================================================

import { randomUUID } from "node:crypto";

import {
  iniciarDiagnosticoV2,
  procesarRespuestaV2,
  resumirSesionV2,
  type SesionDiagnosticoV2,
} from "./orquestador-v2";

import {
  obtenerPreguntasV2,
  type PreguntaPublicaV2,
} from "./preguntas-v2";

import {
  generarInformePedagogico,
} from "./informe-pedagogico";

import {
  construirPerfilPedagogico,
} from "./perfil-pedagogico";

import {
  CONFIG_DIAGNOSTICO,
} from "./configuracion";

import type {
  NivelMCERAdaptativo,
} from "./adaptativo";

// ======================================================
// CONFIGURACION LOCAL
// ======================================================

const DURACION_SESION_MS = 30 * 60 * 1000;
const MAX_SESIONES = 100;

type RegistroSesion = {
  id: string;
  sesion: SesionDiagnosticoV2;
  nivelDeclarado: NivelMCERAdaptativo;
  creadaEn: number;
  expiraEn: number;
  procesando: boolean;
};

const sesiones = new Map<string, RegistroSesion>();

export type SesionPublica = {
  sesionId: string;
  estado: string;
  pregunta: PreguntaPublicaV2 | null;
  preguntasRespondidas: number;
  maxPreguntas: number;
  expiraEn: string;
};

// ======================================================
// FUNCIONES INTERNAS
// ======================================================

function limpiarSesionesExpiradas(): void {
  const ahora = Date.now();

  for (const [id, registro] of sesiones) {
    if (registro.expiraEn <= ahora) {
      sesiones.delete(id);
    }
  }
}

function obtenerRegistro(
  sesionId: string
): RegistroSesion {
  limpiarSesionesExpiradas();

  const registro = sesiones.get(sesionId);

  if (!registro) {
    throw new Error(
      "Sesion inexistente o caducada."
    );
  }

  return registro;
}

function obtenerPreguntaActual(
  sesion: SesionDiagnosticoV2
): PreguntaPublicaV2 | null {
  if (!sesion.preguntaActualId) {
    return null;
  }

  return (
    obtenerPreguntasV2(sesion.idioma).find(
      (pregunta) =>
        pregunta.id === sesion.preguntaActualId
    ) ?? null
  );
}

function convertirSesionPublica(
  registro: RegistroSesion
): SesionPublica {
  return {
    sesionId: registro.id,
    estado: registro.sesion.estadoFinal,
    pregunta: obtenerPreguntaActual(
      registro.sesion
    ),
    preguntasRespondidas:
      registro.sesion.historial.length,
    maxPreguntas:
      CONFIG_DIAGNOSTICO.maxPreguntas,
    expiraEn: new Date(
      registro.expiraEn
    ).toISOString(),
  };
}

// ======================================================
// CREAR SESION
// ======================================================

export function crearSesionTemporal(
  idioma: string,
  nivelInicial: NivelMCERAdaptativo
): SesionPublica {
  limpiarSesionesExpiradas();

  if (sesiones.size >= MAX_SESIONES) {
    throw new Error(
      "Limite de sesiones temporales alcanzado."
    );
  }

  const inicio = iniciarDiagnosticoV2(
    idioma,
    nivelInicial
  );

  const ahora = Date.now();
  const id = randomUUID();

  const registro: RegistroSesion = {
    id,
    sesion: inicio.sesion,
    nivelDeclarado: nivelInicial,
    creadaEn: ahora,
    expiraEn:
      ahora + DURACION_SESION_MS,
    procesando: false,
  };

  sesiones.set(id, registro);

  return convertirSesionPublica(registro);
}

// ======================================================
// CONSULTAR SESION
// ======================================================

export function consultarSesionTemporal(
  sesionId: string
): SesionPublica {
  const registro = obtenerRegistro(sesionId);

  return convertirSesionPublica(registro);
}

// ======================================================
// RESPONDER
// ======================================================

export function responderSesionTemporal(
  sesionId: string,
  preguntaId: string,
  respuesta: number
): SesionPublica {
  const registro = obtenerRegistro(sesionId);

  if (registro.procesando) {
    throw new Error(
      "La sesion esta procesando otra respuesta."
    );
  }

  if (
    registro.sesion.estadoFinal !== "en_curso"
  ) {
    throw new Error(
      "La evaluacion ya ha finalizado."
    );
  }

  if (
    registro.sesion.preguntaActualId !==
    preguntaId
  ) {
    throw new Error(
      "La pregunta no coincide con la pregunta activa."
    );
  }

  if (
    !Number.isInteger(respuesta) ||
    respuesta < 0 ||
    respuesta > 3
  ) {
    throw new Error(
      "Respuesta no valida."
    );
  }

  registro.procesando = true;

  try {
    const resultado = procesarRespuestaV2(
      registro.sesion,
      respuesta
    );

    registro.sesion = resultado.sesion;

    return convertirSesionPublica(
      registro
    );
  } finally {
    registro.procesando = false;
  }
}

// ======================================================
// RESULTADO FINAL + INFORME + PERFIL PEDAGOGICO
// ======================================================

export function obtenerResultadoSesionTemporal(
  sesionId: string
) {
  const registro = obtenerRegistro(sesionId);

  if (
    registro.sesion.estadoFinal === "en_curso"
  ) {
    throw new Error(
      "La evaluacion todavia no ha finalizado."
    );
  }

  // 1. Resumen del diagnostico.
  const resultadoGeneral = resumirSesionV2(
    registro.sesion
  );

  // 2. Informe basado en respuestas reales.
  const informePedagogico =
    generarInformePedagogico(
      registro.sesion.idioma,
      registro.sesion.historial
    );

  // 3. Perfil pedagogico.
  // Utiliza el nivel inicial conservado al
  // crear la sesion, no la dificultad final.
  const perfilPedagogico =
    construirPerfilPedagogico({
      idiomaEvaluado: registro.sesion.idioma,
      nivelDeclarado: registro.nivelDeclarado,
      estadoDiagnostico:
        registro.sesion.estadoFinal === "completado"
          ? "completado"
          : "incompleto",
      informe: informePedagogico,
      fechaEvaluacion: new Date(
        registro.creadaEn
      ).toISOString(),
    });

  // Conservamos los campos anteriores.
  // El nuevo perfil se agrega sin sustituir
  // el informe pedagogico ni el resumen.

  return {
    sesionId,
    ...resultadoGeneral,
    informePedagogico,
    perfilPedagogico,
  };
}

// ======================================================
// ESTADISTICAS INTERNAS
// ======================================================

export function obtenerEstadisticasSesiones() {
  limpiarSesionesExpiradas();

  return {
    sesionesActivas: sesiones.size,
    limiteSesiones: MAX_SESIONES,
    duracionMinutos:
      DURACION_SESION_MS / 60000,
  };
}
