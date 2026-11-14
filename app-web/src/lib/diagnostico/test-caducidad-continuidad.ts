
import {
  guardarContinuidadPedagogica,
  obtenerContinuidadPedagogica,
  obtenerEstadisticasContinuidad,
  eliminarContinuidadPedagogica,
} from "./continuidad-pedagogica";

import {
  construirPerfilPedagogico,
} from "./perfil-pedagogico";

import type {
  InformePedagogico,
} from "./informe-pedagogico";

// ======================================================
// INTERESTALK - TEST CADUCIDAD CONTINUIDAD V1
//
// Simula el paso del tiempo sin esperar 24 horas.
// No modifica el modulo de produccion.
// No utiliza Gemini ni datos reales.
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

function rechaza(
  accion: () => unknown
): boolean {
  try {
    accion();
    return false;
  } catch {
    return true;
  }
}

const informe: InformePedagogico = {
  total: 2,
  aciertos: 1,
  errores: 1,
  porcentaje: 50,
  competencias: [
    {
      competencia: "grammar",
      total: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },
  ],
  niveles: [
    {
      nivel: "B1",
      total: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },
  ],
  objetivos: [
    {
      objetivo: "present-perfect",
      competencia: "grammar",
      nivel: "B1",
      total: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },
  ],
  recomendaciones: [],
  nivelMCERCertificado: false,
};

const perfil = construirPerfilPedagogico({
  idiomaEvaluado: "en",
  nivelDeclarado: "B1",
  estadoDiagnostico: "completado",
  informe,
});

const relojOriginal = Date.now;
const inicio = relojOriginal();
let tiempoSimulado = inicio;

const HORA = 60 * 60 * 1000;

try {
  // Simular Date.now solo durante esta prueba.
  Date.now = () => tiempoSimulado;

  const registro = guardarContinuidadPedagogica(
    perfil
  );

  comprobar(
    "Crea perfil con reloj simulado",
    Boolean(registro.continuidadId)
  );

  comprobar(
    "Configura caducidad a 24 horas",
    new Date(registro.expiraEn).getTime() ===
      inicio + 24 * HORA
  );

  tiempoSimulado = inicio + 23 * HORA;

  comprobar(
    "Perfil disponible a las 23 horas",
    obtenerContinuidadPedagogica(
      registro.continuidadId
    ).nivelDeclarado === "B1"
  );

  tiempoSimulado =
    inicio + 24 * HORA - 60 * 1000;

  comprobar(
    "Perfil disponible un minuto antes",
    obtenerContinuidadPedagogica(
      registro.continuidadId
    ).grammar?.objetivo === "present-perfect"
  );

  tiempoSimulado = inicio + 24 * HORA;

  comprobar(
    "Rechaza perfil al cumplir 24 horas",
    rechaza(() =>
      obtenerContinuidadPedagogica(
        registro.continuidadId
      )
    )
  );

  comprobar(
    "Elimina registro caducado",
    obtenerEstadisticasContinuidad()
      .perfilesActivos === 0
  );

  tiempoSimulado = inicio + 25 * HORA;

  comprobar(
    "No recupera perfil a las 25 horas",
    rechaza(() =>
      obtenerContinuidadPedagogica(
        registro.continuidadId
      )
    )
  );

  const nuevo = guardarContinuidadPedagogica(
    perfil
  );

  comprobar(
    "Permite crear perfil tras caducidad",
    obtenerContinuidadPedagogica(
      nuevo.continuidadId
    ).nivelDeclarado === "B1"
  );

  eliminarContinuidadPedagogica(
    nuevo.continuidadId
  );

} finally {
  // Restaurar siempre el reloj real.
  Date.now = relojOriginal;
}

console.log("\n================================");
console.log("INTERESTALK - TEST CADUCIDAD CONTINUIDAD");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("\nTODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error("\nSE HAN DETECTADO FALLOS");
  process.exitCode = 1;
}
