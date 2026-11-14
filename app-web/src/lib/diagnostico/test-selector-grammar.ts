
import {
  seleccionarObjetivoGrammar,
} from "./selector-grammar";

import type {
  InformePedagogico,
  ResultadoObjetivo,
} from "./informe-pedagogico";

import type {
  NivelMCER,
  Competencia,
} from "./preguntas-v2";

// ======================================================
// INTERESTALK - TEST SELECTOR GRAMMAR V1
//
// Pruebas deterministas sin llamadas a Gemini.
// No modifica sesiones ni datos del alumno.
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

function crearObjetivo(
  objetivo: string,
  competencia: Competencia,
  nivel: NivelMCER,
  total: number,
  aciertos: number
): ResultadoObjetivo {
  return {
    objetivo,
    competencia,
    nivel,
    total,
    aciertos,
    errores: total - aciertos,
    porcentaje:
      total > 0
        ? Math.round((aciertos / total) * 100)
        : 0,
  };
}

function crearInforme(
  objetivos: ResultadoObjetivo[]
): InformePedagogico {
  const total = objetivos.reduce(
    (suma, item) => suma + item.total,
    0
  );

  const aciertos = objetivos.reduce(
    (suma, item) => suma + item.aciertos,
    0
  );

  return {
    total,
    aciertos,
    errores: total - aciertos,
    porcentaje:
      total > 0
        ? Math.round((aciertos / total) * 100)
        : 0,
    competencias: [],
    niveles: [],
    objetivos,
    recomendaciones: [],
    nivelMCERCertificado: false,
  };
}

// ======================================================
// PRUEBA 1 - PRIORIZA B1 FRENTE A C1
// ======================================================

const informe1 = crearInforme([
  crearObjetivo(
    "advanced-inversion", "grammar", "C1", 1, 0
  ),
  crearObjetivo(
    "second-conditional", "grammar", "B1", 1, 0
  ),
]);

const seleccion1 = seleccionarObjetivoGrammar(
  informe1,
  "B1"
);

comprobar(
  "Prioriza error B1 frente a C1",
  seleccion1?.objetivo === "second-conditional" &&
    seleccion1.tipo === "refuerzo"
);

// ======================================================
// PRUEBA 2 - PRIORIZA B1 FRENTE A A2
// ======================================================

const informe2 = crearInforme([
  crearObjetivo(
    "past-simple", "grammar", "A2", 1, 0
  ),
  crearObjetivo(
    "present-perfect", "grammar", "B1", 1, 0
  ),
]);

const seleccion2 = seleccionarObjetivoGrammar(
  informe2,
  "B1"
);

comprobar(
  "Prioriza B1 frente a A2",
  seleccion2?.objetivo === "present-perfect"
);

// ======================================================
// PRUEBA 3 - MAS ERRORES EN MISMO NIVEL
// ======================================================

const informe3 = crearInforme([
  crearObjetivo(
    "relative-clauses", "grammar", "B1", 3, 1
  ),
  crearObjetivo(
    "second-conditional", "grammar", "B1", 3, 0
  ),
]);

const seleccion3 = seleccionarObjetivoGrammar(
  informe3,
  "B1"
);

comprobar(
  "Prioriza mas errores dentro del mismo nivel",
  seleccion3?.objetivo === "second-conditional" &&
    seleccion3.evidencia.errores === 3
);

// ======================================================
// PRUEBA 4 - CONSOLIDACION
// ======================================================

const informe4 = crearInforme([
  crearObjetivo(
    "present-perfect", "grammar", "B1", 2, 2
  ),
  crearObjetivo(
    "past-simple", "grammar", "A2", 2, 2
  ),
]);

const seleccion4 = seleccionarObjetivoGrammar(
  informe4,
  "B1"
);

comprobar(
  "Propone consolidacion sin errores",
  seleccion4?.tipo === "consolidacion" &&
    seleccion4.objetivo === "present-perfect" &&
    seleccion4.evidencia.errores === 0
);

// ======================================================
// PRUEBA 5 - SIN GRAMMAR
// ======================================================

const informe5 = crearInforme([
  crearObjetivo(
    "remote-work", "reading", "B1", 2, 0
  ),
  crearObjetivo(
    "synonyms", "vocabulary", "B1", 2, 0
  ),
]);

comprobar(
  "Devuelve null si no hay Grammar",
  seleccionarObjetivoGrammar(
    informe5,
    "B1"
  ) === null
);

// ======================================================
// PRUEBA 6 - NIVEL INVALIDO
// ======================================================

let rechazaNivelInvalido = false;

try {
  seleccionarObjetivoGrammar(
    informe1,
    "B3" as NivelMCER
  );
} catch {
  rechazaNivelInvalido = true;
}

comprobar(
  "Rechaza niveles invalidos",
  rechazaNivelInvalido
);

// ======================================================
// PRUEBA 7 - IGNORA OTRAS COMPETENCIAS
// ======================================================

const informe7 = crearInforme([
  crearObjetivo(
    "critical-reading", "reading", "B1", 5, 0
  ),
  crearObjetivo(
    "synonyms", "vocabulary", "B1", 5, 0
  ),
  crearObjetivo(
    "second-conditional", "grammar", "B1", 1, 0
  ),
]);

const seleccion7 = seleccionarObjetivoGrammar(
  informe7,
  "B1"
);

comprobar(
  "Reading y Vocabulary no alteran Grammar",
  seleccion7?.objetivo === "second-conditional" &&
    seleccion7.competencia === "grammar"
);

// ======================================================
// PRUEBA 8 - RESULTADO DETERMINISTA
// ======================================================

const primeraSeleccion = seleccionarObjetivoGrammar(
  informe3,
  "B1"
);

const segundaSeleccion = seleccionarObjetivoGrammar(
  informe3,
  "B1"
);

comprobar(
  "El mismo informe produce la misma seleccion",
  JSON.stringify(primeraSeleccion) ===
    JSON.stringify(segundaSeleccion)
);

// ======================================================
// PRUEBA 9 - NO MODIFICA EL INFORME
// ======================================================

const informeOriginal = crearInforme([
  crearObjetivo(
    "past-simple", "grammar", "A2", 1, 0
  ),
  crearObjetivo(
    "second-conditional", "grammar", "B1", 1, 0
  ),
]);

const copiaOriginal = JSON.stringify(informeOriginal);

seleccionarObjetivoGrammar(
  informeOriginal,
  "B1"
);

comprobar(
  "No modifica los datos originales",
  JSON.stringify(informeOriginal) === copiaOriginal
);

// ======================================================
// PRUEBA 10 - SIN OBJETIVOS
// ======================================================

comprobar(
  "Gestiona un informe sin objetivos",
  seleccionarObjetivoGrammar(
    crearInforme([]),
    "B1"
  ) === null
);

// ======================================================
// PRUEBA 11 - EVIDENCIA CORRECTA
// ======================================================

comprobar(
  "Conserva los datos de evidencia",
  seleccion3?.evidencia.preguntas === 3 &&
    seleccion3.evidencia.aciertos === 0 &&
    seleccion3.evidencia.errores === 3 &&
    seleccion3.evidencia.porcentaje === 0
);

// ======================================================
// PRUEBA 12 - OBJETIVO DE NIVEL INFERIOR
// ======================================================

const informe12 = crearInforme([
  crearObjetivo(
    "past-simple", "grammar", "A2", 2, 0
  ),
  crearObjetivo(
    "advanced-inversion", "grammar", "C1", 2, 0
  ),
]);

const seleccion12 = seleccionarObjetivoGrammar(
  informe12,
  "B1"
);

comprobar(
  "Prioriza nivel inferior frente a superior",
  seleccion12?.objetivo === "past-simple"
);

// ======================================================
// RESULTADO FINAL
// ======================================================

console.log("\n================================");
console.log("INTERESTALK - TEST SELECTOR GRAMMAR");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("\nTODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error(
    "\nSE HAN DETECTADO FALLOS EN EL SELECTOR"
  );
  process.exitCode = 1;
}
