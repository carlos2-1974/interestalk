
import assert from "node:assert/strict";

import {
  generarRecomendacionPedagogica,
} from "./motor-recomendaciones";

import type {
  PerfilPedagogico,
} from "./perfil-pedagogico";

// ======================================================
// INTERESTALK - TEST MOTOR RECOMENDACIONES V1
//
// Comprueba decisiones pedagogicas de Grammar.
//
// No modifica el diagnostico.
// No utiliza Gemini.
// No almacena datos.
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
// PERFIL DE PRUEBA
// ======================================================

function crearPerfil(): PerfilPedagogico {
  return {
    version: 1,
    idiomaEvaluado: "en",
    nivelDeclarado: "B1",
    estadoDiagnostico: "completado",
    fechaEvaluacion: new Date().toISOString(),
    resultadoGeneral: {
      preguntas: 15,
      aciertos: 10,
      errores: 5,
      porcentaje: 67,
    },
    competencias: [],
    grammar: {
      competencia: "grammar",
      objetivo: "present-perfect",
      nivel: "B1",
      tipo: "refuerzo",
      evidencia: {
        preguntas: 3,
        aciertos: 1,
        errores: 2,
        porcentaje: 33,
      },
      motivo: "Errores observados en Present Perfect.",
    },
    nivelMCERCertificado: false,
  };
}

// ======================================================
// PRUEBAS
// ======================================================

comprobar("Genera recomendacion Grammar", () => {
  const resultado =
    generarRecomendacionPedagogica(
      crearPerfil()
    );

  assert.ok(resultado);
  assert.equal(resultado.competencia, "grammar");
});

comprobar("Selecciona Present Perfect", () => {
  const resultado =
    generarRecomendacionPedagogica(
      crearPerfil()
    );

  assert.equal(
    resultado?.objetivo,
    "present-perfect"
  );
});

comprobar("Recomienda refuerzo", () => {
  const resultado =
    generarRecomendacionPedagogica(
      crearPerfil()
    );

  assert.equal(resultado?.tipo, "refuerzo");
  assert.equal(
    resultado?.actividad,
    "practica-guiada"
  );
  assert.equal(resultado?.duracionMinutos, 10);
});

comprobar("Conserva nivel B1", () => {
  const resultado =
    generarRecomendacionPedagogica(
      crearPerfil()
    );

  assert.equal(
    resultado?.nivelReferencia,
    "B1"
  );
});

comprobar("Conserva evidencia real", () => {
  const resultado =
    generarRecomendacionPedagogica(
      crearPerfil()
    );

  assert.equal(resultado?.evidencia.preguntas, 3);
  assert.equal(resultado?.evidencia.aciertos, 1);
  assert.equal(resultado?.evidencia.errores, 2);
  assert.equal(resultado?.evidencia.porcentaje, 33);
});

comprobar("Recomienda consolidacion", () => {
  const perfil = crearPerfil();

  if (!perfil.grammar) {
    throw new Error("Grammar no disponible.");
  }

  perfil.grammar.tipo = "consolidacion";
  perfil.grammar.evidencia = {
    preguntas: 3,
    aciertos: 3,
    errores: 0,
    porcentaje: 100,
  };

  const resultado =
    generarRecomendacionPedagogica(perfil);

  assert.equal(resultado?.tipo, "consolidacion");
  assert.equal(
    resultado?.actividad,
    "practica-contextual"
  );
  assert.equal(resultado?.duracionMinutos, 8);
});

comprobar("No recomienda sin diagnostico completo", () => {
  const perfil = crearPerfil();
  perfil.estadoDiagnostico = "incompleto";

  assert.equal(
    generarRecomendacionPedagogica(perfil),
    null
  );
});

comprobar("No inventa objetivo Grammar", () => {
  const perfil = crearPerfil();
  perfil.grammar = null;

  assert.equal(
    generarRecomendacionPedagogica(perfil),
    null
  );
});

comprobar("Rechaza conteos inconsistentes", () => {
  const perfil = crearPerfil();

  if (!perfil.grammar) {
    throw new Error("Grammar no disponible.");
  }

  perfil.grammar.evidencia.preguntas = 10;

  assert.throws(
    () => generarRecomendacionPedagogica(perfil),
    /Evidencia pedagogica inconsistente/
  );
});

comprobar("No modifica el perfil original", () => {
  const perfil = crearPerfil();
  const antes = JSON.stringify(perfil);

  generarRecomendacionPedagogica(perfil);

  assert.equal(JSON.stringify(perfil), antes);
});

comprobar("Genera resultado reproducible", () => {
  const perfil = crearPerfil();

  const primero =
    generarRecomendacionPedagogica(perfil);

  const segundo =
    generarRecomendacionPedagogica(perfil);

  assert.deepEqual(primero, segundo);
});

comprobar("La recomendacion queda pendiente", () => {
  const resultado =
    generarRecomendacionPedagogica(
      crearPerfil()
    );

  assert.equal(resultado?.estado, "pendiente");
  assert.equal(resultado?.version, 1);
});

// ======================================================
// RESULTADO FINAL
// ======================================================

console.log("\n================================");
console.log(
  "INTERESTALK - MOTOR RECOMENDACIONES V1"
);
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("\nTODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error("\nSE HAN DETECTADO FALLOS");
  process.exitCode = 1;
}
