
import "server-only";

import { randomUUID } from "node:crypto";

import type {
  PerfilPedagogico,
} from "./perfil-pedagogico";

// ======================================================
// INTERESTALK - CONTINUIDAD PEDAGOGICA V1
//
// Almacenamiento temporal en memoria del servidor.
// Exclusivamente para desarrollo local.
//
// No utilizar en produccion sin autenticacion,
// autorizacion y persistencia adecuada.
// ======================================================

const DURACION_MS = 24 * 60 * 60 * 1000;
const MAX_PERFILES = 100;

type RegistroContinuidad = {
  id: string;
  perfil: PerfilPedagogico;
  creadoEn: number;
  expiraEn: number;
};

const registros = new Map<
  string,
  RegistroContinuidad
>();

export type ContinuidadPublica = {
  continuidadId: string;
  expiraEn: string;
};

function copiarPerfil(
  perfil: PerfilPedagogico
): PerfilPedagogico {
  return structuredClone(perfil);
}

function limpiarExpirados(): void {
  const ahora = Date.now();

  for (const [id, registro] of registros) {
    if (registro.expiraEn <= ahora) {
      registros.delete(id);
    }
  }
}

function validarPerfil(
  perfil: PerfilPedagogico
): void {
  if (perfil.version !== 1) {
    throw new Error(
      "Version de perfil no valida."
    );
  }

  if (
    perfil.nivelMCERCertificado !== false
  ) {
    throw new Error(
      "El perfil no puede certificar MCER."
    );
  }

  if (
    perfil.estadoDiagnostico !== "completado" &&
    perfil.estadoDiagnostico !== "incompleto"
  ) {
    throw new Error(
      "Estado de diagnostico no valido."
    );
  }

  if (
    !perfil.idiomaEvaluado ||
    typeof perfil.idiomaEvaluado !== "string"
  ) {
    throw new Error(
      "Idioma evaluado no valido."
    );
  }

  if (
    !perfil.resultadoGeneral ||
    !Number.isInteger(
      perfil.resultadoGeneral.preguntas
    ) ||
    perfil.resultadoGeneral.preguntas < 0
  ) {
    throw new Error(
      "Resultado general no valido."
    );
  }

  if (
    !Array.isArray(perfil.competencias)
  ) {
    throw new Error(
      "Competencias no validas."
    );
  }

  if (
    perfil.grammar !== null &&
    perfil.grammar.competencia !== "grammar"
  ) {
    throw new Error(
      "Seleccion Grammar no valida."
    );
  }
}

// ======================================================
// GUARDAR PERFIL
// ======================================================

export function guardarContinuidadPedagogica(
  perfil: PerfilPedagogico
): ContinuidadPublica {
  limpiarExpirados();
  validarPerfil(perfil);

  if (registros.size >= MAX_PERFILES) {
    throw new Error(
      "Limite de perfiles temporales alcanzado."
    );
  }

  const ahora = Date.now();
  const id = randomUUID();

  registros.set(id, {
    id,
    perfil: copiarPerfil(perfil),
    creadoEn: ahora,
    expiraEn: ahora + DURACION_MS,
  });

  return {
    continuidadId: id,
    expiraEn: new Date(
      ahora + DURACION_MS
    ).toISOString(),
  };
}

// ======================================================
// RECUPERAR PERFIL
// ======================================================

export function obtenerContinuidadPedagogica(
  continuidadId: string
): PerfilPedagogico {
  limpiarExpirados();

  const registro = registros.get(
    continuidadId
  );

  if (!registro) {
    if (
      continuidadId === "demo-continuidad-b1" ||
      continuidadId.startsWith("demo-")
    ) {
      return {
        version: 1,
        nivelMCERCertificado: false,
        estadoDiagnostico: "completado",
        fechaEvaluacion: new Date().toISOString(),
        idiomaEvaluado: "en",
        nivelDeclarado: "B1",
        resultadoGeneral: {
          preguntas: 10,
          aciertos: 7,
          errores: 3,
          porcentaje: 70,
        },
        competencias: [],
        grammar: {
          competencia: "grammar",
          objetivo: "present-perfect",
          nivel: "B1",
          tipo: "refuerzo",
          motivo: "Diagnostico de prueba para desarrollo.",
          evidencia: {
            preguntas: 5,
            aciertos: 2,
            errores: 3,
            porcentaje: 40,
          },
        },
      };
    }

    throw new Error(
      "Perfil inexistente o caducado."
    );
  }

  return copiarPerfil(registro.perfil);
}

// ======================================================
// ELIMINAR PERFIL
// ======================================================

export function eliminarContinuidadPedagogica(
  continuidadId: string
): boolean {
  return registros.delete(continuidadId);
}

// ======================================================
// ESTADISTICAS
// ======================================================

export function obtenerEstadisticasContinuidad() {
  limpiarExpirados();

  return {
    perfilesActivos: registros.size,
    limitePerfiles: MAX_PERFILES,
    duracionHoras: DURACION_MS / 3600000,
  };
}
