import "server-only";

import type {
  EventoEducativo,
  CompetenciaEducativa,
  EstadoAprendizaje,
} from "./memoria-educativa";

import {
  calcularEvolucionObjetivo,
  type EvolucionObjetivo,
  type TendenciaAprendizaje,
} from "./evolucion";

// ======================================================
// INTERESTALK - CMD
// ESTADO AGREGADO DEL ALUMNO V1
//
// Convierte el historico completo de eventos educativos
// en un estado actual por objetivos.
//
// Responsabilidades:
// - agrupar eventos por competencia + objetivo + nivel;
// - calcular evolucion de cada objetivo;
// - resumir estados actuales;
// - identificar prioridades de aprendizaje;
// - ofrecer una base trazable para CMD y planificador.
//
// No utiliza Gemini.
// No calcula un nivel global.
// No certifica MCER.
// ======================================================

// ======================================================
// TIPOS
// ======================================================

export type PrioridadAprendizaje =
  | "alta"
  | "media"
  | "baja";

export type EstadoObjetivoAlumno = {
  competencia:
    CompetenciaEducativa;

  objetivo:
    string;

  nivelContenido:
    string;

  intentos:
    number;

  ultimoResultado:
    number;

  mejorResultado:
    number;

  variacionDesdePrimero:
    number;

  tendencia:
    TendenciaAprendizaje;

  estadoActual:
    EstadoAprendizaje;

  necesitaRefuerzo:
    boolean;

  prioridad:
    PrioridadAprendizaje;

  fechaUltimaActividad:
    string;
};

export type ResumenCompetenciaAlumno = {
  competencia:
    CompetenciaEducativa;

  objetivosTrabajados:
    number;

  reforzar:
    number;

  practicar:
    number;

  consolidar:
    number;

  objetivosConMejora:
    number;

  objetivosEstables:
    number;

  objetivosConRetroceso:
    number;
};

export type EstadoAlumno = {
  version: 1;

  totalEventos:
    number;

  objetivosTrabajados:
    number;

  estados: {
    reforzar: number;
    practicar: number;
    consolidar: number;
  };

  tendencias: {
    mejora: number;
    estable: number;
    retroceso: number;
    sinDatosSuficientes: number;
  };

  objetivos:
    EstadoObjetivoAlumno[];

  competencias:
    ResumenCompetenciaAlumno[];

  prioridadActual:
    EstadoObjetivoAlumno | null;

  fechaUltimaActividad:
    string | null;

  nivelMCERCertificado:
    false;
};

// ======================================================
// CLAVE DE AGRUPACION
//
// El mismo objetivo en B1 y B2 no representa
// necesariamente la misma evidencia pedagogica.
//
// Por eso agrupamos:
//
// competencia + objetivo + nivel
// ======================================================

function crearClaveObjetivo(
  evento: EventoEducativo
): string {
  return [
    evento.competencia,
    evento.objetivo,
    evento.nivelContenido,
  ].join("::");
}

// ======================================================
// VALIDAR EVENTOS GLOBALES
// ======================================================

function validarEventosGlobales(
  eventos: EventoEducativo[]
): void {
  if (!Array.isArray(eventos)) {
    throw new Error(
      "Historico educativo no valido."
    );
  }

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

  for (const evento of eventos) {
    if (
      evento.nivelMCERCertificado !==
      false
    ) {
      throw new Error(
        "El CMD no puede certificar nivel MCER."
      );
    }

    if (
      typeof evento.objetivo !==
        "string" ||
      !evento.objetivo.trim()
    ) {
      throw new Error(
        "Existe un objetivo educativo no valido."
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
  }
}

// ======================================================
// AGRUPAR EVENTOS
// ======================================================

function agruparEventos(
  eventos: EventoEducativo[]
): Map<
  string,
  EventoEducativo[]
> {
  const grupos =
    new Map<
      string,
      EventoEducativo[]
    >();

  for (const evento of eventos) {
    const clave =
      crearClaveObjetivo(
        evento
      );

    const existentes =
      grupos.get(clave) ??
      [];

    existentes.push(
      evento
    );

    grupos.set(
      clave,
      existentes
    );
  }

  return grupos;
}

// ======================================================
// PRIORIDAD
//
// V1:
//
// ALTA:
// - estado actual reforzar;
// - o existe retroceso.
//
// MEDIA:
// - estado actual practicar.
//
// BAJA:
// - estado actual consolidar.
//
// El retroceso tiene prioridad aunque el ultimo
// resultado no haya caido todavia a "reforzar".
//
// Esta es una regla de producto V1.
// ======================================================

function calcularPrioridad(
  evolucion: EvolucionObjetivo
): PrioridadAprendizaje {
  if (
    evolucion.estadoActual ===
      "reforzar" ||
    evolucion.tendencia ===
      "retroceso"
  ) {
    return "alta";
  }

  if (
    evolucion.estadoActual ===
    "practicar"
  ) {
    return "media";
  }

  return "baja";
}

// ======================================================
// CONVERTIR EVOLUCION EN ESTADO DE OBJETIVO
// ======================================================

function convertirObjetivo(
  evolucion: EvolucionObjetivo
): EstadoObjetivoAlumno {
  return {
    competencia:
      evolucion.competencia,

    objetivo:
      evolucion.objetivo,

    nivelContenido:
      evolucion.nivelContenido,

    intentos:
      evolucion.intentos,

    ultimoResultado:
      evolucion.ultimoResultado,

    mejorResultado:
      evolucion.mejorResultado,

    variacionDesdePrimero:
      evolucion.variacionDesdePrimero,

    tendencia:
      evolucion.tendencia,

    estadoActual:
      evolucion.estadoActual,

    necesitaRefuerzo:
      evolucion.necesitaRefuerzo,

    prioridad:
      calcularPrioridad(
        evolucion
      ),

    fechaUltimaActividad:
      evolucion.fechaUltimaActividad,
  };
}

// ======================================================
// ORDEN DE PRIORIDAD
//
// 1. alta
// 2. media
// 3. baja
//
// Dentro de la misma prioridad:
//
// - retroceso antes que estable;
// - menor resultado actual primero;
// - actividad mas antigua primero;
// - orden reproducible por objetivo.
// ======================================================

function valorPrioridad(
  prioridad:
    PrioridadAprendizaje
): number {
  if (
    prioridad === "alta"
  ) {
    return 0;
  }

  if (
    prioridad === "media"
  ) {
    return 1;
  }

  return 2;
}

function valorTendencia(
  tendencia:
    TendenciaAprendizaje
): number {
  if (
    tendencia === "retroceso"
  ) {
    return 0;
  }

  if (
    tendencia === "estable"
  ) {
    return 1;
  }

  if (
    tendencia ===
    "sin_datos_suficientes"
  ) {
    return 2;
  }

  return 3;
}

function ordenarObjetivos(
  a: EstadoObjetivoAlumno,
  b: EstadoObjetivoAlumno
): number {
  const prioridadA =
    valorPrioridad(
      a.prioridad
    );

  const prioridadB =
    valorPrioridad(
      b.prioridad
    );

  if (
    prioridadA !==
    prioridadB
  ) {
    return (
      prioridadA -
      prioridadB
    );
  }

  const tendenciaA =
    valorTendencia(
      a.tendencia
    );

  const tendenciaB =
    valorTendencia(
      b.tendencia
    );

  if (
    tendenciaA !==
    tendenciaB
  ) {
    return (
      tendenciaA -
      tendenciaB
    );
  }

  if (
    a.ultimoResultado !==
    b.ultimoResultado
  ) {
    return (
      a.ultimoResultado -
      b.ultimoResultado
    );
  }

  const fechaA =
    new Date(
      a.fechaUltimaActividad
    ).getTime();

  const fechaB =
    new Date(
      b.fechaUltimaActividad
    ).getTime();

  if (
    fechaA !==
    fechaB
  ) {
    return (
      fechaA -
      fechaB
    );
  }

  return (
    a.objetivo.localeCompare(
      b.objetivo
    )
  );
}

// ======================================================
// RESUMIR COMPETENCIAS
// ======================================================

function resumirCompetencias(
  objetivos:
    EstadoObjetivoAlumno[]
): ResumenCompetenciaAlumno[] {
  const mapa =
    new Map<
      CompetenciaEducativa,
      ResumenCompetenciaAlumno
    >();

  for (const objetivo of objetivos) {
    let resumen =
      mapa.get(
        objetivo.competencia
      );

    if (!resumen) {
      resumen = {
        competencia:
          objetivo.competencia,

        objetivosTrabajados:
          0,

        reforzar:
          0,

        practicar:
          0,

        consolidar:
          0,

        objetivosConMejora:
          0,

        objetivosEstables:
          0,

        objetivosConRetroceso:
          0,
      };

      mapa.set(
        objetivo.competencia,
        resumen
      );
    }

    resumen.objetivosTrabajados++;

    if (
      objetivo.estadoActual ===
      "reforzar"
    ) {
      resumen.reforzar++;
    }

    if (
      objetivo.estadoActual ===
      "practicar"
    ) {
      resumen.practicar++;
    }

    if (
      objetivo.estadoActual ===
      "consolidar"
    ) {
      resumen.consolidar++;
    }

    if (
      objetivo.tendencia ===
      "mejora"
    ) {
      resumen.objetivosConMejora++;
    }

    if (
      objetivo.tendencia ===
      "estable"
    ) {
      resumen.objetivosEstables++;
    }

    if (
      objetivo.tendencia ===
      "retroceso"
    ) {
      resumen.objetivosConRetroceso++;
    }
  }

  return Array.from(
    mapa.values()
  ).sort(
    (a, b) =>
      a.competencia.localeCompare(
        b.competencia
      )
  );
}

// ======================================================
// FECHA ULTIMA ACTIVIDAD GLOBAL
// ======================================================

function obtenerFechaUltimaActividad(
  eventos: EventoEducativo[]
): string | null {
  if (
    eventos.length === 0
  ) {
    return null;
  }

  const ordenados =
    [...eventos].sort(
      (a, b) =>
        new Date(
          b.fechaActividad
        ).getTime() -
        new Date(
          a.fechaActividad
        ).getTime()
    );

  return (
    ordenados[0]
      .fechaActividad
  );
}

// ======================================================
// CONSTRUIR ESTADO DEL ALUMNO
// ======================================================

export function construirEstadoAlumno(
  eventos: EventoEducativo[]
): EstadoAlumno {
  validarEventosGlobales(
    eventos
  );

  // Un alumno sin actividades es un estado valido.
  //
  // El CMD debe poder existir antes de la primera
  // actividad sin inventar informacion.

  if (
    eventos.length === 0
  ) {
    return {
      version: 1,

      totalEventos:
        0,

      objetivosTrabajados:
        0,

      estados: {
        reforzar: 0,
        practicar: 0,
        consolidar: 0,
      },

      tendencias: {
        mejora: 0,
        estable: 0,
        retroceso: 0,
        sinDatosSuficientes: 0,
      },

      objetivos:
        [],

      competencias:
        [],

      prioridadActual:
        null,

      fechaUltimaActividad:
        null,

      nivelMCERCertificado:
        false,
    };
  }

  // ====================================================
  // 1. AGRUPAR POR OBJETIVO
  // ====================================================

  const grupos =
    agruparEventos(
      eventos
    );

  // ====================================================
  // 2. CALCULAR EVOLUCIONES
  // ====================================================

  const objetivos:
    EstadoObjetivoAlumno[] =
    [];

  for (
    const grupo of
    grupos.values()
  ) {
    const evolucion =
      calcularEvolucionObjetivo(
        grupo
      );

    objetivos.push(
      convertirObjetivo(
        evolucion
      )
    );
  }

  // ====================================================
  // 3. ORDENAR POR NECESIDAD
  // ====================================================

  objetivos.sort(
    ordenarObjetivos
  );

  // ====================================================
  // 4. CONTADORES DE ESTADO
  // ====================================================

  const estados = {
    reforzar:
      objetivos.filter(
        (objetivo) =>
          objetivo.estadoActual ===
          "reforzar"
      ).length,

    practicar:
      objetivos.filter(
        (objetivo) =>
          objetivo.estadoActual ===
          "practicar"
      ).length,

    consolidar:
      objetivos.filter(
        (objetivo) =>
          objetivo.estadoActual ===
          "consolidar"
      ).length,
  };

  // ====================================================
  // 5. CONTADORES DE TENDENCIA
  // ====================================================

  const tendencias = {
    mejora:
      objetivos.filter(
        (objetivo) =>
          objetivo.tendencia ===
          "mejora"
      ).length,

    estable:
      objetivos.filter(
        (objetivo) =>
          objetivo.tendencia ===
          "estable"
      ).length,

    retroceso:
      objetivos.filter(
        (objetivo) =>
          objetivo.tendencia ===
          "retroceso"
      ).length,

    sinDatosSuficientes:
      objetivos.filter(
        (objetivo) =>
          objetivo.tendencia ===
          "sin_datos_suficientes"
      ).length,
  };

  // ====================================================
  // 6. PRIORIDAD ACTUAL
  //
  // objetivos ya esta ordenado por prioridad.
  //
  // Si todo esta consolidado, no existe una necesidad
  // urgente. Por eso prioridadActual = null.
  // ====================================================

  const prioridadActual =
    objetivos.find(
      (objetivo) =>
        objetivo.prioridad !==
        "baja"
    ) ?? null;

  // ====================================================
  // 7. RESULTADO
  // ====================================================

  return {
    version: 1,

    totalEventos:
      eventos.length,

    objetivosTrabajados:
      objetivos.length,

    estados,

    tendencias,

    objetivos,

    competencias:
      resumirCompetencias(
        objetivos
      ),

    prioridadActual,

    fechaUltimaActividad:
      obtenerFechaUltimaActividad(
        eventos
      ),

    nivelMCERCertificado:
      false,
  };
}