import type {
  NivelMCER,
} from "../diagnostico/preguntas-v2";

// ======================================================
// INTERESTALK - GRAMMAR V2
// Contrato estructurado de actividad
//
// Define la estructura de una actividad Grammar.
// No utiliza Gemini.
// No almacena datos.
// No corrige respuestas.
// ======================================================

export type TipoActividadGrammar =
  | "refuerzo"
  | "consolidacion";

export type EvidenciaGrammar = {
  preguntas: number;
  aciertos: number;
  errores: number;
  porcentaje: number;
};

// ======================================================
// CONTEXTO PERSONAL
// ======================================================

export type ContextoPersonalGrammar = {
  idiomaApoyo: string;
  idiomaAprendizaje: string;
  nivelDeclarado: NivelMCER;
  objetivoPersonal: string;
  intereses: string[];
  interesPrincipal: string;
};

// ======================================================
// NECESIDAD PEDAGOGICA
// ======================================================

export type NecesidadGrammar = {
  objetivo: string;
  nivel: NivelMCER;
  tipo: TipoActividadGrammar;
  evidencia: EvidenciaGrammar;
  motivo: string;
};

// ======================================================
// SOLICITUD DE GENERACION
// ======================================================

export type SolicitudGrammarV2 = {
  contexto: ContextoPersonalGrammar;
  necesidad: NecesidadGrammar;
};

// ======================================================
// CONTENIDO PUBLICO
//
// Esta parte puede enviarse al navegador.
// NO contiene soluciones.
// ======================================================

export type EjercicioGrammarPublico = {
  id: string;
  tipo:
    | "opcion_multiple"
    | "completar"
    | "transformar";
  enunciado: string;
  opciones: string[] | null;
};

export type ActividadGrammarPublica = {
  version: 1;
  actividadId: string;

  objetivoGrammar: string;
  nivelContenido: NivelMCER;
  tipoActividad: TipoActividadGrammar;

  titulo: string;
  introduccion: string;
  explicacion: string;
  regla: string;

  ejemplos: string[];
  erroresFrecuentes: string[];

  ejercicios: EjercicioGrammarPublico[];

  aplicacionPractica: string;
};

// ======================================================
// SOLUCIONES PRIVADAS
//
// Esta parte debe permanecer en servidor.
// Nunca debe enviarse al navegador antes de responder.
// ======================================================

export type SolucionEjercicioGrammar = {
  ejercicioId: string;
  respuestaCorrecta: string;
  explicacion: string;
};

export type SolucionesGrammarPrivadas = {
  actividadId: string;
  soluciones: SolucionEjercicioGrammar[];
};

// ======================================================
// ACTIVIDAD COMPLETA
//
// Solo debe existir en servidor.
// ======================================================

export type ActividadGrammarCompleta = {
  publica: ActividadGrammarPublica;
  privada: SolucionesGrammarPrivadas;

  origenPedagogico: {
    objetivo: string;
    nivel: NivelMCER;
    tipo: TipoActividadGrammar;
    evidencia: EvidenciaGrammar;
    motivo: string;
  };
};