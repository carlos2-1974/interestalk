import "server-only";

// ======================================================
// INTERESTALK - GRAMMAR V2
// ALMACEN TEMPORAL DE ACTIVIDADES V1
//
// Exclusivamente para desarrollo local.
//
// Conserva en servidor:
// - contenido publico;
// - soluciones privadas;
// - origen pedagogico.
//
// El navegador solo debe recibir la parte publica.
//
// No es persistencia definitiva.
// No constituye autenticacion ni autorizacion.
// ======================================================

import type {
  ActividadGrammarCompleta,
  ActividadGrammarPublica,
} from "./tipos";

// ======================================================
// CONFIGURACION
// ======================================================

const DURACION_MS =
  2 * 60 * 60 * 1000;

const MAX_ACTIVIDADES = 100;

// ======================================================
// REGISTRO INTERNO
// ======================================================

type RegistroActividadGrammar = {
  actividad:
    ActividadGrammarCompleta;

  creadaEn: number;
  expiraEn: number;
};

const actividades =
  new Map<
    string,
    RegistroActividadGrammar
  >();

// ======================================================
// COPIA DEFENSIVA
//
// Evita que quien recibe un objeto pueda modificar
// accidentalmente el registro interno del servidor.
// ======================================================

function copiarActividadCompleta(
  actividad: ActividadGrammarCompleta
): ActividadGrammarCompleta {
  return structuredClone(
    actividad
  );
}

function copiarActividadPublica(
  actividad: ActividadGrammarPublica
): ActividadGrammarPublica {
  return structuredClone(
    actividad
  );
}

// ======================================================
// LIMPIEZA
// ======================================================

function limpiarExpiradas(): void {
  const ahora =
    Date.now();

  for (
    const [
      actividadId,
      registro,
    ] of actividades
  ) {
    if (
      registro.expiraEn <= ahora
    ) {
      actividades.delete(
        actividadId
      );
    }
  }
}

// ======================================================
// OBTENER REGISTRO PRIVADO
// ======================================================

function obtenerRegistro(
  actividadId: string
): RegistroActividadGrammar {
  limpiarExpiradas();

  if (
    typeof actividadId !== "string" ||
    !actividadId.trim()
  ) {
    throw new Error(
      "ActividadId no valido."
    );
  }

  const registro =
    actividades.get(
      actividadId
    );

  if (!registro) {
    throw new Error(
      "Actividad Grammar inexistente o caducada."
    );
  }

  return registro;
}

// ======================================================
// GUARDAR ACTIVIDAD COMPLETA
// ======================================================

export function guardarActividadGrammar(
  actividad: ActividadGrammarCompleta
): {
  actividadId: string;
  expiraEn: string;
} {
  limpiarExpiradas();

  if (
    !actividad ||
    typeof actividad !== "object"
  ) {
    throw new Error(
      "Actividad Grammar no valida."
    );
  }

  const actividadId =
    actividad.publica.actividadId;

  if (
    typeof actividadId !== "string" ||
    !actividadId.trim()
  ) {
    throw new Error(
      "ActividadId no valido."
    );
  }

  if (
    actividad.privada.actividadId !==
    actividadId
  ) {
    throw new Error(
      "Los identificadores publico y privado no coinciden."
    );
  }

  if (
    actividades.has(
      actividadId
    )
  ) {
    throw new Error(
      "La actividad Grammar ya existe."
    );
  }

  if (
    actividades.size >=
    MAX_ACTIVIDADES
  ) {
    throw new Error(
      "Limite de actividades temporales alcanzado."
    );
  }

  const ahora =
    Date.now();

  actividades.set(
    actividadId,
    {
      actividad:
        copiarActividadCompleta(
          actividad
        ),

      creadaEn:
        ahora,

      expiraEn:
        ahora + DURACION_MS,
    }
  );

  return {
    actividadId,

    expiraEn:
      new Date(
        ahora + DURACION_MS
      ).toISOString(),
  };
}

// ======================================================
// OBTENER PARTE PUBLICA
//
// Esta es la funcion destinada a alimentar
// posteriormente la API que consume el navegador.
// ======================================================

export function obtenerActividadGrammarPublica(
  actividadId: string
): ActividadGrammarPublica {
  const registro =
    obtenerRegistro(
      actividadId
    );

  return copiarActividadPublica(
    registro.actividad.publica
  );
}

// ======================================================
// OBTENER ACTIVIDAD COMPLETA
//
// SOLO SERVIDOR.
//
// Se utilizara para:
// - corregir respuestas;
// - consultar soluciones privadas;
// - registrar resultados.
//
// No debe exponerse directamente mediante una API.
// ======================================================

export function obtenerActividadGrammarPrivada(
  actividadId: string
): ActividadGrammarCompleta {
  const registro =
    obtenerRegistro(
      actividadId
    );

  return copiarActividadCompleta(
    registro.actividad
  );
}

// ======================================================
// ELIMINAR
// ======================================================

export function eliminarActividadGrammar(
  actividadId: string
): boolean {
  if (
    typeof actividadId !== "string" ||
    !actividadId.trim()
  ) {
    return false;
  }

  return actividades.delete(
    actividadId
  );
}

// ======================================================
// ESTADISTICAS
// ======================================================

export function obtenerEstadisticasActividadesGrammar() {
  limpiarExpiradas();

  return {
    actividadesActivas:
      actividades.size,

    limiteActividades:
      MAX_ACTIVIDADES,

    duracionHoras:
      DURACION_MS / 3600000,
  };
}