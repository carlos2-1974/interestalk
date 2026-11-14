import {
  NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  perfilValido,
  type PerfilProvisional,
} from "@/lib/perfil-provisional";

import {
  obtenerContinuidadPedagogica,
} from "@/lib/diagnostico/continuidad-pedagogica";

import {
  crearSolicitudGrammarV2,
} from "@/lib/grammar/crear-solicitud";

import {
  crearActividadGrammar,
  corregirGrammar,
} from "@/lib/grammar/orquestador";

// ======================================================
// INTERESTALK - API GRAMMAR V2
//
// POST:
//
// accion = "generar"
// - continuidadId
// - perfil provisional
//
// accion = "corregir"
// - actividadId
// - respuestas
//
// PROTOTIPO LOCAL.
//
// No publicar para usuarios externos sin:
// - autenticacion;
// - autorizacion;
// - persistencia real;
// - rate limiting;
// - control de consumo.
// ======================================================

const MAX_BODY_BYTES =
  16 * 1024;

// ======================================================
// SCHEMAS
// ======================================================

const continuidadIdSchema =
  z.string()
    .trim()
    .min(1)
    .max(100);

const actividadIdSchema =
  z.string()
    .trim()
    .min(1)
    .max(100);

const respuestaSchema =
  z.object({
    ejercicioId:
      z.string()
        .trim()
        .min(1)
        .max(100),

    respuesta:
      z.string()
        .max(2000),
  });

const solicitudGenerarSchema =
  z.object({
    accion:
      z.literal("generar"),

    continuidadId:
      continuidadIdSchema,

    perfil:
      z.unknown(),
  });

const solicitudCorregirSchema =
  z.object({
    accion:
      z.literal("corregir"),

    actividadId:
      actividadIdSchema,

    respuestas:
      z.array(
        respuestaSchema
      )
      .length(5),
  });

// ======================================================
// RESPUESTA JSON SIN CACHE
// ======================================================

function responderJson(
  datos: unknown,
  status: number
) {
  return NextResponse.json(
    datos,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

// ======================================================
// LEER BODY CON LIMITE
// ======================================================

async function leerJsonLimitado(
  request: NextRequest
): Promise<
  | {
      ok: true;
      datos: unknown;
    }
  | {
      ok: false;
      respuesta: NextResponse;
    }
> {
  const longitud =
    request.headers.get(
      "content-length"
    );

  if (
    longitud &&
    Number(longitud) >
      MAX_BODY_BYTES
  ) {
    return {
      ok: false,

      respuesta:
        responderJson(
          {
            error:
              "Solicitud demasiado grande.",
          },
          413
        ),
    };
  }

  const texto =
    await request.text();

  if (
    Buffer.byteLength(
      texto,
      "utf8"
    ) >
    MAX_BODY_BYTES
  ) {
    return {
      ok: false,

      respuesta:
        responderJson(
          {
            error:
              "Solicitud demasiado grande.",
          },
          413
        ),
    };
  }

  let datos: unknown;

  try {
    datos =
      JSON.parse(texto);
  } catch {
    return {
      ok: false,

      respuesta:
        responderJson(
          {
            error:
              "JSON no valido.",
          },
          400
        ),
    };
  }

  return {
    ok: true,
    datos,
  };
}

// ======================================================
// GENERAR ACTIVIDAD
// ======================================================

async function generar(
  datos: z.infer<
    typeof solicitudGenerarSchema
  >
) {
  // ----------------------------------------------
  // 1. Validar nuevamente el perfil recibido
  // desde el navegador.
  // ----------------------------------------------

  if (
    !perfilValido(
      datos.perfil
    )
  ) {
    return responderJson(
      {
        error:
          "Perfil provisional no valido o caducado.",
      },
      400
    );
  }

  const perfilPersonal:
    PerfilProvisional =
    datos.perfil;

  // ----------------------------------------------
  // 2. Recuperar perfil pedagogico desde servidor.
  //
  // El navegador NO decide:
  // - objetivo Grammar;
  // - nivel del objetivo;
  // - refuerzo/consolidacion;
  // - evidencia.
  // ----------------------------------------------

  let perfilPedagogico;

  try {
    perfilPedagogico =
      obtenerContinuidadPedagogica(
        datos.continuidadId
      );
  } catch {
    return responderJson(
      {
        error:
          "Continuidad pedagogica inexistente o caducada.",
      },
      404
    );
  }

  // ----------------------------------------------
  // 3. Crear solicitud pedagogica controlada.
  // ----------------------------------------------

  let solicitud;

  try {
    solicitud =
      crearSolicitudGrammarV2(
        perfilPersonal,
        perfilPedagogico
      );
  } catch (error) {
    console.error(
      "Error creando solicitud Grammar:",
      error
    );

    return responderJson(
      {
        error:
          "No se puede generar Grammar con los perfiles disponibles.",
      },
      400
    );
  }

  // ----------------------------------------------
  // 4. Gemini + Quality Gate + almacenamiento.
  //
  // El orquestador devuelve SOLO parte publica.
  // ----------------------------------------------

  try {
    const resultado =
      await crearActividadGrammar(
        solicitud
      );

    return responderJson(
      {
        estado:
          "actividad_generada",

        actividad:
          resultado.actividad,

        expiraEn:
          resultado.expiraEn,
      },
      200
    );

  } catch (error) {
    console.error(
      "Error generando actividad Grammar:",
      error
    );

    return responderJson(
      {
        error:
          "No se pudo generar la actividad Grammar.",
      },
      500
    );
  }
}

// ======================================================
// CORREGIR ACTIVIDAD
// ======================================================

function corregir(
  datos: z.infer<
    typeof solicitudCorregirSchema
  >
) {
  try {
    const resultado =
      corregirGrammar(
        datos.actividadId,
        datos.respuestas
      );

    return responderJson(
      {
        estado:
          "actividad_corregida",

        resultado,
      },
      200
    );

  } catch (error) {
    console.error(
      "Error corrigiendo Grammar:",
      error
    );

    return responderJson(
      {
        error:
          "No se pudo corregir la actividad Grammar.",
      },
      400
    );
  }
}

// ======================================================
// POST
// ======================================================

export async function POST(
  request: NextRequest
) {
  try {
    const lectura =
      await leerJsonLimitado(
        request
      );

    if (!lectura.ok) {
      return lectura.respuesta;
    }

    const datos =
      lectura.datos;

    // ----------------------------------------------
    // Determinar accion.
    // ----------------------------------------------

    if (
      !datos ||
      typeof datos !== "object" ||
      !("accion" in datos)
    ) {
      return responderJson(
        {
          error:
            "Accion Grammar no valida.",
        },
        400
      );
    }

    const accion =
      (datos as {
        accion?: unknown;
      }).accion;

    // ----------------------------------------------
    // GENERAR
    // ----------------------------------------------

    if (
      accion === "generar"
    ) {
      const validacion =
        solicitudGenerarSchema.safeParse(
          datos
        );

      if (
        !validacion.success
      ) {
        return responderJson(
          {
            error:
              "Datos de generacion Grammar no validos.",
          },
          400
        );
      }

      return await generar(
        validacion.data
      );
    }

    // ----------------------------------------------
    // CORREGIR
    // ----------------------------------------------

    if (
      accion === "corregir"
    ) {
      const validacion =
        solicitudCorregirSchema.safeParse(
          datos
        );

      if (
        !validacion.success
      ) {
        return responderJson(
          {
            error:
              "Datos de correccion Grammar no validos.",
          },
          400
        );
      }

      return corregir(
        validacion.data
      );
    }

    return responderJson(
      {
        error:
          "Accion Grammar no disponible.",
      },
      400
    );

  } catch (error) {
    console.error(
      "Error POST Grammar:",
      error
    );

    return responderJson(
      {
        error:
          "Error interno en Grammar.",
      },
      500
    );
  }
}