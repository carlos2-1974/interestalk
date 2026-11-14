
import {
  crearSesionTemporal,
  consultarSesionTemporal,
  responderSesionTemporal,
  obtenerResultadoSesionTemporal,
} from "./sesiones";

import {
  corregirPreguntaV2,
} from "./preguntas-v2";

// ======================================================
// INTERESTALK - TEST INTEGRACION INFORME V1
// Verifica sesion -> correccion -> informe pedagogico
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

// Funcion exclusiva para pruebas.
// Encuentra una opcion correcta o incorrecta
// utilizando el corrector privado del servidor.
function respuestaSimulada(
  preguntaId: string,
  acertar: boolean
): number {
  for (let opcion = 0; opcion < 4; opcion++) {
    const evaluacion = corregirPreguntaV2(
      preguntaId,
      opcion
    );

    if (
      evaluacion &&
      evaluacion.correcta === acertar
    ) {
      return opcion;
    }
  }

  throw new Error(
    "No se encontro una respuesta simulada valida."
  );
}

// ======================================================
// CREAR UNA SESION REAL EN MEMORIA
// ======================================================

const inicio = crearSesionTemporal("en", "B1");

comprobar(
  "Crea una sesion de diagnostico",
  inicio.estado === "en_curso" &&
    inicio.pregunta !== null
);

// ======================================================
// COMPLETAR LA EVALUACION
// ======================================================

// Simulamos respuestas correctas e incorrectas
// para obtener un informe con informacion util.
const patronRespuestas = [
  true, true, false, true, false,
  false, true, true, false, true,
  true, false, true, false, true,
  false, true, true, false, true,
];

let sesion = consultarSesionTemporal(
  inicio.sesionId
);

let iteraciones = 0;

while (
  sesion.estado === "en_curso" &&
  sesion.pregunta !== null &&
  iteraciones < 25
) {
  const preguntaId = sesion.pregunta.id;

  const acertar =
    patronRespuestas[
      iteraciones % patronRespuestas.length
    ];

  sesion = responderSesionTemporal(
    inicio.sesionId,
    preguntaId,
    respuestaSimulada(preguntaId, acertar)
  );

  iteraciones++;
}

comprobar(
  "La evaluacion finaliza",
  sesion.estado !== "en_curso" &&
    sesion.pregunta === null
);

// ======================================================
// OBTENER RESULTADO FINAL
// ======================================================

const resultado = obtenerResultadoSesionTemporal(
  inicio.sesionId
);

const informe = resultado.informePedagogico;

// PRUEBA 3
comprobar(
  "El resultado incluye informe pedagogico",
  informe !== null &&
    typeof informe === "object"
);

// PRUEBA 4
comprobar(
  "Coincide el total de preguntas",
  informe.total === resultado.preguntasRespondidas
);

// PRUEBA 5
comprobar(
  "Coinciden los aciertos",
  informe.aciertos === resultado.aciertos
);

// PRUEBA 6
comprobar(
  "Coincide el porcentaje",
  informe.porcentaje === resultado.porcentaje
);

// PRUEBA 7
comprobar(
  "Las competencias suman el total",
  informe.competencias.reduce(
    (suma, item) => suma + item.total,
    0
  ) === informe.total
);

// PRUEBA 8
comprobar(
  "Los niveles suman el total",
  informe.niveles.reduce(
    (suma, item) => suma + item.total,
    0
  ) === informe.total
);

// PRUEBA 9
comprobar(
  "Los objetivos suman el total",
  informe.objetivos.reduce(
    (suma, item) => suma + item.total,
    0
  ) === informe.total
);

// PRUEBA 10
comprobar(
  "Las recomendaciones tienen prioridad valida",
  informe.recomendaciones.every(
    (item, indice) =>
      item.prioridad === indice + 1
  )
);

// PRUEBA 11
comprobar(
  "No devuelve certificacion MCER",
  informe.nivelMCERCertificado === false
);

// PRUEBA 12
comprobar(
  "El informe no contiene soluciones correctas",
  !JSON.stringify(informe).includes(
    "respuestaCorrecta"
  ) &&
    !JSON.stringify(informe).includes(
      "explicacion"
    )
);

// PRUEBA 13
comprobar(
  "Los errores generan recomendaciones",
  informe.errores === 0 ||
    informe.recomendaciones.length > 0
);

// PRUEBA 14
comprobar(
  "Las recomendaciones no superan cinco",
  informe.recomendaciones.length <= 5
);

// PRUEBA 15
comprobar(
  "El informe refleja la evaluacion finalizada",
  resultado.estado !== "en_curso" &&
    resultado.sesionId === inicio.sesionId
);

// ======================================================
// RESULTADO FINAL
// ======================================================

console.log("\n================================");
console.log("INTERESTALK - TEST INTEGRACION INFORME");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

console.log("\nRESUMEN DE LA EVALUACION:");
console.log("Estado:", resultado.estado);
console.log(
  "Preguntas:",
  resultado.preguntasRespondidas
);
console.log("Aciertos:", resultado.aciertos);
console.log("Porcentaje:", resultado.porcentaje + "%");
console.log(
  "Recomendaciones:",
  informe.recomendaciones.length
);

if (fallidas === 0) {
  console.log("\nTODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error(
    "\nSE HAN DETECTADO FALLOS DE INTEGRACION"
  );
  process.exitCode = 1;
}
