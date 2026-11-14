import "server-only";

import type {
  EventoEducativo,
  CompetenciaEducativa,
  EstadoAprendizaje,
} from "./memoria-educativa";

// ======================================================
// INTERESTALK - CMD
// MOTOR DE EVOLUCION V1
//
// Analiza el historico de eventos educativos de
// un mismo objetivo.
//
// Calcula:
// - numero de intentos;
// - primer y ultimo resultado;
// - mejor resultado;
// - variacion en puntos porcentuales;
// - tendencia;
// - estado actual;
// - necesidad actual de refuerzo.
//
// No utiliza Gemini.
// No certifica nivel MCER.
// ======================================================

export type TendenciaAprendizaje =
  | "mejora"
  | "estable"
  | "retroceso"
  | "sin_datos_suficientes";

export type PuntoEvolucion = {
  eventoId: string;
  actividadId: string;
  intento: number;
  porcentaje: number;
  estadoAprendizaje: EstadoAprendizaje;
  fechaActividad: string;
};

export type EvolucionObjetivo = {
  version: 1;

  competencia:
    CompetenciaEducativa;

  objetivo:
    string;

  nivelContenido:
    string;

  intentos:
    number;

  primerResultado:
    number;

  ultimoResultado:
    number;

  mejorResultado:
    number;

  peorResultado:
    number;

  variacionDesdePrimero:
    number;

  variacionUltimoIntento:
    number | null;

  tendencia:
    TendenciaAprendizaje;

  estadoActual:
    EstadoAprendizaje;

  necesitaRefuerzo:
    boolean;

  fechaPrimeraActividad:
    string;

  fechaUltimaActividad:
    string;

  historial:
    PuntoEvolucion[];

  nivelMCERCertificado:
    false;
};

// ======================================================
// VALIDACIONES
// ======================================================

function validarEventos(
  eventos: EventoEducativo[]
): void {
  if (
    !Array.isArray(eventos) ||
    eventos.length === 0
  ) {
    throw new Error(
      "No existen eventos educativos para analizar."
    );
  }

  const primero =
    eventos[0];

  for (const evento of eventos) {
    if (
      evento.competencia !==
      primero.competencia
    ) {
      throw new Error(
        "Los eventos pertenecen a competencias diferentes."
      );
    }

    if (
      evento.objetivo !==
      primero.objetivo
    ) {
      throw new Error(
        "Los eventos pertenecen a objetivos diferentes."
      );
    }

    if (
      evento.nivelContenido !==
      primero.nivelContenido
    ) {
      throw new Error(
        "Los eventos pertenecen a niveles diferentes."
      );
    }

    if (
      !Number.isInteger(
        evento.intento
      ) ||
      evento.intento < 1
    ) {
      throw new Error(
        "Existe un numero de intento no valido."
      );
    }

    if (
      !Number.isFinite(
        evento.resultado.porcentaje
      ) ||
      evento.resultado.porcentaje < 0 ||
      evento.resultado.porcentaje > 100
    ) {
      throw new Error(
        "Existe un porcentaje no valido."
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
        "Existe una fecha educativa no valida."
      );
    }

    if (
      evento.nivelMCERCertificado !==
      false
    ) {
      throw new Error(
        "La memoria educativa no puede certificar MCER."
      );
    }
  }

  // Un mismo objetivo no debe tener dos eventos
  // con el mismo eventoId.

  const eventoIds =
    eventos.map(
      (evento) =>
        evento.eventoId
    );

  if (
    new Set(
      eventoIds
    ).size !==
    eventoIds.length
  ) {
    throw new Error(
      "Existen eventos educativos duplicados."
    );
  }

  // Tampoco aceptamos dos registros para la misma
  // actividad dentro del mismo historico.

  const actividadIds =
    eventos.map(
      (evento) =>
        evento.actividadId
    );

  if (
    new Set(
      actividadIds
    ).size !==
    actividadIds.length
  ) {
    throw new Error(
      "Existen actividades educativas duplicadas."
    );
  }
}

// ======================================================
// ORDENAR HISTORICO
//
// La fecha es la fuente principal de orden.
// El intento actua como desempate.
//
// No confiamos en el orden recibido.
// ======================================================

function ordenarEventos(
  eventos: EventoEducativo[]
): EventoEducativo[] {
  return [
    ...eventos,
  ].sort(
    (a, b) => {
      const fechaA =
        new Date(
          a.fechaActividad
        ).getTime();

      const fechaB =
        new Date(
          b.fechaActividad
        ).getTime();

      if (
        fechaA !== fechaB
      ) {
        return (
          fechaA -
          fechaB
        );
      }

      return (
        a.intento -
        b.intento
      );
    }
  );
}

// ======================================================
// CALCULAR TENDENCIA
//
// V1:
// - 1 evento: sin datos suficientes.
// - diferencia >= +10 pp: mejora.
// - diferencia <= -10 pp: retroceso.
// - entre -9 y +9 pp: estable.
//
// Se compara el primer resultado con el ultimo.
//
// El umbral de 10 puntos es una regla de producto V1,
// no una equivalencia MCER.
// ======================================================

function calcularTendencia(
  primerResultado: number,
  ultimoResultado: number,
  numeroEventos: number
): TendenciaAprendizaje {
  if (
    numeroEventos < 2
  ) {
    return "sin_datos_suficientes";
  }

  const diferencia =
    ultimoResultado -
    primerResultado;

  if (
    diferencia >= 10
  ) {
    return "mejora";
  }

  if (
    diferencia <= -10
  ) {
    return "retroceso";
  }

  return "estable";
}

// ======================================================
// CONSTRUIR EVOLUCION
// ======================================================

export function calcularEvolucionObjetivo(
  eventos: EventoEducativo[]
): EvolucionObjetivo {
  validarEventos(
    eventos
  );

  const ordenados =
    ordenarEventos(
      eventos
    );

  const primero =
    ordenados[0];

  const ultimo =
    ordenados[
      ordenados.length - 1
    ];

  const anterior =
    ordenados.length >= 2
      ? ordenados[
          ordenados.length - 2
        ]
      : null;

  const porcentajes =
    ordenados.map(
      (evento) =>
        evento.resultado
          .porcentaje
    );

  const primerResultado =
    primero.resultado
      .porcentaje;

  const ultimoResultado =
    ultimo.resultado
      .porcentaje;

  const mejorResultado =
    Math.max(
      ...porcentajes
    );

  const peorResultado =
    Math.min(
      ...porcentajes
    );

  const variacionDesdePrimero =
    ultimoResultado -
    primerResultado;

  const variacionUltimoIntento =
    anterior
      ? ultimoResultado -
        anterior.resultado
          .porcentaje
      : null;

  const tendencia =
    calcularTendencia(
      primerResultado,
      ultimoResultado,
      ordenados.length
    );

  const historial:
    PuntoEvolucion[] =
    ordenados.map(
      (evento) => ({
        eventoId:
          evento.eventoId,

        actividadId:
          evento.actividadId,

        intento:
          evento.intento,

        porcentaje:
          evento.resultado
            .porcentaje,

        estadoAprendizaje:
          evento
            .estadoAprendizaje,

        fechaActividad:
          evento.fechaActividad,
      })
    );

  return {
    version: 1,

    competencia:
      primero.competencia,

    objetivo:
      primero.objetivo,

    nivelContenido:
      primero.nivelContenido,

    intentos:
      ordenados.length,

    primerResultado,

    ultimoResultado,

    mejorResultado,

    peorResultado,

    variacionDesdePrimero,

    variacionUltimoIntento,

    tendencia,

    estadoActual:
      ultimo.estadoAprendizaje,

    necesitaRefuerzo:
      ultimo.necesitaRefuerzo,

    fechaPrimeraActividad:
      primero.fechaActividad,

    fechaUltimaActividad:
      ultimo.fechaActividad,

    historial,

    nivelMCERCertificado:
      false,
  };
}