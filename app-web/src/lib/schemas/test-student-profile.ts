import {
  validarPerfilAlumno,
} from "./student-profile";

// =====================================================
// INTERESTALK - PRUEBAS DEL PERFIL DEL ALUMNO
// =====================================================

const perfilBase = {
  idiomaNativo: "es",
  idiomaAprendizaje: "en",
  nivelDeclarado: "B1",
  objetivo: "Mejorar mi conversacion en ingles",
  intereses: [
    {
      id: "crossfit",
      nombre: "CrossFit",
      personalizado: false,
    },
    {
      id: "ia",
      nombre: "Inteligencia Artificial",
      personalizado: false,
    },
    {
      id: "viajes",
      nombre: "Viajes",
      personalizado: false,
    },
  ],
  interesPrincipalId: "crossfit",
};

// PRUEBA 1: Perfil correcto
const prueba1 = validarPerfilAlumno(perfilBase);

console.log(
  "PRUEBA 1 - Perfil valido:",
  prueba1.success ? "CORRECTO" : "ERROR"
);

// PRUEBA 2: Seis intereses
const perfilSeisIntereses = {
  ...perfilBase,
  intereses: [
    ...perfilBase.intereses,
    { id: "cine", nombre: "Cine" },
    { id: "musica", nombre: "Musica" },
    { id: "deporte", nombre: "Deporte" },
  ],
};

const prueba2 = validarPerfilAlumno(
  perfilSeisIntereses
);

console.log(
  "PRUEBA 2 - Rechaza 6 intereses:",
  !prueba2.success ? "CORRECTO" : "ERROR"
);

// PRUEBA 3: Interes principal inexistente
const perfilPrincipalInvalido = {
  ...perfilBase,
  interesPrincipalId: "astronomia",
};

const prueba3 = validarPerfilAlumno(
  perfilPrincipalInvalido
);

console.log(
  "PRUEBA 3 - Rechaza principal invalido:",
  !prueba3.success ? "CORRECTO" : "ERROR"
);

// Resultado general
const todasCorrectas =
  prueba1.success &&
  !prueba2.success &&
  !prueba3.success;

console.log(
  "\nRESULTADO GENERAL:",
  todasCorrectas
    ? "TODAS LAS PRUEBAS SUPERADAS"
    : "HAY ERRORES"
);

if (!todasCorrectas) {
  process.exitCode = 1;
}