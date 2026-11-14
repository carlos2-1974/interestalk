import {
  generarGrammarV2,
} from "./generar-grammar";

import type {
  SolicitudGrammarV2,
} from "./tipos";

// ======================================================
// INTERESTALK - GRAMMAR V2
// TEST GENERACION REAL GEMINI V1
//
// Realiza una llamada real a Gemini.
//
// Comprueba:
// - generacion estructurada;
// - objetivo fijado por Interestalk;
// - nivel y tipo;
// - cinco ejercicios;
// - soluciones privadas;
// - correspondencia de IDs;
// - evidencia pedagogica;
// - ausencia de soluciones en parte publica.
//
// No modifica diagnostico.
// No modifica perfiles.
// No conecta todavia la interfaz.
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
// SOLICITUD CONTROLADA
//
// Simula exactamente la salida que Interestalk
// ya sabe construir mediante crearSolicitudGrammarV2.
// ======================================================

const solicitud: SolicitudGrammarV2 = {
  contexto: {
    idiomaApoyo: "es",
    idiomaAprendizaje: "en",
    nivelDeclarado: "B1",

    objetivoPersonal:
      "Conversar con fluidez",

    intereses: [
      "Deporte",
      "Tecnologia",
      "Viajes",
    ],

    interesPrincipal:
      "Deporte",
  },

  necesidad: {
    objetivo:
      "present-perfect",

    nivel:
      "B1",

    tipo:
      "refuerzo",

    evidencia: {
      preguntas: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },

    motivo:
      "Se han observado errores en este objetivo. " +
      "Se propone una actividad de refuerzo y una " +
      "comprobacion posterior del aprendizaje.",
  },
};

// ======================================================
// EJECUCION
// ======================================================

async function ejecutar(): Promise<void> {
  console.log(
    "\nGenerando primera actividad Grammar V2..."
  );

  console.log(
    "Modelo:",
    process.env.GEMINI_MODEL ??
      "gemini-3.5-flash-lite"
  );

  console.log(
    "Objetivo:",
    solicitud.necesidad.objetivo
  );

  console.log(
    "Tipo:",
    solicitud.necesidad.tipo
  );

  console.log(
    "Interes principal:",
    solicitud.contexto.interesPrincipal
  );

  const actividad =
    await generarGrammarV2(
      solicitud
    );

  // ====================================================
  // 1. IDENTIDAD PEDAGOGICA
  // ====================================================

  comprobar(
    "Genera actividadId",
    Boolean(
      actividad.publica.actividadId
    )
  );

  comprobar(
    "Mantiene objetivo present-perfect",
    actividad.publica.objetivoGrammar ===
      solicitud.necesidad.objetivo
  );

  comprobar(
    "Mantiene nivel B1",
    actividad.publica.nivelContenido ===
      solicitud.necesidad.nivel
  );

  comprobar(
    "Mantiene tipo refuerzo",
    actividad.publica.tipoActividad ===
      solicitud.necesidad.tipo
  );

  // ====================================================
  // 2. CONTENIDO EDUCATIVO
  // ====================================================

  comprobar(
    "Genera titulo",
    actividad.publica.titulo.trim().length > 0
  );

  comprobar(
    "Genera introduccion",
    actividad.publica.introduccion
      .trim()
      .length > 0
  );

  comprobar(
    "Genera explicacion",
    actividad.publica.explicacion
      .trim()
      .length > 0
  );

  comprobar(
    "Genera regla",
    actividad.publica.regla.trim().length > 0
  );

  comprobar(
    "Genera ejemplos",
    actividad.publica.ejemplos.length >= 2
  );

  comprobar(
    "Genera errores frecuentes",
    actividad.publica.erroresFrecuentes
      .length >= 1
  );

  comprobar(
    "Genera aplicacion practica",
    actividad.publica.aplicacionPractica
      .trim()
      .length > 0
  );

  // ====================================================
  // 3. EJERCICIOS
  // ====================================================

  comprobar(
    "Genera exactamente cinco ejercicios",
    actividad.publica.ejercicios.length === 5
  );

  const idsEjercicios =
    actividad.publica.ejercicios.map(
      (ejercicio) => ejercicio.id
    );

  comprobar(
    "Los IDs de ejercicios son unicos",
    new Set(idsEjercicios).size === 5
  );

  // ====================================================
  // 4. SOLUCIONES PRIVADAS
  // ====================================================

  comprobar(
    "Genera exactamente cinco soluciones",
    actividad.privada.soluciones.length === 5
  );

  comprobar(
    "Publico y privado comparten actividadId",
    actividad.publica.actividadId ===
      actividad.privada.actividadId
  );

  const idsSoluciones =
    actividad.privada.soluciones.map(
      (solucion) =>
        solucion.ejercicioId
    );

  comprobar(
    "Cada ejercicio tiene solucion",
    idsEjercicios.every(
      (id) => idsSoluciones.includes(id)
    )
  );

  // ====================================================
  // 5. SEGURIDAD
  //
  // La parte publica no debe contener las propiedades
  // privadas utilizadas para corregir.
  // ====================================================

  const textoPublico =
    JSON.stringify(
      actividad.publica
    );

  comprobar(
    "La parte publica no expone respuestaCorrecta",
    !textoPublico.includes(
      "respuestaCorrecta"
    )
  );

  comprobar(
    "La parte publica no expone explicacionRespuesta",
    !textoPublico.includes(
      "explicacionRespuesta"
    )
  );

  // ====================================================
  // 6. ORIGEN PEDAGOGICO
  // ====================================================

  comprobar(
    "Conserva objetivo en origen pedagogico",
    actividad.origenPedagogico.objetivo ===
      solicitud.necesidad.objetivo
  );

  comprobar(
    "Conserva nivel en origen pedagogico",
    actividad.origenPedagogico.nivel ===
      solicitud.necesidad.nivel
  );

  comprobar(
    "Conserva tipo en origen pedagogico",
    actividad.origenPedagogico.tipo ===
      solicitud.necesidad.tipo
  );

  comprobar(
    "Conserva preguntas de evidencia",
    actividad.origenPedagogico.evidencia
      .preguntas ===
      solicitud.necesidad.evidencia.preguntas
  );

  comprobar(
    "Conserva aciertos de evidencia",
    actividad.origenPedagogico.evidencia
      .aciertos ===
      solicitud.necesidad.evidencia.aciertos
  );

  comprobar(
    "Conserva errores de evidencia",
    actividad.origenPedagogico.evidencia
      .errores ===
      solicitud.necesidad.evidencia.errores
  );

  comprobar(
    "Conserva porcentaje de evidencia",
    actividad.origenPedagogico.evidencia
      .porcentaje ===
      solicitud.necesidad.evidencia.porcentaje
  );

  // ====================================================
  // 7. INSPECCION PEDAGOGICA
  //
  // No convertimos la personalizacion en un test
  // mecanico por palabra. Mostramos el contenido
  // para una primera revision humana.
  // ====================================================

  console.log(
    "\n================================"
  );

  console.log(
    "INTERESTALK - GRAMMAR V2 GENERADA"
  );

  console.log(
    "================================"
  );

  console.log(
    "\nTitulo:",
    actividad.publica.titulo
  );

  console.log(
    "\nIntroduccion:",
    actividad.publica.introduccion
  );

  console.log(
    "\nExplicacion:",
    actividad.publica.explicacion
  );

  console.log(
    "\nRegla:",
    actividad.publica.regla
  );

  console.log(
    "\nEjemplos:"
  );

  actividad.publica.ejemplos.forEach(
    (ejemplo, indice) => {
      console.log(
        `${indice + 1}. ${ejemplo}`
      );
    }
  );

  console.log(
    "\nEjercicios:"
  );

  actividad.publica.ejercicios.forEach(
    (ejercicio, indice) => {
      console.log(
        `\n${indice + 1}. [${ejercicio.tipo}]`
      );

      console.log(
        ejercicio.enunciado
      );

      if (ejercicio.opciones) {
        ejercicio.opciones.forEach(
          (opcion, opcionIndice) => {
            console.log(
              `   ${opcionIndice + 1}) ${opcion}`
            );
          }
        );
      }
    }
  );

  console.log(
    "\nAplicacion practica:",
    actividad.publica.aplicacionPractica
  );

  // ====================================================
  // RESUMEN
  // ====================================================

  console.log(
    "\n================================"
  );

  console.log(
    "INTERESTALK - TEST GENERACION GRAMMAR V2"
  );

  console.log(
    "================================"
  );

  console.log(
    "Pruebas superadas:",
    superadas
  );

  console.log(
    "Pruebas fallidas:",
    fallidas
  );

  console.log(
    "Actividad ID:",
    actividad.publica.actividadId
  );

  console.log(
    "Objetivo:",
    actividad.publica.objetivoGrammar
  );

  console.log(
    "Nivel:",
    actividad.publica.nivelContenido
  );

  console.log(
    "Tipo:",
    actividad.publica.tipoActividad
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
}

ejecutar().catch((error) => {
  console.error(
    "\nERROR EN GENERACION GRAMMAR V2:"
  );

  console.error(error);

  process.exitCode = 1;
});