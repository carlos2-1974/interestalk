import { z } from "zod";

// ======================================================
// INTERESTALK - GRAMMAR V2
// SCHEMA DE VALIDACION V1
//
// Valida la respuesta estructurada generada por Gemini.
//
// IMPORTANTE:
// - No decide el objetivo pedagogico.
// - No llama a Gemini.
// - No expone soluciones al navegador.
// - Valida contenido publico y privado.
// ======================================================

// ======================================================
// CONSTANTES
// ======================================================

const niveles = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

const tiposActividad = [
  "refuerzo",
  "consolidacion",
] as const;

const tiposEjercicio = [
  "opcion_multiple",
  "completar",
  "transformar",
] as const;

// ======================================================
// EVIDENCIA PEDAGOGICA
// ======================================================

export const evidenciaGrammarSchema = z
  .object({
    preguntas: z.number().int().nonnegative(),
    aciertos: z.number().int().nonnegative(),
    errores: z.number().int().nonnegative(),
    porcentaje: z.number().min(0).max(100),
  })
  .refine(
    (evidencia) =>
      evidencia.aciertos + evidencia.errores ===
      evidencia.preguntas,
    {
      message:
        "Los conteos de evidencia no coinciden.",
    }
  );

// ======================================================
// EJERCICIO PUBLICO
// ======================================================

export const ejercicioGrammarPublicoSchema =
  z
    .object({
      id: z.string().trim().min(1).max(100),

      tipo: z.enum(tiposEjercicio),

      enunciado: z
        .string()
        .trim()
        .min(1)
        .max(1000),

      opciones: z
        .array(
          z.string().trim().min(1).max(500)
        )
        .min(2)
        .max(6)
        .nullable(),
    })
    .superRefine((ejercicio, ctx) => {
      if (
        ejercicio.tipo === "opcion_multiple" &&
        ejercicio.opciones === null
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Un ejercicio de opcion multiple " +
            "debe incluir opciones.",
          path: ["opciones"],
        });
      }

      if (
        ejercicio.tipo !== "opcion_multiple" &&
        ejercicio.opciones !== null
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Solo los ejercicios de opcion multiple " +
            "pueden incluir opciones.",
          path: ["opciones"],
        });
      }
    });

// ======================================================
// ACTIVIDAD PUBLICA
// ======================================================

export const actividadGrammarPublicaSchema =
  z.object({
    version: z.literal(1),

    actividadId: z
      .string()
      .trim()
      .min(1)
      .max(100),

    objetivoGrammar: z
      .string()
      .trim()
      .min(1)
      .max(120),

    nivelContenido: z.enum(niveles),

    tipoActividad: z.enum(tiposActividad),

    titulo: z
      .string()
      .trim()
      .min(1)
      .max(200),

    introduccion: z
      .string()
      .trim()
      .min(1)
      .max(1500),

    explicacion: z
      .string()
      .trim()
      .min(1)
      .max(4000),

    regla: z
      .string()
      .trim()
      .min(1)
      .max(2000),

    ejemplos: z
      .array(
        z.string().trim().min(1).max(1000)
      )
      .min(2)
      .max(8),

    erroresFrecuentes: z
      .array(
        z.string().trim().min(1).max(1000)
      )
      .min(1)
      .max(6),

    ejercicios: z
      .array(ejercicioGrammarPublicoSchema)
      .length(5),

    aplicacionPractica: z
      .string()
      .trim()
      .min(1)
      .max(2000),
  })
  .superRefine((actividad, ctx) => {
    const ids = actividad.ejercicios.map(
      (ejercicio) => ejercicio.id
    );

    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message:
          "Los identificadores de ejercicios " +
          "deben ser unicos.",
        path: ["ejercicios"],
      });
    }
  });

// ======================================================
// SOLUCION PRIVADA
// ======================================================

export const solucionEjercicioGrammarSchema =
  z.object({
    ejercicioId: z
      .string()
      .trim()
      .min(1)
      .max(100),

    respuestaCorrecta: z
      .string()
      .trim()
      .min(1)
      .max(1000),

    explicacion: z
      .string()
      .trim()
      .min(1)
      .max(2000),
  });

// ======================================================
// SOLUCIONES PRIVADAS
// ======================================================

export const solucionesGrammarPrivadasSchema =
  z.object({
    actividadId: z
      .string()
      .trim()
      .min(1)
      .max(100),

    soluciones: z
      .array(solucionEjercicioGrammarSchema)
      .length(5),
  });

// ======================================================
// ORIGEN PEDAGOGICO
// ======================================================

export const origenPedagogicoGrammarSchema =
  z.object({
    objetivo: z
      .string()
      .trim()
      .min(1)
      .max(120),

    nivel: z.enum(niveles),

    tipo: z.enum(tiposActividad),

    evidencia: evidenciaGrammarSchema,

    motivo: z
      .string()
      .trim()
      .min(1)
      .max(1500),
  });

// ======================================================
// ACTIVIDAD COMPLETA
// ======================================================

export const actividadGrammarCompletaSchema =
  z
    .object({
      publica: actividadGrammarPublicaSchema,
      privada: solucionesGrammarPrivadasSchema,
      origenPedagogico:
        origenPedagogicoGrammarSchema,
    })
    .superRefine((actividad, ctx) => {
      // ----------------------------------------------
      // MISMO ID PUBLICO / PRIVADO
      // ----------------------------------------------

      if (
        actividad.publica.actividadId !==
        actividad.privada.actividadId
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "El actividadId publico y privado " +
            "debe coincidir.",
          path: ["privada", "actividadId"],
        });
      }

      // ----------------------------------------------
      // OBJETIVO
      // ----------------------------------------------

      if (
        actividad.publica.objetivoGrammar !==
        actividad.origenPedagogico.objetivo
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "El objetivo Grammar no coincide con " +
            "el origen pedagogico.",
          path: ["publica", "objetivoGrammar"],
        });
      }

      // ----------------------------------------------
      // NIVEL
      // ----------------------------------------------

      if (
        actividad.publica.nivelContenido !==
        actividad.origenPedagogico.nivel
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "El nivel de contenido no coincide " +
            "con el origen pedagogico.",
          path: ["publica", "nivelContenido"],
        });
      }

      // ----------------------------------------------
      // TIPO
      // ----------------------------------------------

      if (
        actividad.publica.tipoActividad !==
        actividad.origenPedagogico.tipo
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "El tipo de actividad no coincide " +
            "con el origen pedagogico.",
          path: ["publica", "tipoActividad"],
        });
      }

      // ----------------------------------------------
      // EJERCICIOS / SOLUCIONES
      // ----------------------------------------------

      const idsEjercicios =
        actividad.publica.ejercicios.map(
          (ejercicio) => ejercicio.id
        );

      const idsSoluciones =
        actividad.privada.soluciones.map(
          (solucion) => solucion.ejercicioId
        );

      if (
        new Set(idsSoluciones).size !==
        idsSoluciones.length
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Las soluciones contienen " +
            "identificadores duplicados.",
          path: ["privada", "soluciones"],
        });
      }

      const mismosIds =
        idsEjercicios.length ===
          idsSoluciones.length &&
        idsEjercicios.every((id) =>
          idsSoluciones.includes(id)
        );

      if (!mismosIds) {
        ctx.addIssue({
          code: "custom",
          message:
            "Cada ejercicio debe tener exactamente " +
            "una solucion privada.",
          path: ["privada", "soluciones"],
        });
      }

      // ----------------------------------------------
      // OPCION MULTIPLE
      //
      // La respuesta correcta debe existir entre
      // las opciones mostradas al alumno.
      // ----------------------------------------------

      for (const ejercicio of
        actividad.publica.ejercicios) {
        if (
          ejercicio.tipo !== "opcion_multiple" ||
          ejercicio.opciones === null
        ) {
          continue;
        }

        const solucion =
          actividad.privada.soluciones.find(
            (item) =>
              item.ejercicioId === ejercicio.id
          );

        if (
          solucion &&
          !ejercicio.opciones.includes(
            solucion.respuestaCorrecta
          )
        ) {
          ctx.addIssue({
            code: "custom",
            message:
              "La respuesta correcta de una pregunta " +
              "de opcion multiple debe existir entre " +
              "sus opciones.",
            path: [
              "privada",
              "soluciones",
            ],
          });
        }
      }
    });

// ======================================================
// TIPOS INFERIDOS
//
// Estos tipos permiten comprobar que el schema y
// el contrato TypeScript permanecen alineados.
// ======================================================

export type ActividadGrammarValidada =
  z.infer<
    typeof actividadGrammarCompletaSchema
  >;

// ======================================================
// FUNCION PUBLICA DE VALIDACION
// ======================================================

export function validarActividadGrammar(
  valor: unknown
): ActividadGrammarValidada {
  return actividadGrammarCompletaSchema.parse(
    valor
  );
}