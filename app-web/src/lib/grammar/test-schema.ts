import {
  validarActividadGrammar,
} from "./schema";

// ======================================================
// INTERESTALK - GRAMMAR V2
// TEST SCHEMA V1
//
// Comprueba:
// - actividad valida
// - numero exacto de ejercicios
// - IDs unicos
// - correspondencia ejercicio / solucion
// - coherencia publico / privado
// - opcion multiple con respuesta valida
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

function acepta(valor: unknown): boolean {
  try {
    validarActividadGrammar(valor);
    return true;
  } catch {
    return false;
  }
}

function rechaza(valor: unknown): boolean {
  return !acepta(valor);
}

function clonar<T>(valor: T): T {
  return JSON.parse(
    JSON.stringify(valor)
  ) as T;
}

// ======================================================
// ACTIVIDAD VALIDA DE REFERENCIA
// ======================================================

const actividadValida = {
  publica: {
    version: 1,
    actividadId: "grammar-test-001",

    objetivoGrammar: "present-perfect",
    nivelContenido: "B1",
    tipoActividad: "refuerzo",

    titulo:
      "Talking about sports experiences",

    introduccion:
      "Practica el present perfect hablando " +
      "sobre experiencias relacionadas con el deporte.",

    explicacion:
      "Usamos el present perfect para hablar " +
      "de experiencias pasadas cuando el momento " +
      "exacto no es lo importante.",

    regla:
      "Subject + have/has + past participle.",

    ejemplos: [
      "I have played tennis many times.",
      "She has never run a marathon.",
      "Have you ever watched a live NBA game?",
    ],

    erroresFrecuentes: [
      "Usar el pasado simple cuando no se indica " +
        "un momento pasado concreto.",
      "Olvidar have o has antes del participio.",
    ],

    ejercicios: [
      {
        id: "e1",
        tipo: "opcion_multiple",
        enunciado:
          "Choose the correct sentence.",
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
          "Complete: She ___ never ___ a marathon.",
        opciones: null,
      },
      {
        id: "e3",
        tipo: "transformar",
        enunciado:
          "Transform using the present perfect: " +
          "I visit Wembley Stadium.",
        opciones: null,
      },
      {
        id: "e4",
        tipo: "opcion_multiple",
        enunciado:
          "Choose the correct question.",
        opciones: [
          "Have you ever played rugby?",
          "Did you ever played rugby?",
          "Has you ever played rugby?",
        ],
      },
      {
        id: "e5",
        tipo: "completar",
        enunciado:
          "Complete: We ___ already ___ the match.",
        opciones: null,
      },
    ],

    aplicacionPractica:
      "Escribe tres frases sobre experiencias " +
      "deportivas reales o imaginarias utilizando " +
      "el present perfect.",
  },

  privada: {
    actividadId: "grammar-test-001",

    soluciones: [
      {
        ejercicioId: "e1",
        respuestaCorrecta:
          "I have played tennis many times.",
        explicacion:
          "Con I utilizamos have y el participio played.",
      },
      {
        ejercicioId: "e2",
        respuestaCorrecta:
          "has / run",
        explicacion:
          "Con she usamos has y el participio de run es run.",
      },
      {
        ejercicioId: "e3",
        respuestaCorrecta:
          "I have visited Wembley Stadium.",
        explicacion:
          "El present perfect utiliza have + visited.",
      },
      {
        ejercicioId: "e4",
        respuestaCorrecta:
          "Have you ever played rugby?",
        explicacion:
          "La pregunta se forma con Have + subject + participle.",
      },
      {
        ejercicioId: "e5",
        respuestaCorrecta:
          "have / watched",
        explicacion:
          "Con we utilizamos have + past participle.",
      },
    ],
  },

  origenPedagogico: {
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
      "Se han observado errores en este objetivo. " +
      "Se propone una actividad de refuerzo.",
  },
};

// ======================================================
// 1. ACTIVIDAD CORRECTA
// ======================================================

comprobar(
  "Acepta una actividad Grammar valida",
  acepta(actividadValida)
);

const validada =
  validarActividadGrammar(
    actividadValida
  );

comprobar(
  "Conserva el actividadId",
  validada.publica.actividadId ===
    "grammar-test-001"
);

comprobar(
  "Conserva el objetivo pedagogico",
  validada.publica.objetivoGrammar ===
    "present-perfect"
);

comprobar(
  "Conserva exactamente cinco ejercicios",
  validada.publica.ejercicios.length === 5
);

comprobar(
  "Conserva exactamente cinco soluciones",
  validada.privada.soluciones.length === 5
);

// ======================================================
// 2. NUMERO INCORRECTO DE EJERCICIOS
// ======================================================

const cuatroEjercicios =
  clonar(actividadValida);

cuatroEjercicios.publica.ejercicios.pop();
cuatroEjercicios.privada.soluciones.pop();

comprobar(
  "Rechaza actividad con cuatro ejercicios",
  rechaza(cuatroEjercicios)
);

// ======================================================
// 3. IDS DE EJERCICIOS DUPLICADOS
// ======================================================

const ejerciciosDuplicados =
  clonar(actividadValida);

ejerciciosDuplicados.publica.ejercicios[1].id =
  "e1";

comprobar(
  "Rechaza IDs de ejercicios duplicados",
  rechaza(ejerciciosDuplicados)
);

// ======================================================
// 4. IDS DE SOLUCIONES DUPLICADOS
// ======================================================

const solucionesDuplicadas =
  clonar(actividadValida);

solucionesDuplicadas.privada.soluciones[1]
  .ejercicioId = "e1";

comprobar(
  "Rechaza IDs de soluciones duplicados",
  rechaza(solucionesDuplicadas)
);

// ======================================================
// 5. SOLUCION SIN EJERCICIO
// ======================================================

const solucionInexistente =
  clonar(actividadValida);

solucionInexistente.privada.soluciones[4]
  .ejercicioId = "e99";

comprobar(
  "Rechaza solucion sin ejercicio correspondiente",
  rechaza(solucionInexistente)
);

// ======================================================
// 6. ACTIVIDAD ID INCOHERENTE
// ======================================================

const idActividadIncorrecto =
  clonar(actividadValida);

idActividadIncorrecto.privada.actividadId =
  "otro-id";

comprobar(
  "Rechaza actividadId publico y privado distintos",
  rechaza(idActividadIncorrecto)
);

// ======================================================
// 7. OBJETIVO PEDAGOGICO INCOHERENTE
// ======================================================

const objetivoIncorrecto =
  clonar(actividadValida);

objetivoIncorrecto.publica.objetivoGrammar =
  "past-simple";

comprobar(
  "Rechaza objetivo distinto al origen pedagogico",
  rechaza(objetivoIncorrecto)
);

// ======================================================
// 8. NIVEL INCOHERENTE
// ======================================================

const nivelIncorrecto =
  clonar(actividadValida);

nivelIncorrecto.publica.nivelContenido =
  "B2";

comprobar(
  "Rechaza nivel distinto al origen pedagogico",
  rechaza(nivelIncorrecto)
);

// ======================================================
// 9. TIPO DE ACTIVIDAD INCOHERENTE
// ======================================================

const tipoIncorrecto =
  clonar(actividadValida);

tipoIncorrecto.publica.tipoActividad =
  "consolidacion";

comprobar(
  "Rechaza tipo distinto al origen pedagogico",
  rechaza(tipoIncorrecto)
);

// ======================================================
// 10. OPCION MULTIPLE SIN OPCIONES
// ======================================================

const sinOpciones =
  clonar(actividadValida);

sinOpciones.publica.ejercicios[0].opciones =
  null;

comprobar(
  "Rechaza opcion multiple sin opciones",
  rechaza(sinOpciones)
);

// ======================================================
// 11. COMPLETAR CON OPCIONES
// ======================================================

const completarConOpciones =
  clonar(actividadValida);

completarConOpciones.publica.ejercicios[1]
  .opciones = [
    "has / run",
    "have / ran",
  ];

comprobar(
  "Rechaza completar con opciones",
  rechaza(completarConOpciones)
);

// ======================================================
// 12. RESPUESTA DE OPCION MULTIPLE NO EXISTE
// ======================================================

const respuestaFueraOpciones =
  clonar(actividadValida);

respuestaFueraOpciones.privada.soluciones[0]
  .respuestaCorrecta =
  "I played tennis yesterday.";

comprobar(
  "Rechaza respuesta correcta fuera de opciones",
  rechaza(respuestaFueraOpciones)
);

// ======================================================
// 13. EVIDENCIA INCOHERENTE
// ======================================================

const evidenciaIncorrecta =
  clonar(actividadValida);

evidenciaIncorrecta.origenPedagogico.evidencia =
  {
    preguntas: 2,
    aciertos: 2,
    errores: 1,
    porcentaje: 100,
  };

comprobar(
  "Rechaza conteos de evidencia incoherentes",
  rechaza(evidenciaIncorrecta)
);

// ======================================================
// 14. PORCENTAJE FUERA DE RANGO
// ======================================================

const porcentajeIncorrecto =
  clonar(actividadValida);

porcentajeIncorrecto.origenPedagogico.evidencia
  .porcentaje = 120;

comprobar(
  "Rechaza porcentaje fuera de rango",
  rechaza(porcentajeIncorrecto)
);

// ======================================================
// 15. VERSION INCORRECTA
// ======================================================

const versionIncorrecta =
  clonar(actividadValida);

versionIncorrecta.publica.version = 2;

comprobar(
  "Rechaza version de actividad incorrecta",
  rechaza(versionIncorrecta)
);

// ======================================================
// RESUMEN
// ======================================================

console.log("\n================================");
console.log(
  "INTERESTALK - TEST SCHEMA GRAMMAR V2"
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

console.log("\nACTIVIDAD DE REFERENCIA:");
console.log(
  "Objetivo:",
  validada.publica.objetivoGrammar
);
console.log(
  "Nivel:",
  validada.publica.nivelContenido
);
console.log(
  "Tipo:",
  validada.publica.tipoActividad
);
console.log(
  "Ejercicios:",
  validada.publica.ejercicios.length
);
console.log(
  "Soluciones privadas:",
  validada.privada.soluciones.length
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