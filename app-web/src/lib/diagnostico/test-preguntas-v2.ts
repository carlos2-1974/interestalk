// =====================================================
// INTERESTALK - TEST BANCO DE PREGUNTAS V2
// Validacion estructural de 54 preguntas
// =====================================================

import {
  obtenerPreguntasV2,
  corregirPreguntaV2,
  obtenerEstadisticasBancoV2,
  NIVELES,
  type Competencia,
} from "./preguntas-v2";

let superadas = 0;
let fallidas = 0;

function comprobar(nombre: string, condicion: boolean) {
  if (condicion) {
    superadas++;
    console.log("CORRECTO - " + nombre);
  } else {
    fallidas++;
    console.error("ERROR - " + nombre);
  }
}

const competencias: Competencia[] = [
  "grammar",
  "vocabulary",
  "reading",
];

const preguntas = obtenerPreguntasV2("en");
const estadisticas = obtenerEstadisticasBancoV2();

// PRUEBA 1: Total de preguntas
comprobar(
  "El banco contiene 54 preguntas",
  preguntas.length === 54
);

// PRUEBA 2: Nueve preguntas por nivel
comprobar(
  "Cada nivel contiene 9 preguntas",
  NIVELES.every(
    (nivel) =>
      obtenerPreguntasV2("en", nivel).length === 9
  )
);

// PRUEBA 3: Tres preguntas por competencia y nivel
comprobar(
  "Cada nivel tiene 3 preguntas por competencia",
  NIVELES.every((nivel) =>
    competencias.every(
      (competencia) =>
        obtenerPreguntasV2(
          "en",
          nivel,
          competencia
        ).length === 3
    )
  )
);

// PRUEBA 4: Identificadores unicos
const ids = preguntas.map((pregunta) => pregunta.id);

comprobar(
  "Todos los identificadores son unicos",
  new Set(ids).size === preguntas.length
);

// PRUEBA 5: No se exponen soluciones
comprobar(
  "Las preguntas publicas no exponen soluciones",
  preguntas.every(
    (pregunta) =>
      !("respuestaCorrecta" in pregunta) &&
      !("explicacion" in pregunta)
  )
);

// PRUEBA 6: Todas tienen cuatro opciones
comprobar(
  "Todas las preguntas tienen cuatro opciones",
  preguntas.every(
    (pregunta) =>
      pregunta.opciones.length === 4 &&
      pregunta.opciones.every(
        (opcion) => opcion.trim().length > 0
      )
  )
);

// PRUEBA 7: Campos obligatorios
comprobar(
  "Todas las preguntas tienen datos completos",
  preguntas.every(
    (pregunta) =>
      pregunta.id.length > 0 &&
      pregunta.enunciado.trim().length > 0 &&
      pregunta.objetivo.trim().length > 0 &&
      pregunta.idioma === "en"
  )
);

// PRUEBA 8: Reading tiene contexto
comprobar(
  "Todas las preguntas Reading tienen contexto",
  preguntas
    .filter(
      (pregunta) =>
        pregunta.competencia === "reading"
    )
    .every(
      (pregunta) =>
        typeof pregunta.contexto === "string" &&
        pregunta.contexto.trim().length > 0
    )
);

// PRUEBA 9: Filtrado por nivel
comprobar(
  "El filtro B1 devuelve solo preguntas B1",
  obtenerPreguntasV2("en", "B1").every(
    (pregunta) => pregunta.nivel === "B1"
  )
);

// PRUEBA 10: Exclusion de preguntas usadas
const primeraPregunta = preguntas[0];

const filtradas = obtenerPreguntasV2(
  "en",
  undefined,
  undefined,
  [primeraPregunta.id]
);

comprobar(
  "El sistema excluye preguntas utilizadas",
  filtradas.length === 53 &&
    !filtradas.some(
      (pregunta) =>
        pregunta.id === primeraPregunta.id
    )
);

// PRUEBA 11: Idioma no disponible
comprobar(
  "No devuelve preguntas para idioma no disponible",
  obtenerPreguntasV2("fr").length === 0
);

// PRUEBA 12: Correccion de respuesta correcta
const correcta = corregirPreguntaV2(
  "en-a1-grammar-001",
  1
);

comprobar(
  "La correccion reconoce una respuesta correcta",
  correcta !== null &&
    correcta.correcta === true
);

// PRUEBA 13: Correccion de respuesta incorrecta
const incorrecta = corregirPreguntaV2(
  "en-a1-grammar-001",
  0
);

comprobar(
  "La correccion reconoce una respuesta incorrecta",
  incorrecta !== null &&
    incorrecta.correcta === false
);

// PRUEBA 14: Pregunta inexistente
comprobar(
  "La correccion rechaza preguntas inexistentes",
  corregirPreguntaV2("pregunta-inexistente", 0) === null
);

// PRUEBA 15: Estadisticas
comprobar(
  "Las estadisticas del banco son correctas",
  estadisticas.total === 54 &&
    estadisticas.idioma === "en" &&
    estadisticas.niveles.length === 6 &&
    estadisticas.niveles.every(
      (item) => item.total === 9
    )
);

// RESULTADO FINAL
console.log("\n================================");
console.log("INTERESTALK - TEST BANCO V2");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("TODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error("HAY PRUEBAS FALLIDAS");
  process.exitCode = 1;
}