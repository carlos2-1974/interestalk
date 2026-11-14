import "server-only";

// =====================================================
// INTERESTALK - BANCO DE PREGUNTAS V1
// Diagnostico original inspirado en MCER
// No contiene preguntas oficiales de Cambridge
// =====================================================

export type NivelMCER =
  | "A1"
  | "A2"
  | "B1"
  | "B2"
  | "C1"
  | "C2";

export type Competencia =
  | "grammar"
  | "vocabulary"
  | "reading";

export type PreguntaDiagnostico = {
  id: string;
  idioma: string;
  nivel: NivelMCER;
  competencia: Competencia;
  enunciado: string;
  contexto?: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string;
};

// Banco privado: nunca enviar este objeto completo
// al navegador.
const BANCO_PREGUNTAS: PreguntaDiagnostico[] = [
  {
    id: "en-a2-grammar-001",
    idioma: "en",
    nivel: "A2",
    competencia: "grammar",
    enunciado: "She _____ to work every morning.",
    opciones: [
      "go",
      "goes",
      "going",
      "is go",
    ],
    respuestaCorrecta: 1,
    explicacion:
      "En presente simple, la tercera persona singular utiliza 'goes'.",
  },
  {
    id: "en-b1-vocabulary-001",
    idioma: "en",
    nivel: "B1",
    competencia: "vocabulary",
    enunciado:
      "Which word is closest in meaning to 'reliable'?",
    opciones: [
      "Expensive",
      "Trustworthy",
      "Temporary",
      "Complicated",
    ],
    respuestaCorrecta: 1,
    explicacion:
      "'Reliable' significa fiable; 'trustworthy' tiene un significado similar.",
  },
  {
    id: "en-b1-grammar-001",
    idioma: "en",
    nivel: "B1",
    competencia: "grammar",
    enunciado:
      "If I had more time, I _____ another language.",
    opciones: [
      "learn",
      "will learn",
      "would learn",
      "learning",
    ],
    respuestaCorrecta: 2,
    explicacion:
      "El segundo condicional utiliza 'if + past simple' y 'would + verbo base'.",
  },
  {
    id: "en-b1-reading-001",
    idioma: "en",
    nivel: "B1",
    competencia: "reading",
    contexto:
      "Emma recently started working from home. " +
      "Although she enjoys avoiding the daily commute, " +
      "she sometimes misses talking to her colleagues. " +
      "To stay connected, she schedules regular video calls.",
    enunciado:
      "Why does Emma schedule regular video calls?",
    opciones: [
      "To find another job",
      "To stay connected with colleagues",
      "To avoid working",
      "To reduce her working hours",
    ],
    respuestaCorrecta: 1,
    explicacion:
      "El texto indica que Emma organiza videollamadas para mantenerse en contacto con sus compañeros.",
  },
  {
    id: "en-b2-grammar-001",
    idioma: "en",
    nivel: "B2",
    competencia: "grammar",
    enunciado:
      "By the time we arrived, the meeting _____.",
    opciones: [
      "already starts",
      "has already started",
      "had already started",
      "will already start",
    ],
    respuestaCorrecta: 2,
    explicacion:
      "El pasado perfecto expresa una acción anterior a otra acción pasada.",
  },
];

// Tipo publico: excluye soluciones y explicaciones.
export type PreguntaPublica = Omit<
  PreguntaDiagnostico,
  "respuestaCorrecta" | "explicacion"
>;

// Devuelve preguntas sin soluciones.
export function obtenerPreguntasPublicas(
  idioma: string
): PreguntaPublica[] {
  return BANCO_PREGUNTAS
    .filter((pregunta) => pregunta.idioma === idioma)
    .map(
      ({
        respuestaCorrecta: _respuesta,
        explicacion: _explicacion,
        ...pregunta
      }) => pregunta
    );
}

// Corrige respuestas exclusivamente en el servidor.
export function corregirDiagnostico(
  idioma: string,
  respuestas: Record<string, number>
) {
  const preguntas = BANCO_PREGUNTAS.filter(
    (pregunta) => pregunta.idioma === idioma
  );

  let aciertos = 0;

  const detalle = preguntas.map((pregunta) => {
    const respuesta = respuestas[pregunta.id];

    const correcta =
      Number.isInteger(respuesta) &&
      respuesta === pregunta.respuestaCorrecta;

    if (correcta) {
      aciertos++;
    }

    return {
      preguntaId: pregunta.id,
      competencia: pregunta.competencia,
      nivel: pregunta.nivel,
      correcta,
    };
  });

  return {
    total: preguntas.length,
    aciertos,
    porcentaje:
      preguntas.length > 0
        ? Math.round((aciertos / preguntas.length) * 100)
        : 0,
    detalle,
  };
}