import "server-only";

// ======================================================
// INTERESTALK - BANCO DE PREGUNTAS V2
// 54 preguntas originales: A1-C2
// Grammar, Vocabulary y Reading
// Solo para desarrollo y validacion pedagogica.
// ======================================================

export const NIVELES = [
  "A1", "A2", "B1", "B2", "C1", "C2",
] as const;

export type NivelMCER = (typeof NIVELES)[number];

export type Competencia =
  | "grammar"
  | "vocabulary"
  | "reading";

export type PreguntaV2 = {
  id: string;
  idioma: string;
  nivel: NivelMCER;
  competencia: Competencia;
  objetivo: string;
  enunciado: string;
  contexto?: string;
  opciones: [string, string, string, string];
  respuestaCorrecta: number;
  explicacion: string;
};

type DatosPregunta = [
  string, // Objetivo
  string, // Enunciado
  string, // Opcion A
  string, // Opcion B
  string, // Opcion C
  string, // Opcion D
  number, // Indice de respuesta correcta
  string, // Explicacion
  string?, // Contexto opcional
];

type Grupo = {
  nivel: NivelMCER;
  competencia: Competencia;
  preguntas: DatosPregunta[];
};

// Cada grupo contiene tres preguntas originales.
// Las etiquetas MCER son provisionales, no calibradas.

const GRUPOS: Grupo[] = [
  // ==================== A1 ====================
  {
    nivel: "A1",
    competencia: "grammar",
    preguntas: [
      [
        "verb-to-be",
        "My name _____ Anna.",
        "am", "is", "are", "be", 1,
        "Con el sujeto 'my name' utilizamos 'is'.",
      ],
      [
        "present-simple",
        "I _____ in Madrid.",
        "lives", "living", "live", "am live", 2,
        "Con 'I' utilizamos la forma base 'live'.",
      ],
      [
        "articles",
        "She has _____ orange.",
        "a", "an", "the", "some", 1,
        "Usamos 'an' antes de un sonido vocal.",
      ],
    ],
  },
  {
    nivel: "A1",
    competencia: "vocabulary",
    preguntas: [
      [
        "family",
        "Your mother's brother is your _____.",
        "cousin", "uncle", "nephew", "grandfather", 1,
        "El hermano de tu madre es tu 'uncle'.",
      ],
      [
        "daily-routines",
        "Which activity do people usually do at night?",
        "Have breakfast", "Go to school",
        "Go to bed", "Have lunch", 2,
        "'Go to bed' significa acostarse.",
      ],
      [
        "basic-adjectives",
        "Which word is the opposite of 'big'?",
        "Tall", "Small", "Long", "Fast", 1,
        "El contrario de 'big' es 'small'.",
      ],
    ],
  },
  {
    nivel: "A1",
    competencia: "reading",
    preguntas: [
      [
        "personal-information",
        "Where does Tom live?",
        "London", "Paris", "Rome", "Berlin", 0,
        "El texto dice que Tom vive en Londres.",
        "Tom is 20 years old. He lives in London and studies English.",
      ],
      [
        "daily-routines",
        "How does Lisa travel to school?",
        "By car", "By bus", "By train", "On foot", 1,
        "Lisa utiliza el autobus.",
        "Lisa starts school at nine. Every morning, she takes the bus.",
      ],
      [
        "free-time",
        "What does Ben do on Sundays?",
        "He works", "He swims",
        "He plays football", "He studies", 2,
        "El texto indica que juega al futbol.",
        "Ben likes sports. On Sundays, he plays football with his friends.",
      ],
    ],
  },

  // ==================== A2 ====================
  {
    nivel: "A2",
    competencia: "grammar",
    preguntas: [
      [
        "past-simple",
        "Yesterday, we _____ to the cinema.",
        "go", "went", "gone", "going", 1,
        "'Went' es el pasado simple de 'go'.",
      ],
      [
        "comparatives",
        "This exercise is _____ than the last one.",
        "difficult", "most difficult",
        "more difficult", "difficulty", 2,
        "Los adjetivos largos forman el comparativo con 'more'.",
      ],
      [
        "present-continuous",
        "Look! The children _____ in the garden.",
        "play", "plays", "are playing", "played", 2,
        "La accion ocurre ahora: 'are playing'.",
      ],
    ],
  },
  {
    nivel: "A2",
    competencia: "vocabulary",
    preguntas: [
      [
        "travel",
        "Where do you usually catch a flight?",
        "Station", "Airport", "Hospital", "Library", 1,
        "Los vuelos salen de un aeropuerto.",
      ],
      [
        "health",
        "If you have a toothache, you should visit a _____.",
        "dentist", "pilot", "waiter", "teacher", 0,
        "El dentista trata problemas dentales.",
      ],
      [
        "shopping",
        "What does 'receipt' mean?",
        "A discount", "A shopping bag",
        "A payment record", "A shop assistant", 2,
        "'Receipt' es un recibo o justificante de compra.",
      ],
    ],
  },
  {
    nivel: "A2",
    competencia: "reading",
    preguntas: [
      [
        "travel-plans",
        "Why is Maria taking a train?",
        "To visit family", "To find work",
        "To attend a concert", "To study", 0,
        "Maria viaja para visitar a su hermana.",
        "Maria is travelling to Valencia on Friday. She is taking the train to visit her sister.",
      ],
      [
        "work-schedule",
        "When does the shop close on Saturdays?",
        "At four", "At five", "At six", "At seven", 2,
        "El horario del sabado termina a las seis.",
        "The shop closes at eight on weekdays, but at six on Saturdays.",
      ],
      [
        "weather-plans",
        "Why did they cancel the picnic?",
        "It was too hot", "It was raining",
        "They were busy", "The park closed", 1,
        "La lluvia impidio celebrar el picnic.",
        "We planned a picnic, but heavy rain started in the morning, so we stayed home.",
      ],
    ],
  },

  // ==================== B1 ====================
  {
    nivel: "B1",
    competencia: "grammar",
    preguntas: [
      [
        "second-conditional",
        "If I had more money, I _____ around the world.",
        "travel", "will travel",
        "would travel", "travelling", 2,
        "El segundo condicional utiliza 'would' y verbo base.",
      ],
      [
        "present-perfect",
        "She _____ in this company since 2020.",
        "works", "has worked", "worked", "is working", 1,
        "El presente perfecto expresa una situacion que continua.",
      ],
      [
        "relative-clauses",
        "The woman _____ lives next door is a doctor.",
        "which", "where", "who", "whose", 2,
        "'Who' introduce una relativa referida a una persona.",
      ],
    ],
  },
  {
    nivel: "B1",
    competencia: "vocabulary",
    preguntas: [
      [
        "synonyms",
        "Which word is closest to 'reliable'?",
        "Expensive", "Trustworthy",
        "Temporary", "Complicated", 1,
        "'Reliable' y 'trustworthy' expresan fiabilidad.",
      ],
      [
        "phrasal-verbs",
        "What does 'give up' mean in 'Don't give up'?",
        "Continue", "Stop trying",
        "Start again", "Work faster", 1,
        "'Give up' significa rendirse o dejar de intentarlo.",
      ],
      [
        "work-vocabulary",
        "What is a 'deadline'?",
        "A job interview", "A salary increase",
        "A final date", "A work meeting", 2,
        "'Deadline' es una fecha limite.",
      ],
    ],
  },
  {
    nivel: "B1",
    competencia: "reading",
    preguntas: [
      [
        "remote-work",
        "Why does Emma arrange video calls?",
        "To change jobs", "To stay connected",
        "To work less", "To avoid meetings", 1,
        "Las videollamadas le ayudan a mantener contacto.",
        "Emma enjoys working from home, but misses her colleagues. She arranges regular video calls to stay connected.",
      ],
      [
        "environment",
        "What is the main purpose of the new scheme?",
        "To reduce waste", "To sell more plastic",
        "To close shops", "To increase traffic", 0,
        "El objetivo principal es reducir residuos.",
        "The town introduced reusable containers in local shops to reduce packaging waste.",
      ],
      [
        "learning-strategies",
        "What helped Daniel improve his English?",
        "Memorising lists only", "Avoiding mistakes",
        "Practising regularly", "Changing schools", 2,
        "Daniel mejoro mediante practica constante.",
        "Daniel began speaking English for fifteen minutes daily. Over time, he became more confident.",
      ],
    ],
  },

  // ==================== B2 ====================
  {
    nivel: "B2",
    competencia: "grammar",
    preguntas: [
      [
        "past-perfect",
        "By the time we arrived, the meeting _____.",
        "already starts", "has already started",
        "had already started", "will already start", 2,
        "El pasado perfecto indica anterioridad en el pasado.",
      ],
      [
        "inversion",
        "Not only _____ late, but he also forgot the documents.",
        "he arrived", "did he arrive",
        "he did arrive", "arrived he", 1,
        "Tras 'not only' inicial se produce inversion.",
      ],
      [
        "passive-voice",
        "The report _____ by Friday.",
        "must complete", "must be completed",
        "must completed", "must be completing", 1,
        "La pasiva modal utiliza 'must be' + participio.",
      ],
    ],
  },
  {
    nivel: "B2",
    competencia: "vocabulary",
    preguntas: [
      [
        "collocations",
        "Which expression is correct?",
        "Make a decision", "Do a decision",
        "Take a decisioning", "Build a decision", 0,
        "'Make a decision' es una colocacion habitual.",
      ],
      [
        "abstract-vocabulary",
        "What does 'drawback' mean?",
        "An advantage", "A disadvantage",
        "A conclusion", "An opportunity", 1,
        "'Drawback' significa inconveniente.",
      ],
      [
        "phrasal-verbs",
        "What does 'bring up' mean in a meeting?",
        "Mention a topic", "Finish a project",
        "Reject an offer", "Cancel a meeting", 0,
        "'Bring up' puede significar plantear un asunto.",
      ],
    ],
  },
  {
    nivel: "B2",
    competencia: "reading",
    preguntas: [
      [
        "critical-reading",
        "What is the writer's main concern?",
        "Technology is too slow", "People lack devices",
        "Privacy may be affected", "Schools need funding", 2,
        "El texto plantea un riesgo para la privacidad.",
        "Digital services offer convenience, yet collecting personal information without clear safeguards can undermine privacy.",
      ],
      [
        "argumentation",
        "What does the author suggest about remote work?",
        "It always reduces costs", "It has benefits and limitations",
        "It should be prohibited", "It eliminates teamwork", 1,
        "El autor presenta ventajas y dificultades.",
        "Remote work offers flexibility, although organisations must address communication and collaboration challenges.",
      ],
      [
        "inference",
        "What can be inferred about the project?",
        "It was cancelled", "It needs further testing",
        "It is already perfect", "It has no supporters", 1,
        "Los resultados prometedores requieren mas pruebas.",
        "Initial results were promising, but researchers warned that larger trials would be necessary before wider adoption.",
      ],
    ],
  },

  // ==================== C1 ====================
  {
    nivel: "C1",
    competencia: "grammar",
    preguntas: [
      [
        "advanced-inversion",
        "Hardly _____ the meeting begun when the alarm sounded.",
        "had", "has", "did", "was", 0,
        "'Hardly had ... when' es una inversion avanzada.",
      ],
      [
        "subjunctive",
        "It is essential that every applicant _____ informed.",
        "is", "be", "was", "being", 1,
        "En ingles formal se usa el subjuntivo base 'be'.",
      ],
      [
        "mixed-conditionals",
        "If she had accepted the offer, she _____ in Berlin now.",
        "will live", "would live",
        "had lived", "would have lived", 1,
        "Condicional mixto: pasado hipotetico y resultado presente.",
      ],
    ],
  },
  {
    nivel: "C1",
    competencia: "vocabulary",
    preguntas: [
      [
        "nuanced-vocabulary",
        "Which word best means 'difficult to understand'?",
        "Lucid", "Obscure", "Explicit", "Evident", 1,
        "'Obscure' puede describir algo poco claro.",
      ],
      [
        "formal-register",
        "Which verb best replaces 'make worse' in formal writing?",
        "Alleviate", "Exacerbate",
        "Mitigate", "Rectify", 1,
        "'Exacerbate' significa agravar.",
      ],
      [
        "academic-language",
        "What does 'substantiate a claim' mean?",
        "Withdraw it", "Ignore it",
        "Support it with evidence", "Repeat it loudly", 2,
        "'Substantiate' significa aportar pruebas.",
      ],
    ],
  },
  {
    nivel: "C1",
    competencia: "reading",
    preguntas: [
      [
        "author-stance",
        "Which position does the author adopt?",
        "Unconditional support", "Complete rejection",
        "Cautious approval", "Indifference", 2,
        "Reconoce ventajas, pero exige salvaguardas.",
        "The initiative deserves consideration, provided that transparent safeguards are established before implementation.",
      ],
      [
        "implicit-meaning",
        "What is implied by the statement?",
        "The evidence is conclusive", "Further scrutiny is warranted",
        "The theory is irrelevant", "The issue is resolved", 1,
        "El texto cuestiona la suficiencia de la evidencia.",
        "Although widely cited, the findings rest on a relatively small sample and have yet to be independently replicated.",
      ],
      [
        "rhetorical-purpose",
        "Why does the writer mention the earlier failure?",
        "To provide a warning", "To praise the managers",
        "To introduce a new product", "To reject all innovation", 0,
        "El fracaso previo se usa como advertencia.",
        "Before committing substantial resources, decision-makers should recall how a similar initiative failed through inadequate planning.",
      ],
    ],
  },

  // ==================== C2 ====================
  {
    nivel: "C2",
    competencia: "grammar",
    preguntas: [
      [
        "complex-inversion",
        "No sooner _____ the announcement than objections emerged.",
        "they made", "had they made",
        "they had made", "did they made", 1,
        "'No sooner had ... than' requiere inversion.",
      ],
      [
        "formal-conditionals",
        "_____ the proposal to be rejected, a revised plan would be needed.",
        "Were", "Had", "Should", "If", 0,
        "'Were the proposal to be rejected' es una condicional formal.",
      ],
      [
        "advanced-concession",
        "_____ compelling the argument may seem, it lacks evidence.",
        "However", "Despite", "Although", "Whatever", 0,
        "'However + adjetivo + sujeto + verbo' expresa concesion.",
      ],
    ],
  },
  {
    nivel: "C2",
    competencia: "vocabulary",
    preguntas: [
      [
        "precision",
        "Which word best means 'deliberately ambiguous'?",
        "Unequivocal", "Equivocal",
        "Transparent", "Explicit", 1,
        "'Equivocal' significa ambiguo; la intencionalidad requiere contexto.",
      ],
      [
        "advanced-register",
        "Which verb means 'to publicly reject a belief'?",
        "Espouse", "Repudiate",
        "Endorse", "Embrace", 1,
        "'Repudiate' significa rechazar o repudiar.",
      ],
      [
        "semantic-nuance",
        "What does 'perfunctory' suggest?",
        "Deeply considered", "Done with little care",
        "Highly innovative", "Completely voluntary", 1,
        "'Perfunctory' describe algo hecho de manera superficial.",
      ],
    ],
  },
  {
    nivel: "C2",
    competencia: "reading",
    preguntas: [
      [
        "rhetorical-irony",
        "What is the tone of the final sentence?",
        "Sincere admiration", "Subtle irony",
        "Neutral reporting", "Open enthusiasm", 1,
        "El elogio aparente contrasta con la critica anterior.",
        "After months of delays and repeated errors, the committee finally delivered a report. A remarkable triumph of efficiency, indeed.",
      ],
      [
        "argumentative-nuance",
        "What distinction does the author emphasise?",
        "Popularity versus validity", "Cost versus speed",
        "Age versus experience", "Quantity versus availability", 0,
        "La aceptacion general no garantiza la validez.",
        "The widespread acceptance of a claim may explain its influence, but consensus alone cannot establish its validity.",
      ],
      [
        "qualified-conclusion",
        "Which interpretation best reflects the passage?",
        "All models are useless", "Predictions are always accurate",
        "Models are useful within their assumptions",
        "Uncertainty can be eliminated", 2,
        "Los modelos son utiles si se respetan sus supuestos.",
        "Predictive models can illuminate possible outcomes, yet their apparent precision should never obscure the assumptions on which they depend.",
      ],
    ],
  },
];

// Construir identificadores estables y objetos completos.
const BANCO: PreguntaV2[] = GRUPOS.flatMap((grupo) =>
  grupo.preguntas.map((datos, indice) => {
    const [
      objetivo,
      enunciado,
      opcionA,
      opcionB,
      opcionC,
      opcionD,
      respuestaCorrecta,
      explicacion,
      contexto,
    ] = datos;

    return {
      id:
        "en-" +
        grupo.nivel.toLowerCase() +
        "-" +
        grupo.competencia +
        "-" +
        String(indice + 1).padStart(3, "0"),
      idioma: "en",
      nivel: grupo.nivel,
      competencia: grupo.competencia,
      objetivo,
      enunciado,
      ...(contexto ? { contexto } : {}),
      opciones: [opcionA, opcionB, opcionC, opcionD],
      respuestaCorrecta,
      explicacion,
    };
  })
);

// Comprobaciones al cargar el modulo.
const ids = BANCO.map((p) => p.id);

if (
  BANCO.length !== 54 ||
  new Set(ids).size !== BANCO.length ||
  BANCO.some(
    (p) =>
      p.respuestaCorrecta < 0 ||
      p.respuestaCorrecta >= p.opciones.length
  )
) {
  throw new Error("Banco V2 inconsistente");
}

// Tipo que puede recibir el navegador.
export type PreguntaPublicaV2 = Omit<
  PreguntaV2,
  "respuestaCorrecta" | "explicacion"
>;

// Seleccion de preguntas sin soluciones.
export function obtenerPreguntasV2(
  idioma: string,
  nivel?: NivelMCER,
  competencia?: Competencia,
  excluirIds: string[] = []
): PreguntaPublicaV2[] {
  const excluidas = new Set(excluirIds);

  return BANCO.filter(
    (p) =>
      p.idioma === idioma &&
      (!nivel || p.nivel === nivel) &&
      (!competencia || p.competencia === competencia) &&
      !excluidas.has(p.id)
  ).map(
    ({
      respuestaCorrecta: _respuesta,
      explicacion: _explicacion,
      ...publica
    }) => publica
  );
}

// Correccion privada de una pregunta.
// No devolver este resultado antes de finalizar
// la evaluacion del alumno.
export function corregirPreguntaV2(
  preguntaId: string,
  respuesta: number
) {
  const pregunta = BANCO.find(
    (p) => p.id === preguntaId
  );

  if (!pregunta) {
    return null;
  }

  return {
    preguntaId,
    nivel: pregunta.nivel,
    competencia: pregunta.competencia,
    objetivo: pregunta.objetivo,
    correcta:
      Number.isInteger(respuesta) &&
      respuesta === pregunta.respuestaCorrecta,
  };
}

// Metadatos del banco, sin soluciones.
export function obtenerEstadisticasBancoV2() {
  return {
    total: BANCO.length,
    idioma: "en",
    niveles: NIVELES.map((nivel) => ({
      nivel,
      total: BANCO.filter(
        (p) => p.nivel === nivel
      ).length,
    })),
  };
}