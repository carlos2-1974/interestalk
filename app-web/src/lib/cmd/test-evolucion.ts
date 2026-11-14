import {
  calcularEvolucionObjetivo,
} from "./evolucion";

import type {
  EventoEducativo,
  EstadoAprendizaje,
  CompetenciaEducativa,
} from "./memoria-educativa";

// ======================================================
// INTERESTALK - CMD
// TEST MOTOR DE EVOLUCION V1
//
// Comprueba:
// - mejora;
// - estabilidad;
// - retroceso;
// - un unico intento;
// - orden cronologico;
// - variaciones;
// - estado actual;
// - duplicados;
// - mezcla de objetivos;
// - mezcla de niveles;
// - mezcla de competencias.
//
// No utiliza Gemini.
// ======================================================

let superadas = 0;
let fallidas = 0;

function comprobar(
  nombre: string,
  condicion: boolean
): void {
  if (condicion) {
    superadas++;
    console.log(
      "CORRECTO - " + nombre
    );
  } else {
    fallidas++;
    console.error(
      "ERROR - " + nombre
    );
  }
}

function rechaza(
  accion: () => unknown
): boolean {
  try {
    accion();
    return false;
  } catch {
    return true;
  }
}

// ======================================================
// CREAR EVENTO DE PRUEBA
// ======================================================

function crearEvento(
  datos: {
    eventoId: string;
    actividadId: string;
    intento: number;
    porcentaje: number;
    fecha: string;
    estado: EstadoAprendizaje;
    objetivo?: string;
    nivel?: string;
    competencia?: CompetenciaEducativa;
  }
): EventoEducativo {
  const preguntas = 5;

  const aciertos =
    Math.round(
      (
        datos.porcentaje /
        100
      ) * preguntas
    );

  const errores =
    preguntas -
    aciertos;

  return {
    version: 1,

    eventoId:
      datos.eventoId,

    actividadId:
      datos.actividadId,

    competencia:
      datos.competencia ??
      "grammar",

    objetivo:
      datos.objetivo ??
      "second-conditional",

    nivelContenido:
      datos.nivel ??
      "B1",

    tipoActividad:
      datos.estado ===
      "consolidar"
        ? "consolidacion"
        : "refuerzo",

    origen:
      datos.intento === 1
        ? "diagnostico"
        : "actividad",

    evidenciaOrigen: {
      preguntas: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },

    resultado: {
      preguntas,
      aciertos,
      errores,
      porcentaje:
        datos.porcentaje,
    },

    estadoAprendizaje:
      datos.estado,

    necesitaRefuerzo:
      datos.estado !==
      "consolidar",

    contextoPersonalizacion: {
      interesPrincipal:
        "Tecnologia e IA",
    },

    intento:
      datos.intento,

    fechaActividad:
      datos.fecha,

    nivelMCERCertificado:
      false,
  };
}

// ======================================================
// 1. TRAYECTORIA DE MEJORA
//
// 40 -> 60 -> 80
// ======================================================

const mejora1 =
  crearEvento({
    eventoId: "mejora-e1",
    actividadId: "mejora-a1",
    intento: 1,
    porcentaje: 40,
    fecha:
      "2026-11-01T10:00:00.000Z",
    estado: "reforzar",
  });

const mejora2 =
  crearEvento({
    eventoId: "mejora-e2",
    actividadId: "mejora-a2",
    intento: 2,
    porcentaje: 60,
    fecha:
      "2026-11-05T10:00:00.000Z",
    estado: "practicar",
  });

const mejora3 =
  crearEvento({
    eventoId: "mejora-e3",
    actividadId: "mejora-a3",
    intento: 3,
    porcentaje: 80,
    fecha:
      "2026-11-10T10:00:00.000Z",
    estado: "consolidar",
  });

const evolucionMejora =
  calcularEvolucionObjetivo([
    mejora1,
    mejora2,
    mejora3,
  ]);

comprobar(
  "Mejora registra tres intentos",
  evolucionMejora.intentos === 3
);

comprobar(
  "Mejora conserva primer resultado 40",
  evolucionMejora
    .primerResultado === 40
);

comprobar(
  "Mejora conserva ultimo resultado 80",
  evolucionMejora
    .ultimoResultado === 80
);

comprobar(
  "Mejora calcula mejor resultado 80",
  evolucionMejora
    .mejorResultado === 80
);

comprobar(
  "Mejora calcula peor resultado 40",
  evolucionMejora
    .peorResultado === 40
);

comprobar(
  "Mejora calcula +40 puntos",
  evolucionMejora
    .variacionDesdePrimero === 40
);

comprobar(
  "Ultimo intento mejora 20 puntos",
  evolucionMejora
    .variacionUltimoIntento === 20
);

comprobar(
  "Trayectoria se clasifica como mejora",
  evolucionMejora.tendencia ===
    "mejora"
);

comprobar(
  "Estado actual es consolidar",
  evolucionMejora.estadoActual ===
    "consolidar"
);

comprobar(
  "Objetivo consolidado no necesita refuerzo",
  evolucionMejora.necesitaRefuerzo ===
    false
);

comprobar(
  "Conserva objetivo second-conditional",
  evolucionMejora.objetivo ===
    "second-conditional"
);

comprobar(
  "Conserva competencia Grammar",
  evolucionMejora.competencia ===
    "grammar"
);

comprobar(
  "Conserva nivel B1",
  evolucionMejora.nivelContenido ===
    "B1"
);

comprobar(
  "No certifica MCER",
  evolucionMejora
    .nivelMCERCertificado === false
);

// ======================================================
// 2. TRAYECTORIA ESTABLE
//
// 60 -> 65 -> 60
//
// Los porcentajes no tienen que proceder de cinco
// preguntas reales en este test: evolucion.ts analiza
// eventos ya validados.
// ======================================================

const estable1 =
  crearEvento({
    eventoId: "estable-e1",
    actividadId: "estable-a1",
    intento: 1,
    porcentaje: 60,
    fecha:
      "2026-10-01T10:00:00.000Z",
    estado: "practicar",
  });

const estable2 =
  crearEvento({
    eventoId: "estable-e2",
    actividadId: "estable-a2",
    intento: 2,
    porcentaje: 65,
    fecha:
      "2026-10-05T10:00:00.000Z",
    estado: "practicar",
  });

const estable3 =
  crearEvento({
    eventoId: "estable-e3",
    actividadId: "estable-a3",
    intento: 3,
    porcentaje: 60,
    fecha:
      "2026-10-10T10:00:00.000Z",
    estado: "practicar",
  });

const evolucionEstable =
  calcularEvolucionObjetivo([
    estable1,
    estable2,
    estable3,
  ]);

comprobar(
  "Trayectoria estable conserva 60 inicial",
  evolucionEstable
    .primerResultado === 60
);

comprobar(
  "Trayectoria estable conserva 60 final",
  evolucionEstable
    .ultimoResultado === 60
);

comprobar(
  "Trayectoria estable tiene variacion cero",
  evolucionEstable
    .variacionDesdePrimero === 0
);

comprobar(
  "Trayectoria se clasifica como estable",
  evolucionEstable.tendencia ===
    "estable"
);

comprobar(
  "Estado estable actual es practicar",
  evolucionEstable.estadoActual ===
    "practicar"
);

// ======================================================
// 3. RETROCESO
//
// 80 -> 60 -> 40
// ======================================================

const retroceso1 =
  crearEvento({
    eventoId: "retroceso-e1",
    actividadId: "retroceso-a1",
    intento: 1,
    porcentaje: 80,
    fecha:
      "2026-09-01T10:00:00.000Z",
    estado: "consolidar",
  });

const retroceso2 =
  crearEvento({
    eventoId: "retroceso-e2",
    actividadId: "retroceso-a2",
    intento: 2,
    porcentaje: 60,
    fecha:
      "2026-09-05T10:00:00.000Z",
    estado: "practicar",
  });

const retroceso3 =
  crearEvento({
    eventoId: "retroceso-e3",
    actividadId: "retroceso-a3",
    intento: 3,
    porcentaje: 40,
    fecha:
      "2026-09-10T10:00:00.000Z",
    estado: "reforzar",
  });

const evolucionRetroceso =
  calcularEvolucionObjetivo([
    retroceso1,
    retroceso2,
    retroceso3,
  ]);

comprobar(
  "Retroceso calcula -40 puntos",
  evolucionRetroceso
    .variacionDesdePrimero === -40
);

comprobar(
  "Ultimo intento retrocede 20 puntos",
  evolucionRetroceso
    .variacionUltimoIntento === -20
);

comprobar(
  "Trayectoria se clasifica como retroceso",
  evolucionRetroceso.tendencia ===
    "retroceso"
);

comprobar(
  "Estado actual tras retroceso es reforzar",
  evolucionRetroceso.estadoActual ===
    "reforzar"
);

comprobar(
  "Retroceso necesita refuerzo",
  evolucionRetroceso
    .necesitaRefuerzo === true
);

// ======================================================
// 4. UN SOLO INTENTO
// ======================================================

const unico =
  crearEvento({
    eventoId: "unico-e1",
    actividadId: "unico-a1",
    intento: 1,
    porcentaje: 40,
    fecha:
      "2026-08-01T10:00:00.000Z",
    estado: "reforzar",
  });

const evolucionUnica =
  calcularEvolucionObjetivo([
    unico,
  ]);

comprobar(
  "Un intento produce sin datos suficientes",
  evolucionUnica.tendencia ===
    "sin_datos_suficientes"
);

comprobar(
  "Un intento no calcula variacion ultimo intento",
  evolucionUnica
    .variacionUltimoIntento === null
);

comprobar(
  "Un intento conserva estado actual",
  evolucionUnica.estadoActual ===
    "reforzar"
);

// ======================================================
// 5. EVENTOS DESORDENADOS
//
// Recibimos 80, 40, 60.
// El motor debe reconstruir 40, 60, 80.
// ======================================================

const evolucionDesordenada =
  calcularEvolucionObjetivo([
    mejora3,
    mejora1,
    mejora2,
  ]);

comprobar(
  "Ordena eventos cronologicamente",
  evolucionDesordenada
    .historial[0]
    .porcentaje === 40 &&
    evolucionDesordenada
      .historial[1]
      .porcentaje === 60 &&
    evolucionDesordenada
      .historial[2]
      .porcentaje === 80
);

comprobar(
  "Desorden no altera tendencia",
  evolucionDesordenada
    .tendencia === "mejora"
);

comprobar(
  "Desorden no altera estado actual",
  evolucionDesordenada
    .estadoActual ===
    "consolidar"
);

comprobar(
  "Conserva fecha primera actividad",
  evolucionDesordenada
    .fechaPrimeraActividad ===
    "2026-11-01T10:00:00.000Z"
);

comprobar(
  "Conserva fecha ultima actividad",
  evolucionDesordenada
    .fechaUltimaActividad ===
    "2026-11-10T10:00:00.000Z"
);

// ======================================================
// 6. UMBRALES DE TENDENCIA
//
// +9  -> estable
// +10 -> mejora
// -9  -> estable
// -10 -> retroceso
// ======================================================

const base50 =
  crearEvento({
    eventoId: "umbral-base",
    actividadId: "umbral-base-a",
    intento: 1,
    porcentaje: 50,
    fecha:
      "2026-07-01T10:00:00.000Z",
    estado: "reforzar",
  });

const mas9 =
  crearEvento({
    eventoId: "umbral-mas9",
    actividadId: "umbral-mas9-a",
    intento: 2,
    porcentaje: 59,
    fecha:
      "2026-07-02T10:00:00.000Z",
    estado: "reforzar",
  });

const mas10 =
  crearEvento({
    eventoId: "umbral-mas10",
    actividadId: "umbral-mas10-a",
    intento: 2,
    porcentaje: 60,
    fecha:
      "2026-07-02T10:00:00.000Z",
    estado: "practicar",
  });

const menos9 =
  crearEvento({
    eventoId: "umbral-menos9",
    actividadId: "umbral-menos9-a",
    intento: 2,
    porcentaje: 41,
    fecha:
      "2026-07-02T10:00:00.000Z",
    estado: "reforzar",
  });

const menos10 =
  crearEvento({
    eventoId: "umbral-menos10",
    actividadId: "umbral-menos10-a",
    intento: 2,
    porcentaje: 40,
    fecha:
      "2026-07-02T10:00:00.000Z",
    estado: "reforzar",
  });

comprobar(
  "+9 puntos sigue siendo estable",
  calcularEvolucionObjetivo([
    base50,
    mas9,
  ]).tendencia === "estable"
);

comprobar(
  "+10 puntos produce mejora",
  calcularEvolucionObjetivo([
    base50,
    mas10,
  ]).tendencia === "mejora"
);

comprobar(
  "-9 puntos sigue siendo estable",
  calcularEvolucionObjetivo([
    base50,
    menos9,
  ]).tendencia === "estable"
);

comprobar(
  "-10 puntos produce retroceso",
  calcularEvolucionObjetivo([
    base50,
    menos10,
  ]).tendencia === "retroceso"
);

// ======================================================
// 7. DUPLICADO DE EVENTO
// ======================================================

comprobar(
  "Rechaza eventoId duplicado",
  rechaza(() =>
    calcularEvolucionObjetivo([
      mejora1,
      {
        ...mejora2,
        eventoId:
          mejora1.eventoId,
      },
    ])
  )
);

// ======================================================
// 8. ACTIVIDAD DUPLICADA
// ======================================================

comprobar(
  "Rechaza actividadId duplicado",
  rechaza(() =>
    calcularEvolucionObjetivo([
      mejora1,
      {
        ...mejora2,
        actividadId:
          mejora1.actividadId,
      },
    ])
  )
);

// ======================================================
// 9. OBJETIVOS DIFERENTES
// ======================================================

const otroObjetivo =
  crearEvento({
    eventoId: "otro-objetivo-e",
    actividadId: "otro-objetivo-a",
    intento: 2,
    porcentaje: 60,
    fecha:
      "2026-11-05T10:00:00.000Z",
    estado: "practicar",
    objetivo:
      "present-perfect",
  });

comprobar(
  "Rechaza mezcla de objetivos",
  rechaza(() =>
    calcularEvolucionObjetivo([
      mejora1,
      otroObjetivo,
    ])
  )
);

// ======================================================
// 10. NIVELES DIFERENTES
// ======================================================

const otroNivel =
  crearEvento({
    eventoId: "otro-nivel-e",
    actividadId: "otro-nivel-a",
    intento: 2,
    porcentaje: 60,
    fecha:
      "2026-11-05T10:00:00.000Z",
    estado: "practicar",
    nivel:
      "B2",
  });

comprobar(
  "Rechaza mezcla de niveles",
  rechaza(() =>
    calcularEvolucionObjetivo([
      mejora1,
      otroNivel,
    ])
  )
);

// ======================================================
// 11. COMPETENCIAS DIFERENTES
// ======================================================

const otraCompetencia =
  crearEvento({
    eventoId: "otra-competencia-e",
    actividadId: "otra-competencia-a",
    intento: 2,
    porcentaje: 60,
    fecha:
      "2026-11-05T10:00:00.000Z",
    estado: "practicar",
    competencia:
      "reading",
  });

comprobar(
  "Rechaza mezcla de competencias",
  rechaza(() =>
    calcularEvolucionObjetivo([
      mejora1,
      otraCompetencia,
    ])
  )
);

// ======================================================
// 12. LISTA VACIA
// ======================================================

comprobar(
  "Rechaza historico vacio",
  rechaza(() =>
    calcularEvolucionObjetivo(
      []
    )
  )
);

// ======================================================
// RESUMEN
// ======================================================

console.log(
  "\n================================"
);

console.log(
  "INTERESTALK - TEST EVOLUCION CMD V1"
);

console.log(
  "================================"
);

console.log(
  "Pruebas superadas:",
  superadas
);

console.log(
  "Pruebas fallidas:",
  fallidas
);

console.log(
  "\nTRAYECTORIA PRINCIPAL:"
);

console.log(
  evolucionMejora.historial
    .map(
      (punto) =>
        punto.porcentaje +
        "% " +
        punto.estadoAprendizaje
    )
    .join(" -> ")
);

console.log(
  "Variacion:",
  (
    evolucionMejora
      .variacionDesdePrimero >= 0
      ? "+"
      : ""
  ) +
    evolucionMejora
      .variacionDesdePrimero +
    " pp"
);

console.log(
  "Tendencia:",
  evolucionMejora.tendencia
);

console.log(
  "Estado actual:",
  evolucionMejora.estadoActual
);

if (
  fallidas === 0
) {
  console.log(
    "\nTODAS LAS PRUEBAS SUPERADAS"
  );
} else {
  console.error(
    "\nSE HAN DETECTADO FALLOS"
  );

  process.exitCode = 1;
}