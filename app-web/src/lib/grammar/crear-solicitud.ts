import type {
  PerfilProvisional,
} from "../perfil-provisional";

import type {
  PerfilPedagogico,
} from "../diagnostico/perfil-pedagogico";

import type {
  SolicitudGrammarV2,
} from "./tipos";

// ======================================================
// INTERESTALK - GRAMMAR V2
// ADAPTADOR DE SOLICITUD V1
//
// Combina:
// - perfil personal del onboarding
// - perfil pedagogico del diagnostico
//
// Produce una SolicitudGrammarV2.
//
// No utiliza Gemini.
// No modifica los perfiles originales.
// No decide el objetivo pedagogico.
// ======================================================

// ======================================================
// VALIDACIONES
// ======================================================

function validarCoherencia(
  personal: PerfilProvisional,
  pedagogico: PerfilPedagogico
): void {
  if (
    personal.idiomaAprendizaje !==
    pedagogico.idiomaEvaluado
  ) {
    throw new Error(
      "El idioma del onboarding no coincide " +
        "con el idioma evaluado."
    );
  }

  if (
    personal.nivelDeclarado !==
    pedagogico.nivelDeclarado
  ) {
    throw new Error(
      "El nivel declarado del onboarding no " +
        "coincide con el perfil pedagogico."
    );
  }

  if (
    pedagogico.estadoDiagnostico !==
    "completado"
  ) {
    throw new Error(
      "El diagnostico debe estar completado."
    );
  }

  if (pedagogico.grammar === null) {
    throw new Error(
      "No existe una necesidad Grammar seleccionada."
    );
  }

  if (
    !Array.isArray(personal.intereses) ||
    personal.intereses.length === 0
  ) {
    throw new Error(
      "El alumno no tiene intereses disponibles."
    );
  }

  const principal = personal.intereses.find(
    (interes) =>
      interes.id === personal.interesPrincipalId
  );

  if (!principal) {
    throw new Error(
      "El interes principal no existe."
    );
  }
}

// ======================================================
// CREAR SOLICITUD
// ======================================================

export function crearSolicitudGrammarV2(
  personal: PerfilProvisional,
  pedagogico: PerfilPedagogico
): SolicitudGrammarV2 {
  validarCoherencia(personal, pedagogico);

  const seleccion = pedagogico.grammar;

  if (seleccion === null) {
    throw new Error(
      "No existe una seleccion Grammar."
    );
  }

  const interesPrincipal =
    personal.intereses.find(
      (interes) =>
        interes.id === personal.interesPrincipalId
    );

  if (!interesPrincipal) {
    throw new Error(
      "No se ha podido recuperar el interes principal."
    );
  }

  return {
    contexto: {
      idiomaApoyo: personal.idiomaApoyo,
      idiomaAprendizaje:
        personal.idiomaAprendizaje,
      nivelDeclarado:
        personal.nivelDeclarado,
      objetivoPersonal:
        personal.objetivo,
      intereses: personal.intereses.map(
        (interes) => interes.nombre
      ),
      interesPrincipal:
        interesPrincipal.nombre,
    },

    necesidad: {
      objetivo: seleccion.objetivo,
      nivel: seleccion.nivel,
      tipo: seleccion.tipo,

      evidencia: {
        preguntas:
          seleccion.evidencia.preguntas,
        aciertos:
          seleccion.evidencia.aciertos,
        errores:
          seleccion.evidencia.errores,
        porcentaje:
          seleccion.evidencia.porcentaje,
      },

      motivo: seleccion.motivo,
    },
  };
}