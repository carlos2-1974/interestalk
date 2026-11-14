import {
  crearEventoEducativoGrammar,
} from "./memoria-educativa";

import type {
  ActividadGrammarCompleta,
} from "@/lib/grammar/tipos";

import type {
  ResultadoCorreccionGrammar,
} from "@/lib/grammar/correccion";

// ======================================================
// INTERESTALK - CMD
// TEST MEMORIA EDUCATIVA V1
//
// Comprueba:
// - creacion de evento educativo;
// - identidad y trazabilidad;
// - evidencia de origen;
// - resultado de aprendizaje;
// - interes utilizado;
// - intento y fecha;
// - seguridad pedagogica;
// - rechazo de incoherencias.
//
// No utiliza Gemini.
// ======================================================

let superadas = 0;
let fallidas = 0;

function comprobar(
  nombre: string,
  condicion: boolean
): void {
  if (condicion) {
    superadas++;

    console.log(
      "CORRECTO - " + nombre
    );
  } else {
    fallidas++;

    console.error(
      "ERROR - " + nombre
    );
  }
}

function rechaza(
  accion: () => unknown
): boolean {
  try {
    accion();

    return false;
  } catch {
    return true;
  }
}

// ======================================================
// ACTIVIDAD GRAMMAR DE REFERENCIA
//
// Representa una actividad generada despues de que
// el diagnostico detectase una necesidad.
// ======================================================

const actividad:
  ActividadGrammarCompleta = {
  publica: {
    version: 1,

    actividadId:
      "grammar-cmd-test-001",

    objetivoGrammar:
      "second-conditional",

    nivelContenido:
      "B1",

    tipoActividad:
      "refuerzo",

    titulo:
      "Second Conditional con tecnologia",

    introduccion:
      "Practica situaciones hipoteticas.",

    explicacion:
      "El segundo condicional se utiliza para " +
      "situaciones hipoteticas o poco probables.",

    regla:
      "If + past simple, would + base verb.",

    ejemplos: [
      "If I had more time, I would learn AI.",
      "If I were a developer, I would build an app.",
    ],

    erroresFrecuentes: [
      "Usar will en lugar de would.",
      "Usar presente simple despues de if.",
    ],

    ejercicios: [
      {
        id: "e1",
        tipo: "opcion_multiple",
        enunciado:
          "Choose the correct option.",
        opciones: [
          "were",
          "am",
          "will be",
        ],
      },

      {
        id: "e2",
        tipo: "completar",
        enunciado:
          "I ___ use it every day.",
        opciones: null,
      },

      {
        id: "e3",
        tipo: "opcion_multiple",
        enunciado:
          "What ___ you do?",
        opciones: [
          "would",
          "will",
          "do",
        ],
      },

      {
        id: "e4",
        tipo: "completar",
        enunciado:
          "If I ___ in AI, I would learn faster.",
        opciones: null,
      },

      {
        id: "e5",
        tipo: "transformar",
        enunciado:
          "Transforma la frase al segundo condicional.",
        opciones: null,
      },
    ],

    aplicacionPractica:
      "Describe una situacion hipotetica relacionada " +
      "con tecnologia.",
  },

  privada: {
    actividadId:
      "grammar-cmd-test-001",

    soluciones: [
      {
        ejercicioId: "e1",
        respuestaCorrecta:
          "were",
        explicacion:
          "Usamos pasado simple.",
      },

      {
        ejercicioId: "e2",
        respuestaCorrecta:
          "would",
        explicacion:
          "La clausula principal utiliza would.",
      },

      {
        ejercicioId: "e3",
        respuestaCorrecta:
          "would",
        explicacion:
          "La pregunta utiliza would.",
      },

      {
        ejercicioId: "e4",
        respuestaCorrecta:
          "invested",
        explicacion:
          "La clausula if utiliza pasado simple.",
      },

      {
        ejercicioId: "e5",
        respuestaCorrecta:
          "If I had a smart watch, I would monitor my heart rate.",
        explicacion:
          "Segundo condicional: if + pasado, would + verbo.",
      },
    ],
  },

  origenPedagogico: {
    objetivo:
      "second-conditional",

    nivel:
      "B1",

    tipo:
      "refuerzo",

    evidencia: {
      preguntas: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },

    motivo:
      "Se han observado errores en este objetivo.",
  },
};

// ======================================================
// RESULTADO DE REFERENCIA
//
// Simula la prueba real realizada en navegador:
//
// 2/5
// 40%
// reforzar
// ======================================================

const resultado:
  ResultadoCorreccionGrammar = {
  actividadId:
    "grammar-cmd-test-001",

  objetivoGrammar:
    "second-conditional",

  nivelContenido:
    "B1",

  tipoActividad:
    "refuerzo",

  total:
    5,

  aciertos:
    2,

  errores:
    3,

  porcentaje:
    40,

  resultados: [
    {
      ejercicioId: "e1",
      respuestaAlumno: "were",
      respuestaCorrecta: "were",
      correcto: true,
      explicacion: "Correcto.",
    },

    {
      ejercicioId: "e2",
      respuestaAlumno: "wd",
      respuestaCorrecta: "would",
      correcto: false,
      explicacion: "Debes utilizar would.",
    },

    {
      ejercicioId: "e3",
      respuestaAlumno: "would",
      respuestaCorrecta: "would",
      correcto: true,
      explicacion: "Correcto.",
    },

    {
      ejercicioId: "e4",
      respuestaAlumno: "invest",
      respuestaCorrecta: "invested",
      correcto: false,
      explicacion: "Debes utilizar pasado simple.",
    },

    {
      ejercicioId: "e5",
      respuestaAlumno:
        "If I have a smart watch, I monitor my heart rate.",
      respuestaCorrecta:
        "If I had a smart watch, I would monitor my heart rate.",
      correcto: false,
      explicacion:
        "Debes utilizar pasado simple y would.",
    },
  ],

  estadoAprendizaje:
    "reforzar",

  necesitaRefuerzo:
    true,

  completadoEn:
    "2026-11-11T20:50:00.000Z",
};

// ======================================================
// 1. CREAR EVENTO
// ======================================================

const evento =
  crearEventoEducativoGrammar({
    actividad,
    resultado,

    interesPrincipal:
      "Tecnologia e IA",

    intento:
      1,

    origen:
      "diagnostico",
  });

// ======================================================
// 2. IDENTIDAD
// ======================================================

comprobar(
  "Genera eventoId",
  typeof evento.eventoId ===
    "string" &&
    evento.eventoId.length > 0
);

comprobar(
  "Conserva actividadId",
  evento.actividadId ===
    "grammar-cmd-test-001"
);

comprobar(
  "Registra competencia Grammar",
  evento.competencia ===
    "grammar"
);

// ======================================================
// 3. OBJETIVO PEDAGOGICO
// ======================================================

comprobar(
  "Conserva objetivo second-conditional",
  evento.objetivo ===
    "second-conditional"
);

comprobar(
  "Conserva nivel B1",
  evento.nivelContenido ===
    "B1"
);

comprobar(
  "Conserva tipo refuerzo",
  evento.tipoActividad ===
    "refuerzo"
);

comprobar(
  "Conserva origen diagnostico",
  evento.origen ===
    "diagnostico"
);

// ======================================================
// 4. EVIDENCIA DE ORIGEN
// ======================================================

comprobar(
  "Conserva evidencia de diagnostico",
  evento.evidenciaOrigen !==
    null &&
    evento.evidenciaOrigen
      .preguntas === 2 &&
    evento.evidenciaOrigen
      .aciertos === 1 &&
    evento.evidenciaOrigen
      .errores === 1 &&
    evento.evidenciaOrigen
      .porcentaje === 50
);

// ======================================================
// 5. RESULTADO DE ACTIVIDAD
// ======================================================

comprobar(
  "Registra cinco preguntas",
  evento.resultado
    .preguntas === 5
);

comprobar(
  "Registra dos aciertos",
  evento.resultado
    .aciertos === 2
);

comprobar(
  "Registra tres errores",
  evento.resultado
    .errores === 3
);

comprobar(
  "Registra 40 por ciento",
  evento.resultado
    .porcentaje === 40
);

comprobar(
  "Registra estado reforzar",
  evento.estadoAprendizaje ===
    "reforzar"
);

comprobar(
  "Registra necesidad de refuerzo",
  evento.necesitaRefuerzo ===
    true
);

// ======================================================
// 6. PERSONALIZACION
// ======================================================

comprobar(
  "Conserva interes principal",
  evento
    .contextoPersonalizacion
    .interesPrincipal ===
    "Tecnologia e IA"
);

// ======================================================
// 7. HISTORICO
// ======================================================

comprobar(
  "Registra intento uno",
  evento.intento === 1
);

comprobar(
  "Conserva fecha de actividad",
  evento.fechaActividad ===
    "2026-11-11T20:50:00.000Z"
);

// ======================================================
// 8. SEGURIDAD MCER
// ======================================================

comprobar(
  "No certifica nivel MCER",
  evento.nivelMCERCertificado ===
    false
);

// ======================================================
// 9. NO GUARDA CONTENIDO INNECESARIO
//
// El evento CMD no debe convertirse en una copia
// completa de la actividad ni de las soluciones.
// ======================================================

const eventoTexto =
  JSON.stringify(
    evento
  );

comprobar(
  "Evento no guarda soluciones",
  !eventoTexto.includes(
    "respuestaCorrecta"
  ) &&
    !eventoTexto.includes(
      '"soluciones"'
    )
);

comprobar(
  "Evento no guarda ejercicios",
  !eventoTexto.includes(
    '"ejercicios"'
  )
);

comprobar(
  "Evento no guarda enunciados",
  !eventoTexto.includes(
    '"enunciado"'
  )
);

// ======================================================
// 10. RECHAZA ACTIVIDAD Y RESULTADO DIFERENTES
// ======================================================

const resultadoOtroId:
  ResultadoCorreccionGrammar = {
  ...resultado,

  actividadId:
    "actividad-distinta",
};

comprobar(
  "Rechaza resultado de otra actividad",
  rechaza(() =>
    crearEventoEducativoGrammar({
      actividad,
      resultado:
        resultadoOtroId,
    })
  )
);

// ======================================================
// 11. RECHAZA OBJETIVO ALTERADO
// ======================================================

const resultadoOtroObjetivo:
  ResultadoCorreccionGrammar = {
  ...resultado,

  objetivoGrammar:
    "present-perfect",
};

comprobar(
  "Rechaza objetivo alterado",
  rechaza(() =>
    crearEventoEducativoGrammar({
      actividad,
      resultado:
        resultadoOtroObjetivo,
    })
  )
);

// ======================================================
// 12. RECHAZA NIVEL ALTERADO
// ======================================================

const resultadoOtroNivel:
  ResultadoCorreccionGrammar = {
  ...resultado,

  nivelContenido:
    "B2",
};

comprobar(
  "Rechaza nivel alterado",
  rechaza(() =>
    crearEventoEducativoGrammar({
      actividad,
      resultado:
        resultadoOtroNivel,
    })
  )
);

// ======================================================
// 13. RECHAZA TIPO ALTERADO
// ======================================================

const resultadoOtroTipo:
  ResultadoCorreccionGrammar = {
  ...resultado,

  tipoActividad:
    "consolidacion",
};

comprobar(
  "Rechaza tipo alterado",
  rechaza(() =>
    crearEventoEducativoGrammar({
      actividad,
      resultado:
        resultadoOtroTipo,
    })
  )
);

// ======================================================
// 14. RECHAZA CONTEOS INCOHERENTES
// ======================================================

const resultadoConteosMal:
  ResultadoCorreccionGrammar = {
  ...resultado,

  aciertos:
    3,

  errores:
    3,
};

comprobar(
  "Rechaza conteos incoherentes",
  rechaza(() =>
    crearEventoEducativoGrammar({
      actividad,
      resultado:
        resultadoConteosMal,
    })
  )
);

// ======================================================
// 15. RECHAZA PORCENTAJE INCORRECTO
// ======================================================

const resultadoPorcentajeMal:
  ResultadoCorreccionGrammar = {
  ...resultado,

  porcentaje:
    60,
};

comprobar(
  "Rechaza porcentaje incoherente",
  rechaza(() =>
    crearEventoEducativoGrammar({
      actividad,
      resultado:
        resultadoPorcentajeMal,
    })
  )
);

// ======================================================
// 16. RECHAZA INTENTO CERO
// ======================================================

comprobar(
  "Rechaza intento cero",
  rechaza(() =>
    crearEventoEducativoGrammar({
      actividad,
      resultado,
      intento: 0,
    })
  )
);

// ======================================================
// 17. NORMALIZA FECHA
// ======================================================

const eventoFecha =
  crearEventoEducativoGrammar({
    actividad,
    resultado,

    fechaActividad:
      "2026-11-11T21:00:00+01:00",
  });

comprobar(
  "Normaliza fecha a ISO",
  eventoFecha.fechaActividad ===
    "2026-11-11T20:00:00.000Z"
);

// ======================================================
// RESUMEN
// ======================================================

console.log(
  "\n================================"
);

console.log(
  "INTERESTALK - TEST MEMORIA EDUCATIVA V1"
);

console.log(
  "================================"
);

console.log(
  "Pruebas superadas:",
  superadas
);

console.log(
  "Pruebas fallidas:",
  fallidas
);

console.log(
  "\nEVENTO EDUCATIVO:"
);

console.log(
  "Competencia:",
  evento.competencia
);

console.log(
  "Objetivo:",
  evento.objetivo
);

console.log(
  "Nivel:",
  evento.nivelContenido
);

console.log(
  "Intento:",
  evento.intento
);

console.log(
  "Resultado:",
  evento.resultado
    .aciertos +
    "/" +
    evento.resultado
      .preguntas,
  "-",
  evento.resultado
    .porcentaje +
    "%"
);

console.log(
  "Estado:",
  evento.estadoAprendizaje
);

console.log(
  "Interes:",
  evento
    .contextoPersonalizacion
    .interesPrincipal ??
    "No disponible"
);

if (
  fallidas === 0
) {
  console.log(
    "\nTODAS LAS PRUEBAS SUPERADAS"
  );
} else {
  console.error(
    "\nSE HAN DETECTADO FALLOS"
  );

  process.exitCode = 1;
}