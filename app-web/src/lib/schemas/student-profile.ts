import { z } from "zod";

// =====================================================
// INTERESTALK - PERFIL PERSONALIZADO DEL ALUMNO
// Validacion de datos mediante Zod
// =====================================================

// Niveles del Marco Comun Europeo
export const nivelesIdioma = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

// Idiomas: utilizamos codigos BCP-47.
// Ejemplos: es, en, fr, de, pt-BR, zh-CN.
const idiomaSchema = z
  .string()
  .trim()
  .min(2, "Debes seleccionar un idioma")
  .max(35, "Codigo de idioma demasiado largo")
  .regex(
    /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/,
    "Codigo de idioma no valido"
  );

// Cada interes tiene un identificador estable.
// Esto permite cambiar su nombre o imagen.
export const interesSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(80),

  nombre: z
    .string()
    .trim()
    .min(2, "El interes debe tener un nombre")
    .max(80),

  // El alumno puede crear intereses propios.
  personalizado: z.boolean().default(false),
});

// Perfil que completa el alumno
export const studentProfileSchema = z
  .object({
    idiomaNativo: idiomaSchema,

    idiomaAprendizaje: idiomaSchema,

    nivelDeclarado: z.enum(nivelesIdioma),

    objetivo: z
      .string()
      .trim()
      .min(5, "Describe tu objetivo")
      .max(300),

    intereses: z
      .array(interesSchema)
      .min(1, "Selecciona al menos un interes")
      .max(5, "Puedes seleccionar hasta 5 intereses"),

    // Debe coincidir con uno de los intereses.
    interesPrincipalId: z
      .string()
      .trim()
      .min(1),

  })
  .superRefine((perfil, ctx) => {
    // Evitar aprender el mismo idioma de apoyo
    if (
      perfil.idiomaNativo.toLowerCase() ===
      perfil.idiomaAprendizaje.toLowerCase()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["idiomaAprendizaje"],
        message:
          "Selecciona un idioma de aprendizaje diferente",
      });
    }

    // Evitar intereses duplicados
    const ids = perfil.intereses.map(
      (interes) => interes.id.toLowerCase()
    );

    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["intereses"],
        message: "No puedes repetir intereses",
      });
    }

    // Validar el interes principal
    const existePrincipal = perfil.intereses.some(
      (interes) =>
        interes.id === perfil.interesPrincipalId
    );

    if (!existePrincipal) {
      ctx.addIssue({
        code: "custom",
        path: ["interesPrincipalId"],
        message:
          "El interes principal debe estar entre los seleccionados",
      });
    }
  });

// Tipo TypeScript derivado del esquema
export type StudentProfile = z.infer<
  typeof studentProfileSchema
>;

// Funcion para validar perfiles
export function validarPerfilAlumno(datos: unknown) {
  return studentProfileSchema.safeParse(datos);
}