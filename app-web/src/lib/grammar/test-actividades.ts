import {
  guardarActividadGrammar,
  obtenerActividadGrammarPublica,
  obtenerActividadGrammarPrivada,
  eliminarActividadGrammar,
  obtenerEstadisticasActividadesGrammar,
} from "./actividades";

import type {
  ActividadGrammarCompleta,
} from "./tipos";

// ======================================================
// INTERESTALK - GRAMMAR V2
// TEST ALMACEN TEMPORAL DE ACTIVIDADES V1
//
// Comprueba:
// - almacenamiento;
// - aislamiento publico / privado;
// - copia defensiva;
// - duplicados;
// - eliminacion;
// - estadisticas;
// - caducidad efectiva a las 2 horas.
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
    console.log("CORRECTO - " + nombre);
  } else {
    fallidas++;
    console.error("ERROR - " + nombre);
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
// ACTIVIDAD DE REFERENCIA
// ======================================================

const actividad: ActividadGrammarCompleta = {
  publica: {
    version: 1,

    actividadId:
      "grammar-almacen-test-001",

    objetivoGrammar:
      "present-perfect",

    nivelContenido:
      "B1",

    tipoActividad:
      "refuerzo",

    titulo:
      "Present perfect and sport",

    introduccion:
      "Practica el present perfect con situaciones deportivas.",

    explicacion:
      "Usamos el present perfect para hablar de experiencias " +
      "y situaciones conectadas con el presente.",

    regla:
      "Subject + have/has + past participle.",

    ejemplos: [
      "I have played tennis many times.",
      "She has won three matches.",
    ],

    erroresFrecuentes: [
      "Olvidar have o has.",
    ],

    ejercicios: [
      {
        id: "e1",
        tipo: "opcion_multiple",
        enunciado:
          "Choose the correct sentence.",
        opciones: [
          "I have played tennis.",
          "I has played tennis.",
          "I have play tennis.",
        ],
      },

      {
        id: "e2",
        tipo: "completar",
        enunciado:
          "Complete: She ___ (win) three matches.",
        opciones: null,
      },

      {
        id: "e3",
        tipo: "opcion_multiple",
        enunciado:
          "Choose the correct question.",
        opciones: [
          "Have you ever played rugby?",
          "Has you ever played rugby?",
          "Did you ever played rugby?",
        ],
      },

      {
        id: "e4",
        tipo: "completar",
        enunciado:
          "Complete: We ___ (train) hard.",
        opciones: null,
      },

      {
        id: "e5",
        tipo: "transformar",
        enunciado:
          "Transforma a negativo: " +
          "He has played basketball.",
        opciones: null,
      },
    ],

    aplicacionPractica:
      "Escribe tres experiencias deportivas.",
  },

  privada: {
    actividadId:
      "grammar-almacen-test-001",

    soluciones: [
      {
        ejercicioId: "e1",
        respuestaCorrecta:
          "I have played tennis.",
        explicacion:
          "Con I utilizamos have + played.",
      },

      {
        ejercicioId: "e2",
        respuestaCorrecta:
          "has won",
        explicacion:
          "Con she utilizamos has + won.",
      },

      {
        ejercicioId: "e3",
        respuestaCorrecta:
          "Have you ever played rugby?",
        explicacion:
          "La pregunta empieza con Have.",
      },

      {
        ejercicioId: "e4",
        respuestaCorrecta:
          "have trained",
        explicacion:
          "Con we utilizamos have + trained.",
      },

      {
        ejercicioId: "e5",
        respuestaCorrecta:
          "He has not played basketball.",
        explicacion:
          "La negativa utiliza has not.",
      },
    ],
  },

  origenPedagogico: {
    objetivo:
      "present-perfect",

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
      "Se han observado errores.",
  },
};

// ======================================================
// RELOJ SIMULADO
// ======================================================

const relojOriginal =
  Date.now;

const inicio =
  relojOriginal();

let tiempoSimulado =
  inicio;

const HORA =
  60 * 60 * 1000;

try {
  Date.now = () =>
    tiempoSimulado;

  // ====================================================
  // 1. ESTADO INICIAL
  // ====================================================

  const estadisticasIniciales =
    obtenerEstadisticasActividadesGrammar();

  comprobar(
    "Almacen inicialmente disponible",
    estadisticasIniciales.actividadesActivas === 0
  );

  comprobar(
    "Configura duracion de dos horas",
    estadisticasIniciales.duracionHoras === 2
  );

  // ====================================================
  // 2. GUARDAR
  // ====================================================

  const registro =
    guardarActividadGrammar(
      actividad
    );

  comprobar(
    "Guarda actividad Grammar",
    registro.actividadId ===
      actividad.publica.actividadId
  );

  comprobar(
    "Configura caducidad a dos horas",
    new Date(
      registro.expiraEn
    ).getTime() ===
      inicio + 2 * HORA
  );

  comprobar(
    "Incrementa actividades activas",
    obtenerEstadisticasActividadesGrammar()
      .actividadesActivas === 1
  );

  // ====================================================
  // 3. PARTE PUBLICA
  // ====================================================

  const publica =
    obtenerActividadGrammarPublica(
      registro.actividadId
    );

  comprobar(
    "Recupera parte publica",
    publica.actividadId ===
      registro.actividadId
  );

  comprobar(
    "Parte publica conserva objetivo",
    publica.objetivoGrammar ===
      "present-perfect"
  );

  comprobar(
    "Parte publica conserva cinco ejercicios",
    publica.ejercicios.length === 5
  );

  const textoPublico =
    JSON.stringify(publica);

  comprobar(
    "Parte publica no expone respuestaCorrecta",
    !textoPublico.includes(
      "respuestaCorrecta"
    )
  );

  comprobar(
    "Parte publica no expone soluciones",
    !textoPublico.includes(
      '"soluciones"'
    )
  );

  comprobar(
    "Parte publica no expone origen pedagogico",
    !textoPublico.includes(
      "origenPedagogico"
    )
  );

  // ====================================================
  // 4. PARTE PRIVADA
  // ====================================================

  const privada =
    obtenerActividadGrammarPrivada(
      registro.actividadId
    );

  comprobar(
    "Servidor recupera actividad completa",
    privada.publica.actividadId ===
      registro.actividadId
  );

  comprobar(
    "Servidor conserva cinco soluciones",
    privada.privada.soluciones.length === 5
  );

  comprobar(
    "Servidor conserva origen pedagogico",
    privada.origenPedagogico.objetivo ===
      "present-perfect"
  );

  // ====================================================
  // 5. COPIA DEFENSIVA PUBLICA
  // ====================================================

  publica.titulo =
    "TITULO MODIFICADO";

  publica.ejercicios[0].enunciado =
    "ENUNCIADO MODIFICADO";

  const publicaOtraVez =
    obtenerActividadGrammarPublica(
      registro.actividadId
    );

  comprobar(
    "Modificar copia publica no altera titulo interno",
    publicaOtraVez.titulo !==
      "TITULO MODIFICADO"
  );

  comprobar(
    "Modificar copia publica no altera ejercicios internos",
    publicaOtraVez.ejercicios[0]
      .enunciado !==
      "ENUNCIADO MODIFICADO"
  );

  // ====================================================
  // 6. COPIA DEFENSIVA PRIVADA
  // ====================================================

  privada.privada.soluciones[0]
    .respuestaCorrecta =
    "RESPUESTA MODIFICADA";

  privada.origenPedagogico.objetivo =
    "objetivo-modificado";

  const privadaOtraVez =
    obtenerActividadGrammarPrivada(
      registro.actividadId
    );

  comprobar(
    "Modificar copia privada no altera solucion interna",
    privadaOtraVez.privada.soluciones[0]
      .respuestaCorrecta !==
      "RESPUESTA MODIFICADA"
  );

  comprobar(
    "Modificar copia privada no altera origen interno",
    privadaOtraVez.origenPedagogico
      .objetivo ===
      "present-perfect"
  );

  // ====================================================
  // 7. DUPLICADOS
  // ====================================================

  comprobar(
    "Rechaza actividadId duplicado",
    rechaza(() =>
      guardarActividadGrammar(
        actividad
      )
    )
  );

  comprobar(
    "Duplicado no incrementa almacen",
    obtenerEstadisticasActividadesGrammar()
      .actividadesActivas === 1
  );

  // ====================================================
  // 8. DISPONIBLE ANTES DE CADUCAR
  // ====================================================

  tiempoSimulado =
    inicio + HORA;

  comprobar(
    "Actividad disponible a la hora",
    obtenerActividadGrammarPublica(
      registro.actividadId
    ).actividadId ===
      registro.actividadId
  );

  tiempoSimulado =
    inicio + 2 * HORA - 60 * 1000;

  comprobar(
    "Actividad disponible un minuto antes",
    obtenerActividadGrammarPublica(
      registro.actividadId
    ).objetivoGrammar ===
      "present-perfect"
  );

  // ====================================================
  // 9. CADUCIDAD EXACTA
  // ====================================================

  tiempoSimulado =
    inicio + 2 * HORA;

  comprobar(
    "Rechaza actividad al cumplir dos horas",
    rechaza(() =>
      obtenerActividadGrammarPublica(
        registro.actividadId
      )
    )
  );

  comprobar(
    "Elimina automaticamente actividad caducada",
    obtenerEstadisticasActividadesGrammar()
      .actividadesActivas === 0
  );

  tiempoSimulado =
    inicio + 3 * HORA;

  comprobar(
    "No recupera actividad despues de caducar",
    rechaza(() =>
      obtenerActividadGrammarPrivada(
        registro.actividadId
      )
    )
  );

  // ====================================================
  // 10. NUEVA ACTIVIDAD DESPUES DE CADUCIDAD
  // ====================================================

  const nuevaActividad:
    ActividadGrammarCompleta =
    structuredClone(
      actividad
    );

  nuevaActividad.publica.actividadId =
    "grammar-almacen-test-002";

  nuevaActividad.privada.actividadId =
    "grammar-almacen-test-002";

  const nuevoRegistro =
    guardarActividadGrammar(
      nuevaActividad
    );

  comprobar(
    "Permite guardar actividad tras caducidad",
    nuevoRegistro.actividadId ===
      "grammar-almacen-test-002"
  );

  comprobar(
    "Nueva actividad queda activa",
    obtenerEstadisticasActividadesGrammar()
      .actividadesActivas === 1
  );

  // ====================================================
  // 11. ELIMINACION MANUAL
  // ====================================================

  comprobar(
    "Elimina actividad manualmente",
    eliminarActividadGrammar(
      nuevoRegistro.actividadId
    ) === true
  );

  comprobar(
    "Actividad eliminada deja de existir",
    rechaza(() =>
      obtenerActividadGrammarPublica(
        nuevoRegistro.actividadId
      )
    )
  );

  comprobar(
    "Almacen vuelve a cero",
    obtenerEstadisticasActividadesGrammar()
      .actividadesActivas === 0
  );

} finally {
  Date.now =
    relojOriginal;
}

// ======================================================
// RESUMEN
// ======================================================

console.log("\n================================");
console.log(
  "INTERESTALK - TEST ALMACEN GRAMMAR V2"
);
console.log("================================");

console.log(
  "Pruebas superadas:",
  superadas
);

console.log(
  "Pruebas fallidas:",
  fallidas
);

console.log(
  "\nCONFIGURACION:"
);

console.log(
  "Duracion:",
  obtenerEstadisticasActividadesGrammar()
    .duracionHoras,
  "horas"
);

console.log(
  "Limite:",
  obtenerEstadisticasActividadesGrammar()
    .limiteActividades
);

console.log(
  "Actividades activas al finalizar:",
  obtenerEstadisticasActividadesGrammar()
    .actividadesActivas
);

if (fallidas === 0) {
  console.log(
    "\nTODAS LAS PRUEBAS SUPERADAS"
  );
} else {
  console.error(
    "\nSE HAN DETECTADO FALLOS"
  );

  process.exitCode = 1;
}