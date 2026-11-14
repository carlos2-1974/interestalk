import "server-only";

import type {
  ResultadoCorreccionGrammar,
} from "@/lib/grammar/correccion";

import type {
  ActividadGrammarCompleta,
} from "@/lib/grammar/tipos";

// ======================================================
// INTERESTALK - CMD
// MEMORIA EDUCATIVA V1
//
// Convierte resultados de aprendizaje en eventos
// educativos normalizados.
//
// Objetivo:
// - conservar evidencia historica;
// - permitir calcular evolucion;
// - alimentar el futuro CMD;
// - alimentar el futuro planificador semanal.
//
// No utiliza Gemini.
// No certifica nivel MCER.
// No decide todavia el siguiente contenido.
// ======================================================

// ======================================================
// TIPOS GENERALES
// ======================================================

export type CompetenciaEducativa =
  | "grammar"
  | "reading"
  | "listening"
  | "conversation"
  | "vocabulary";

export type EstadoAprendizaje =
  | "reforzar"
  | "practicar"
  | "consolidar";

export type OrigenNecesidad =
  | "diagnostico"
  | "actividad"
  | "plan"
  | "manual";

export type TipoActividadEducativa =
  | "refuerzo"
  | "consolidacion";

export type EventoEducativo = {
  version: 1;

  eventoId: string;

  actividadId: string;

  competencia:
    CompetenciaEducativa;

  objetivo: string;

  nivelContenido: string;

  tipoActividad:
    TipoActividadEducativa;

  origen:
    OrigenNecesidad;

  evidenciaOrigen: {
    preguntas: number;
    aciertos: number;
    errores: number;
    porcentaje: number;
  } | null;

  resultado: {
    preguntas: number;
    aciertos: number;
    errores: number;
    porcentaje: number;
  };

  estadoAprendizaje:
    EstadoAprendizaje;

  necesitaRefuerzo:
    boolean;

  contextoPersonalizacion: {
    interesPrincipal:
      string | null;
  };

  intento:
    number;

  fechaActividad:
    string;

  nivelMCERCertificado:
    false;
};

// ======================================================
// DATOS NECESARIOS PARA REGISTRAR GRAMMAR
//
// El resultado de correccion no conoce por si solo
// el interes utilizado ni el numero de intento.
//
// Estos datos los aporta la capa que registra
// el evento en el CMD.
// ======================================================

export type DatosEventoGrammar = {
  actividad:
    ActividadGrammarCompleta;

  resultado:
    ResultadoCorreccionGrammar;

  interesPrincipal?:
    string | null;

  intento?:
    number;

  origen?:
    OrigenNecesidad;

  fechaActividad?:
    string;
};

// ======================================================
// VALIDACIONES INTERNAS
// ======================================================

function esEnteroNoNegativo(
  valor: number
): boolean {
  return (
    Number.isInteger(valor) &&
    valor >= 0
  );
}

function validarConteos(
  preguntas: number,
  aciertos: number,
  errores: number,
  porcentaje: number
): void {
  if (
    !esEnteroNoNegativo(
      preguntas
    ) ||
    !esEnteroNoNegativo(
      aciertos
    ) ||
    !esEnteroNoNegativo(
      errores
    )
  ) {
    throw new Error(
      "Conteos educativos no validos."
    );
  }

  if (
    aciertos + errores !==
    preguntas
  ) {
    throw new Error(
      "Los conteos educativos no coinciden."
    );
  }

  if (
    !Number.isFinite(
      porcentaje
    ) ||
    porcentaje < 0 ||
    porcentaje > 100
  ) {
    throw new Error(
      "Porcentaje educativo no valido."
    );
  }

  const esperado =
    preguntas > 0
      ? Math.round(
          (
            aciertos /
            preguntas
          ) * 100
        )
      : 0;

  if (
    porcentaje !== esperado
  ) {
    throw new Error(
      "El porcentaje educativo no coincide."
    );
  }
}

function validarFecha(
  fecha: string
): string {
  const valor =
    new Date(fecha);

  if (
    Number.isNaN(
      valor.getTime()
    )
  ) {
    throw new Error(
      "Fecha educativa no valida."
    );
  }

  return valor.toISOString();
}

function validarIntento(
  intento: number
): void {
  if (
    !Number.isInteger(
      intento
    ) ||
    intento < 1
  ) {
    throw new Error(
      "Numero de intento no valido."
    );
  }
}

// ======================================================
// CREAR ID DE EVENTO
//
// Se usa crypto.randomUUID del runtime global.
// Compatible con Node moderno.
// ======================================================

function crearEventoId():
  string {
  return crypto.randomUUID();
}

// ======================================================
// CREAR EVENTO DESDE GRAMMAR
// ======================================================

export function crearEventoEducativoGrammar(
  datos: DatosEventoGrammar
): EventoEducativo {

  const {
    actividad,
    resultado,
  } = datos;

  // ====================================================
  // 1. COHERENCIA DE IDENTIDAD
  // ====================================================

  if (
    actividad.publica
      .actividadId !==
    actividad.privada
      .actividadId
  ) {
    throw new Error(
      "La actividad Grammar no es coherente."
    );
  }

  if (
    resultado.actividadId !==
    actividad.publica
      .actividadId
  ) {
    throw new Error(
      "El resultado no pertenece a la actividad."
    );
  }

  // ====================================================
  // 2. COHERENCIA PEDAGOGICA
  // ====================================================

  if (
    resultado.objetivoGrammar !==
    actividad.origenPedagogico
      .objetivo
  ) {
    throw new Error(
      "El objetivo Grammar del resultado no coincide."
    );
  }

  if (
    resultado.nivelContenido !==
    actividad.origenPedagogico
      .nivel
  ) {
    throw new Error(
      "El nivel Grammar del resultado no coincide."
    );
  }

  if (
    resultado.tipoActividad !==
    actividad.origenPedagogico
      .tipo
  ) {
    throw new Error(
      "El tipo Grammar del resultado no coincide."
    );
  }

  // ====================================================
  // 3. VALIDAR RESULTADO
  // ====================================================

  validarConteos(
    resultado.total,
    resultado.aciertos,
    resultado.errores,
    resultado.porcentaje
  );

  // ====================================================
  // 4. VALIDAR EVIDENCIA DE ORIGEN
  // ====================================================

  const evidencia =
    actividad.origenPedagogico
      .evidencia;

  validarConteos(
    evidencia.preguntas,
    evidencia.aciertos,
    evidencia.errores,
    evidencia.porcentaje
  );

  // ====================================================
  // 5. INTENTO
  // ====================================================

  const intento =
    datos.intento ?? 1;

  validarIntento(
    intento
  );

  // ====================================================
  // 6. FECHA
  // ====================================================

  const fechaActividad =
    validarFecha(
      datos.fechaActividad ??
        resultado.completadoEn
    );

  // ====================================================
  // 7. INTERES
  // ====================================================

  const interesPrincipal =
    datos.interesPrincipal
      ?.trim() || null;

  // ====================================================
  // 8. EVENTO NORMALIZADO
  // ====================================================

  return {
    version: 1,

    eventoId:
      crearEventoId(),

    actividadId:
      actividad.publica
        .actividadId,

    competencia:
      "grammar",

    objetivo:
      actividad.origenPedagogico
        .objetivo,

    nivelContenido:
      actividad.origenPedagogico
        .nivel,

    tipoActividad:
      actividad.origenPedagogico
        .tipo,

    origen:
      datos.origen ??
      "diagnostico",

    evidenciaOrigen: {
      preguntas:
        evidencia.preguntas,

      aciertos:
        evidencia.aciertos,

      errores:
        evidencia.errores,

      porcentaje:
        evidencia.porcentaje,
    },

    resultado: {
      preguntas:
        resultado.total,

      aciertos:
        resultado.aciertos,

      errores:
        resultado.errores,

      porcentaje:
        resultado.porcentaje,
    },

    estadoAprendizaje:
      resultado
        .estadoAprendizaje,

    necesitaRefuerzo:
      resultado
        .necesitaRefuerzo,

    contextoPersonalizacion: {
      interesPrincipal,
    },

    intento,

    fechaActividad,

    nivelMCERCertificado:
      false,
  };
}