
import type {
  PerfilPedagogico,
} from "./perfil-pedagogico";

import type {
  NivelMCER,
} from "./preguntas-v2";

// ======================================================
// INTERESTALK - MOTOR DE RECOMENDACIONES V1
//
// Convierte el perfil pedagogico en una recomendacion.
//
// No llama a Gemini.
// No modifica el diagnostico.
// No certifica niveles MCER.
// No almacena datos.
// ======================================================

export type RecomendacionPedagogica = {
  version: 1;
  competencia: "grammar";
  objetivo: string;
  nivelReferencia: NivelMCER;
  tipo: "refuerzo" | "consolidacion";
  actividad: "practica-guiada" | "practica-contextual";
  duracionMinutos: number;
  estado: "pendiente";
  motivo: string;
  evidencia: {
    preguntas: number;
    aciertos: number;
    errores: number;
    porcentaje: number;
  };
};

export function generarRecomendacionPedagogica(
  perfil: PerfilPedagogico
): RecomendacionPedagogica | null {

  // Solo recomendar con diagnostico completado.
  if (perfil.estadoDiagnostico !== "completado") {
    return null;
  }

  // No inventar objetivos sin evidencia.
  if (perfil.grammar === null) {
    return null;
  }

  const seleccion = perfil.grammar;

  // Validar coherencia de los resultados.
  if (
    seleccion.evidencia.preguntas <= 0 ||
    seleccion.evidencia.aciertos +
      seleccion.evidencia.errores !==
      seleccion.evidencia.preguntas
  ) {
    throw new Error(
      "Evidencia pedagogica inconsistente."
    );
  }

  const esRefuerzo =
    seleccion.tipo === "refuerzo";

  return {
    version: 1,
    competencia: "grammar",
    objetivo: seleccion.objetivo,
    nivelReferencia: seleccion.nivel,
    tipo: seleccion.tipo,
    actividad: esRefuerzo
      ? "practica-guiada"
      : "practica-contextual",
    duracionMinutos: esRefuerzo ? 10 : 8,
    estado: "pendiente",
    motivo: seleccion.motivo,
    evidencia: {
      preguntas: seleccion.evidencia.preguntas,
      aciertos: seleccion.evidencia.aciertos,
      errores: seleccion.evidencia.errores,
      porcentaje: seleccion.evidencia.porcentaje,
    },
  };
}
