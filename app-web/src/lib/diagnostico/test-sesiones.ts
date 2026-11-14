// =====================================================
// INTERESTALK - TEST GESTOR DE SESIONES V1
// 12 pruebas funcionales de sesiones temporales
// =====================================================

import {
  crearSesionTemporal,
  consultarSesionTemporal,
  responderSesionTemporal,
  obtenerResultadoSesionTemporal,
  obtenerEstadisticasSesiones,
} from "./sesiones";

import {
  corregirPreguntaV2,
} from "./preguntas-v2";

let superadas = 0;
let fallidas = 0;

function comprobar(
  nombre: string,
  condicion: boolean
) {
  if (condicion) {
    superadas++;
    console.log("CORRECTO - " + nombre);
  } else {
    fallidas++;
    console.error("ERROR - " + nombre);
  }
}

function debeFallar(
  nombre: string,
  accion: () => unknown
) {
  let fallo = false;

  try {
    accion();
  } catch {
    fallo = true;
  }

  comprobar(nombre, fallo);
}

// Funcion exclusiva para pruebas.
// Busca una opcion correcta o incorrecta.
function respuestaSimulada(
  preguntaId: string,
  acertar: boolean
): number {
  for (let opcion = 0; opcion < 4; opcion++) {
    const resultado = corregirPreguntaV2(
      preguntaId,
      opcion
    );

    if (
      resultado &&
      resultado.correcta === acertar
    ) {
      return opcion;
    }
  }

  throw new Error(
    "No se encontro respuesta simulada."
  );
}

// =====================================================
// PRUEBA 1 - CREAR SESIONES DIFERENTES
// =====================================================

const alumnoA = crearSesionTemporal("en", "B1");
const alumnoB = crearSesionTemporal("en", "A2");

comprobar(
  "Crea identificadores de sesion diferentes",
  alumnoA.sesionId !== alumnoB.sesionId
);

// =====================================================
// PRUEBA 2 - PREGUNTAS SEGUN NIVEL
// =====================================================

comprobar(
  "Cada alumno comienza en su nivel",
  alumnoA.pregunta?.nivel === "B1" &&
    alumnoB.pregunta?.nivel === "A2"
);

// =====================================================
// PRUEBA 3 - CONSULTAR SESION
// =====================================================

const consultaA = consultarSesionTemporal(
  alumnoA.sesionId
);

comprobar(
  "Recupera la pregunta activa",
  consultaA.pregunta?.id === alumnoA.pregunta?.id &&
    consultaA.estado === "en_curso"
);

// =====================================================
// PRUEBA 4 - NO EXPONER SOLUCIONES
// =====================================================

comprobar(
  "La sesion publica no expone soluciones",
  alumnoA.pregunta !== null &&
    !("respuestaCorrecta" in alumnoA.pregunta) &&
    !("explicacion" in alumnoA.pregunta)
);

// =====================================================
// PRUEBA 5 - RESPONDER Y AVANZAR
// =====================================================

if (!alumnoA.pregunta) {
  throw new Error("Alumno A sin pregunta inicial.");
}

const primeraPreguntaA = alumnoA.pregunta.id;

const avanceA = responderSesionTemporal(
  alumnoA.sesionId,
  primeraPreguntaA,
  respuestaSimulada(primeraPreguntaA, true)
);

comprobar(
  "Procesa respuesta y avanza",
  avanceA.preguntasRespondidas === 1 &&
    avanceA.pregunta?.id !== primeraPreguntaA
);

// =====================================================
// PRUEBA 6 - SESIONES INDEPENDIENTES
// =====================================================

const consultaB = consultarSesionTemporal(
  alumnoB.sesionId
);

comprobar(
  "La respuesta de A no modifica la sesion B",
  consultaB.preguntasRespondidas === 0 &&
    consultaB.pregunta?.id === alumnoB.pregunta?.id
);

// =====================================================
// PRUEBA 7 - RECHAZAR RESPUESTA DUPLICADA
// =====================================================

debeFallar(
  "Rechaza responder dos veces la misma pregunta",
  () =>
    responderSesionTemporal(
      alumnoA.sesionId,
      primeraPreguntaA,
      0
    )
);

// =====================================================
// PRUEBA 8 - RECHAZAR RESPUESTA INVALIDA
// =====================================================

if (!avanceA.pregunta) {
  throw new Error("No existe segunda pregunta.");
}

debeFallar(
  "Rechaza respuestas fuera de rango",
  () =>
    responderSesionTemporal(
      alumnoA.sesionId,
      avanceA.pregunta!.id,
      99
    )
);

// =====================================================
// PRUEBA 9 - SESION INEXISTENTE
// =====================================================

debeFallar(
  "Rechaza identificadores inexistentes",
  () =>
    consultarSesionTemporal(
      "sesion-que-no-existe"
    )
);

// =====================================================
// PRUEBA 10 - RESULTADO PREMATURO
// =====================================================

debeFallar(
  "No entrega resultados antes de finalizar",
  () =>
    obtenerResultadoSesionTemporal(
      alumnoA.sesionId
    )
);

// =====================================================
// PRUEBA 11 - FINALIZAR EVALUACION
// =====================================================

// Se responde correctamente hasta que el
// orquestador finalice o se alcance un limite
// preventivo de iteraciones.

let sesionActual = consultarSesionTemporal(
  alumnoA.sesionId
);

let iteraciones = 0;

while (
  sesionActual.estado === "en_curso" &&
  sesionActual.pregunta &&
  iteraciones < 30
) {
  const id = sesionActual.pregunta.id;

  sesionActual = responderSesionTemporal(
    alumnoA.sesionId,
    id,
    respuestaSimulada(id, true)
  );

  iteraciones++;
}

let resultadoFinal:
  ReturnType<typeof obtenerResultadoSesionTemporal> | null =
  null;

try {
  resultadoFinal = obtenerResultadoSesionTemporal(
    alumnoA.sesionId
  );
} catch {
  resultadoFinal = null;
}

comprobar(
  "Finaliza y permite consultar resultados",
  sesionActual.estado !== "en_curso" &&
    resultadoFinal !== null &&
    resultadoFinal.preguntasRespondidas ===
      sesionActual.preguntasRespondidas
);

// =====================================================
// PRUEBA 12 - ESTADISTICAS DEL GESTOR
// =====================================================

const estadisticas = obtenerEstadisticasSesiones();

comprobar(
  "El gestor informa limites y duracion",
  estadisticas.sesionesActivas >= 2 &&
    estadisticas.limiteSesiones === 100 &&
    estadisticas.duracionMinutos === 30
);

// =====================================================
// RESULTADO FINAL
// =====================================================

console.log("\n================================");
console.log("INTERESTALK - TEST SESIONES V1");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("TODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error(
    "SE HAN DETECTADO FALLOS QUE DEBEN CORREGIRSE"
  );
  process.exitCode = 1;
}