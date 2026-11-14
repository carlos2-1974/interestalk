
import assert from "node:assert/strict";

import {
  crearSesionTemporal,
  responderSesionTemporal,
  obtenerResultadoSesionTemporal,
} from "./sesiones";

import {
  obtenerContinuidadPedagogica,
  eliminarContinuidadPedagogica,
} from "./continuidad-pedagogica";

import {
  generarRecomendacionPedagogica,
} from "./motor-recomendaciones";

// ======================================================
// INTERESTALK - TEST INTEGRACION RECOMENDACIONES V1
//
// Recorrido:
// Diagnostico -> Perfil -> Continuidad -> Recomendacion
//
// Utiliza el diagnostico real con respuestas simuladas.
// No accede a soluciones privadas.
// No llama a Gemini.
// No modifica los modulos existentes.
// ======================================================

let superadas = 0;
let fallidas = 0;

function comprobar(
  nombre: string,
  ejecutar: () => void
): void {
  try {
    ejecutar();
    superadas++;
    console.log("CORRECTO - " + nombre);
  } catch (error) {
    fallidas++;
    console.error("ERROR - " + nombre);
    console.error(error);
  }
}

// ======================================================
// 1. CREAR Y COMPLETAR DIAGNOSTICO
// ======================================================

let sesion = crearSesionTemporal("en", "B1");

comprobar("Crea sesion B1", () => {
  assert.equal(sesion.estado, "en_curso");
  assert.ok(sesion.pregunta);
});

let iteraciones = 0;

while (
  sesion.estado === "en_curso" &&
  sesion.pregunta !== null &&
  iteraciones < 30
) {
  const pregunta = sesion.pregunta;

  // Respuesta simulada dentro de las opciones.
  // No consultamos respuestas correctas.
  const respuesta =
    iteraciones % pregunta.opciones.length;

  sesion = responderSesionTemporal(
    sesion.sesionId,
    pregunta.id,
    respuesta
  );

  iteraciones++;
}

comprobar("Finaliza diagnostico", () => {
  assert.notEqual(sesion.estado, "en_curso");
});

comprobar("Respeta limite de preguntas", () => {
  assert.ok(
    sesion.preguntasRespondidas <=
      sesion.maxPreguntas
  );
});

if (sesion.estado === "en_curso") {
  throw new Error(
    "El diagnostico no ha finalizado."
  );
}

// ======================================================
// 2. OBTENER PERFIL Y CONTINUIDAD
// ======================================================

const resultado =
  obtenerResultadoSesionTemporal(
    sesion.sesionId
  );

const continuidadId =
  resultado.continuidad.continuidadId;

comprobar("Genera continuidad", () => {
  assert.ok(continuidadId);
});

const perfil =
  obtenerContinuidadPedagogica(
    continuidadId
  );

comprobar("Recupera perfil", () => {
  assert.equal(perfil.version, 1);
});

comprobar("Conserva nivel declarado B1", () => {
  assert.equal(perfil.nivelDeclarado, "B1");
});

comprobar("No certifica nivel MCER", () => {
  assert.equal(
    perfil.nivelMCERCertificado,
    false
  );
});

// ======================================================
// 3. GENERAR RECOMENDACION
// ======================================================

const perfilAntes = JSON.stringify(perfil);

const recomendacion =
  generarRecomendacionPedagogica(perfil);

comprobar("Recomendacion coherente con Grammar", () => {
  if (perfil.grammar === null) {
    assert.equal(recomendacion, null);
  } else {
    assert.ok(recomendacion);
    assert.equal(
      recomendacion.objetivo,
      perfil.grammar.objetivo
    );
  }
});

comprobar("Conserva nivel del objetivo", () => {
  if (perfil.grammar === null) {
    assert.equal(recomendacion, null);
  } else {
    assert.equal(
      recomendacion?.nivelReferencia,
      perfil.grammar.nivel
    );
  }
});

comprobar("Conserva tipo pedagogico", () => {
  if (perfil.grammar === null) {
    assert.equal(recomendacion, null);
  } else {
    assert.equal(
      recomendacion?.tipo,
      perfil.grammar.tipo
    );
  }
});

comprobar("Conserva evidencias", () => {
  if (perfil.grammar === null) {
    assert.equal(recomendacion, null);
  } else {
    assert.deepEqual(
      recomendacion?.evidencia,
      perfil.grammar.evidencia
    );
  }
});

comprobar("No modifica el perfil", () => {
  assert.equal(
    JSON.stringify(perfil),
    perfilAntes
  );
});

comprobar("Genera resultado reproducible", () => {
  const segunda =
    generarRecomendacionPedagogica(perfil);

  assert.deepEqual(
    recomendacion,
    segunda
  );
});

comprobar("Estado inicial pendiente", () => {
  if (recomendacion !== null) {
    assert.equal(
      recomendacion.estado,
      "pendiente"
    );
  } else {
    assert.equal(perfil.grammar, null);
  }
});

// ======================================================
// 4. COMPROBAR SEGURIDAD
// ======================================================

comprobar("No incluye soluciones privadas", () => {
  const texto = JSON.stringify(recomendacion);

  assert.ok(
    !texto.includes("respuestaCorrecta")
  );
  assert.ok(
    !texto.includes('"opciones"')
  );
  assert.ok(
    !texto.includes('"enunciado"')
  );
});

// ======================================================
// 5. LIMPIEZA
// ======================================================

comprobar("Elimina continuidad de prueba", () => {
  assert.equal(
    eliminarContinuidadPedagogica(
      continuidadId
    ),
    true
  );
});

// ======================================================
// RESUMEN
// ======================================================

console.log("\n================================");
console.log(
  "INTERESTALK - INTEGRACION RECOMENDACIONES"
);
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

console.log("\nRESUMEN PEDAGOGICO");
console.log("Nivel declarado:", perfil.nivelDeclarado);
console.log(
  "Objetivo Grammar:",
  perfil.grammar?.objetivo ?? "Sin objetivo"
);
console.log(
  "Tipo:",
  recomendacion?.tipo ?? "Sin recomendacion"
);
console.log(
  "Actividad:",
  recomendacion?.actividad ?? "No disponible"
);
console.log(
  "Duracion:",
  recomendacion?.duracionMinutos ?? 0,
  "minutos"
);

if (fallidas === 0) {
  console.log("\nTODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error("\nSE HAN DETECTADO FALLOS");
  process.exitCode = 1;
}
