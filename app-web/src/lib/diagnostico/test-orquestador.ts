// =====================================================
// INTERESTALK - TEST ORQUESTADOR ADAPTATIVO V1
// Pruebas funcionales con el banco de 54 preguntas
// =====================================================

import {
  crearSesionDiagnostico,
  iniciarSesionDiagnostico,
  seleccionarSiguientePregunta,
  procesarRespuestaDiagnostico,
  type SesionDiagnostico,
} from "./orquestador";

import {
  obtenerPreguntasV2,
  corregirPreguntaV2,
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

// Obtener una respuesta para simular un acierto o error.
// Esta funcion es exclusiva del archivo de pruebas.
function respuestaDePrueba(
  preguntaId: string,
  acertar: boolean
): number {
  for (let opcion = 0; opcion < 4; opcion++) {
    const resultado = corregirPreguntaV2(
      preguntaId,
      opcion
    );

    if (resultado && resultado.correcta === acertar) {
      return opcion;
    }
  }

  throw new Error(
    "No se encontro una respuesta de prueba valida."
  );
}

// =====================================================
// PRUEBA 1 - CREAR SESION B1
// =====================================================

const inicial = iniciarSesionDiagnostico(
  "en",
  "B1"
);

comprobar(
  "Inicia sesion en B1",
  inicial.sesion.estado.nivelActual === "B1" &&
    inicial.pregunta !== null &&
    inicial.pregunta.nivel === "B1"
);

// =====================================================
// PRUEBA 2 - PRIMERA PREGUNTA SIN SOLUCIONES
// =====================================================

comprobar(
  "No expone soluciones en la primera pregunta",
  inicial.pregunta !== null &&
    !("respuestaCorrecta" in inicial.pregunta) &&
    !("explicacion" in inicial.pregunta)
);

// =====================================================
// PRUEBA 3 - PRIMERA PREGUNTA REGISTRADA
// =====================================================

comprobar(
  "Registra la primera pregunta utilizada",
  inicial.pregunta !== null &&
    inicial.sesion.preguntaActualId ===
      inicial.pregunta.id &&
    inicial.sesion.preguntasUsadas.includes(
      inicial.pregunta.id
    )
);

// =====================================================
// PRUEBA 4 - RESPUESTA CORRECTA
// =====================================================

if (!inicial.pregunta) {
  throw new Error("No existe pregunta inicial.");
}

const paso1 = procesarRespuestaDiagnostico(
  inicial.sesion,
  respuestaDePrueba(inicial.pregunta.id, true)
);

comprobar(
  "Procesa una respuesta correcta",
  paso1.respuestaCorrecta === true &&
    paso1.sesion.historial.length === 1
);

// =====================================================
// PRUEBA 5 - EVITAR REPETICIONES
// =====================================================

comprobar(
  "No repite la primera pregunta",
  paso1.siguientePregunta !== null &&
    paso1.siguientePregunta.id !==
      inicial.pregunta.id
);

// =====================================================
// PRUEBA 6 - ALTERNAR COMPETENCIAS
// =====================================================

const competenciasVistas = new Set<string>();

let sesion: SesionDiagnostico = inicial.sesion;

for (let i = 0; i < 3; i++) {
  const preguntaId = sesion.preguntaActualId;

  if (!preguntaId) break;

  const pregunta = obtenerPreguntasV2(
    "en"
  ).find((p) => p.id === preguntaId);

  if (!pregunta) break;

  competenciasVistas.add(pregunta.competencia);

  const resultado = procesarRespuestaDiagnostico(
    sesion,
    respuestaDePrueba(preguntaId, i === 0)
  );

  sesion = resultado.sesion;
}

comprobar(
  "Evalua las tres competencias iniciales",
  competenciasVistas.has("grammar") &&
    competenciasVistas.has("vocabulary") &&
    competenciasVistas.has("reading")
);

// =====================================================
// PRUEBA 7 - TRES ACIERTOS SUBEN DE B1 A B2
// =====================================================

let sesionAciertos = iniciarSesionDiagnostico(
  "en",
  "B1"
).sesion;

for (let i = 0; i < 3; i++) {
  const id = sesionAciertos.preguntaActualId;

  if (!id) break;

  const paso = procesarRespuestaDiagnostico(
    sesionAciertos,
    respuestaDePrueba(id, true)
  );

  sesionAciertos = paso.sesion;
}

comprobar(
  "Tres aciertos suben la dificultad a B2",
  sesionAciertos.estado.nivelActual === "B2" &&
    sesionAciertos.estado.cambiosRealizados === 1
);

// =====================================================
// PRUEBA 8 - DOS ERRORES BAJAN DE B1 A A2
// =====================================================

let sesionErrores = iniciarSesionDiagnostico(
  "en",
  "B1"
).sesion;

for (let i = 0; i < 2; i++) {
  const id = sesionErrores.preguntaActualId;

  if (!id) break;

  const paso = procesarRespuestaDiagnostico(
    sesionErrores,
    respuestaDePrueba(id, false)
  );

  sesionErrores = paso.sesion;
}

comprobar(
  "Dos errores bajan la dificultad a A2",
  sesionErrores.estado.nivelActual === "A2" &&
    sesionErrores.estado.cambiosRealizados === 1
);

// =====================================================
// PRUEBA 9 - NO REPETIR PREGUNTAS EN UNA SESION
// =====================================================

let sesionCompleta = iniciarSesionDiagnostico(
  "en",
  "B1"
).sesion;

let iteraciones = 0;

while (
  !sesionCompleta.finalizada &&
  iteraciones < 60
) {
  const id = sesionCompleta.preguntaActualId;

  if (!id) break;

  const paso = procesarRespuestaDiagnostico(
    sesionCompleta,
    respuestaDePrueba(id, true)
  );

  sesionCompleta = paso.sesion;
  iteraciones++;
}

const idsUsados = sesionCompleta.preguntasUsadas;

comprobar(
  "No repite preguntas durante la sesion",
  new Set(idsUsados).size === idsUsados.length
);

// =====================================================
// PRUEBA 10 - FINALIZAR AL AGOTAR PREGUNTAS
// =====================================================

comprobar(
  "Finaliza cuando no hay mas preguntas disponibles",
  sesionCompleta.finalizada &&
    sesionCompleta.preguntaActualId === null &&
    iteraciones <= 54
);

// =====================================================
// PRUEBA 11 - RECHAZAR RESPUESTAS INVALIDAS
// =====================================================

let rechazaInvalida = false;

try {
  procesarRespuestaDiagnostico(
    inicial.sesion,
    99
  );
} catch {
  rechazaInvalida = true;
}

comprobar(
  "Rechaza respuestas fuera de rango",
  rechazaInvalida
);

// =====================================================
// PRUEBA 12 - SESION FINALIZADA
// =====================================================

let rechazaFinalizada = false;

try {
  procesarRespuestaDiagnostico(
    sesionCompleta,
    0
  );
} catch {
  rechazaFinalizada = true;
}

comprobar(
  "No permite responder una sesion finalizada",
  rechazaFinalizada
);

// =====================================================
// PRUEBA 13 - NIVEL SIN PREGUNTAS DISPONIBLES
// =====================================================

const sesionAgotada = crearSesionDiagnostico(
  "en",
  "B1"
);

sesionAgotada.preguntasUsadas = obtenerPreguntasV2(
  "en",
  "B1"
).map((p) => p.id);

comprobar(
  "No reutiliza preguntas de un nivel agotado",
  seleccionarSiguientePregunta(
    sesionAgotada
  ) === null
);

// =====================================================
// RESULTADO FINAL
// =====================================================

console.log("\n================================");
console.log("INTERESTALK - TEST ORQUESTADOR V1");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("TODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error("HAY PRUEBAS FALLIDAS");
  process.exitCode = 1;
}