import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  obtenerPreguntasPublicas,
  corregirDiagnostico,
} from "@/lib/diagnostico/preguntas";

// =====================================================
// INTERESTALK - API DIAGNOSTICO V1
// GET: preguntas sin soluciones
// POST: correccion en servidor
//
// Prototipo local. No publicar sin autenticacion,
// control de intentos y proteccion contra abuso.
// =====================================================

const idiomaSchema = z.enum(["en"]);

const respuestasSchema = z.record(
  z.string().min(1).max(100),
  z.number().int().min(0).max(3)
);

const solicitudSchema = z.object({
  idioma: idiomaSchema,
  respuestas: respuestasSchema,
});

// Obtener preguntas publicas
export async function GET(request: NextRequest) {
  try {
    const idioma = request.nextUrl.searchParams.get("idioma");

    const validacion = idiomaSchema.safeParse(idioma);

    if (!validacion.success) {
      return NextResponse.json(
        {
          error:
            "Idioma no disponible para el diagnostico.",
        },
        { status: 400 }
      );
    }

    const preguntas = obtenerPreguntasPublicas(
      validacion.data
    );

    return NextResponse.json(
      {
        idioma: validacion.data,
        total: preguntas.length,
        preguntas,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error GET diagnostico:", error);

    return NextResponse.json(
      {
        error: "No se pudieron obtener las preguntas.",
      },
      { status: 500 }
    );
  }
}

// Corregir respuestas en el servidor
export async function POST(request: NextRequest) {
  try {
    // Limite de entrada para este prototipo.
    const longitud = request.headers.get("content-length");

    if (longitud && Number(longitud) > 8192) {
      return NextResponse.json(
        { error: "Solicitud demasiado grande." },
        { status: 413 }
      );
    }

    const texto = await request.text();

    if (Buffer.byteLength(texto, "utf8") > 8192) {
      return NextResponse.json(
        { error: "Solicitud demasiado grande." },
        { status: 413 }
      );
    }

    let datos: unknown;

    try {
      datos = JSON.parse(texto);
    } catch {
      return NextResponse.json(
        { error: "JSON no valido." },
        { status: 400 }
      );
    }

    const validacion = solicitudSchema.safeParse(datos);

    if (!validacion.success) {
      return NextResponse.json(
        {
          error: "Datos del diagnostico no validos.",
        },
        { status: 400 }
      );
    }

    const { idioma, respuestas } = validacion.data;

    const preguntas = obtenerPreguntasPublicas(idioma);
    const idsPermitidos = new Set(
      preguntas.map((pregunta) => pregunta.id)
    );

    const idsEnviados = Object.keys(respuestas);

    if (
      idsEnviados.length !== preguntas.length ||
      idsEnviados.some((id) => !idsPermitidos.has(id))
    ) {
      return NextResponse.json(
        {
          error:
            "Debes responder exactamente las preguntas del diagnostico.",
        },
        { status: 400 }
      );
    }

    const resultado = corregirDiagnostico(
      idioma,
      respuestas
    );

    return NextResponse.json(
      {
        estado: "completado",
        idioma,
        resultado,
        mensaje:
          "Diagnostico corregido. Nivel MCER pendiente de calibracion.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error POST diagnostico:", error);

    return NextResponse.json(
      {
        error: "No se pudo corregir el diagnostico.",
      },
      { status: 500 }
    );
  }
}