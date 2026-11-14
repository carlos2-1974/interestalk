import { NextResponse } from "next/server";

import {
  generarContenido,
  type PerfilAlumno,
  type TipoActividad,
} from "@/lib/gemini";

// =====================================================
// INTERESTALK - API DE GENERACION MULTIIDIOMA
// Compatible con Next.js 16 y Cache Components
// =====================================================

const MAX_BODY_BYTES = 4096;

const NIVELES = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

const ACTIVIDADES: TipoActividad[] = [
  "reading",
  "listening",
  "grammar",
  "conversation",
];

// =====================================================
// VALIDACION DE TEXTO
// =====================================================

function textoValido(
  valor: unknown,
  maximo: number
): valor is string {
  return (
    typeof valor === "string" &&
    valor.trim().length > 0 &&
    valor.length <= maximo
  );
}

// =====================================================
// ENDPOINT POST /api/generate
// =====================================================

export async function POST(request: Request) {
  try {
    // 1. Comprobar el tamano de la solicitud
    const longitud = request.headers.get("content-length");

    if (
      longitud !== null &&
      Number(longitud) > MAX_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Solicitud demasiado grande",
        },
        { status: 413 }
      );
    }

    // 2. Leer JSON con un limite real de bytes
    const lector = request.body?.getReader();

    if (!lector) {
      return NextResponse.json(
        {
          success: false,
          error: "Solicitud vacia",
        },
        { status: 400 }
      );
    }

    const fragmentos: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await lector.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_BODY_BYTES) {
        await lector.cancel();

        return NextResponse.json(
          {
            success: false,
            error: "Solicitud demasiado grande",
          },
          { status: 413 }
        );
      }

      fragmentos.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let posicion = 0;

    for (const fragmento of fragmentos) {
      bytes.set(fragmento, posicion);
      posicion += fragmento.byteLength;
    }

    let datos: unknown;

    try {
      const texto = new TextDecoder(
        "utf-8",
        { fatal: true }
      ).decode(bytes);

      datos = JSON.parse(texto);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "JSON no valido",
        },
        { status: 400 }
      );
    }

    // 3. Validar estructura de solicitud
    if (
      typeof datos !== "object" ||
      datos === null ||
      Array.isArray(datos)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Formato de solicitud incorrecto",
        },
        { status: 400 }
      );
    }

    const body = datos as Record<string, unknown>;

    const perfil = body.perfil;

    if (
      typeof perfil !== "object" ||
      perfil === null ||
      Array.isArray(perfil)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Perfil del alumno no valido",
        },
        { status: 400 }
      );
    }

    const p = perfil as Record<string, unknown>;

    // 4. Validar perfil multiidioma
    const perfilValido =
      textoValido(p.idiomaNativo, 60) &&
      textoValido(p.idiomaAprendizaje, 60) &&
      typeof p.nivel === "string" &&
      NIVELES.some((nivel) => nivel === p.nivel) &&
      Array.isArray(p.intereses) &&
      p.intereses.length >= 1 &&
      p.intereses.length <= 5 &&
      p.intereses.every(
        (interes: unknown) =>
          textoValido(interes, 60)
      ) &&
      textoValido(p.objetivo, 200);

    // 5. Validar actividad solicitada
    const actividadValida =
      typeof body.actividad === "string" &&
      ACTIVIDADES.some(
        (actividad) => actividad === body.actividad
      );

    if (!perfilValido || !actividadValida) {
      return NextResponse.json(
        {
          success: false,
          error: "Datos del alumno o actividad invalidos",
        },
        { status: 400 }
      );
    }

    // 6. Construir perfil validado
    const perfilAlumno: PerfilAlumno = {
      idiomaNativo: p.idiomaNativo as string,
      idiomaAprendizaje: p.idiomaAprendizaje as string,
      nivel: p.nivel as PerfilAlumno["nivel"],
      intereses: p.intereses as string[],
      objetivo: p.objetivo as string,
    };

    const actividad = body.actividad as TipoActividad;

    // 7. Generar contenido mediante Gemini
    const contenido = await generarContenido({
      perfil: perfilAlumno,
      actividad,
    });

    // 8. Responder al navegador
    return NextResponse.json(
      {
        success: true,
        actividad,
        idioma: perfilAlumno.idiomaAprendizaje,
        nivel: perfilAlumno.nivel,
        nivelVerificado: false,
        contenido,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {
    console.error(
      "Error en API Interestalk:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo generar la actividad",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}