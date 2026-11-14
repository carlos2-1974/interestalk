import {
  construirEstadoAlumno,
} from "./estado-alumno";

import type {
  EventoEducativo,
  EstadoAprendizaje,
  CompetenciaEducativa,
} from "./memoria-educativa";

// ======================================================
// INTERESTALK - CMD
// TEST ESTADO AGREGADO DEL ALUMNO V1
//
// Comprueba:
// - varios objetivos simultaneos;
// - varias competencias;
// - agrupacion por objetivo + nivel;
// - estados actuales;
// - tendencias;
// - prioridad automatica;
// - retroceso como factor prioritario;
// - alumno sin historico;
// - todos consolidados;
// - duplicados.
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
// CREAR EVENTO
//
// Los porcentajes se utilizan para probar el motor
// agregado. En produccion procederan de eventos
// previamente validados.
// ======================================================

function crearEvento(
  datos: {
    eventoId: string;
    actividadId: string;
    competencia:
      CompetenciaEducativa;
    objetivo: string;
    nivel: string;
    intento: number;
    porcentaje: number;
    estado:
      EstadoAprendizaje;
    fecha: string;
  }
): EventoEducativo {
  const preguntas =
    100;

  const aciertos =
    datos.porcentaje;

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
      datos.competencia,

    objetivo:
      datos.objetivo,

    nivelContenido:
      datos.nivel,

    tipoActividad:
      datos.estado ===
      "consolidar"
        ? "consolidacion"
        : "refuerzo",

    origen:
      datos.intento === 1
        ? "diagnostico"
        : "actividad",

    evidenciaOrigen:
      datos.intento === 1
        ? {
            preguntas: 2,
            aciertos: 1,
            errores: 1,
            porcentaje: 50,
          }
        : null,

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
// 1. SECOND CONDITIONAL
//
// 40 -> 60 -> 80
// mejora + consolidar
// ======================================================

const second1 =
  crearEvento({
    eventoId: "second-e1",
    actividadId: "second-a1",
    competencia: "grammar",
    objetivo:
      "second-conditional",
    nivel: "B1",
    intento: 1,
    porcentaje: 40,
    estado: "reforzar",
    fecha:
      "2026-10-01T10:00:00.000Z",
  });

const second2 =
  crearEvento({
    eventoId: "second-e2",
    actividadId: "second-a2",
    competencia: "grammar",
    objetivo:
      "second-conditional",
    nivel: "B1",
    intento: 2,
    porcentaje: 60,
    estado: "practicar",
    fecha:
      "2026-10-05T10:00:00.000Z",
  });

const second3 =
  crearEvento({
    eventoId: "second-e3",
    actividadId: "second-a3",
    competencia: "grammar",
    objetivo:
      "second-conditional",
    nivel: "B1",
    intento: 3,
    porcentaje: 80,
    estado: "consolidar",
    fecha:
      "2026-10-10T10:00:00.000Z",
  });

// ======================================================
// 2. PRESENT PERFECT
//
// 40 -> 40
// estable + reforzar
// ======================================================

const present1 =
  crearEvento({
    eventoId: "present-e1",
    actividadId: "present-a1",
    competencia: "grammar",
    objetivo:
      "present-perfect",
    nivel: "B1",
    intento: 1,
    porcentaje: 40,
    estado: "reforzar",
    fecha:
      "2026-10-12T10:00:00.000Z",
  });

const present2 =
  crearEvento({
    eventoId: "present-e2",
    actividadId: "present-a2",
    competencia: "grammar",
    objetivo:
      "present-perfect",
    nivel: "B1",
    intento: 2,
    porcentaje: 40,
    estado: "reforzar",
    fecha:
      "2026-10-18T10:00:00.000Z",
  });

// ======================================================
// 3. PAST SIMPLE
//
// 80 -> 60
// retroceso + practicar
//
// Aunque 60 > 40 de Present Perfect,
// el retroceso convierte este objetivo en
// prioridad alta y debe aparecer primero.
// ======================================================

const past1 =
  crearEvento({
    eventoId: "past-e1",
    actividadId: "past-a1",
    competencia: "grammar",
    objetivo:
      "past-simple",
    nivel: "B1",
    intento: 1,
    porcentaje: 80,
    estado: "consolidar",
    fecha:
      "2026-10-20T10:00:00.000Z",
  });

const past2 =
  crearEvento({
    eventoId: "past-e2",
    actividadId: "past-a2",
    competencia: "grammar",
    objetivo:
      "past-simple",
    nivel: "B1",
    intento: 2,
    porcentaje: 60,
    estado: "practicar",
    fecha:
      "2026-10-25T10:00:00.000Z",
  });

// ======================================================
// 4. READING · TRAVEL PLANS
//
// 60 -> 80
// mejora + consolidar
// ======================================================

const reading1 =
  crearEvento({
    eventoId: "reading-e1",
    actividadId: "reading-a1",
    competencia: "reading",
    objetivo:
      "travel-plans",
    nivel: "B1",
    intento: 1,
    porcentaje: 60,
    estado: "practicar",
    fecha:
      "2026-10-27T10:00:00.000Z",
  });

const reading2 =
  crearEvento({
    eventoId: "reading-e2",
    actividadId: "reading-a2",
    competencia: "reading",
    objetivo:
      "travel-plans",
    nivel: "B1",
    intento: 2,
    porcentaje: 80,
    estado: "consolidar",
    fecha:
      "2026-11-01T10:00:00.000Z",
  });

// ======================================================
// 5. CONSTRUIR ESTADO COMPLETO
// ======================================================

const eventos = [
  second1,
  second2,
  second3,
  present1,
  present2,
  past1,
  past2,
  reading1,
  reading2,
];

const estado =
  construirEstadoAlumno(
    eventos
  );

// ======================================================
// 6. CONTADORES GENERALES
// ======================================================

comprobar(
  "Registra nueve eventos",
  estado.totalEventos === 9
);

comprobar(
  "Detecta cuatro objetivos trabajados",
  estado.objetivosTrabajados === 4
);

comprobar(
  "Detecta un objetivo en reforzar",
  estado.estados.reforzar === 1
);

comprobar(
  "Detecta un objetivo en practicar",
  estado.estados.practicar === 1
);

comprobar(
  "Detecta dos objetivos consolidados",
  estado.estados.consolidar === 2
);

// ======================================================
// 7. TENDENCIAS
// ======================================================

comprobar(
  "Detecta dos objetivos en mejora",
  estado.tendencias.mejora === 2
);

comprobar(
  "Detecta un objetivo estable",
  estado.tendencias.estable === 1
);

comprobar(
  "Detecta un objetivo en retroceso",
  estado.tendencias.retroceso === 1
);

comprobar(
  "No hay objetivos sin datos suficientes",
  estado.tendencias
    .sinDatosSuficientes === 0
);

// ======================================================
// 8. PRIORIDAD ACTUAL
// ======================================================

comprobar(
  "Existe prioridad actual",
  estado.prioridadActual !==
    null
);

comprobar(
  "Past Simple es prioridad actual",
  estado.prioridadActual
    ?.objetivo ===
    "past-simple"
);

comprobar(
  "Prioridad pertenece a Grammar",
  estado.prioridadActual
    ?.competencia ===
    "grammar"
);

comprobar(
  "Prioridad conserva nivel B1",
  estado.prioridadActual
    ?.nivelContenido ===
    "B1"
);

comprobar(
  "Prioridad tiene resultado 60",
  estado.prioridadActual
    ?.ultimoResultado ===
    60
);

comprobar(
  "Prioridad esta en retroceso",
  estado.prioridadActual
    ?.tendencia ===
    "retroceso"
);

comprobar(
  "Prioridad se clasifica alta",
  estado.prioridadActual
    ?.prioridad ===
    "alta"
);

// ======================================================
// 9. ORDEN DE OBJETIVOS
//
// Esperamos:
//
// 1. Past Simple
//    alta + retroceso
//
// 2. Present Perfect
//    alta + estable
//
// Los consolidados quedan despues.
// ======================================================

comprobar(
  "Retroceso aparece antes que refuerzo estable",
  estado.objetivos[0]
    .objetivo ===
    "past-simple" &&
    estado.objetivos[1]
      .objetivo ===
      "present-perfect"
);

comprobar(
  "Present Perfect mantiene 40 por ciento",
  estado.objetivos[1]
    .ultimoResultado === 40
);

// ======================================================
// 10. SECOND CONDITIONAL
// ======================================================

const second =
  estado.objetivos.find(
    (objetivo) =>
      objetivo.objetivo ===
      "second-conditional"
  );

comprobar(
  "Second Conditional existe",
  second !== undefined
);

comprobar(
  "Second Conditional tiene tres intentos",
  second?.intentos === 3
);

comprobar(
  "Second Conditional mejora 40 puntos",
  second
    ?.variacionDesdePrimero ===
    40
);

comprobar(
  "Second Conditional esta consolidado",
  second?.estadoActual ===
    "consolidar"
);

// ======================================================
// 11. READING
// ======================================================

const travel =
  estado.objetivos.find(
    (objetivo) =>
      objetivo.competencia ===
        "reading" &&
      objetivo.objetivo ===
        "travel-plans"
  );

comprobar(
  "Reading Travel Plans existe",
  travel !== undefined
);

comprobar(
  "Reading Travel Plans esta consolidado",
  travel?.estadoActual ===
    "consolidar"
);

comprobar(
  "Reading Travel Plans mejora",
  travel?.tendencia ===
    "mejora"
);

// ======================================================
// 12. RESUMEN POR COMPETENCIAS
// ======================================================

const grammar =
  estado.competencias.find(
    (item) =>
      item.competencia ===
      "grammar"
  );

const reading =
  estado.competencias.find(
    (item) =>
      item.competencia ===
      "reading"
  );

comprobar(
  "Resumen Grammar existe",
  grammar !== undefined
);

comprobar(
  "Grammar tiene tres objetivos",
  grammar
    ?.objetivosTrabajados ===
    3
);

comprobar(
  "Grammar tiene un refuerzo",
  grammar?.reforzar === 1
);

comprobar(
  "Grammar tiene un objetivo en practica",
  grammar?.practicar === 1
);

comprobar(
  "Grammar tiene un consolidado",
  grammar?.consolidar === 1
);

comprobar(
  "Grammar detecta un retroceso",
  grammar
    ?.objetivosConRetroceso ===
    1
);

comprobar(
  "Resumen Reading existe",
  reading !== undefined
);

comprobar(
  "Reading tiene un objetivo",
  reading
    ?.objetivosTrabajados ===
    1
);

comprobar(
  "Reading tiene un consolidado",
  reading?.consolidar === 1
);

// ======================================================
// 13. FECHA GLOBAL
// ======================================================

comprobar(
  "Detecta fecha de ultima actividad",
  estado.fechaUltimaActividad ===
    "2026-11-01T10:00:00.000Z"
);

// ======================================================
// 14. NO CERTIFICA MCER
// ======================================================

comprobar(
  "Estado agregado no certifica MCER",
  estado.nivelMCERCertificado ===
    false
);

// ======================================================
// 15. ALUMNO SIN HISTORICO
// ======================================================

const vacio =
  construirEstadoAlumno(
    []
  );

comprobar(
  "Alumno sin historico tiene cero eventos",
  vacio.totalEventos === 0
);

comprobar(
  "Alumno sin historico tiene cero objetivos",
  vacio.objetivosTrabajados ===
    0
);

comprobar(
  "Alumno sin historico no tiene prioridad",
  vacio.prioridadActual ===
    null
);

comprobar(
  "Alumno sin historico no inventa fecha",
  vacio.fechaUltimaActividad ===
    null
);

// ======================================================
// 16. TODOS CONSOLIDADOS
// ======================================================

const consolidadoGrammar =
  crearEvento({
    eventoId:
      "todo-consolidado-e1",

    actividadId:
      "todo-consolidado-a1",

    competencia:
      "grammar",

    objetivo:
      "present-perfect",

    nivel:
      "B1",

    intento:
      1,

    porcentaje:
      80,

    estado:
      "consolidar",

    fecha:
      "2026-11-02T10:00:00.000Z",
  });

const consolidadoReading =
  crearEvento({
    eventoId:
      "todo-consolidado-e2",

    actividadId:
      "todo-consolidado-a2",

    competencia:
      "reading",

    objetivo:
      "travel-plans",

    nivel:
      "B1",

    intento:
      1,

    porcentaje:
      100,

    estado:
      "consolidar",

    fecha:
      "2026-11-03T10:00:00.000Z",
  });

const todoConsolidado =
  construirEstadoAlumno([
    consolidadoGrammar,
    consolidadoReading,
  ]);

comprobar(
  "Todo consolidado registra dos objetivos",
  todoConsolidado
    .objetivosTrabajados ===
    2
);

comprobar(
  "Todo consolidado tiene dos consolidados",
  todoConsolidado
    .estados.consolidar ===
    2
);

comprobar(
  "Todo consolidado no inventa prioridad",
  todoConsolidado
    .prioridadActual ===
    null
);

// ======================================================
// 17. MISMO OBJETIVO EN DOS NIVELES
//
// Deben ser dos grupos diferentes.
// ======================================================

const presentB1 =
  crearEvento({
    eventoId:
      "present-b1-e",

    actividadId:
      "present-b1-a",

    competencia:
      "grammar",

    objetivo:
      "present-perfect",

    nivel:
      "B1",

    intento:
      1,

    porcentaje:
      80,

    estado:
      "consolidar",

    fecha:
      "2026-09-01T10:00:00.000Z",
  });

const presentB2 =
  crearEvento({
    eventoId:
      "present-b2-e",

    actividadId:
      "present-b2-a",

    competencia:
      "grammar",

    objetivo:
      "present-perfect",

    nivel:
      "B2",

    intento:
      1,

    porcentaje:
      40,

    estado:
      "reforzar",

    fecha:
      "2026-10-01T10:00:00.000Z",
  });

const nivelesSeparados =
  construirEstadoAlumno([
    presentB1,
    presentB2,
  ]);

comprobar(
  "Mismo objetivo en dos niveles crea dos estados",
  nivelesSeparados
    .objetivosTrabajados ===
    2
);

comprobar(
  "B1 y B2 permanecen separados",
  nivelesSeparados.objetivos.some(
    (objetivo) =>
      objetivo.objetivo ===
        "present-perfect" &&
      objetivo.nivelContenido ===
        "B1"
  ) &&
    nivelesSeparados.objetivos.some(
      (objetivo) =>
        objetivo.objetivo ===
          "present-perfect" &&
        objetivo.nivelContenido ===
          "B2"
    )
);

// ======================================================
// 18. EVENTO DUPLICADO
// ======================================================

comprobar(
  "Rechaza eventoId duplicado global",
  rechaza(() =>
    construirEstadoAlumno([
      second1,
      {
        ...present1,
        eventoId:
          second1.eventoId,
      },
    ])
  )
);

// ======================================================
// 19. ACTIVIDAD DUPLICADA
// ======================================================

comprobar(
  "Rechaza actividadId duplicado global",
  rechaza(() =>
    construirEstadoAlumno([
      second1,
      {
        ...present1,
        actividadId:
          second1.actividadId,
      },
    ])
  )
);

// ======================================================
// RESUMEN
// ======================================================

console.log(
  "\n================================"
);

console.log(
  "INTERESTALK - TEST ESTADO ALUMNO V1"
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
  "\nESTADO DEL ALUMNO:"
);

console.log(
  "Eventos:",
  estado.totalEventos
);

console.log(
  "Objetivos:",
  estado.objetivosTrabajados
);

console.log(
  "Reforzar:",
  estado.estados.reforzar
);

console.log(
  "Practicar:",
  estado.estados.practicar
);

console.log(
  "Consolidar:",
  estado.estados.consolidar
);

console.log(
  "\nPRIORIDAD ACTUAL:"
);

if (
  estado.prioridadActual
) {
  console.log(
    "Competencia:",
    estado.prioridadActual
      .competencia
  );

  console.log(
    "Objetivo:",
    estado.prioridadActual
      .objetivo
  );

  console.log(
    "Nivel:",
    estado.prioridadActual
      .nivelContenido
  );

  console.log(
    "Resultado:",
    estado.prioridadActual
      .ultimoResultado +
      "%"
  );

  console.log(
    "Tendencia:",
    estado.prioridadActual
      .tendencia
  );

  console.log(
    "Prioridad:",
    estado.prioridadActual
      .prioridad
  );
} else {
  console.log(
    "Sin prioridad pendiente"
  );
}

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