
import {
  construirPerfilPedagogico,
} from "./perfil-pedagogico";

import type {
  InformePedagogico,
  ResultadoObjetivo,
} from "./informe-pedagogico";

// INTERESTALK - TEST PERFIL PEDAGOGICO V1

let superadas = 0;
let fallidas = 0;

function comprobar(
  nombre: string,
  condicion: boolean
): void {
  if (condicion) {
    superadas++;
    console.log("CORRECTO - " + nombre);
  } else {
    fallidas++;
    console.error("ERROR - " + nombre);
  }
}

function objetivo(
  nombre: string,
  aciertos: number,
  total: number
): ResultadoObjetivo {
  return {
    objetivo: nombre,
    competencia: "grammar",
    nivel: "B1",
    total,
    aciertos,
    errores: total - aciertos,
    porcentaje: total
      ? Math.round((aciertos / total) * 100)
      : 0,
  };
}

function informe(
  objetivos: ResultadoObjetivo[]
): InformePedagogico {
  const total = objetivos.reduce(
    (suma, item) => suma + item.total, 0
  );

  const aciertos = objetivos.reduce(
    (suma, item) => suma + item.aciertos, 0
  );

  return {
    total,
    aciertos,
    errores: total - aciertos,
    porcentaje: total
      ? Math.round((aciertos / total) * 100)
      : 0,
    competencias: [
      {
        competencia: "grammar",
        total,
        aciertos,
        errores: total - aciertos,
        porcentaje: total
          ? Math.round((aciertos / total) * 100)
          : 0,
      },
    ],
    niveles: [],
    objetivos,
    recomendaciones: [],
    nivelMCERCertificado: false,
  };
}

const datosBase = {
  idiomaEvaluado: "en",
  nivelDeclarado: "B1" as const,
  estadoDiagnostico: "completado" as const,
  fechaEvaluacion: "2026-11-11T12:00:00.000Z",
};

function rechaza(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

// 1. PERFIL VALIDO

const perfil1 = construirPerfilPedagogico({
  ...datosBase,
  informe: informe([
    objetivo("second-conditional", 0, 1),
  ]),
});

comprobar(
  "Construye perfil B1 valido",
  perfil1.version === 1 &&
    perfil1.nivelDeclarado === "B1" &&
    perfil1.idiomaEvaluado === "en" &&
    perfil1.estadoDiagnostico === "completado"
);

// 2. REFUERZO

comprobar(
  "Selecciona refuerzo de Grammar",
  perfil1.grammar?.objetivo ===
    "second-conditional" &&
    perfil1.grammar.tipo === "refuerzo" &&
    perfil1.grammar.evidencia.errores === 1
);

// 3. CONSOLIDACION

const perfil3 = construirPerfilPedagogico({
  ...datosBase,
  informe: informe([
    objetivo("present-perfect", 2, 2),
  ]),
});

comprobar(
  "Propone consolidacion sin errores",
  perfil3.grammar?.tipo === "consolidacion" &&
    perfil3.grammar.evidencia.errores === 0
);

// 4. SIN GRAMMAR

const perfil4 = construirPerfilPedagogico({
  ...datosBase,
  informe: informe([]),
});

comprobar(
  "No inventa objetivos sin evidencias",
  perfil4.grammar === null
);

// 5. CONTEOS INVALIDOS

const informeInvalido = informe([
  objetivo("second-conditional", 0, 1),
]);

informeInvalido.aciertos = 2;

comprobar(
  "Rechaza conteos incoherentes",
  rechaza(() =>
    construirPerfilPedagogico({
      ...datosBase,
      informe: informeInvalido,
    })
  )
);

// 6. NIVEL INVALIDO

comprobar(
  "Rechaza nivel declarado invalido",
  rechaza(() =>
    construirPerfilPedagogico({
      ...datosBase,
      nivelDeclarado: "B3" as "B1",
      informe: informe([
        objetivo("second-conditional", 0, 1),
      ]),
    })
  )
);

// 7. FECHA INVALIDA

comprobar(
  "Rechaza fecha de evaluacion invalida",
  rechaza(() =>
    construirPerfilPedagogico({
      ...datosBase,
      fechaEvaluacion: "fecha-invalida",
      informe: informe([
        objetivo("second-conditional", 0, 1),
      ]),
    })
  )
);

// 8. INDEPENDENCIA DEL INFORME ORIGINAL

const informeOriginal = informe([
  objetivo("second-conditional", 0, 1),
]);

const perfil8 = construirPerfilPedagogico({
  ...datosBase,
  informe: informeOriginal,
});

informeOriginal.competencias[0].aciertos = 99;
informeOriginal.objetivos[0].errores = 99;

comprobar(
  "El perfil no cambia al modificar el informe",
  perfil8.competencias[0].aciertos === 0 &&
    perfil8.grammar?.evidencia.errores === 1
);

// RESULTADO FINAL

console.log("\n================================");
console.log("INTERESTALK - TEST PERFIL PEDAGOGICO");
console.log("================================");
console.log("Pruebas superadas:", superadas);
console.log("Pruebas fallidas:", fallidas);

if (fallidas === 0) {
  console.log("\nTODAS LAS PRUEBAS SUPERADAS");
} else {
  console.error("\nSE HAN DETECTADO FALLOS");
  process.exitCode = 1;
}
