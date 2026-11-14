
import type {
  InformePedagogico,
  ResultadoObjetivo,
} from "./informe-pedagogico";

import type {
  NivelMCER,
} from "./preguntas-v2";

// ======================================================
// INTERESTALK - SELECTOR PEDAGOGICO GRAMMAR V1
//
// Selecciona objetivos a partir del diagnostico.
// No utiliza Gemini.
// No modifica resultados ni estima niveles MCER.
// ======================================================

const NIVELES: NivelMCER[] = [
  "A1", "A2", "B1", "B2", "C1", "C2",
];

export type SeleccionGrammar = {
  competencia: "grammar";
  objetivo: string;
  nivel: NivelMCER;
  tipo: "refuerzo" | "consolidacion";
  evidencia: {
    preguntas: number;
    aciertos: number;
    errores: number;
    porcentaje: number;
  };
  motivo: string;
};

function indiceNivel(nivel: NivelMCER): number {
  return NIVELES.indexOf(nivel);
}

function distanciaNivel(
  nivelObjetivo: NivelMCER,
  nivelDeclarado: NivelMCER
): number {
  return Math.abs(
    indiceNivel(nivelObjetivo) -
    indiceNivel(nivelDeclarado)
  );
}

function ordenarObjetivos(
  a: ResultadoObjetivo,
  b: ResultadoObjetivo,
  nivelDeclarado: NivelMCER
): number {
  // Primero, contenidos del nivel declarado
  // o de niveles inferiores.
  const prioridadA =
    indiceNivel(a.nivel) <= indiceNivel(nivelDeclarado)
      ? 0
      : 1;

  const prioridadB =
    indiceNivel(b.nivel) <= indiceNivel(nivelDeclarado)
      ? 0
      : 1;

  if (prioridadA !== prioridadB) {
    return prioridadA - prioridadB;
  }

  // Entre objetivos del mismo grupo,
  // priorizar los mas cercanos al nivel declarado.
  const distanciaA = distanciaNivel(
    a.nivel,
    nivelDeclarado
  );

  const distanciaB = distanciaNivel(
    b.nivel,
    nivelDeclarado
  );

  if (distanciaA !== distanciaB) {
    return distanciaA - distanciaB;
  }

  // Priorizar mas errores observados.
  if (a.errores !== b.errores) {
    return b.errores - a.errores;
  }

  // Desempatar por menor porcentaje.
  if (a.porcentaje !== b.porcentaje) {
    return a.porcentaje - b.porcentaje;
  }

  // Orden estable y reproducible.
  return a.objetivo.localeCompare(b.objetivo);
}

export function seleccionarObjetivoGrammar(
  informe: InformePedagogico,
  nivelDeclarado: NivelMCER
): SeleccionGrammar | null {
  if (!NIVELES.includes(nivelDeclarado)) {
    throw new Error(
      "Nivel declarado no valido."
    );
  }

  const objetivosGrammar = informe.objetivos.filter(
    (item) =>
      item.competencia === "grammar" &&
      item.total > 0
  );

  if (objetivosGrammar.length === 0) {
    return null;
  }

  // PRIMERA OPCION: REFUERZO
  const objetivosConErrores = objetivosGrammar
    .filter((item) => item.errores > 0)
    .sort((a, b) =>
      ordenarObjetivos(a, b, nivelDeclarado)
    );

  if (objetivosConErrores.length > 0) {
    const seleccionado = objetivosConErrores[0];

    return {
      competencia: "grammar",
      objetivo: seleccionado.objetivo,
      nivel: seleccionado.nivel,
      tipo: "refuerzo",
      evidencia: {
        preguntas: seleccionado.total,
        aciertos: seleccionado.aciertos,
        errores: seleccionado.errores,
        porcentaje: seleccionado.porcentaje,
      },
      motivo:
        "Se han observado errores en este objetivo. " +
        "Se propone una actividad de refuerzo y una " +
        "comprobacion posterior del aprendizaje.",
    };
  }

  // SEGUNDA OPCION: CONSOLIDACION
  // Solo si se han evaluado objetivos de Grammar.
  const objetivosConsolidacion = [
    ...objetivosGrammar,
  ].sort((a, b) =>
    ordenarObjetivos(a, b, nivelDeclarado)
  );

  const seleccionado = objetivosConsolidacion[0];

  return {
    competencia: "grammar",
    objetivo: seleccionado.objetivo,
    nivel: seleccionado.nivel,
    tipo: "consolidacion",
    evidencia: {
      preguntas: seleccionado.total,
      aciertos: seleccionado.aciertos,
      errores: seleccionado.errores,
      porcentaje: seleccionado.porcentaje,
    },
    motivo:
      "No se han observado errores en los objetivos " +
      "gramaticales evaluados. Se propone consolidar " +
      "el aprendizaje con nuevos ejercicios.",
  };
}
