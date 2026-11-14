// =====================================================
// INTERESTALK - CONFIGURACION DIAGNOSTICO V2
// Parametros del Interestalk Placement Test
//
// Configuracion experimental.
// No representa una certificacion oficial MCER.
// =====================================================

export const CONFIG_DIAGNOSTICO = {
  // Numero maximo de preguntas por evaluacion.
  maxPreguntas: 20,

  // Numero minimo deseado de preguntas.
  minPreguntas: 15,

  // Cobertura minima por competencia.
  coberturaMinima: {
    grammar: 5,
    vocabulary: 5,
    reading: 5,
  },

  // Reglas de cambio de dificultad.
  adaptacion: {
    aciertosParaSubir: 3,
    erroresParaBajar: 2,
  },

  // Niveles admitidos.
  niveles: [
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2",
  ],

  // Competencias evaluadas.
  competencias: [
    "grammar",
    "vocabulary",
    "reading",
  ],

  // Idiomas con banco de preguntas disponible.
  idiomasDisponibles: ["en"],

  // No permitir preguntas repetidas.
  permitirRepeticiones: false,

  // No mostrar respuestas correctas durante la prueba.
  mostrarSolucionesDurantePrueba: false,

  // La prueba no emite certificaciones oficiales.
  certificacionOficial: false,

  // Tiempo orientativo en minutos.
  duracionObjetivoMinutos: {
    minimo: 10,
    maximo: 15,
  },
} as const;

// Tipo de competencia admitida.
export type CompetenciaDiagnostico =
  keyof typeof CONFIG_DIAGNOSTICO.coberturaMinima;

// Devuelve el minimo exigido para una competencia.
export function obtenerCoberturaMinima(
  competencia: CompetenciaDiagnostico
): number {
  return CONFIG_DIAGNOSTICO.coberturaMinima[
    competencia
  ];
}

// Comprueba si se ha alcanzado la cobertura minima.
export function coberturaCompleta(
  conteos: Record<CompetenciaDiagnostico, number>
): boolean {
  return (
    conteos.grammar >=
      CONFIG_DIAGNOSTICO.coberturaMinima.grammar &&
    conteos.vocabulary >=
      CONFIG_DIAGNOSTICO.coberturaMinima.vocabulary &&
    conteos.reading >=
      CONFIG_DIAGNOSTICO.coberturaMinima.reading
  );
}

// Determina si se ha alcanzado el maximo de preguntas.
export function limitePreguntasAlcanzado(
  totalRespondidas: number
): boolean {
  return (
    totalRespondidas >=
    CONFIG_DIAGNOSTICO.maxPreguntas
  );
}

// Comprueba si un idioma tiene banco disponible.
export function idiomaDiagnosticoDisponible(
  idioma: string
): boolean {
  return CONFIG_DIAGNOSTICO.idiomasDisponibles.some(
    (disponible) => disponible === idioma
  );
}