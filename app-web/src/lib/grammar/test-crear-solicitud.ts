import {
  crearSolicitudGrammarV2,
} from "./crear-solicitud";

import type {
  PerfilProvisional,
} from "../perfil-provisional";

import type {
  PerfilPedagogico,
} from "../diagnostico/perfil-pedagogico";

// ======================================================
// INTERESTALK - GRAMMAR V2
// TEST ADAPTADOR DE SOLICITUD V1
//
// Comprueba la union entre:
// - perfil personal del onboarding
// - perfil pedagogico del diagnostico
//
// No utiliza Gemini.
// No modifica el diagnostico.
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
// DATOS PERSONALES DE PRUEBA
// ======================================================

const perfilPersonal: PerfilProvisional = {
  version: 1,
  idiomaApoyo: "es",
  idiomaAprendizaje: "en",
  nivelDeclarado: "B1",
  objetivo: "Conversar con fluidez",
  intereses: [
    {
      id: "deporte",
      nombre: "Deporte",
    },
    {
      id: "tecnologia",
      nombre: "Tecnologia",
    },
    {
      id: "viajes",
      nombre: "Viajes",
    },
  ],
  interesPrincipalId: "deporte",
  creadoEn: Date.now(),
};

// ======================================================
// PERFIL PEDAGOGICO DE PRUEBA
//
// Representa la estructura real producida por
// Interestalk despues del diagnostico.
// ======================================================

const perfilPedagogico: PerfilPedagogico = {
  version: 1,
  idiomaEvaluado: "en",
  nivelDeclarado: "B1",
  estadoDiagnostico: "completado",
  fechaEvaluacion: new Date().toISOString(),

  resultadoGeneral: {
    preguntas: 15,
    aciertos: 9,
    errores: 6,
    porcentaje: 60,
  },

  competencias: [
    {
      competencia: "grammar",
      total: 5,
      aciertos: 2,
      errores: 3,
      porcentaje: 40,
    },
    {
      competencia: "vocabulary",
      total: 5,
      aciertos: 3,
      errores: 2,
      porcentaje: 60,
    },
    {
      competencia: "reading",
      total: 5,
      aciertos: 4,
      errores: 1,
      porcentaje: 80,
    },
  ],

  grammar: {
    competencia: "grammar",
    objetivo: "present-perfect",
    nivel: "B1",
    tipo: "refuerzo",

    evidencia: {
      preguntas: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },

    motivo:
      "Se han observado errores en este objetivo. " +
      "Se propone una actividad de refuerzo y una " +
      "comprobacion posterior del aprendizaje.",
  },

  nivelMCERCertificado: false,
};

// ======================================================
// 1. CREAR SOLICITUD
// ======================================================

const solicitud = crearSolicitudGrammarV2(
  perfilPersonal,
  perfilPedagogico
);

comprobar(
  "Crea solicitud Grammar V2",
  solicitud !== null &&
    solicitud !== undefined
);

// ======================================================
// 2. CONTEXTO PERSONAL
// ======================================================

comprobar(
  "Conserva idioma de apoyo",
  solicitud.contexto.idiomaApoyo === "es"
);

comprobar(
  "Conserva idioma de aprendizaje",
  solicitud.contexto.idiomaAprendizaje === "en"
);

comprobar(
  "Conserva nivel declarado",
  solicitud.contexto.nivelDeclarado === "B1"
);

comprobar(
  "Conserva objetivo personal",
  solicitud.contexto.objetivoPersonal ===
    "Conversar con fluidez"
);

comprobar(
  "Conserva todos los intereses",
  solicitud.contexto.intereses.length === 3 &&
    solicitud.contexto.intereses.includes(
      "Deporte"
    ) &&
    solicitud.contexto.intereses.includes(
      "Tecnologia"
    ) &&
    solicitud.contexto.intereses.includes(
      "Viajes"
    )
);

comprobar(
  "Identifica interes principal",
  solicitud.contexto.interesPrincipal ===
    "Deporte"
);

// ======================================================
// 3. NECESIDAD PEDAGOGICA
// ======================================================

comprobar(
  "Conserva objetivo Grammar",
  solicitud.necesidad.objetivo ===
    "present-perfect"
);

comprobar(
  "Conserva nivel del objetivo",
  solicitud.necesidad.nivel === "B1"
);

comprobar(
  "Conserva tipo refuerzo",
  solicitud.necesidad.tipo === "refuerzo"
);

comprobar(
  "Conserva preguntas de evidencia",
  solicitud.necesidad.evidencia.preguntas === 2
);

comprobar(
  "Conserva aciertos de evidencia",
  solicitud.necesidad.evidencia.aciertos === 1
);

comprobar(
  "Conserva errores de evidencia",
  solicitud.necesidad.evidencia.errores === 1
);

comprobar(
  "Conserva porcentaje de evidencia",
  solicitud.necesidad.evidencia.porcentaje === 50
);

comprobar(
  "Conserva motivo pedagogico",
  solicitud.necesidad.motivo ===
    perfilPedagogico.grammar?.motivo
);

// ======================================================
// 4. INMUTABILIDAD
// ======================================================

comprobar(
  "No comparte array de intereses",
  solicitud.contexto.intereses !==
    (perfilPersonal.intereses as unknown)
);

comprobar(
  "No modifica perfil personal",
  perfilPersonal.intereses[0].nombre ===
    "Deporte"
);

comprobar(
  "No modifica perfil pedagogico",
  perfilPedagogico.grammar?.objetivo ===
    "present-perfect"
);

// ======================================================
// 5. RECHAZOS DE COHERENCIA
// ======================================================

const idiomaIncorrecto: PerfilProvisional = {
  ...perfilPersonal,
  idiomaAprendizaje: "fr",
};

comprobar(
  "Rechaza idiomas incoherentes",
  rechaza(() =>
    crearSolicitudGrammarV2(
      idiomaIncorrecto,
      perfilPedagogico
    )
  )
);

const nivelIncorrecto: PerfilProvisional = {
  ...perfilPersonal,
  nivelDeclarado: "B2",
};

comprobar(
  "Rechaza niveles declarados incoherentes",
  rechaza(() =>
    crearSolicitudGrammarV2(
      nivelIncorrecto,
      perfilPedagogico
    )
  )
);

const diagnosticoIncompleto: PerfilPedagogico = {
  ...perfilPedagogico,
  estadoDiagnostico: "incompleto",
};

comprobar(
  "Rechaza diagnostico incompleto",
  rechaza(() =>
    crearSolicitudGrammarV2(
      perfilPersonal,
      diagnosticoIncompleto
    )
  )
);

const sinGrammar: PerfilPedagogico = {
  ...perfilPedagogico,
  grammar: null,
};

comprobar(
  "Rechaza perfil sin seleccion Grammar",
  rechaza(() =>
    crearSolicitudGrammarV2(
      perfilPersonal,
      sinGrammar
    )
  )
);

const principalInexistente: PerfilProvisional = {
  ...perfilPersonal,
  interesPrincipalId: "no-existe",
};

comprobar(
  "Rechaza interes principal inexistente",
  rechaza(() =>
    crearSolicitudGrammarV2(
      principalInexistente,
      perfilPedagogico
    )
  )
);

// ======================================================
// RESUMEN
// ======================================================

console.log("\n================================");
console.log(
  "INTERESTALK - TEST SOLICITUD GRAMMAR V2"
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

console.log("\nSOLICITUD RESULTANTE:");

console.log(
  "Nivel declarado:",
  solicitud.contexto.nivelDeclarado
);

console.log(
  "Interes principal:",
  solicitud.contexto.interesPrincipal
);

console.log(
  "Objetivo personal:",
  solicitud.contexto.objetivoPersonal
);

console.log(
  "Objetivo Grammar:",
  solicitud.necesidad.objetivo
);

console.log(
  "Nivel Grammar:",
  solicitud.necesidad.nivel
);

console.log(
  "Tipo:",
  solicitud.necesidad.tipo
);

console.log(
  "Evidencia:",
  solicitud.necesidad.evidencia.aciertos +
    "/" +
    solicitud.necesidad.evidencia.preguntas
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