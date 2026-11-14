// ======================================================
// INTERESTALK - GRAMMAR V2
// CONTINUIDAD CLIENTE V1
//
// Conserva temporalmente en sessionStorage la referencia
// necesaria para pasar del resultado del diagnostico
// a la primera actividad Grammar.
//
// IMPORTANTE:
// - No almacena el perfil pedagogico.
// - No almacena soluciones.
// - No es autenticacion.
// - No es persistencia definitiva.
// - El servidor sigue siendo la fuente de verdad.
// ======================================================

export type ContinuidadGrammarCliente = {
  version: 1;
  continuidadId: string;
  expiraEn: string;
  creadoEn: number;
};

// ======================================================
// CONFIGURACION
// ======================================================

const CLAVE =
  "interestalk.grammar-continuidad.v1";

// ======================================================
// VALIDACION
// ======================================================

export function continuidadGrammarClienteValida(
  valor: unknown
): valor is ContinuidadGrammarCliente {
  if (
    !valor ||
    typeof valor !== "object"
  ) {
    return false;
  }

  const continuidad =
    valor as Partial<ContinuidadGrammarCliente>;

  if (
    continuidad.version !== 1
  ) {
    return false;
  }

  if (
    typeof continuidad.continuidadId !==
      "string" ||
    !continuidad.continuidadId.trim() ||
    continuidad.continuidadId.length > 100
  ) {
    return false;
  }

  if (
    typeof continuidad.expiraEn !==
      "string" ||
    !continuidad.expiraEn.trim()
  ) {
    return false;
  }

  const fechaExpiracion =
    new Date(
      continuidad.expiraEn
    ).getTime();

  if (
    Number.isNaN(
      fechaExpiracion
    )
  ) {
    return false;
  }

  if (
    fechaExpiracion <=
    Date.now()
  ) {
    return false;
  }

  if (
    typeof continuidad.creadoEn !==
      "number" ||
    !Number.isFinite(
      continuidad.creadoEn
    )
  ) {
    return false;
  }

  // No aceptamos referencias creadas
  // claramente en el futuro.
  if (
    continuidad.creadoEn >
    Date.now() + 60 * 1000
  ) {
    return false;
  }

  // La continuidad pedagogica del servidor
  // dura actualmente 24 horas.
  //
  // Admitimos un pequeno margen para evitar
  // depender de diferencias de milisegundos.
  const MAX_DURACION_MS =
    24 * 60 * 60 * 1000 +
    5 * 60 * 1000;

  if (
    fechaExpiracion -
      continuidad.creadoEn >
    MAX_DURACION_MS
  ) {
    return false;
  }

  return true;
}

// ======================================================
// GUARDAR
// ======================================================

export function guardarContinuidadGrammarCliente(
  continuidadId: string,
  expiraEn: string
): boolean {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  const continuidad:
    ContinuidadGrammarCliente = {
    version: 1,

    continuidadId,

    expiraEn,

    creadoEn:
      Date.now(),
  };

  if (
    !continuidadGrammarClienteValida(
      continuidad
    )
  ) {
    return false;
  }

  try {
    window.sessionStorage.setItem(
      CLAVE,
      JSON.stringify(
        continuidad
      )
    );

    return true;

  } catch {
    return false;
  }
}

// ======================================================
// LEER
// ======================================================

export function leerContinuidadGrammarCliente():
  ContinuidadGrammarCliente | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const guardado =
      window.sessionStorage.getItem(
        CLAVE
      );

    if (!guardado) {
      return null;
    }

    const valor: unknown =
      JSON.parse(
        guardado
      );

    if (
      continuidadGrammarClienteValida(
        valor
      )
    ) {
      return valor;
    }

    window.sessionStorage.removeItem(
      CLAVE
    );

  } catch {
    return null;
  }

  return null;
}

// ======================================================
// ELIMINAR
// ======================================================

export function eliminarContinuidadGrammarCliente():
  boolean {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  try {
    window.sessionStorage.removeItem(
      CLAVE
    );

    return true;

  } catch {
    return false;
  }
}