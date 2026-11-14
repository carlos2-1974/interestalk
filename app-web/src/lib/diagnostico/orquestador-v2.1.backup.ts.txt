import "server-only";

// ======================================================
// INTERESTALK - ORQUESTADOR ADAPTATIVO V2.1
//
// Correccion de reutilizacion de evidencias.
// Banco de 54 preguntas.
// Maximo 20 preguntas.
// Cobertura minima por competencia.
// Modulo exclusivo del servidor.
//
// No determina ni certifica un nivel MCER.
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
  type MovimientoAdaptativo,
} from "./adaptativo";

import {
  CONFIG_DIAGNOSTICO,
  coberturaCompleta,
  limitePreguntasAlcanzado,
  idiomaDiagnosticoDisponible,
  type CompetenciaDiagnostico,
} from "./configuracion";

// ======================================================
// TIPOS
// ======================================================

export type MotivoFinalizacion =
  | "maximo_preguntas"
  | "sin_preguntas"
  | null;

export type EstadoFinalDiagnostico =
  | "en_curso"
  | "completado"
  | "incompleto";

export type ConteosCompetencias = Record<
  CompetenciaDiagnostico,
  number
>;

export type SesionDiagnosticoV2 = {
  idioma: string;
  estado: EstadoAdaptativo;
  historial: RespuestaEvaluada[];
  preguntasUsadas: string[];
  preguntaActualId: string | null;
  conteos: ConteosCompetencias;
  estadoFinal: EstadoFinalDiagnostico;
  motivoFinalizacion: MotivoFinalizacion;
};

export type ResultadoPasoV2 = {
  sesion: SesionDiagnosticoV2;
  siguientePregunta: PreguntaPublicaV2 | null;
  movimiento: MovimientoAdaptativo;
  motivo: string;
};

// ======================================================
// CONFIGURACION
// ======================================================

const COMPETENCIAS: Competencia[] = [
  "grammar",
  "vocabulary",
  "reading",
];

function crearConteos(): ConteosCompetencias {
  return {
    grammar: 0,
    vocabulary: 0,
    reading: 0,
  };
}

function validarNivel(
  nivel: string
): nivel is NivelMCERAdaptativo {
  return CONFIG_DIAGNOSTICO.niveles.some(
    (item) => item === nivel
  );
}

// ======================================================
// CREAR SESION
// ======================================================

export function crearSesionV2(
  idioma: string,
  nivelInicial: NivelMCERAdaptativo
): SesionDiagnosticoV2 {
  if (!idiomaDiagnosticoDisponible(idioma)) {
    throw new Error(
      "Idioma no disponible para el diagnostico."
    );
  }

  if (!validarNivel(nivelInicial)) {
    throw new Error(
      "Nivel inicial no valido."
    );
  }

  return {
    idioma,
    estado: crearEstadoAdaptativo(nivelInicial),
    historial: [],
    preguntasUsadas: [],
    preguntaActualId: null,
    conteos: crearConteos(),
    estadoFinal: "en_curso",
    motivoFinalizacion: null,
  };
}

// ======================================================
// PRIORIZACION DE COMPETENCIAS
// ======================================================

function ordenarCompetencias(
  conteos: ConteosCompetencias
): Competencia[] {
  return [...COMPETENCIAS].sort((a, b) => {
    const deficitA = Math.max(
      0,
      CONFIG_DIAGNOSTICO.coberturaMinima[a] -
        conteos[a]
    );

    const deficitB = Math.max(
      0,
      CONFIG_DIAGNOSTICO.coberturaMinima[b] -
        conteos[b]
    );

    if (deficitA !== deficitB) {
      return deficitB - deficitA;
    }

    return conteos[a] - conteos[b];
  });
}

// ======================================================
// SELECCION DE PREGUNTAS
// ======================================================

export function seleccionarPreguntaV2(
  sesion: SesionDiagnosticoV2
): PreguntaPublicaV2 | null {
  if (sesion.estadoFinal !== "en_curso") {
    return null;
  }

  if (
    limitePreguntasAlcanzado(
      sesion.historial.length
    )
  ) {
    return null;
  }

  const nivel = sesion.estado.nivelActual;

  const competencias = ordenarCompetencias(
    sesion.conteos
  );

  for (const competencia of competencias) {
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

  // Nunca repetir preguntas ni cambiar de nivel
  // arbitrariamente para rellenar la evaluacion.
  return null;
}

// ======================================================
// INICIAR DIAGNOSTICO
// ======================================================

export function iniciarDiagnosticoV2(
  idioma: string,
  nivelInicial: NivelMCERAdaptativo
) {
  const sesion = crearSesionV2(
    idioma,
    nivelInicial
  );

  const pregunta = seleccionarPreguntaV2(sesion);

  if (!pregunta) {
    return {
      sesion: {
        ...sesion,
        estadoFinal: "incompleto" as const,
        motivoFinalizacion: "sin_preguntas" as const,
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

// ======================================================
// FINALIZACION
// ======================================================

function finalizarSesion(
  sesion: SesionDiagnosticoV2,
  motivo: Exclude<MotivoFinalizacion, null>
): SesionDiagnosticoV2 {
  const cobertura = coberturaCompleta(
    sesion.conteos
  );

  const suficientesPreguntas =
    sesion.historial.length >=
    CONFIG_DIAGNOSTICO.minPreguntas;

  return {
    ...sesion,
    preguntaActualId: null,
    estadoFinal:
      cobertura && suficientesPreguntas
        ? "completado"
        : "incompleto",
    motivoFinalizacion: motivo,
  };
}

// ======================================================
// PROCESAR RESPUESTA
// ======================================================

export function procesarRespuestaV2(
  sesion: SesionDiagnosticoV2,
  respuesta: number
): ResultadoPasoV2 {
  if (sesion.estadoFinal !== "en_curso") {
    throw new Error(
      "La evaluacion ya ha finalizado."
    );
  }

  if (!sesion.preguntaActualId) {
    throw new Error(
      "No existe una pregunta activa."
    );
  }

  if (
    !Number.isInteger(respuesta) ||
    respuesta < 0 ||
    respuesta > 3
  ) {
    throw new Error(
      "Respuesta no valida."
    );
  }

  const evaluacion = corregirPreguntaV2(
    sesion.preguntaActualId,
    respuesta
  );

  if (!evaluacion) {
    throw new Error(
      "Pregunta no encontrada."
    );
  }

  const nuevoHistorial: RespuestaEvaluada[] = [
    ...sesion.historial,
    {
      preguntaId: evaluacion.preguntaId,
      nivel: evaluacion.nivel,
      correcta: evaluacion.correcta,
    },
  ];

  const nuevosConteos: ConteosCompetencias = {
    ...sesion.conteos,
    [evaluacion.competencia]:
      sesion.conteos[evaluacion.competencia] + 1,
  };

  // ====================================================
  // CORRECCION V2.1
  //
  // Se utiliza el historial completo.
  // respuestasConsumidas indica el punto posterior
  // al ultimo cambio de dificultad.
  //
  // Nunca se recuperan respuestas antiguas cuando
  // el alumno vuelve a un nivel anterior.
  // ====================================================

  const nivelActual = sesion.estado.nivelActual;

  // Respuestas posteriores al ultimo cambio.
  const respuestasNuevas = nuevoHistorial.slice(
    sesion.estado.respuestasConsumidas
  );

  // Solo considerar la racha final de preguntas
  // realizadas al nivel actual.
  const rachaNivelActual: RespuestaEvaluada[] = [];

  for (
    let i = respuestasNuevas.length - 1;
    i >= 0;
    i--
  ) {
    const item = respuestasNuevas[i];

    if (item.nivel !== nivelActual) {
      break;
    }

    rachaNivelActual.unshift(item);
  }

  // Estado temporal relativo a las respuestas
  // nuevas del nivel actual.
  const estadoTemporal: EstadoAdaptativo = {
    nivelActual,
    respuestasConsumidas: 0,
    cambiosRealizados:
      sesion.estado.cambiosRealizados,
  };

  const decision = decidirSiguienteNivel(
    estadoTemporal,
    rachaNivelActual
  );

  // Si existe un cambio de dificultad, consumir
  // todas las respuestas hasta este momento.
  const nuevoEstado: EstadoAdaptativo = {
    nivelActual: decision.nivelSiguiente,
    respuestasConsumidas:
      decision.movimiento === "mantener"
        ? sesion.estado.respuestasConsumidas
        : nuevoHistorial.length,
    cambiosRealizados:
      decision.estado.cambiosRealizados,
  };

  const sesionActualizada: SesionDiagnosticoV2 = {
    ...sesion,
    estado: nuevoEstado,
    historial: nuevoHistorial,
    conteos: nuevosConteos,
    preguntaActualId: null,
  };

  // Finalizar al alcanzar el maximo.
  if (
    limitePreguntasAlcanzado(
      nuevoHistorial.length
    )
  ) {
    return {
      sesion: finalizarSesion(
        sesionActualizada,
        "maximo_preguntas"
      ),
      siguientePregunta: null,
      movimiento: decision.movimiento,
      motivo: "Limite de preguntas alcanzado.",
    };
  }

  const siguientePregunta = seleccionarPreguntaV2(
    sesionActualizada
  );

  if (!siguientePregunta) {
    return {
      sesion: finalizarSesion(
        sesionActualizada,
        "sin_preguntas"
      ),
      siguientePregunta: null,
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
    movimiento: decision.movimiento,
    motivo: decision.motivo,
  };
}

// ======================================================
// RESUMEN
// ======================================================

export function resumirSesionV2(
  sesion: SesionDiagnosticoV2
) {
  const total = sesion.historial.length;

  const aciertos = sesion.historial.filter(
    (item) => item.correcta
  ).length;

  return {
    estado: sesion.estadoFinal,
    motivoFinalizacion:
      sesion.motivoFinalizacion,
    preguntasRespondidas: total,
    aciertos,
    porcentaje:
      total > 0
        ? Math.round((aciertos / total) * 100)
        : 0,
    conteos: sesion.conteos,
    coberturaCompleta: coberturaCompleta(
      sesion.conteos
    ),
    dificultadFinal:
      sesion.estado.nivelActual,
    cambiosDificultad:
      sesion.estado.cambiosRealizados,
    nivelMCERCertificado: false,
  };
}