import "server-only";

// ======================================================
// INTERESTALK - INFORME PEDAGOGICO V1
//
// Analiza respuestas del diagnostico adaptativo.
// Prepara informacion para el futuro CMD.
//
// No certifica ni estima un nivel MCER calibrado.
// ======================================================

import {
  obtenerPreguntasV2,
  type Competencia,
  type NivelMCER,
} from "./preguntas-v2";

import type {
  RespuestaEvaluada,
} from "./adaptativo";

// ------------------------------------------------------
// TIPOS
// ------------------------------------------------------

export type ResultadoCompetencia = {
  competencia: Competencia;
  total: number;
  aciertos: number;
  errores: number;
  porcentaje: number;
};

export type ResultadoNivel = {
  nivel: NivelMCER;
  total: number;
  aciertos: number;
  errores: number;
  porcentaje: number;
};

export type ResultadoObjetivo = {
  objetivo: string;
  competencia: Competencia;
  nivel: NivelMCER;
  total: number;
  aciertos: number;
  errores: number;
  porcentaje: number;
};

export type RecomendacionPedagogica = {
  prioridad: number;
  competencia: Competencia;
  objetivo: string;
  nivel: NivelMCER;
  motivo: string;
};

export type InformePedagogico = {
  total: number;
  aciertos: number;
  errores: number;
  porcentaje: number;
  competencias: ResultadoCompetencia[];
  niveles: ResultadoNivel[];
  objetivos: ResultadoObjetivo[];
  recomendaciones: RecomendacionPedagogica[];
  nivelMCERCertificado: false;
};

// ------------------------------------------------------
// CONSTANTES
// ------------------------------------------------------

const COMPETENCIAS: Competencia[] = [
  "grammar",
  "vocabulary",
  "reading",
];

const NIVELES: NivelMCER[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
];

function porcentaje(
  aciertos: number,
  total: number
): number {
  return total > 0
    ? Math.round((aciertos / total) * 100)
    : 0;
}

// ------------------------------------------------------
// GENERAR INFORME
// ------------------------------------------------------

export function generarInformePedagogico(
  idioma: string,
  historial: RespuestaEvaluada[]
): InformePedagogico {
  const banco = obtenerPreguntasV2(idioma);

  const mapaPreguntas = new Map(
    banco.map((pregunta) => [
      pregunta.id,
      pregunta,
    ])
  );

  const registros = historial.map((respuesta) => {
    const pregunta = mapaPreguntas.get(
      respuesta.preguntaId
    );

    if (!pregunta) {
      throw new Error(
        "Pregunta no encontrada en el banco."
      );
    }

    return {
      ...respuesta,
      competencia: pregunta.competencia,
      objetivo: pregunta.objetivo,
      nivel: pregunta.nivel,
    };
  });

  const total = registros.length;

  const aciertos = registros.filter(
    (registro) => registro.correcta
  ).length;

  // ----------------------------------------------------
  // RESULTADOS POR COMPETENCIA
  // ----------------------------------------------------

  const competencias = COMPETENCIAS.map(
    (competencia): ResultadoCompetencia => {
      const items = registros.filter(
        (registro) =>
          registro.competencia === competencia
      );

      const correctas = items.filter(
        (item) => item.correcta
      ).length;

      return {
        competencia,
        total: items.length,
        aciertos: correctas,
        errores: items.length - correctas,
        porcentaje: porcentaje(
          correctas,
          items.length
        ),
      };
    }
  );

  // ----------------------------------------------------
  // RESULTADOS POR NIVEL DE DIFICULTAD
  // ----------------------------------------------------

  const niveles = NIVELES.map(
    (nivel): ResultadoNivel => {
      const items = registros.filter(
        (registro) =>
          registro.nivel === nivel
      );

      const correctas = items.filter(
        (item) => item.correcta
      ).length;

      return {
        nivel,
        total: items.length,
        aciertos: correctas,
        errores: items.length - correctas,
        porcentaje: porcentaje(
          correctas,
          items.length
        ),
      };
    }
  );

  // ----------------------------------------------------
  // RESULTADOS POR OBJETIVO LINGUISTICO
  // ----------------------------------------------------

  const gruposObjetivos = new Map<
    string,
    ResultadoObjetivo
  >();

  for (const registro of registros) {
    const clave = [
      registro.competencia,
      registro.nivel,
      registro.objetivo,
    ].join("|");

    const existente = gruposObjetivos.get(clave);

    if (existente) {
      existente.total++;
      if (registro.correcta) {
        existente.aciertos++;
      } else {
        existente.errores++;
      }
    } else {
      gruposObjetivos.set(clave, {
        objetivo: registro.objetivo,
        competencia: registro.competencia,
        nivel: registro.nivel,
        total: 1,
        aciertos: registro.correcta ? 1 : 0,
        errores: registro.correcta ? 0 : 1,
        porcentaje: 0,
      });
    }
  }

  const objetivos = Array.from(
    gruposObjetivos.values()
  ).map((objetivo) => ({
    ...objetivo,
    porcentaje: porcentaje(
      objetivo.aciertos,
      objetivo.total
    ),
  }));

  // ----------------------------------------------------
  // RECOMENDACIONES INICIALES
  // ----------------------------------------------------

  // Priorizar objetivos con errores.
  // Estas recomendaciones son orientativas.
  // Una sola pregunta fallada no demuestra
  // falta de dominio de una competencia.

  const recomendaciones = objetivos
    .filter((objetivo) => objetivo.errores > 0)
    .sort((a, b) => {
      if (a.porcentaje !== b.porcentaje) {
        return a.porcentaje - b.porcentaje;
      }

      return b.errores - a.errores;
    })
    .slice(0, 5)
    .map(
      (
        objetivo,
        indice
      ): RecomendacionPedagogica => ({
        prioridad: indice + 1,
        competencia: objetivo.competencia,
        objetivo: objetivo.objetivo,
        nivel: objetivo.nivel,
        motivo:
          "Se han observado errores en este objetivo durante el diagnostico. Conviene reforzarlo y verificar el aprendizaje con nuevas actividades.",
      })
    );

  return {
    total,
    aciertos,
    errores: total - aciertos,
    porcentaje: porcentaje(
      aciertos,
      total
    ),
    competencias,
    niveles,
    objetivos,
    recomendaciones,
    nivelMCERCertificado: false,
  };
}