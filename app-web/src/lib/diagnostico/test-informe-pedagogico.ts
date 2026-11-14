
import {
  generarInformePedagogico,
} from "./informe-pedagogico";

import type {
  RespuestaEvaluada,
} from "./adaptativo";

// ======================================================
// INTERESTALK - TEST INFORME PEDAGOGICO V1
// 15 pruebas funcionales y de consistencia
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

function obtenerCompetencia(
  informe: ReturnType<typeof generarInformePedagogico>,
  competencia: "grammar" | "vocabulary" | "reading"
) {
  return informe.competencias.find(
    (item) => item.competencia === competencia
  );
}

// Historial simulado con preguntas existentes
// en el banco V2.
//
// Grammar: 2 aciertos de 3.
// Vocabulary: 0 aciertos de 2.
// Reading: 1 acierto de 1.
//
// Total: 3 aciertos de 6 = 50 %.

const historial: RespuestaEvaluada[] = [
  {
    preguntaId: "en-b1-grammar-001",
    nivel: "B1",
    correcta: true,
  },
  {
    preguntaId: "en-b1-grammar-002",
    nivel: "B1",
    correcta: false,
  },
  {
    preguntaId: "en-b1-grammar-003",
    nivel: "B1",
    correcta: true,
  },
  {
    preguntaId: "en-b1-vocabulary-001",
    nivel: "B1",
    correcta: false,
  },
  {
    preguntaId: "en-b1-vocabulary-002",
    nivel: "B1",
    correcta: false,
  },
  {
    preguntaId: "en-b1-reading-001",
    nivel: "B1",
    correcta: true,
  },
];

const informe = generarInformePedagogico(
  "en",
  historial
);

// PRUEBA 1
comprobar(
  "Calcula el total de preguntas",
  informe.total === 6
);

// PRUEBA 2
comprobar(
  "Calcula los aciertos",
  informe.aciertos === 3
);

// PRUEBA 3
comprobar(
  "Calcula los errores",
  informe.errores === 3
);

// PRUEBA 4
comprobar(
  "Calcula el porcentaje global",
  informe.porcentaje === 50
);

// PRUEBA 5
const grammar = obtenerCompetencia(
  informe,
  "grammar"
);

comprobar(
  "Calcula Grammar 2/3",
  grammar?.total === 3 &&
    grammar.aciertos === 2 &&
    grammar.errores === 1 &&
    grammar.porcentaje === 67
);

// PRUEBA 6
const vocabulary = obtenerCompetencia(
  informe,
  "vocabulary"
);

comprobar(
  "Calcula Vocabulary 0/2",
  vocabulary?.total === 2 &&
    vocabulary.aciertos === 0 &&
    vocabulary.errores === 2 &&
    vocabulary.porcentaje === 0
);

// PRUEBA 7
const reading = obtenerCompetencia(
  informe,
  "reading"
);

comprobar(
  "Calcula Reading 1/1",
  reading?.total === 1 &&
    reading.aciertos === 1 &&
    reading.errores === 0 &&
    reading.porcentaje === 100
);

// PRUEBA 8
const nivelB1 = informe.niveles.find(
  (item) => item.nivel === "B1"
);

comprobar(
  "Agrupa correctamente el nivel B1",
  nivelB1?.total === 6 &&
    nivelB1.aciertos === 3 &&
    nivelB1.porcentaje === 50
);

// PRUEBA 9
comprobar(
  "No atribuye preguntas a niveles no evaluados",
  informe.niveles
    .filter((item) => item.nivel !== "B1")
    .every(
      (item) =>
        item.total === 0 &&
        item.aciertos === 0 &&
        item.errores === 0
    )
);

// PRUEBA 10
comprobar(
  "Identifica los objetivos linguisticos",
  informe.objetivos.length === 6 &&
    informe.objetivos.every(
      (item) => item.objetivo.length > 0
    )
);

// PRUEBA 11
comprobar(
  "Detecta tres objetivos con errores",
  informe.objetivos.filter(
    (item) => item.errores > 0
  ).length === 3
);

// PRUEBA 12
comprobar(
  "Genera tres recomendaciones de refuerzo",
  informe.recomendaciones.length === 3
);

// PRUEBA 13
comprobar(
  "Las recomendaciones tienen prioridades consecutivas",
  informe.recomendaciones.every(
    (item, indice) =>
      item.prioridad === indice + 1
  )
);

// PRUEBA 14
const informeVacio = generarInformePedagogico(
  "en",
  []
);

comprobar(
  "Gestiona un historial vacio",
  informeVacio.total === 0 &&
    informeVacio.aciertos === 0 &&
    informeVacio.porcentaje === 0 &&
    informeVacio.recomendaciones.length === 0
);

// PRUEBA 15
let rechazaDesconocida = false;

try {
  generarInformePedagogico("en", [
    {
      preguntaId: "pregunta-inexistente",
      nivel: "B1",
      correcta: true,
    },
  ]);
} catch {
  rechazaDesconocida = true;
}

comprobar(
  "Rechaza preguntas inexistentes",
  rechazaDesconocida
);

// COMPROBACIONES ADICIONALES DE CONSISTENCIA
comprobar(
  "La suma de competencias coincide con el total",
  informe.competencias.reduce(
    (suma, item) => suma + item.total,
    0
  ) === informe.total
);

comprobar(
  "La suma de niveles coincide con el total",
  informe.niveles.reduce(
    (suma, item) => suma + item.total,
    0
  ) === informe.total
);

comprobar(
  "No presenta certificacion MCER",
  informe.nivelMCERCertificado === false
);

// RESULTADO FINAL
console.log("\n================================");
console.log("INTERESTALK - TEST INFORME PEDAGOGICO");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("TODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error(
    "SE HAN DETECTADO FALLOS EN EL INFORME"
  );
  process.exitCode = 1;
}
