
import type {
  InformePedagogico,
  ResultadoCompetencia,
} from "./informe-pedagogico";

import type {
  NivelMCER,
} from "./preguntas-v2";

import {
  seleccionarObjetivoGrammar,
  type SeleccionGrammar,
} from "./selector-grammar";

// ======================================================
// INTERESTALK - PERFIL PEDAGOGICO V1
//
// Construye un resumen minimo del diagnostico.
// No almacena preguntas, respuestas ni soluciones.
// No certifica niveles MCER.
// ======================================================

const NIVELES: NivelMCER[] = [
  "A1", "A2", "B1", "B2", "C1", "C2",
];

export type PerfilPedagogico = {
  version: 1;
  idiomaEvaluado: string;
  nivelDeclarado: NivelMCER;
  estadoDiagnostico: "completado" | "incompleto";
  fechaEvaluacion: string;
  resultadoGeneral: {
    preguntas: number;
    aciertos: number;
    errores: number;
    porcentaje: number;
  };
  competencias: ResultadoCompetencia[];
  grammar: SeleccionGrammar | null;
  nivelMCERCertificado: false;
};

export type DatosDiagnosticoPedagogico = {
  idiomaEvaluado: string;
  nivelDeclarado: NivelMCER;
  estadoDiagnostico: "completado" | "incompleto";
  informe: InformePedagogico;
  fechaEvaluacion?: string;
};

// ======================================================
// VALIDACIONES
// ======================================================

function esEnteroNoNegativo(
  valor: number
): boolean {
  return Number.isInteger(valor) && valor >= 0;
}

function validarInforme(
  informe: InformePedagogico
): void {
  if (
    !esEnteroNoNegativo(informe.total) ||
    !esEnteroNoNegativo(informe.aciertos) ||
    !esEnteroNoNegativo(informe.errores)
  ) {
    throw new Error(
      "Los conteos del informe no son validos."
    );
  }

  if (
    informe.aciertos + informe.errores !==
    informe.total
  ) {
    throw new Error(
      "Los conteos del informe no coinciden."
    );
  }

  if (
    !Number.isFinite(informe.porcentaje) ||
    informe.porcentaje < 0 ||
    informe.porcentaje > 100
  ) {
    throw new Error(
      "Porcentaje del informe no valido."
    );
  }

  const porcentajeEsperado =
    informe.total > 0
      ? Math.round(
          (informe.aciertos / informe.total) * 100
        )
      : 0;

  if (
    informe.porcentaje !== porcentajeEsperado
  ) {
    throw new Error(
      "El porcentaje global no coincide."
    );
  }

  if (informe.nivelMCERCertificado !== false) {
    throw new Error(
      "El diagnostico no puede certificar MCER."
    );
  }

  if (!Array.isArray(informe.competencias)) {
    throw new Error(
      "Competencias del informe no validas."
    );
  }

  if (!Array.isArray(informe.objetivos)) {
    throw new Error(
      "Objetivos del informe no validos."
    );
  }

  for (const item of informe.competencias) {
    if (
      !esEnteroNoNegativo(item.total) ||
      !esEnteroNoNegativo(item.aciertos) ||
      !esEnteroNoNegativo(item.errores) ||
      item.aciertos + item.errores !== item.total
    ) {
      throw new Error(
        "Conteos de competencia no validos."
      );
    }
  }

  for (const item of informe.objetivos) {
    if (
      !esEnteroNoNegativo(item.total) ||
      !esEnteroNoNegativo(item.aciertos) ||
      !esEnteroNoNegativo(item.errores) ||
      item.aciertos + item.errores !== item.total
    ) {
      throw new Error(
        "Conteos de objetivo no validos."
      );
    }
  }
}

// ======================================================
// CONSTRUIR PERFIL
// ======================================================

export function construirPerfilPedagogico(
  datos: DatosDiagnosticoPedagogico
): PerfilPedagogico {
  if (
    !datos.idiomaEvaluado ||
    typeof datos.idiomaEvaluado !== "string"
  ) {
    throw new Error(
      "Idioma evaluado no valido."
    );
  }

  if (!NIVELES.includes(datos.nivelDeclarado)) {
    throw new Error(
      "Nivel declarado no valido."
    );
  }

  if (
    datos.estadoDiagnostico !== "completado" &&
    datos.estadoDiagnostico !== "incompleto"
  ) {
    throw new Error(
      "Estado de diagnostico no valido."
    );
  }

  validarInforme(datos.informe);

  const fecha = datos.fechaEvaluacion
    ? new Date(datos.fechaEvaluacion)
    : new Date();

  if (Number.isNaN(fecha.getTime())) {
    throw new Error(
      "Fecha de evaluacion no valida."
    );
  }

  const seleccionGrammar =
    seleccionarObjetivoGrammar(
      datos.informe,
      datos.nivelDeclarado
    );

  return {
    version: 1,
    idiomaEvaluado: datos.idiomaEvaluado,
    nivelDeclarado: datos.nivelDeclarado,
    estadoDiagnostico: datos.estadoDiagnostico,
    fechaEvaluacion: fecha.toISOString(),
    resultadoGeneral: {
      preguntas: datos.informe.total,
      aciertos: datos.informe.aciertos,
      errores: datos.informe.errores,
      porcentaje: datos.informe.porcentaje,
    },
    competencias: datos.informe.competencias.map(
      (item) => ({ ...item })
    ),
    grammar: seleccionGrammar
      ? {
          ...seleccionGrammar,
          evidencia: {
            ...seleccionGrammar.evidencia,
          },
        }
      : null,
    nivelMCERCertificado: false,
  };
}
