import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  crearSesionTemporal,
  consultarSesionTemporal,
  responderSesionTemporal,
  obtenerResultadoSesionTemporal,
} from "@/lib/diagnostico/sesiones";

// ======================================================
// INTERESTALK - API DIAGNOSTICO ADAPTATIVO V1
//
// POST: iniciar una sesion o responder una pregunta.
// GET: consultar sesion o resultado final.
//
// SOLO DESARROLLO LOCAL.
// No publicar sin autenticacion y persistencia.
// ======================================================

const esquemaInicio = z.object({
  accion: z.literal("iniciar"),
  idioma: z.literal("en"),
  nivel: z.enum([
    "A1", "A2", "B1", "B2", "C1", "C2",
  ]),
}).strict();

const esquemaRespuesta = z.object({
  accion: z.literal("responder"),
  sesionId: z.string().uuid(),
  preguntaId: z.string().min(1).max(100),
  respuesta: z.number().int().min(0).max(3),
}).strict();

const esquemaSolicitud = z.discriminatedUnion(
  "accion",
  [esquemaInicio, esquemaRespuesta]
);

const MAX_BODY_BYTES = 4096;

function respuestaSinCache(
  datos: unknown,
  estado = 200
) {
  return NextResponse.json(datos, {
    status: estado,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

// ======================================================
// POST - INICIAR O RESPONDER
// ======================================================

export async function POST(request: NextRequest) {
  try {
    const longitud = request.headers.get(
      "content-length"
    );

    if (
      longitud !== null &&
      Number(longitud) > MAX_BODY_BYTES
    ) {
      return respuestaSinCache(
        { error: "Solicitud demasiado grande." },
        413
      );
    }

    const texto = await request.text();

    if (
      Buffer.byteLength(texto, "utf8") >
      MAX_BODY_BYTES
    ) {
      return respuestaSinCache(
        { error: "Solicitud demasiado grande." },
        413
      );
    }

    let datos: unknown;

    try {
      datos = JSON.parse(texto);
    } catch {
      return respuestaSinCache(
        { error: "JSON no valido." },
        400
      );
    }

    const validacion = esquemaSolicitud.safeParse(
      datos
    );

    if (!validacion.success) {
      return respuestaSinCache(
        { error: "Datos de solicitud no validos." },
        400
      );
    }

    if (validacion.data.accion === "iniciar") {
      const sesion = crearSesionTemporal(
        validacion.data.idioma,
        validacion.data.nivel
      );

      return respuestaSinCache({
        estado: "iniciada",
        sesion,
      });
    }

    const sesion = responderSesionTemporal(
      validacion.data.sesionId,
      validacion.data.preguntaId,
      validacion.data.respuesta
    );

    return respuestaSinCache({
      estado: "respuesta_procesada",
      sesion,
    });

  } catch (error) {
    console.error(
      "Error POST diagnostico adaptativo:",
      error
    );

    return respuestaSinCache(
      {
        error:
          "No se pudo procesar la solicitud del diagnostico.",
      },
      400
    );
  }
}

// ======================================================
// GET - CONSULTAR SESION O RESULTADO
// ======================================================

export async function GET(request: NextRequest) {
  try {
    const sesionId = request.nextUrl.searchParams.get(
      "sesionId"
    );

    const tipo = request.nextUrl.searchParams.get(
      "tipo"
    );

    const validacionId = z.string().uuid().safeParse(
      sesionId
    );

    if (!validacionId.success) {
      return respuestaSinCache(
        { error: "Identificador de sesion no valido." },
        400
      );
    }

    if (tipo === "resultado") {
      const resultado = obtenerResultadoSesionTemporal(
        validacionId.data
      );

      return respuestaSinCache({
        estado: "resultado_disponible",
        resultado,
      });
    }

    if (tipo !== null && tipo !== "sesion") {
      return respuestaSinCache(
        { error: "Tipo de consulta no valido." },
        400
      );
    }

    const sesion = consultarSesionTemporal(
      validacionId.data
    );

    return respuestaSinCache({
      estado: "consulta_correcta",
      sesion,
    });

  } catch (error) {
    console.error(
      "Error GET diagnostico adaptativo:",
      error
    );

    return respuestaSinCache(
      {
        error:
          "Sesion no encontrada, caducada o resultado no disponible.",
      },
      400
    );
  }
}