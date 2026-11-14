import {
  corregirActividadGrammar,
  type RespuestaAlumnoGrammar,
} from "./correccion";

import type {
  ActividadGrammarCompleta,
} from "./tipos";

// ======================================================
// INTERESTALK - GRAMMAR V2
// TEST MOTOR DE CORRECCION V1
//
// Comprueba:
// - 5/5 -> consolidar
// - 4/5 -> consolidar
// - 3/5 -> practicar
// - 2/5 -> reforzar
// - 0/5 -> reforzar
// - normalizacion basica
// - respuestas duplicadas
// - respuestas incompletas
// - IDs inexistentes
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
// ACTIVIDAD DE REFERENCIA
// ======================================================

const actividad: ActividadGrammarCompleta = {
  publica: {
    version: 1,

    actividadId:
      "grammar-correccion-test-001",

    objetivoGrammar:
      "present-perfect",

    nivelContenido:
      "B1",

    tipoActividad:
      "refuerzo",

    titulo:
      "Present perfect and sport",

    introduccion:
      "Practica el present perfect con deporte.",

    explicacion:
      "Usamos el present perfect para experiencias " +
      "y situaciones conectadas con el presente.",

    regla:
      "Subject + have/has + past participle.",

    ejemplos: [
      "I have played tennis many times.",
      "She has won three matches.",
    ],

    erroresFrecuentes: [
      "Olvidar have o has.",
    ],

    ejercicios: [
      {
        id: "e1",
        tipo: "opcion_multiple",
        enunciado:
          "Choose the correct sentence.",
        opciones: [
          "I have played tennis.",
          "I has played tennis.",
          "I have play tennis.",
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
          "Complete: We ___ (train) hard.",
        opciones: null,
      },

      {
        id: "e5",
        tipo: "transformar",
        enunciado:
          "Transforma a negativo: " +
          "He has played basketball.",
        opciones: null,
      },
    ],

    aplicacionPractica:
      "Escribe tres experiencias deportivas.",
  },

  privada: {
    actividadId:
      "grammar-correccion-test-001",

    soluciones: [
      {
        ejercicioId: "e1",
        respuestaCorrecta:
          "I have played tennis.",
        explicacion:
          "Con I utilizamos have + played.",
      },

      {
        ejercicioId: "e2",
        respuestaCorrecta:
          "has won",
        explicacion:
          "Con she utilizamos has + won.",
      },

      {
        ejercicioId: "e3",
        respuestaCorrecta:
          "Have you ever played rugby?",
        explicacion:
          "La pregunta empieza con Have.",
      },

      {
        ejercicioId: "e4",
        respuestaCorrecta:
          "have trained",
        explicacion:
          "Con we utilizamos have + trained.",
      },

      {
        ejercicioId: "e5",
        respuestaCorrecta:
          "He has not played basketball.",
        explicacion:
          "La negativa utiliza has not.",
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
      "Se han observado errores.",
  },
};

// ======================================================
// UTILIDAD PARA CREAR RESPUESTAS
// ======================================================

const correctas = [
  "I have played tennis.",
  "has won",
  "Have you ever played rugby?",
  "have trained",
  "He has not played basketball.",
];

const incorrectas = [
  "I has played tennis.",
  "have win",
  "Did you ever played rugby?",
  "has trained",
  "He not has played basketball.",
];

function crearRespuestas(
  numeroAciertos: number
): RespuestaAlumnoGrammar[] {
  return actividad.publica.ejercicios.map(
    (ejercicio, indice) => ({
      ejercicioId:
        ejercicio.id,

      respuesta:
        indice < numeroAciertos
          ? correctas[indice]
          : incorrectas[indice],
    })
  );
}

// ======================================================
// 1. CINCO DE CINCO
// ======================================================

const resultado5 =
  corregirActividadGrammar(
    actividad,
    crearRespuestas(5)
  );

comprobar(
  "5/5 produce 100%",
  resultado5.aciertos === 5 &&
    resultado5.errores === 0 &&
    resultado5.porcentaje === 100
);

comprobar(
  "5/5 produce consolidar",
  resultado5.estadoAprendizaje ===
    "consolidar"
);

comprobar(
  "5/5 no necesita refuerzo",
  resultado5.necesitaRefuerzo === false
);

// ======================================================
// 2. CUATRO DE CINCO
// ======================================================

const resultado4 =
  corregirActividadGrammar(
    actividad,
    crearRespuestas(4)
  );

comprobar(
  "4/5 produce 80%",
  resultado4.aciertos === 4 &&
    resultado4.errores === 1 &&
    resultado4.porcentaje === 80
);

comprobar(
  "4/5 produce consolidar",
  resultado4.estadoAprendizaje ===
    "consolidar"
);

comprobar(
  "4/5 no necesita refuerzo",
  resultado4.necesitaRefuerzo === false
);

// ======================================================
// 3. TRES DE CINCO
// ======================================================

const resultado3 =
  corregirActividadGrammar(
    actividad,
    crearRespuestas(3)
  );

comprobar(
  "3/5 produce 60%",
  resultado3.aciertos === 3 &&
    resultado3.errores === 2 &&
    resultado3.porcentaje === 60
);

comprobar(
  "3/5 produce practicar",
  resultado3.estadoAprendizaje ===
    "practicar"
);

comprobar(
  "3/5 necesita refuerzo",
  resultado3.necesitaRefuerzo === true
);

// ======================================================
// 4. DOS DE CINCO
// ======================================================

const resultado2 =
  corregirActividadGrammar(
    actividad,
    crearRespuestas(2)
  );

comprobar(
  "2/5 produce 40%",
  resultado2.aciertos === 2 &&
    resultado2.errores === 3 &&
    resultado2.porcentaje === 40
);

comprobar(
  "2/5 produce reforzar",
  resultado2.estadoAprendizaje ===
    "reforzar"
);

comprobar(
  "2/5 necesita refuerzo",
  resultado2.necesitaRefuerzo === true
);

// ======================================================
// 5. CERO DE CINCO
// ======================================================

const resultado0 =
  corregirActividadGrammar(
    actividad,
    crearRespuestas(0)
  );

comprobar(
  "0/5 produce 0%",
  resultado0.aciertos === 0 &&
    resultado0.errores === 5 &&
    resultado0.porcentaje === 0
);

comprobar(
  "0/5 produce reforzar",
  resultado0.estadoAprendizaje ===
    "reforzar"
);

comprobar(
  "0/5 necesita refuerzo",
  resultado0.necesitaRefuerzo === true
);

// ======================================================
// 6. NORMALIZACION
// ======================================================

const respuestasNormalizadas =
  crearRespuestas(5);

respuestasNormalizadas[0].respuesta =
  "   I HAVE PLAYED   TENNIS.   ";

respuestasNormalizadas[1].respuesta =
  " HAS WON ";

const resultadoNormalizacion =
  corregirActividadGrammar(
    actividad,
    respuestasNormalizadas
  );

comprobar(
  "Ignora mayusculas y espacios repetidos",
  resultadoNormalizacion.aciertos === 5
);

// ======================================================
// 7. CONSERVA IDENTIDAD
// ======================================================

comprobar(
  "Conserva actividadId",
  resultado5.actividadId ===
    actividad.publica.actividadId
);

comprobar(
  "Conserva objetivo Grammar",
  resultado5.objetivoGrammar ===
    "present-perfect"
);

comprobar(
  "Conserva nivel",
  resultado5.nivelContenido === "B1"
);

comprobar(
  "Conserva tipo de actividad",
  resultado5.tipoActividad === "refuerzo"
);

// ======================================================
// 8. DETALLE DE RESULTADOS
// ======================================================

comprobar(
  "Devuelve cinco resultados individuales",
  resultado3.resultados.length === 5
);

comprobar(
  "Cada resultado conserva explicacion",
  resultado3.resultados.every(
    (resultado) =>
      resultado.explicacion.trim().length > 0
  )
);

comprobar(
  "Cada resultado conserva respuesta correcta",
  resultado3.resultados.every(
    (resultado) =>
      resultado.respuestaCorrecta
        .trim()
        .length > 0
  )
);

// ======================================================
// 9. RESPUESTAS DUPLICADAS
// ======================================================

const duplicadas =
  crearRespuestas(5);

duplicadas[1].ejercicioId =
  duplicadas[0].ejercicioId;

comprobar(
  "Rechaza respuestas duplicadas",
  rechaza(() =>
    corregirActividadGrammar(
      actividad,
      duplicadas
    )
  )
);

// ======================================================
// 10. RESPUESTAS INCOMPLETAS
// ======================================================

const incompletas =
  crearRespuestas(5).slice(0, 4);

comprobar(
  "Rechaza respuestas incompletas",
  rechaza(() =>
    corregirActividadGrammar(
      actividad,
      incompletas
    )
  )
);

// ======================================================
// 11. ID INEXISTENTE
// ======================================================

const idInexistente =
  crearRespuestas(5);

idInexistente[4].ejercicioId =
  "ejercicio-inexistente";

comprobar(
  "Rechaza ID de ejercicio inexistente",
  rechaza(() =>
    corregirActividadGrammar(
      actividad,
      idInexistente
    )
  )
);

// ======================================================
// 12. RESPUESTA VACIA
//
// Una respuesta vacia es una respuesta valida
// estructuralmente, pero debe contar como error.
// ======================================================

const respuestaVacia =
  crearRespuestas(5);

respuestaVacia[0].respuesta = "   ";

const resultadoVacio =
  corregirActividadGrammar(
    actividad,
    respuestaVacia
  );

comprobar(
  "Respuesta vacia cuenta como error",
  resultadoVacio.aciertos === 4 &&
    resultadoVacio.errores === 1
);

// ======================================================
// 13. FECHA DE FINALIZACION
// ======================================================

comprobar(
  "Genera fecha de finalizacion valida",
  !Number.isNaN(
    new Date(
      resultado5.completadoEn
    ).getTime()
  )
);

// ======================================================
// RESUMEN
// ======================================================

console.log("\n================================");
console.log(
  "INTERESTALK - TEST CORRECCION GRAMMAR V2"
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
  "\nMATRIZ DE PROGRESO:"
);

console.log(
  "5/5:",
  resultado5.porcentaje + "%",
  "->",
  resultado5.estadoAprendizaje
);

console.log(
  "4/5:",
  resultado4.porcentaje + "%",
  "->",
  resultado4.estadoAprendizaje
);

console.log(
  "3/5:",
  resultado3.porcentaje + "%",
  "->",
  resultado3.estadoAprendizaje
);

console.log(
  "2/5:",
  resultado2.porcentaje + "%",
  "->",
  resultado2.estadoAprendizaje
);

console.log(
  "0/5:",
  resultado0.porcentaje + "%",
  "->",
  resultado0.estadoAprendizaje
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