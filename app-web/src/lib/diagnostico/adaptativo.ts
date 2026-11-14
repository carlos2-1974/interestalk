// =====================================================
// INTERESTALK - MOTOR ADAPTATIVO V2
// Control de evidencias consumidas
//
// Decide la dificultad de la siguiente pregunta.
// NO certifica ni determina por si solo el nivel MCER.
// =====================================================

export const NIVELES_MCER = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

export type NivelMCERAdaptativo =
  (typeof NIVELES_MCER)[number];

export type RespuestaEvaluada = {
  preguntaId: string;
  nivel: NivelMCERAdaptativo;
  correcta: boolean;
};

export type MovimientoAdaptativo =
  | "subir"
  | "bajar"
  | "mantener";

export type EstadoAdaptativo = {
  nivelActual: NivelMCERAdaptativo;

  // Indice desde el que se evaluaran nuevas respuestas.
  respuestasConsumidas: number;

  // Historial de decisiones de cambio de dificultad.
  cambiosRealizados: number;
};

export type DecisionAdaptativa = {
  nivelAnterior: NivelMCERAdaptativo;
  nivelSiguiente: NivelMCERAdaptativo;
  movimiento: MovimientoAdaptativo;
  motivo: string;

  // Nuevo estado para la siguiente evaluacion.
  estado: EstadoAdaptativo;
};

// Crear el estado inicial de una evaluacion.
export function crearEstadoAdaptativo(
  nivelInicial: NivelMCERAdaptativo
): EstadoAdaptativo {
  return {
    nivelActual: nivelInicial,
    respuestasConsumidas: 0,
    cambiosRealizados: 0,
  };
}

function contarRacha(
  historial: RespuestaEvaluada[],
  correcta: boolean
): number {
  let contador = 0;

  for (let i = historial.length - 1; i >= 0; i--) {
    if (historial[i].correcta !== correcta) {
      break;
    }

    contador++;
  }

  return contador;
}

// Funcion principal del motor adaptativo.
export function decidirSiguienteNivel(
  estado: EstadoAdaptativo,
  historial: RespuestaEvaluada[]
): DecisionAdaptativa {
  const nivelActual = estado.nivelActual;

  const indiceNivel = NIVELES_MCER.indexOf(
    nivelActual
  );

  // Evitar indices invalidos.
  const inicio = Math.max(
    0,
    Math.min(
      estado.respuestasConsumidas,
      historial.length
    )
  );

  // Solo se utilizan respuestas no consumidas.
  const nuevasRespuestas = historial.slice(inicio);

  const estadoSinCambios: EstadoAdaptativo = {
    ...estado,
  };

  if (nuevasRespuestas.length === 0) {
    return {
      nivelAnterior: nivelActual,
      nivelSiguiente: nivelActual,
      movimiento: "mantener",
      motivo: "No hay nuevas respuestas para evaluar.",
      estado: estadoSinCambios,
    };
  }

  const rachaCorrectas = contarRacha(
    nuevasRespuestas,
    true
  );

  const rachaIncorrectas = contarRacha(
    nuevasRespuestas,
    false
  );

  // TRES ACIERTOS: SUBIR DIFICULTAD
  if (rachaCorrectas >= 3) {
    if (indiceNivel < NIVELES_MCER.length - 1) {
      const siguiente = NIVELES_MCER[
        indiceNivel + 1
      ];

      const nuevoEstado: EstadoAdaptativo = {
        nivelActual: siguiente,
        respuestasConsumidas: historial.length,
        cambiosRealizados:
          estado.cambiosRealizados + 1,
      };

      return {
        nivelAnterior: nivelActual,
        nivelSiguiente: siguiente,
        movimiento: "subir",
        motivo:
          "Tres aciertos nuevos consecutivos.",
        estado: nuevoEstado,
      };
    }

    return {
      nivelAnterior: nivelActual,
      nivelSiguiente: nivelActual,
      movimiento: "mantener",
      motivo: "Limite superior C2 alcanzado.",
      estado: estadoSinCambios,
    };
  }

  // DOS ERRORES: BAJAR DIFICULTAD
  if (rachaIncorrectas >= 2) {
    if (indiceNivel > 0) {
      const siguiente = NIVELES_MCER[
        indiceNivel - 1
      ];

      const nuevoEstado: EstadoAdaptativo = {
        nivelActual: siguiente,
        respuestasConsumidas: historial.length,
        cambiosRealizados:
          estado.cambiosRealizados + 1,
      };

      return {
        nivelAnterior: nivelActual,
        nivelSiguiente: siguiente,
        movimiento: "bajar",
        motivo:
          "Dos errores nuevos consecutivos.",
        estado: nuevoEstado,
      };
    }

    return {
      nivelAnterior: nivelActual,
      nivelSiguiente: nivelActual,
      movimiento: "mantener",
      motivo: "Limite inferior A1 alcanzado.",
      estado: estadoSinCambios,
    };
  }

  return {
    nivelAnterior: nivelActual,
    nivelSiguiente: nivelActual,
    movimiento: "mantener",
    motivo:
      "Evidencia nueva insuficiente para cambiar dificultad.",
    estado: estadoSinCambios,
  };
}

// Resumen descriptivo de rendimiento.
export function resumirRendimiento(
  historial: RespuestaEvaluada[]
) {
  const total = historial.length;

  const aciertos = historial.filter(
    (respuesta) => respuesta.correcta
  ).length;

  return {
    total,
    aciertos,
    errores: total - aciertos,
    porcentaje:
      total > 0
        ? Math.round((aciertos / total) * 100)
        : 0,
  };
}