// =====================================================
// INTERESTALK - TEST ORQUESTADOR ADAPTATIVO V2
// Version corregida - 16 pruebas funcionales
// =====================================================

import {
  crearSesionV2,
  iniciarDiagnosticoV2,
  seleccionarPreguntaV2,
  procesarRespuestaV2,
  resumirSesionV2,
  type SesionDiagnosticoV2,
} from "./orquestador-v2";

import {
  obtenerPreguntasV2,
  corregirPreguntaV2,
} from "./preguntas-v2";

import {
  CONFIG_DIAGNOSTICO,
} from "./configuracion";

import type {
  NivelMCERAdaptativo,
} from "./adaptativo";

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

// Buscar una respuesta correcta o incorrecta
// exclusivamente para las pruebas.
function respuestaSimulada(
  id: string,
  acertar: boolean
): number {
  for (let opcion = 0; opcion < 4; opcion++) {
    const evaluacion = corregirPreguntaV2(
      id,
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
    "No se encontro respuesta simulada."
  );
}

// Ejecutar una secuencia de respuestas.
// El tipo explicito evita el error TS2322.
function simular(
  nivelInicial: NivelMCERAdaptativo,
  resultados: boolean[]
): SesionDiagnosticoV2 {
  let sesion: SesionDiagnosticoV2 =
    iniciarDiagnosticoV2(
      "en",
      nivelInicial
    ).sesion;

  for (const acertar of resultados) {
    if (
      sesion.estadoFinal !== "en_curso" ||
      !sesion.preguntaActualId
    ) {
      break;
    }

    const paso = procesarRespuestaV2(
      sesion,
      respuestaSimulada(
        sesion.preguntaActualId,
        acertar
      )
    );

    sesion = paso.sesion;
  }

  return sesion;
}

// PRUEBA 1
const inicio = iniciarDiagnosticoV2("en", "B1");

comprobar(
  "Inicia correctamente en B1",
  inicio.sesion.estado.nivelActual === "B1" &&
    inicio.pregunta !== null &&
    inicio.pregunta.nivel === "B1"
);

// PRUEBA 2
comprobar(
  "No expone soluciones",
  inicio.pregunta !== null &&
    !("respuestaCorrecta" in inicio.pregunta) &&
    !("explicacion" in inicio.pregunta)
);

// PRUEBA 3
comprobar(
  "Registra la primera pregunta",
  inicio.pregunta !== null &&
    inicio.sesion.preguntaActualId ===
      inicio.pregunta.id &&
    inicio.sesion.preguntasUsadas.includes(
      inicio.pregunta.id
    )
);

// PRUEBA 4
const subida = simular(
  "B1",
  [true, true, true]
);

comprobar(
  "Tres aciertos suben de B1 a B2",
  subida.estado.nivelActual === "B2" &&
    subida.estado.cambiosRealizados === 1
);

// PRUEBA 5
const bajada = simular(
  "B1",
  [false, false]
);

comprobar(
  "Dos errores bajan de B1 a A2",
  bajada.estado.nivelActual === "A2" &&
    bajada.estado.cambiosRealizados === 1
);

// PRUEBA 6
const sesionLarga = simular(
  "B1",
  Array(30).fill(true)
);

const ids = sesionLarga.preguntasUsadas;

comprobar(
  "No repite preguntas",
  new Set(ids).size === ids.length
);

// PRUEBA 7
comprobar(
  "No supera el maximo de preguntas",
  sesionLarga.historial.length <=
    CONFIG_DIAGNOSTICO.maxPreguntas
);

// PRUEBA 8
const totalCompetencias =
  sesionLarga.conteos.grammar +
  sesionLarga.conteos.vocabulary +
  sesionLarga.conteos.reading;

comprobar(
  "Conteos coinciden con respuestas",
  totalCompetencias ===
    sesionLarga.historial.length
);

// PRUEBA 9
const resumen = resumirSesionV2(
  sesionLarga
);

comprobar(
  "Resumen refleja las respuestas",
  resumen.preguntasRespondidas ===
    sesionLarga.historial.length &&
    resumen.aciertos ===
      sesionLarga.historial.length &&
    resumen.porcentaje === 100
);

// PRUEBA 10
let rechazaInvalida = false;

try {
  procesarRespuestaV2(inicio.sesion, 99);
} catch {
  rechazaInvalida = true;
}

comprobar(
  "Rechaza respuestas invalidas",
  rechazaInvalida
);

// PRUEBA 11
let rechazaIdioma = false;

try {
  crearSesionV2("fr", "B1");
} catch {
  rechazaIdioma = true;
}

comprobar(
  "Rechaza idiomas sin banco",
  rechazaIdioma
);

// PRUEBA 12
const agotada = crearSesionV2(
  "en",
  "B1"
);

agotada.preguntasUsadas =
  obtenerPreguntasV2("en", "B1").map(
    (p) => p.id
  );

comprobar(
  "No reutiliza preguntas agotadas",
  seleccionarPreguntaV2(agotada) === null
);

// PRUEBA 13
const coberturaDeclarada =
  sesionLarga.estadoFinal === "completado";

const coberturaReal =
  sesionLarga.conteos.grammar >= 5 &&
  sesionLarga.conteos.vocabulary >= 5 &&
  sesionLarga.conteos.reading >= 5 &&
  sesionLarga.historial.length >= 15;

comprobar(
  "No declara completado sin cobertura",
  !coberturaDeclarada || coberturaReal
);

// PRUEBA 14
let rechazaFinalizada = false;

if (sesionLarga.estadoFinal !== "en_curso") {
  try {
    procesarRespuestaV2(
      sesionLarga,
      0
    );
  } catch {
    rechazaFinalizada = true;
  }
}

comprobar(
  "No acepta respuestas tras finalizar",
  sesionLarga.estadoFinal === "en_curso" ||
    rechazaFinalizada
);

// PRUEBA 15
const regreso = simular(
  "B1",
  [true, true, true, false, false, true]
);

comprobar(
  "No reutiliza aciertos antiguos al volver a B1",
  regreso.estado.nivelActual === "B1" &&
    regreso.estado.cambiosRealizados === 2
);

// PRUEBA 16
const cuatroAciertos = simular(
  "B1",
  [true, true, true, true]
);

comprobar(
  "Cuarto acierto no provoca otra subida",
  cuatroAciertos.estado.nivelActual === "B2" &&
    cuatroAciertos.estado.cambiosRealizados === 1
);

// RESULTADO FINAL
console.log("\n================================");
console.log("INTERESTALK - TEST ORQUESTADOR V2");
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