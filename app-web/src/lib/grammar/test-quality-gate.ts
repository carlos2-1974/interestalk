import {
  evaluarQualityGateGrammar,
} from "./quality-gate";

import type {
  ActividadGrammarCompleta,
  SolicitudGrammarV2,
} from "./tipos";

// ======================================================
// INTERESTALK - GRAMMAR V2
// TEST QUALITY GATE PEDAGOGICO V1
//
// Comprueba:
// - aprobacion de actividad correcta;
// - bloqueos objetivos;
// - advertencias pedagogicas;
// - una advertencia no bloquea;
// - multiples incidencias pueden coexistir.
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
    console.log("CORRECTO - " + nombre);
  } else {
    fallidas++;
    console.error("ERROR - " + nombre);
  }
}

function clonar<T>(valor: T): T {
  return JSON.parse(
    JSON.stringify(valor)
  ) as T;
}

function tieneCodigo(
  resultado: ReturnType<
    typeof evaluarQualityGateGrammar
  >,
  codigo: string
): boolean {
  return resultado.incidencias.some(
    (incidencia) =>
      incidencia.codigo === codigo
  );
}

// ======================================================
// SOLICITUD PEDAGOGICA
// ======================================================

const solicitud: SolicitudGrammarV2 = {
  contexto: {
    idiomaApoyo: "es",
    idiomaAprendizaje: "en",
    nivelDeclarado: "B1",
    objetivoPersonal:
      "Conversar con fluidez",
    intereses: [
      "Deporte",
      "Tecnologia",
      "Viajes",
    ],
    interesPrincipal: "Deporte",
  },

  necesidad: {
    objetivo: "present-perfect",
    nivel: "B1",
    tipo: "refuerzo",

    evidencia: {
      preguntas: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },

    motivo:
      "Se han observado errores en este objetivo.",
  },
};

// ======================================================
// ACTIVIDAD CORRECTA
// ======================================================

const actividadValida: ActividadGrammarCompleta = {
  publica: {
    version: 1,

    actividadId:
      "quality-gate-test-001",

    objetivoGrammar:
      "present-perfect",

    nivelContenido:
      "B1",

    tipoActividad:
      "refuerzo",

    titulo:
      "Present perfect through Deporte",

    introduccion:
      "Practica el present perfect con situaciones deportivas.",

    explicacion:
      "El present perfect permite hablar de experiencias " +
      "y resultados relacionados con el presente.",

    regla:
      "Subject + have/has + past participle.",

    ejemplos: [
      "I have played tennis many times.",
      "She has won three matches this season.",
      "Have you ever visited Wembley Stadium?",
    ],

    erroresFrecuentes: [
      "Olvidar have o has.",
      "Utilizar el infinitivo en lugar del participio.",
    ],

    ejercicios: [
      {
        id: "e1",
        tipo: "opcion_multiple",
        enunciado:
          "Choose the correct sentence about Deporte.",
        opciones: [
          "I have played tennis many times.",
          "I has played tennis many times.",
          "I have play tennis many times.",
        ],
      },

      {
        id: "e2",
        tipo: "completar",
        enunciado:
          "Complete: She ___ (win) three matches.",
        opciones: null,
      },

      {
        id: "e3",
        tipo: "opcion_multiple",
        enunciado:
          "Choose the correct question.",
        opciones: [
          "Have you ever played rugby?",
          "Has you ever played rugby?",
          "Did you ever played rugby?",
        ],
      },

      {
        id: "e4",
        tipo: "completar",
        enunciado:
          "Complete: We ___ (train) hard this week.",
        opciones: null,
      },

      {
        id: "e5",
        tipo: "transformar",
        enunciado:
          "Transforma en present perfect: " +
          "I visit the stadium.",
        opciones: null,
      },
    ],

    aplicacionPractica:
      "Escribe tres frases sobre experiencias de Deporte " +
      "utilizando el present perfect.",
  },

  privada: {
    actividadId:
      "quality-gate-test-001",

    soluciones: [
      {
        ejercicioId: "e1",
        respuestaCorrecta:
          "I have played tennis many times.",
        explicacion:
          "Con I utilizamos have seguido del participio played.",
      },

      {
        ejercicioId: "e2",
        respuestaCorrecta:
          "has won",
        explicacion:
          "Con she utilizamos has y el participio irregular won.",
      },

      {
        ejercicioId: "e3",
        respuestaCorrecta:
          "Have you ever played rugby?",
        explicacion:
          "La pregunta utiliza Have + subject + past participle.",
      },

      {
        ejercicioId: "e4",
        respuestaCorrecta:
          "have trained",
        explicacion:
          "Con we utilizamos have seguido de trained.",
      },

      {
        ejercicioId: "e5",
        respuestaCorrecta:
          "I have visited the stadium.",
        explicacion:
          "La transformacion utiliza have + participio visited.",
      },
    ],
  },

  origenPedagogico: {
    objetivo:
      "present-perfect",

    nivel:
      "B1",

    tipo:
      "refuerzo",

    evidencia: {
      preguntas: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },

    motivo:
      "Se han observado errores en este objetivo.",
  },
};

// ======================================================
// 1. ACTIVIDAD CORRECTA
// ======================================================

const correcta =
  evaluarQualityGateGrammar(
    actividadValida,
    solicitud
  );

comprobar(
  "Aprueba actividad correcta",
  correcta.aprobado
);

comprobar(
  "Actividad correcta sin bloqueantes",
  correcta.bloqueantes === 0
);

// ======================================================
// 2. OBJETIVO ALTERADO
// ======================================================

const objetivoAlterado =
  clonar(actividadValida);

objetivoAlterado.publica.objetivoGrammar =
  "past-simple";

const resultadoObjetivo =
  evaluarQualityGateGrammar(
    objetivoAlterado,
    solicitud
  );

comprobar(
  "Bloquea objetivo alterado",
  !resultadoObjetivo.aprobado &&
    tieneCodigo(
      resultadoObjetivo,
      "QG-001"
    )
);

// ======================================================
// 3. NIVEL ALTERADO
// ======================================================

const nivelAlterado =
  clonar(actividadValida);

nivelAlterado.publica.nivelContenido =
  "B2";

const resultadoNivel =
  evaluarQualityGateGrammar(
    nivelAlterado,
    solicitud
  );

comprobar(
  "Bloquea nivel alterado",
  !resultadoNivel.aprobado &&
    tieneCodigo(
      resultadoNivel,
      "QG-002"
    )
);

// ======================================================
// 4. TIPO ALTERADO
// ======================================================

const tipoAlterado =
  clonar(actividadValida);

tipoAlterado.publica.tipoActividad =
  "consolidacion";

const resultadoTipo =
  evaluarQualityGateGrammar(
    tipoAlterado,
    solicitud
  );

comprobar(
  "Bloquea tipo alterado",
  !resultadoTipo.aprobado &&
    tieneCodigo(
      resultadoTipo,
      "QG-003"
    )
);

// ======================================================
// 5. OPCIONES DUPLICADAS
// ======================================================

const opcionesDuplicadas =
  clonar(actividadValida);

opcionesDuplicadas.publica.ejercicios[0]
  .opciones = [
    "I have played tennis many times.",
    "I have played tennis many times.",
    "I have play tennis many times.",
  ];

const resultadoOpciones =
  evaluarQualityGateGrammar(
    opcionesDuplicadas,
    solicitud
  );

comprobar(
  "Bloquea opciones duplicadas",
  !resultadoOpciones.aprobado &&
    tieneCodigo(
      resultadoOpciones,
      "QG-009"
    )
);

// ======================================================
// 6. RESPUESTA FUERA DE OPCIONES
// ======================================================

const respuestaFuera =
  clonar(actividadValida);

respuestaFuera.privada.soluciones[0]
  .respuestaCorrecta =
  "I played tennis yesterday.";

const resultadoRespuesta =
  evaluarQualityGateGrammar(
    respuestaFuera,
    solicitud
  );

comprobar(
  "Bloquea respuesta fuera de opciones",
  !resultadoRespuesta.aprobado &&
    tieneCodigo(
      resultadoRespuesta,
      "QG-010"
    )
);

// ======================================================
// 7. COMPLETAR SIN HUECO
// ======================================================

const completarSinHueco =
  clonar(actividadValida);

completarSinHueco.publica.ejercicios[1]
  .enunciado =
  "Complete the sentence using the present perfect.";

const resultadoHueco =
  evaluarQualityGateGrammar(
    completarSinHueco,
    solicitud
  );

comprobar(
  "Detecta completar sin hueco",
  tieneCodigo(
    resultadoHueco,
    "QG-011"
  )
);

comprobar(
  "Advertencia de hueco no bloquea",
  resultadoHueco.aprobado &&
    resultadoHueco.bloqueantes === 0 &&
    resultadoHueco.advertencias >= 1
);

// ======================================================
// 8. TRANSFORMACION SIN INSTRUCCION
// ======================================================

const transformarSinInstruccion =
  clonar(actividadValida);

transformarSinInstruccion.publica
  .ejercicios[4].enunciado =
  "I visit the stadium.";

const resultadoTransformacion =
  evaluarQualityGateGrammar(
    transformarSinInstruccion,
    solicitud
  );

comprobar(
  "Detecta transformacion poco clara",
  tieneCodigo(
    resultadoTransformacion,
    "QG-014"
  )
);

comprobar(
  "Advertencia de transformacion no bloquea",
  resultadoTransformacion.aprobado
);

// ======================================================
// 9. SIN PERSONALIZACION LITERAL
// ======================================================

const sinPersonalizacion =
  clonar(actividadValida);

sinPersonalizacion.publica.titulo =
  "Present perfect practice";

sinPersonalizacion.publica.introduccion =
  "Practica el uso del present perfect.";

sinPersonalizacion.publica.explicacion =
  "El present perfect conecta pasado y presente.";

sinPersonalizacion.publica.aplicacionPractica =
  "Escribe tres frases utilizando el present perfect.";

sinPersonalizacion.publica.ejemplos = [
  "I have finished my work.",
  "She has visited London.",
];

sinPersonalizacion.publica.ejercicios =
  sinPersonalizacion.publica.ejercicios.map(
    (ejercicio, indice) => ({
      ...ejercicio,
      enunciado:
        indice === 4
          ? "Transforma en present perfect: I visit London."
          : ejercicio.tipo === "completar"
            ? "Complete: She ___ (finish) the task."
            : "Choose the correct present perfect sentence.",
    })
  );

const resultadoPersonalizacion =
  evaluarQualityGateGrammar(
    sinPersonalizacion,
    solicitud
  );

comprobar(
  "Detecta ausencia de personalizacion",
  tieneCodigo(
    resultadoPersonalizacion,
    "QG-017"
  )
);

comprobar(
  "Ausencia literal de interes es advertencia",
  resultadoPersonalizacion.aprobado
);

// ======================================================
// 10. EXPLICACION DE SOLUCION DEMASIADO BREVE
// ======================================================

const explicacionBreve =
  clonar(actividadValida);

explicacionBreve.privada.soluciones[0]
  .explicacion = "Correcto.";

const resultadoExplicacion =
  evaluarQualityGateGrammar(
    explicacionBreve,
    solicitud
  );

comprobar(
  "Detecta explicacion demasiado breve",
  tieneCodigo(
    resultadoExplicacion,
    "QG-016"
  )
);

comprobar(
  "Explicacion breve genera advertencia",
  resultadoExplicacion.aprobado
);

// ======================================================
// 11. MULTIPLES INCIDENCIAS
// ======================================================

const multiplesFallos =
  clonar(actividadValida);

multiplesFallos.publica.objetivoGrammar =
  "past-simple";

multiplesFallos.publica.nivelContenido =
  "B2";

multiplesFallos.publica.ejercicios[0]
  .opciones = [
    "Same option",
    "Same option",
  ];

const resultadoMultiple =
  evaluarQualityGateGrammar(
    multiplesFallos,
    solicitud
  );

comprobar(
  "Acumula multiples incidencias",
  resultadoMultiple.incidencias.length >= 3
);

comprobar(
  "Multiples bloqueantes rechazan actividad",
  !resultadoMultiple.aprobado &&
    resultadoMultiple.bloqueantes >= 3
);

// ======================================================
// RESUMEN
// ======================================================

console.log("\n================================");
console.log(
  "INTERESTALK - TEST QUALITY GATE GRAMMAR"
);
console.log("================================");

console.log(
  "Pruebas superadas:",
  superadas
);

console.log(
  "Pruebas fallidas:",
  fallidas
);

console.log(
  "\nActividad correcta:"
);

console.log(
  "Aprobada:",
  correcta.aprobado
);

console.log(
  "Bloqueantes:",
  correcta.bloqueantes
);

console.log(
  "Advertencias:",
  correcta.advertencias
);

console.log(
  "\nEjemplo con multiples fallos:"
);

console.log(
  "Aprobada:",
  resultadoMultiple.aprobado
);

console.log(
  "Bloqueantes:",
  resultadoMultiple.bloqueantes
);

console.log(
  "Advertencias:",
  resultadoMultiple.advertencias
);

console.log(
  "Codigos:",
  resultadoMultiple.incidencias
    .map(
      (incidencia) =>
        incidencia.codigo
    )
    .join(", ")
);

if (fallidas === 0) {
  console.log(
    "\nTODAS LAS PRUEBAS SUPERADAS"
  );
} else {
  console.error(
    "\nSE HAN DETECTADO FALLOS"
  );

  process.exitCode = 1;
}