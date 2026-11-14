// ======================================================
// INTERESTALK - TEST DE CADUCIDAD V1
// Simulacion de tiempo sin esperar 30 minutos
// No modifica el gestor de sesiones
// ======================================================

import {
  crearSesionTemporal,
  consultarSesionTemporal,
  responderSesionTemporal,
  obtenerEstadisticasSesiones,
} from "./sesiones";

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

// Guardar la funcion original del reloj.
const relojOriginal = Date.now;

// Fecha simulada de inicio.
const inicio = new Date(
  "2026-11-11T10:00:00.000Z"
).getTime();

let tiempoActual = inicio;

// Sustituir temporalmente Date.now.
Date.now = () => tiempoActual;

function avanzarMinutos(minutos: number) {
  tiempoActual += minutos * 60 * 1000;
}

try {
  // ====================================================
  // PRUEBA 1 - CREAR SESION
  // ====================================================

  const sesion = crearSesionTemporal(
    "en",
    "B1"
  );

  comprobar(
    "Crea sesion con reloj simulado",
    Boolean(sesion.sesionId) &&
      sesion.estado === "en_curso"
  );

  // ====================================================
  // PRUEBA 2 - CADUCIDAD CONFIGURADA
  // ====================================================

  const expiracionEsperada =
    inicio + 30 * 60 * 1000;

  comprobar(
    "La caducidad es de 30 minutos",
    new Date(sesion.expiraEn).getTime() ===
      expiracionEsperada
  );

  // ====================================================
  // PRUEBA 3 - ACTIVA A LOS 20 MINUTOS
  // ====================================================

  avanzarMinutos(20);

  const consulta20 = consultarSesionTemporal(
    sesion.sesionId
  );

  comprobar(
    "Sesion activa a los 20 minutos",
    consulta20.estado === "en_curso"
  );

  // ====================================================
  // PRUEBA 4 - ACTIVA A LOS 29 MINUTOS
  // ====================================================

  avanzarMinutos(9);

  const consulta29 = consultarSesionTemporal(
    sesion.sesionId
  );

  comprobar(
    "Sesion activa a los 29 minutos",
    consulta29.estado === "en_curso"
  );

  // ====================================================
  // PRUEBA 5 - CADUCA A LOS 30 MINUTOS
  // ====================================================

  avanzarMinutos(1);

  debeFallar(
    "Sesion caducada a los 30 minutos",
    () => consultarSesionTemporal(sesion.sesionId)
  );

  // ====================================================
  // PRUEBA 6 - RECHAZA RESPUESTAS CADUCADAS
  // ====================================================

  if (!sesion.pregunta) {
    throw new Error(
      "No existe pregunta inicial."
    );
  }

  debeFallar(
    "Rechaza respuestas a sesiones caducadas",
    () =>
      responderSesionTemporal(
        sesion.sesionId,
        sesion.pregunta!.id,
        0
      )
  );

  // ====================================================
  // PRUEBA 7 - LIMPIEZA DE SESIONES
  // ====================================================

  const estadisticas = obtenerEstadisticasSesiones();

  comprobar(
    "Limpia sesiones expiradas",
    estadisticas.sesionesActivas === 0
  );

  // ====================================================
  // PRUEBA 8 - NUEVA SESION
  // ====================================================

  const nuevaSesion = crearSesionTemporal(
    "en",
    "A2"
  );

  comprobar(
    "Permite crear una nueva sesion",
    nuevaSesion.estado === "en_curso" &&
      nuevaSesion.pregunta?.nivel === "A2"
  );

  // ====================================================
  // PRUEBA 9 - NUEVA CADUCIDAD
  // ====================================================

  comprobar(
    "La nueva sesion tiene su propia caducidad",
    new Date(nuevaSesion.expiraEn).getTime() ===
      tiempoActual + 30 * 60 * 1000
  );

} finally {
  // Restaurar siempre el reloj original.
  Date.now = relojOriginal;
}

// ======================================================
// RESULTADO FINAL
// ======================================================

console.log("\n================================");
console.log("INTERESTALK - TEST CADUCIDAD V1");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("TODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error(
    "SE HAN DETECTADO FALLOS DE CADUCIDAD"
  );
  process.exitCode = 1;
}