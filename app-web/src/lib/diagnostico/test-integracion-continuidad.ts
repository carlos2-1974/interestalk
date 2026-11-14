import {
  crearSesionTemporal,
  responderSesionTemporal,
  obtenerResultadoSesionTemporal,
} from "./sesiones";

import {
  obtenerContinuidadPedagogica,
  obtenerEstadisticasContinuidad,
  eliminarContinuidadPedagogica,
} from "./continuidad-pedagogica";

// ======================================================
// INTERESTALK - TEST INTEGRACION CONTINUIDAD V1
//
// Comprueba el recorrido real:
// sesion -> diagnostico -> informe -> perfil
// -> continuidad pedagogica.
//
// No accede a soluciones privadas.
// No modifica el motor adaptativo.
// No llama a Gemini.
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

// ======================================================
// 1. CREAR SESION REAL
// ======================================================

let sesion = crearSesionTemporal("en", "B1");

comprobar(
  "Crea sesion real",
  sesion.estado === "en_curso" &&
    sesion.pregunta !== null
);

// ======================================================
// 2. COMPLETAR DIAGNOSTICO
// ======================================================

let iteraciones = 0;
let respuestasValidas = true;

const preguntasUsadas = new Set<string>();

while (
  sesion.estado === "en_curso" &&
  sesion.pregunta !== null &&
  iteraciones < 30
) {
  const pregunta = sesion.pregunta;

  preguntasUsadas.add(pregunta.id);

  const respuesta = iteraciones % 4;

  if (
    !Number.isInteger(respuesta) ||
    respuesta < 0 ||
    respuesta >= pregunta.opciones.length
  ) {
    respuestasValidas = false;
    break;
  }

  sesion = responderSesionTemporal(
    sesion.sesionId,
    pregunta.id,
    respuesta
  );

  iteraciones++;
}

comprobar(
  "Utiliza respuestas validas",
  respuestasValidas
);

comprobar(
  "Finaliza el diagnostico",
  sesion.estado !== "en_curso"
);

comprobar(
  "Respeta el maximo de preguntas",
  sesion.preguntasRespondidas <=
    sesion.maxPreguntas
);

if (sesion.estado === "en_curso") {
  throw new Error(
    "La evaluacion no ha finalizado."
  );
}

// ======================================================
// 3. OBTENER RESULTADO Y CREAR CONTINUIDAD
// ======================================================

const estadisticasAntes =
  obtenerEstadisticasContinuidad();

const resultado =
  obtenerResultadoSesionTemporal(
    sesion.sesionId
  );

comprobar(
  "Genera continuidad pedagogica",
  Boolean(
    resultado.continuidad.continuidadId
  )
);

comprobar(
  "La continuidad tiene fecha de caducidad",
  Boolean(resultado.continuidad.expiraEn)
);

const estadisticasDespues =
  obtenerEstadisticasContinuidad();

comprobar(
  "Crea un unico registro de continuidad",
  estadisticasDespues.perfilesActivos ===
    estadisticasAntes.perfilesActivos + 1
);

// ======================================================
// 4. RECUPERAR PERFIL DESDE CONTINUIDAD
// ======================================================

const perfilRecuperado =
  obtenerContinuidadPedagogica(
    resultado.continuidad.continuidadId
  );

comprobar(
  "Recupera el perfil desde continuidad",
  perfilRecuperado !== null &&
    perfilRecuperado !== undefined
);

comprobar(
  "Conserva el nivel declarado",
  perfilRecuperado.nivelDeclarado ===
    resultado.perfilPedagogico.nivelDeclarado
);

comprobar(
  "Conserva el idioma evaluado",
  perfilRecuperado.idiomaEvaluado ===
    resultado.perfilPedagogico.idiomaEvaluado
);

comprobar(
  "Conserva el resultado general",
  JSON.stringify(
    perfilRecuperado.resultadoGeneral
  ) ===
    JSON.stringify(
      resultado.perfilPedagogico.resultadoGeneral
    )
);

comprobar(
  "Conserva las competencias",
  JSON.stringify(
    perfilRecuperado.competencias
  ) ===
    JSON.stringify(
      resultado.perfilPedagogico.competencias
    )
);

comprobar(
  "Conserva la seleccion Grammar",
  JSON.stringify(perfilRecuperado.grammar) ===
    JSON.stringify(
      resultado.perfilPedagogico.grammar
    )
);

// ======================================================
// 5. COMPROBAR IDEMPOTENCIA
// ======================================================

const segundoResultado =
  obtenerResultadoSesionTemporal(
    sesion.sesionId
  );

comprobar(
  "Reutiliza el mismo continuidadId",
  segundoResultado.continuidad.continuidadId ===
    resultado.continuidad.continuidadId
);

const estadisticasSegundaConsulta =
  obtenerEstadisticasContinuidad();

comprobar(
  "No duplica el perfil al consultar de nuevo",
  estadisticasSegundaConsulta.perfilesActivos ===
    estadisticasDespues.perfilesActivos
);

// ======================================================
// 6. SEGURIDAD DEL PERFIL RECUPERADO
// ======================================================

const perfilTexto =
  JSON.stringify(perfilRecuperado);

comprobar(
  "No expone respuestas correctas",
  !perfilTexto.includes(
    "respuestaCorrecta"
  )
);

comprobar(
  "No expone enunciados ni opciones",
  !perfilTexto.includes('"enunciado"') &&
    !perfilTexto.includes('"opciones"')
);

// ======================================================
// 7. LIMPIEZA DEL TEST
// ======================================================

const eliminado =
  eliminarContinuidadPedagogica(
    resultado.continuidad.continuidadId
  );

comprobar(
  "Elimina la continuidad de prueba",
  eliminado === true
);

const estadisticasFinales =
  obtenerEstadisticasContinuidad();

comprobar(
  "Restaura el numero inicial de perfiles",
  estadisticasFinales.perfilesActivos ===
    estadisticasAntes.perfilesActivos
);

// ======================================================
// RESUMEN
// ======================================================

console.log("\n================================");
console.log(
  "INTERESTALK - TEST INTEGRACION CONTINUIDAD"
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

console.log("\nRESUMEN:");
console.log(
  "Estado diagnostico:",
  resultado.estado
);
console.log(
  "Preguntas:",
  resultado.preguntasRespondidas
);
console.log(
  "Nivel declarado:",
  resultado.perfilPedagogico.nivelDeclarado
);
console.log(
  "Objetivo Grammar:",
  resultado.perfilPedagogico.grammar?.objetivo ??
    "Sin objetivo"
);
console.log(
  "Continuidad ID:",
  resultado.continuidad.continuidadId
);
console.log(
  "Caduca:",
  resultado.continuidad.expiraEn
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