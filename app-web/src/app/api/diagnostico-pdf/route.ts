import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import {
  createElement,
  type ReactElement,
} from "react";
import { z } from "zod";

import {
  obtenerResultadoSesionTemporal,
} from "@/lib/diagnostico/sesiones";

import {
  InformeDiagnosticoPDF,
  type DatosInformePDF,
} from "@/lib/pdf/informe-diagnostico";

// ======================================================
// INTERESTALK - API INFORME PDF V1.1
//
// GET /api/diagnostico-pdf?sesionId=UUID
//
// Exclusivamente para desarrollo local.
// No publicar sin autenticacion y autorizacion.
// ======================================================

const esquemaId = z.string().uuid();

function respuestaError(
  mensaje: string,
  estado: number
) {
  return NextResponse.json(
    { error: mensaje },
    {
      status: estado,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  // Impedir el uso fuera del entorno de desarrollo.
  if (process.env.NODE_ENV !== "development") {
    return respuestaError(
      "Descarga PDF no disponible.",
      403
    );
  }

  const sesionId = request.nextUrl.searchParams.get(
    "sesionId"
  );

  const validacion = esquemaId.safeParse(sesionId);

  if (!validacion.success) {
    return respuestaError(
      "Identificador de sesion no valido.",
      400
    );
  }

  let resultado;

  try {
    resultado = obtenerResultadoSesionTemporal(
      validacion.data
    );
  } catch {
    return respuestaError(
      "Sesion inexistente, caducada o no finalizada.",
      404
    );
  }

  try {
    const datosPDF: DatosInformePDF = {
      fecha: new Intl.DateTimeFormat("es-ES", {
        dateStyle: "long",
        timeZone: "Europe/Madrid",
      }).format(new Date()),
      idioma: "en",
      estado: resultado.estado,
      preguntasRespondidas:
        resultado.preguntasRespondidas,
      aciertos: resultado.aciertos,
      porcentaje: resultado.porcentaje,
      informePedagogico:
        resultado.informePedagogico,
    };

    // React PDF requiere un elemento Document.
    // Nuestro componente devuelve un Document,
    // pero TypeScript no infiere ese tipo.
    //
    // La conversion se limita al elemento raiz
    // y no modifica los datos ni la plantilla.

    const documento = createElement(
      InformeDiagnosticoPDF,
      { datos: datosPDF }
    ) as ReactElement<DocumentProps>;

    const buffer = await renderToBuffer(documento);

    if (!buffer || buffer.length === 0) {
      throw new Error("PDF vacio.");
    }

    return new NextResponse(
      new Uint8Array(buffer),
      {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="interestalk-informe-diagnostico.pdf"',
          "Content-Length": String(buffer.length),
          "Cache-Control":
            "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error al generar PDF Interestalk:",
      error
    );

    return respuestaError(
      "No se pudo generar el informe PDF.",
      500
    );
  }
}