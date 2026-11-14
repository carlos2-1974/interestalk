import "server-only";

// ======================================================
// INTERESTALK - ORQUESTADOR ADAPTATIVO V1
//
// Coordina el banco de preguntas V2 y el motor
// adaptativo V2.
//
// Solo servidor. No importar en componentes cliente.
// ======================================================

import {
  obtenerPreguntasV2,
  corregirPreguntaV2,
  type PreguntaPublicaV2,
  type Competencia,
} from "./preguntas-v2";

import {
  crearEstadoAdaptativo,
  decidirSiguienteNivel,
  type EstadoAdaptativo,
  type NivelMCERAdaptativo,
  type RespuestaEvaluada,
} from "./adaptativo";

const COMPETENCIAS: Competencia[] = [
  "grammar",
  "vocabulary",
  "reading",
];

export type SesionDiagnostico = {
  idioma: string;
  estado: EstadoAdaptativo;
  historial: RespuestaEvaluada[];
  preguntasUsadas: string[];
  preguntaActualId: string | null;
  finalizada: boolean;
};

export type ResultadoPaso = {
  sesion: SesionDiagnostico;
  siguientePregunta: PreguntaPublicaV2 | null;
  respuestaCorrecta: boolean;
  movimiento: "subir" | "bajar" | "mantener";
  motivo: string;
};

// Crear una sesion inicial.
export function crearSesionDiagnostico(
  idioma: string,
  nivelInicial: NivelMCERAdaptativo
): SesionDiagnostico {
  return {
    idioma,
    estado: crearEstadoAdaptativo(nivelInicial),
    historial: [],
    preguntasUsadas: [],
    preguntaActualId: null,
    finalizada: false,
  };
}

// Determinar competencia menos evaluada.
// En empate, mantener el orden definido.
function elegirCompetencia(
  sesion: SesionDiagnostico
): Competencia {
  const conteos = COMPETENCIAS.map((competencia) => ({
    competencia,
    total: sesion.historial.filter((respuesta) => {
      const pregunta = obtenerPreguntasV2(
        sesion.idioma,
        undefined,
        competencia
      ).find((item) => item.id === respuesta.preguntaId);

      return Boolean(pregunta);
    }).length,
  }));

  conteos.sort((a, b) => a.total - b.total);

  return conteos[0].competencia;
}

// Seleccionar una pregunta sin repetir.
export function seleccionarSiguientePregunta(
  sesion: SesionDiagnostico
): PreguntaPublicaV2 | null {
  if (sesion.finalizada) {
    return null;
  }

  const nivel = sesion.estado.nivelActual;

  // Priorizar la competencia menos evaluada.
  const preferida = elegirCompetencia(sesion);

  const orden = [
    preferida,
    ...COMPETENCIAS.filter(
      (competencia) => competencia !== preferida
    ),
  ];

  for (const competencia of orden) {
    const disponibles = obtenerPreguntasV2(
      sesion.idioma,
      nivel,
      competencia,
      sesion.preguntasUsadas
    );

    if (disponibles.length > 0) {
      return disponibles[0];
    }
  }

  // Si el nivel se agota, no repetir preguntas
  // ni cambiar arbitrariamente de dificultad.
  return null;
}

// Preparar la primera pregunta.
export function iniciarSesionDiagnostico(
  idioma: string,
  nivelInicial: NivelMCERAdaptativo
) {
  const sesion = crearSesionDiagnostico(
    idioma,
    nivelInicial
  );

  const pregunta = seleccionarSiguientePregunta(sesion);

  if (!pregunta) {
    return {
      sesion: {
        ...sesion,
        finalizada: true,
      },
      pregunta: null,
    };
  }

  return {
    sesion: {
      ...sesion,
      preguntaActualId: pregunta.id,
      preguntasUsadas: [pregunta.id],
    },
    pregunta,
  };
}

// Evaluar una respuesta y preparar la siguiente.
export function procesarRespuestaDiagnostico(
  sesion: SesionDiagnostico,
  respuesta: number
): ResultadoPaso {
  if (sesion.finalizada) {
    throw new Error("La sesion ya ha finalizado.");
  }

  if (!sesion.preguntaActualId) {
    throw new Error("No existe una pregunta activa.");
  }

  if (
    !Number.isInteger(respuesta) ||
    respuesta < 0 ||
    respuesta > 3
  ) {
    throw new Error("Respuesta no valida.");
  }

  const evaluacion = corregirPreguntaV2(
    sesion.preguntaActualId,
    respuesta
  );

  if (!evaluacion) {
    throw new Error("Pregunta no encontrada.");
  }

  const nuevoHistorial: RespuestaEvaluada[] = [
    ...sesion.historial,
    {
      preguntaId: evaluacion.preguntaId,
      nivel: evaluacion.nivel,
      correcta: evaluacion.correcta,
    },
  ];

  const decision = decidirSiguienteNivel(
    sesion.estado,
    nuevoHistorial
  );

  const sesionActualizada: SesionDiagnostico = {
    ...sesion,
    estado: decision.estado,
    historial: nuevoHistorial,
    preguntaActualId: null,
  };

  const siguientePregunta =
    seleccionarSiguientePregunta(sesionActualizada);

  if (!siguientePregunta) {
    return {
      sesion: {
        ...sesionActualizada,
        finalizada: true,
      },
      siguientePregunta: null,
      respuestaCorrecta: evaluacion.correcta,
      movimiento: decision.movimiento,
      motivo:
        "No quedan preguntas disponibles en el nivel actual.",
    };
  }

  return {
    sesion: {
      ...sesionActualizada,
      preguntaActualId: siguientePregunta.id,
      preguntasUsadas: [
        ...sesionActualizada.preguntasUsadas,
        siguientePregunta.id,
      ],
    },
    siguientePregunta,
    respuestaCorrecta: evaluacion.correcta,
    movimiento: decision.movimiento,
    motivo: decision.motivo,
  };
}