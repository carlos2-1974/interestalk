
import {
  crearSesionTemporal,
  responderSesionTemporal,
  obtenerResultadoSesionTemporal,
} from "./sesiones";

import {
  seleccionarObjetivoGrammar,
} from "./selector-grammar";

// ======================================================
// INTERESTALK - TEST INTEGRACION PERFIL V1.1
//
// Utiliza el gestor real y el banco existente.
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

function porcentaje(
  aciertos: number,
  total: number
): number {
  return total > 0
    ? Math.round((aciertos / total) * 100)
    : 0;
}

// ======================================================
// 1. CREAR SESION
// ======================================================

let sesion = crearSesionTemporal("en", "B1");

comprobar(
  "Crea sesion inicial en B1",
  sesion.estado === "en_curso" &&
    sesion.preguntasRespondidas === 0
);

comprobar(
  "La pregunta publica no expone soluciones",
  sesion.pregunta !== null &&
    !("respuestaCorrecta" in sesion.pregunta) &&
    !("explicacion" in sesion.pregunta)
);

// ======================================================
// 2. COMPLETAR EVALUACION
// ======================================================

// Usamos exclusivamente indices validos.
// El banco privado determina si son correctos.
//
// No asumimos que una opcion concreta sea
// correcta o incorrecta.

let iteraciones = 0;
let respuestasValidas = true;
let sinRepeticiones = true;

const preguntasUsadas = new Set<string>();

while (
  sesion.estado === "en_curso" &&
  sesion.pregunta !== null &&
  iteraciones < 30
) {
  const pregunta = sesion.pregunta;

  if (preguntasUsadas.has(pregunta.id)) {
    sinRepeticiones = false;
  }

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
  "No repite preguntas",
  sinRepeticiones
);

comprobar(
  "La evaluacion finaliza",
  sesion.estado !== "en_curso"
);

comprobar(
  "Respeta el maximo de preguntas",
  sesion.preguntasRespondidas <=
    sesion.maxPreguntas
);

comprobar(
  "El contador coincide con las respuestas",
  sesion.preguntasRespondidas === iteraciones
);

if (sesion.estado === "en_curso") {
  throw new Error(
    "La evaluacion no ha finalizado."
  );
}

// ======================================================
// 3. RESULTADO REAL
// ======================================================

const resultado = obtenerResultadoSesionTemporal(
  sesion.sesionId
);

const perfil = resultado.perfilPedagogico;
const informe = resultado.informePedagogico;

comprobar(
  "Genera perfil pedagogico",
  perfil !== null &&
    perfil !== undefined
);

comprobar(
  "Conserva nivel declarado B1",
  perfil.nivelDeclarado === "B1"
);

comprobar(
  "Conserva idioma ingles",
  perfil.idiomaEvaluado === "en"
);

comprobar(
  "Coincide el estado final",
  perfil.estadoDiagnostico === resultado.estado
);

comprobar(
  "Coincide el total de preguntas",
  perfil.resultadoGeneral.preguntas ===
    resultado.preguntasRespondidas
);

comprobar(
  "Coinciden los aciertos",
  perfil.resultadoGeneral.aciertos ===
    resultado.aciertos
);

comprobar(
  "Coinciden los errores",
  perfil.resultadoGeneral.errores ===
    informe.errores
);

comprobar(
  "Coincide el porcentaje",
  perfil.resultadoGeneral.porcentaje ===
    resultado.porcentaje
);

comprobar(
  "Los conteos generales son coherentes",
  perfil.resultadoGeneral.aciertos +
    perfil.resultadoGeneral.errores ===
    perfil.resultadoGeneral.preguntas
);

comprobar(
  "El porcentaje esta bien calculado",
  perfil.resultadoGeneral.porcentaje ===
    porcentaje(
      perfil.resultadoGeneral.aciertos,
      perfil.resultadoGeneral.preguntas
    )
);

comprobar(
  "No certifica un nivel MCER",
  perfil.nivelMCERCertificado === false
);

// ======================================================
// 4. COMPETENCIAS
// ======================================================

comprobar(
  "Conserva las competencias del informe",
  JSON.stringify(perfil.competencias) ===
    JSON.stringify(informe.competencias)
);

comprobar(
  "Las competencias suman el total",
  perfil.competencias.reduce(
    (suma, item) => suma + item.total,
    0
  ) === perfil.resultadoGeneral.preguntas
);

// ======================================================
// 5. OBJETIVO GRAMMAR
// ======================================================

const objetivosGrammar = informe.objetivos.filter(
  (item) =>
    item.competencia === "grammar" &&
    item.total > 0
);

const seleccionEsperada = seleccionarObjetivoGrammar(
  informe,
  "B1"
);

comprobar(
  "Grammar coincide con el selector pedagogico",
  JSON.stringify(perfil.grammar) ===
    JSON.stringify(seleccionEsperada)
);

comprobar(
  "No inventa objetivos Grammar",
  perfil.grammar === null ||
    objetivosGrammar.some(
      (item) =>
        item.objetivo === perfil.grammar?.objetivo &&
        item.nivel === perfil.grammar?.nivel
    )
);

comprobar(
  "El tipo de actividad respeta las evidencias",
  perfil.grammar === null ||
    perfil.grammar.tipo ===
      (perfil.grammar.evidencia.errores > 0
        ? "refuerzo"
        : "consolidacion")
);

if (perfil.grammar !== null) {
  const objetivoReal = objetivosGrammar.find(
    (item) =>
      item.objetivo === perfil.grammar?.objetivo &&
      item.nivel === perfil.grammar?.nivel
  );

  comprobar(
    "Las evidencias coinciden con el informe",
    objetivoReal !== undefined &&
      perfil.grammar.evidencia.preguntas ===
        objetivoReal.total &&
      perfil.grammar.evidencia.aciertos ===
        objetivoReal.aciertos &&
      perfil.grammar.evidencia.errores ===
        objetivoReal.errores &&
      perfil.grammar.evidencia.porcentaje ===
        objetivoReal.porcentaje
  );
} else {
  comprobar(
    "La ausencia de Grammar esta justificada",
    objetivosGrammar.length === 0
  );
}

// ======================================================
// 6. SEGURIDAD
// ======================================================

const perfilTexto = JSON.stringify(perfil);

comprobar(
  "No expone respuestas correctas",
  !perfilTexto.includes("respuestaCorrecta")
);

comprobar(
  "No expone enunciados ni opciones",
  !perfilTexto.includes('"enunciado"') &&
    !perfilTexto.includes('"opciones"')
);

// ======================================================
// RESUMEN
// ======================================================

console.log("\n================================");
console.log("INTERESTALK - TEST INTEGRACION PERFIL V1.1");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

console.log("\nRESUMEN DE EVALUACION:");
console.log("Estado:", resultado.estado);
console.log(
  "Preguntas:", resultado.preguntasRespondidas
);
console.log("Aciertos:", resultado.aciertos);
console.log("Porcentaje:", resultado.porcentaje + "%");
console.log(
  "Nivel declarado:", perfil.nivelDeclarado
);
console.log(
  "Dificultad final:", resultado.dificultadFinal
);
console.log(
  "Objetivo Grammar:",
  perfil.grammar?.objetivo ?? "Sin objetivo"
);
console.log(
  "Tipo de actividad:",
  perfil.grammar?.tipo ?? "No disponible"
);

if (fallidas === 0) {
  console.log("\nTODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error("\nSE HAN DETECTADO FALLOS");
  process.exitCode = 1;
}
