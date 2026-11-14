import type {
  ActividadGrammarCompleta,
  SolicitudGrammarV2,
} from "./tipos";

// ======================================================
// INTERESTALK - GRAMMAR V2
// QUALITY GATE PEDAGOGICO V1
//
// Audita una actividad DESPUES de Gemini y Zod.
//
// No utiliza Gemini.
// No modifica la actividad.
// No decide el objetivo pedagogico.
// ======================================================

export type SeveridadQualityGate =
  | "bloqueante"
  | "advertencia";

export type IncidenciaQualityGate = {
  codigo: string;
  severidad: SeveridadQualityGate;
  mensaje: string;
};

export type ResultadoQualityGate = {
  aprobado: boolean;
  incidencias: IncidenciaQualityGate[];
  bloqueantes: number;
  advertencias: number;
};

// ======================================================
// UTILIDADES
// ======================================================

function normalizar(valor: string): string {
  return valor
    .trim()
    .toLocaleLowerCase();
}

function agregarIncidencia(
  incidencias: IncidenciaQualityGate[],
  codigo: string,
  severidad: SeveridadQualityGate,
  mensaje: string
): void {
  incidencias.push({
    codigo,
    severidad,
    mensaje,
  });
}

// ======================================================
// QUALITY GATE
// ======================================================

export function evaluarQualityGateGrammar(
  actividad: ActividadGrammarCompleta,
  solicitud: SolicitudGrammarV2
): ResultadoQualityGate {
  const incidencias: IncidenciaQualityGate[] = [];

  // ====================================================
  // 1. IDENTIDAD PEDAGOGICA
  // ====================================================

  if (
    actividad.publica.objetivoGrammar !==
    solicitud.necesidad.objetivo
  ) {
    agregarIncidencia(
      incidencias,
      "QG-001",
      "bloqueante",
      "La actividad no respeta el objetivo Grammar seleccionado."
    );
  }

  if (
    actividad.publica.nivelContenido !==
    solicitud.necesidad.nivel
  ) {
    agregarIncidencia(
      incidencias,
      "QG-002",
      "bloqueante",
      "La actividad no respeta el nivel pedagogico seleccionado."
    );
  }

  if (
    actividad.publica.tipoActividad !==
    solicitud.necesidad.tipo
  ) {
    agregarIncidencia(
      incidencias,
      "QG-003",
      "bloqueante",
      "La actividad no respeta el tipo de actividad seleccionado."
    );
  }

  // ====================================================
  // 2. NUMERO Y UNICIDAD DE EJERCICIOS
  // ====================================================

  if (actividad.publica.ejercicios.length !== 5) {
    agregarIncidencia(
      incidencias,
      "QG-004",
      "bloqueante",
      "La actividad debe contener exactamente cinco ejercicios."
    );
  }

  const idsEjercicios =
    actividad.publica.ejercicios.map(
      (ejercicio) => ejercicio.id
    );

  if (
    new Set(idsEjercicios).size !==
    idsEjercicios.length
  ) {
    agregarIncidencia(
      incidencias,
      "QG-005",
      "bloqueante",
      "Los identificadores de ejercicios no son unicos."
    );
  }

  // ====================================================
  // 3. CORRESPONDENCIA CON SOLUCIONES
  // ====================================================

  if (
    actividad.privada.soluciones.length !==
    actividad.publica.ejercicios.length
  ) {
    agregarIncidencia(
      incidencias,
      "QG-006",
      "bloqueante",
      "El numero de soluciones no coincide con el numero de ejercicios."
    );
  }

  for (const ejercicio of
    actividad.publica.ejercicios) {
    const soluciones =
      actividad.privada.soluciones.filter(
        (solucion) =>
          solucion.ejercicioId ===
          ejercicio.id
      );

    if (soluciones.length !== 1) {
      agregarIncidencia(
        incidencias,
        "QG-007",
        "bloqueante",
        "Cada ejercicio debe tener exactamente una solucion."
      );
    }
  }

  // ====================================================
  // 4. OPCION MULTIPLE
  // ====================================================

  for (const ejercicio of
    actividad.publica.ejercicios) {
    if (ejercicio.tipo !== "opcion_multiple") {
      continue;
    }

    if (
      ejercicio.opciones === null ||
      ejercicio.opciones.length < 2
    ) {
      agregarIncidencia(
        incidencias,
        "QG-008",
        "bloqueante",
        "Un ejercicio de opcion multiple debe tener al menos dos opciones."
      );

      continue;
    }

    const opcionesNormalizadas =
      ejercicio.opciones.map(normalizar);

    if (
      new Set(opcionesNormalizadas).size !==
      opcionesNormalizadas.length
    ) {
      agregarIncidencia(
        incidencias,
        "QG-009",
        "bloqueante",
        "Un ejercicio de opcion multiple contiene opciones duplicadas."
      );
    }

    const solucion =
      actividad.privada.soluciones.find(
        (item) =>
          item.ejercicioId === ejercicio.id
      );

    if (
      solucion &&
      !ejercicio.opciones.includes(
        solucion.respuestaCorrecta
      )
    ) {
      agregarIncidencia(
        incidencias,
        "QG-010",
        "bloqueante",
        "La respuesta correcta no aparece entre las opciones del ejercicio."
      );
    }
  }

  // ====================================================
  // 5. COMPLETAR
  // ====================================================

  for (const ejercicio of
    actividad.publica.ejercicios) {
    if (ejercicio.tipo !== "completar") {
      continue;
    }

    const tieneHueco =
      ejercicio.enunciado.includes("___") ||
      ejercicio.enunciado.includes("...");

    if (!tieneHueco) {
      agregarIncidencia(
        incidencias,
        "QG-011",
        "advertencia",
        "Un ejercicio de completar no contiene un hueco claramente identificable."
      );
    }

    if (ejercicio.opciones !== null) {
      agregarIncidencia(
        incidencias,
        "QG-012",
        "bloqueante",
        "Un ejercicio de completar no debe incluir opciones."
      );
    }
  }

  // ====================================================
  // 6. TRANSFORMAR
  // ====================================================

  for (const ejercicio of
    actividad.publica.ejercicios) {
    if (ejercicio.tipo !== "transformar") {
      continue;
    }

    if (ejercicio.opciones !== null) {
      agregarIncidencia(
        incidencias,
        "QG-013",
        "bloqueante",
        "Un ejercicio de transformar no debe incluir opciones."
      );
    }

    const texto =
      normalizar(ejercicio.enunciado);

    const tieneInstruccion =
      texto.includes("transform") ||
      texto.includes("rewrite") ||
      texto.includes("reescribe") ||
      texto.includes("transforma");

    if (!tieneInstruccion) {
      agregarIncidencia(
        incidencias,
        "QG-014",
        "advertencia",
        "El ejercicio de transformacion no explica claramente la operacion solicitada."
      );
    }
  }

  // ====================================================
  // 7. CALIDAD DE SOLUCIONES
  // ====================================================

  for (const solucion of
    actividad.privada.soluciones) {
    if (
      solucion.respuestaCorrecta.trim().length <
      1
    ) {
      agregarIncidencia(
        incidencias,
        "QG-015",
        "bloqueante",
        "Existe una solucion sin respuesta correcta."
      );
    }

    if (
      solucion.explicacion.trim().length < 10
    ) {
      agregarIncidencia(
        incidencias,
        "QG-016",
        "advertencia",
        "Una explicacion de correccion es demasiado breve."
      );
    }
  }

  // ====================================================
  // 8. PERSONALIZACION
  //
  // No exigimos literalmente el interes principal.
  // Gemini puede usar sinonimos o contexto relacionado.
  // Solo detectamos una ausencia evidente de contexto.
  // ====================================================

  const contenidoPersonalizable = [
    actividad.publica.titulo,
    actividad.publica.introduccion,
    actividad.publica.explicacion,
    actividad.publica.aplicacionPractica,
    ...actividad.publica.ejemplos,
    ...actividad.publica.ejercicios.map(
      (ejercicio) =>
        ejercicio.enunciado
    ),
  ]
    .join(" ")
    .toLocaleLowerCase();

  const interesesPresentes =
    solicitud.contexto.intereses.filter(
      (interes) =>
        contenidoPersonalizable.includes(
          interes.toLocaleLowerCase()
        )
    );

  if (interesesPresentes.length === 0) {
    agregarIncidencia(
      incidencias,
      "QG-017",
      "advertencia",
      "No se detecta de forma literal ninguno de los intereses del alumno en la actividad."
    );
  }

  // ====================================================
  // 9. SEGURIDAD PUBLICA
  // ====================================================

  const contenidoPublico =
    JSON.stringify(
      actividad.publica
    );

  if (
    contenidoPublico.includes(
      "respuestaCorrecta"
    ) ||
    contenidoPublico.includes(
      "explicacionRespuesta"
    )
  ) {
    agregarIncidencia(
      incidencias,
      "QG-018",
      "bloqueante",
      "La parte publica contiene informacion reservada para la correccion."
    );
  }

  // ====================================================
  // RESULTADO
  // ====================================================

  const bloqueantes =
    incidencias.filter(
      (incidencia) =>
        incidencia.severidad === "bloqueante"
    ).length;

  const advertencias =
    incidencias.filter(
      (incidencia) =>
        incidencia.severidad === "advertencia"
    ).length;

  return {
    aprobado: bloqueantes === 0,
    incidencias,
    bloqueantes,
    advertencias,
  };
}