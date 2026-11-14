import "server-only";

import type {
  EventoEducativo,
} from "./memoria-educativa";

import {
  construirEstadoAlumno,
  type EstadoAlumno,
} from "./estado-alumno";

// ======================================================
// INTERESTALK - CMD
// ALMACEN TEMPORAL V1
//
// Almacen local de memoria educativa por alumno.
//
// alumnoId
//   -> eventos educativos
//   -> estado agregado
//
// EXCLUSIVAMENTE DESARROLLO LOCAL.
//
// Antes del piloto en Vercel debe sustituirse por
// persistencia real + autenticacion/autorizacion.
//
// No utiliza Gemini.
// ======================================================

// ======================================================
// CONFIGURACION
// ======================================================

const DURACION_MS =
  24 * 60 * 60 * 1000;

const MAX_ALUMNOS =
  100;

const MAX_EVENTOS_POR_ALUMNO =
  500;

// ======================================================
// REGISTRO INTERNO
// ======================================================

type RegistroAlumno = {
  alumnoId: string;

  eventos:
    EventoEducativo[];

  creadoEn:
    number;

  actualizadoEn:
    number;

  expiraEn:
    number;
};

const registros =
  new Map<
    string,
    RegistroAlumno
  >();

// ======================================================
// TIPOS PUBLICOS
// ======================================================

export type ResultadoRegistroEvento = {
  alumnoId: string;

  eventoId: string;

  totalEventos: number;

  expiraEn: string;
};

export type HistoricoAlumno = {
  alumnoId: string;

  eventos:
    EventoEducativo[];

  totalEventos: number;

  actualizadoEn: string;

  expiraEn: string;
};

// ======================================================
// COPIAS DEFENSIVAS
// ======================================================

function copiarEvento(
  evento: EventoEducativo
): EventoEducativo {
  return structuredClone(
    evento
  );
}

function copiarEventos(
  eventos: EventoEducativo[]
): EventoEducativo[] {
  return structuredClone(
    eventos
  );
}

// ======================================================
// VALIDAR ALUMNO ID
// ======================================================

function validarAlumnoId(
  alumnoId: string
): string {
  if (
    typeof alumnoId !==
      "string" ||
    !alumnoId.trim()
  ) {
    throw new Error(
      "AlumnoId no valido."
    );
  }

  const limpio =
    alumnoId.trim();

  if (
    limpio.length > 100
  ) {
    throw new Error(
      "AlumnoId demasiado largo."
    );
  }

  return limpio;
}

// ======================================================
// VALIDAR EVENTO MINIMO
//
// El evento ya debe haber sido creado por la capa
// de memoria educativa.
//
// Aqui comprobamos invariantes esenciales antes
// de incorporarlo al historico.
// ======================================================

function validarEvento(
  evento: EventoEducativo
): void {
  if (
    !evento ||
    typeof evento !==
      "object"
  ) {
    throw new Error(
      "Evento educativo no valido."
    );
  }

  if (
    evento.version !== 1
  ) {
    throw new Error(
      "Version de evento no valida."
    );
  }

  if (
    typeof evento.eventoId !==
      "string" ||
    !evento.eventoId.trim()
  ) {
    throw new Error(
      "EventoId no valido."
    );
  }

  if (
    typeof evento.actividadId !==
      "string" ||
    !evento.actividadId.trim()
  ) {
    throw new Error(
      "ActividadId no valido."
    );
  }

  if (
    evento.nivelMCERCertificado !==
    false
  ) {
    throw new Error(
      "El CMD no puede certificar nivel MCER."
    );
  }

  const fecha =
    new Date(
      evento.fechaActividad
    );

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    throw new Error(
      "Fecha educativa no valida."
    );
  }
}

// ======================================================
// LIMPIAR EXPIRADOS
// ======================================================

function limpiarExpirados():
  void {
  const ahora =
    Date.now();

  for (
    const [
      alumnoId,
      registro,
    ] of registros
  ) {
    if (
      registro.expiraEn <=
      ahora
    ) {
      registros.delete(
        alumnoId
      );
    }
  }
}

// ======================================================
// OBTENER REGISTRO
// ======================================================

function obtenerRegistro(
  alumnoId: string
): RegistroAlumno {
  limpiarExpirados();

  const id =
    validarAlumnoId(
      alumnoId
    );

  const registro =
    registros.get(
      id
    );

  if (!registro) {
    throw new Error(
      "Alumno inexistente o memoria caducada."
    );
  }

  return registro;
}

// ======================================================
// REGISTRAR EVENTO
// ======================================================

export function registrarEventoEducativo(
  alumnoId: string,
  evento: EventoEducativo
): ResultadoRegistroEvento {
  limpiarExpirados();

  const id =
    validarAlumnoId(
      alumnoId
    );

  validarEvento(
    evento
  );

  let registro =
    registros.get(
      id
    );

  const ahora =
    Date.now();

  // ====================================================
  // CREAR REGISTRO DE ALUMNO
  // ====================================================

  if (!registro) {
    if (
      registros.size >=
      MAX_ALUMNOS
    ) {
      throw new Error(
        "Limite de alumnos temporales alcanzado."
      );
    }

    registro = {
      alumnoId:
        id,

      eventos:
        [],

      creadoEn:
        ahora,

      actualizadoEn:
        ahora,

      expiraEn:
        ahora +
        DURACION_MS,
    };

    registros.set(
      id,
      registro
    );
  }

  // ====================================================
  // LIMITE DE EVENTOS
  // ====================================================

  if (
    registro.eventos.length >=
    MAX_EVENTOS_POR_ALUMNO
  ) {
    throw new Error(
      "Limite de eventos educativos alcanzado."
    );
  }

  // ====================================================
  // DUPLICADO POR EVENTO ID
  // ====================================================

  if (
    registro.eventos.some(
      (existente) =>
        existente.eventoId ===
        evento.eventoId
    )
  ) {
    throw new Error(
      "El evento educativo ya existe."
    );
  }

  // ====================================================
  // DUPLICADO POR ACTIVIDAD ID
  //
  // Una actividad completada solo puede producir
  // un evento educativo para ese alumno.
  // ====================================================

  if (
    registro.eventos.some(
      (existente) =>
        existente.actividadId ===
        evento.actividadId
    )
  ) {
    throw new Error(
      "La actividad ya esta registrada en el CMD."
    );
  }

  // ====================================================
  // VALIDACION DEL HISTORICO RESULTANTE
  //
  // Antes de modificar el almacen construimos el
  // posible historico completo y comprobamos que el
  // motor agregado puede interpretarlo.
  //
  // Esto evita guardar un evento que deje el CMD
  // en un estado incoherente.
  // ====================================================

  const historicoPropuesto = [
    ...registro.eventos,
    copiarEvento(
      evento
    ),
  ];

  construirEstadoAlumno(
    historicoPropuesto
  );

  // ====================================================
  // GUARDAR
  // ====================================================

  registro.eventos.push(
    copiarEvento(
      evento
    )
  );

  registro.actualizadoEn =
    ahora;

  // Cada actividad valida renueva la memoria
  // temporal del alumno durante otras 24 horas.
  registro.expiraEn =
    ahora +
    DURACION_MS;

  return {
    alumnoId:
      id,

    eventoId:
      evento.eventoId,

    totalEventos:
      registro.eventos.length,

    expiraEn:
      new Date(
        registro.expiraEn
      ).toISOString(),
  };
}

// ======================================================
// OBTENER HISTORICO
// ======================================================

export function obtenerHistoricoAlumno(
  alumnoId: string
): HistoricoAlumno {
  const registro =
    obtenerRegistro(
      alumnoId
    );

  return {
    alumnoId:
      registro.alumnoId,

    eventos:
      copiarEventos(
        registro.eventos
      ),

    totalEventos:
      registro.eventos.length,

    actualizadoEn:
      new Date(
        registro.actualizadoEn
      ).toISOString(),

    expiraEn:
      new Date(
        registro.expiraEn
      ).toISOString(),
  };
}

// ======================================================
// OBTENER ESTADO ACTUAL
// ======================================================

export function obtenerEstadoAlumno(
  alumnoId: string
): EstadoAlumno {
  const registro =
    obtenerRegistro(
      alumnoId
    );

  return construirEstadoAlumno(
    copiarEventos(
      registro.eventos
    )
  );
}

// ======================================================
// EXISTE ALUMNO
// ======================================================

export function existeAlumnoCMD(
  alumnoId: string
): boolean {
  limpiarExpirados();

  try {
    const id =
      validarAlumnoId(
        alumnoId
      );

    return registros.has(
      id
    );

  } catch {
    return false;
  }
}

// ======================================================
// ELIMINAR MEMORIA DE UN ALUMNO
// ======================================================

export function eliminarAlumnoCMD(
  alumnoId: string
): boolean {
  try {
    const id =
      validarAlumnoId(
        alumnoId
      );

    return registros.delete(
      id
    );

  } catch {
    return false;
  }
}

// ======================================================
// ESTADISTICAS
// ======================================================

export function obtenerEstadisticasCMD() {
  limpiarExpirados();

  let eventosTotales =
    0;

  for (
    const registro of
    registros.values()
  ) {
    eventosTotales +=
      registro.eventos.length;
  }

  return {
    alumnosActivos:
      registros.size,

    eventosTotales,

    limiteAlumnos:
      MAX_ALUMNOS,

    limiteEventosPorAlumno:
      MAX_EVENTOS_POR_ALUMNO,

    duracionHoras:
      DURACION_MS /
      3600000,
  };
}