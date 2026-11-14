// =====================================================
// INTERESTALK - TEST MOTOR ADAPTATIVO V2
// Verificacion de cambios de dificultad y evidencias
// =====================================================

import {
  crearEstadoAdaptativo,
  decidirSiguienteNivel,
  resumirRendimiento,
  type NivelMCERAdaptativo,
  type RespuestaEvaluada,
} from "./adaptativo";

let superadas = 0;
let fallidas = 0;

function historial(
  resultados: boolean[],
  nivel: NivelMCERAdaptativo
): RespuestaEvaluada[] {
  return resultados.map((correcta, indice) => ({
    preguntaId: "pregunta-" + (indice + 1),
    nivel,
    correcta,
  }));
}

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

// =====================================================
// PRUEBA 1 - TRES ACIERTOS SUBEN DE B1 A B2
// =====================================================

const prueba1 = decidirSiguienteNivel(
  crearEstadoAdaptativo("B1"),
  historial([true, true, true], "B1")
);

comprobar(
  "Tres aciertos B1 suben a B2",
  prueba1.nivelSiguiente === "B2" &&
    prueba1.movimiento === "subir"
);

// =====================================================
// PRUEBA 2 - DOS ERRORES BAJAN DE B1 A A2
// =====================================================

const prueba2 = decidirSiguienteNivel(
  crearEstadoAdaptativo("B1"),
  historial([false, false], "B1")
);

comprobar(
  "Dos errores B1 bajan a A2",
  prueba2.nivelSiguiente === "A2" &&
    prueba2.movimiento === "bajar"
);

// =====================================================
// PRUEBA 3 - RESULTADOS MIXTOS
// =====================================================

const prueba3 = decidirSiguienteNivel(
  crearEstadoAdaptativo("B1"),
  historial([true, false], "B1")
);

comprobar(
  "Resultados mixtos mantienen B1",
  prueba3.nivelSiguiente === "B1" &&
    prueba3.movimiento === "mantener"
);

// =====================================================
// PRUEBA 4 - LIMITE SUPERIOR C2
// =====================================================

const prueba4 = decidirSiguienteNivel(
  crearEstadoAdaptativo("C2"),
  historial([true, true, true], "C2")
);

comprobar(
  "Tres aciertos C2 mantienen C2",
  prueba4.nivelSiguiente === "C2" &&
    prueba4.movimiento === "mantener"
);

// =====================================================
// PRUEBA 5 - LIMITE INFERIOR A1
// =====================================================

const prueba5 = decidirSiguienteNivel(
  crearEstadoAdaptativo("A1"),
  historial([false, false], "A1")
);

comprobar(
  "Dos errores A1 mantienen A1",
  prueba5.nivelSiguiente === "A1" &&
    prueba5.movimiento === "mantener"
);

// =====================================================
// PRUEBA 6 - SIN RESPUESTAS
// =====================================================

const prueba6 = decidirSiguienteNivel(
  crearEstadoAdaptativo("B1"),
  []
);

comprobar(
  "Sin respuestas mantiene B1",
  prueba6.nivelSiguiente === "B1" &&
    prueba6.movimiento === "mantener"
);

// =====================================================
// PRUEBA 7 - CALCULO DE RENDIMIENTO
// =====================================================

const rendimiento = resumirRendimiento(
  historial(
    [true, true, false, true, false],
    "B1"
  )
);

comprobar(
  "Rendimiento 3/5 = 60%",
  rendimiento.total === 5 &&
    rendimiento.aciertos === 3 &&
    rendimiento.errores === 2 &&
    rendimiento.porcentaje === 60
);

// =====================================================
// PRUEBA 8 - NO REUTILIZAR RESPUESTAS
// =====================================================

const primerasTres = historial(
  [true, true, true],
  "B1"
);

const primeraDecision = decidirSiguienteNivel(
  crearEstadoAdaptativo("B1"),
  primerasTres
);

// Sin respuestas nuevas, debe mantenerse B2.
const segundaDecision = decidirSiguienteNivel(
  primeraDecision.estado,
  primerasTres
);

comprobar(
  "No reutiliza respuestas consumidas",
  primeraDecision.nivelSiguiente === "B2" &&
    segundaDecision.nivelSiguiente === "B2" &&
    segundaDecision.movimiento === "mantener" &&
    segundaDecision.estado.respuestasConsumidas === 3
);

// =====================================================
// PRUEBA 9 - CUARTO ACIERTO NO SUBE OTRA VEZ
// =====================================================

const cuatroAciertos = historial(
  [true, true, true, true],
  "B1"
);

const decisionCuatro = decidirSiguienteNivel(
  primeraDecision.estado,
  cuatroAciertos
);

comprobar(
  "Cuarto acierto mantiene B2",
  decisionCuatro.nivelSiguiente === "B2" &&
    decisionCuatro.movimiento === "mantener"
);

// =====================================================
// PRUEBA 10 - NUEVAS EVIDENCIAS PERMITEN SUBIR
// =====================================================

const seisAciertos = historial(
  [true, true, true, true, true, true],
  "B1"
);

const decisionSeis = decidirSiguienteNivel(
  primeraDecision.estado,
  seisAciertos
);

comprobar(
  "Tres nuevos aciertos permiten subir a C1",
  decisionSeis.nivelSiguiente === "C1" &&
    decisionSeis.movimiento === "subir" &&
    decisionSeis.estado.respuestasConsumidas === 6 &&
    decisionSeis.estado.cambiosRealizados === 2
);

// =====================================================
// PRUEBA 11 - NUEVOS ERRORES PERMITEN BAJAR
// =====================================================

const dosErrores = historial(
  [false, false],
  "B1"
);

const primeraBajada = decidirSiguienteNivel(
  crearEstadoAdaptativo("B1"),
  dosErrores
);

const cuatroErrores = historial(
  [false, false, false, false],
  "B1"
);

const segundaBajada = decidirSiguienteNivel(
  primeraBajada.estado,
  cuatroErrores
);

comprobar(
  "Dos nuevos errores permiten bajar a A1",
  primeraBajada.nivelSiguiente === "A2" &&
    segundaBajada.nivelSiguiente === "A1" &&
    segundaBajada.estado.respuestasConsumidas === 4
);

// =====================================================
// RESULTADO FINAL
// =====================================================

console.log("\n================================");
console.log("INTERESTALK - TEST ADAPTATIVO V2");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("TODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error("HAY PRUEBAS FALLIDAS");
  process.exitCode = 1;
}