import {
  crearActividadGrammar,
  consultarActividadGrammar,
  corregirGrammar,
} from "./orquestador";

import {
  obtenerActividadGrammarPrivada,
  eliminarActividadGrammar,
  obtenerEstadisticasActividadesGrammar,
} from "./actividades";

import type {
  SolicitudGrammarV2,
} from "./tipos";

import type {
  RespuestaAlumnoGrammar,
} from "./correccion";

// ======================================================
// INTERESTALK - GRAMMAR V2
// TEST ORQUESTADOR END-TO-END V1
//
// Recorrido real:
//
// Solicitud pedagogica
// -> Gemini
// -> JSON estructurado
// -> Zod
// -> validacion contra solicitud
// -> Quality Gate
// -> almacenamiento privado
// -> actividad publica
// -> respuestas alumno
// -> correccion servidor
// -> resultado pedagogico
//
// Realiza UNA llamada real a Gemini.
// ======================================================

let superadas = 0;
let fallidas = 0;

function comprobar(
  nombre: string,
  condicion: boolean
): void {
  if (condicion) {
    superadas++;
    console.log(
      "CORRECTO - " + nombre
    );
  } else {
    fallidas++;
    console.error(
      "ERROR - " + nombre
    );
  }
}

// ======================================================
// SOLICITUD CONTROLADA
// ======================================================

const solicitud: SolicitudGrammarV2 = {
  contexto: {
    idiomaApoyo:
      "es",

    idiomaAprendizaje:
      "en",

    nivelDeclarado:
      "B1",

    objetivoPersonal:
      "Conversar con fluidez",

    intereses: [
      "Deporte",
      "Tecnologia",
      "Viajes",
    ],

    interesPrincipal:
      "Deporte",
  },

  necesidad: {
    objetivo:
      "present-perfect",

    nivel:
      "B1",

    tipo:
      "refuerzo",

    evidencia: {
      preguntas: 2,
      aciertos: 1,
      errores: 1,
      porcentaje: 50,
    },

    motivo:
      "Se han observado errores en este objetivo. " +
      "Se propone una actividad de refuerzo y una " +
      "comprobacion posterior del aprendizaje.",
  },
};

// ======================================================
// EJECUCION
// ======================================================

async function ejecutar(): Promise<void> {
  console.log(
    "\nIniciando test end-to-end Grammar V2..."
  );

  console.log(
    "Modelo:",
    process.env.GEMINI_MODEL ??
      "gemini-3.5-flash-lite"
  );

  console.log(
    "Objetivo:",
    solicitud.necesidad.objetivo
  );

  console.log(
    "Interes principal:",
    solicitud.contexto.interesPrincipal
  );

  // ====================================================
  // 1. ESTADO INICIAL
  // ====================================================

  const estadisticasIniciales =
    obtenerEstadisticasActividadesGrammar();

  // ====================================================
  // 2. CREAR ACTIVIDAD
  //
  // Aqui ocurre la llamada real a Gemini.
  // ====================================================

  const creada =
    await crearActividadGrammar(
      solicitud
    );

  const actividad =
    creada.actividad;

  comprobar(
    "Orquestador crea actividad",
    Boolean(
      actividad.actividadId
    )
  );

  comprobar(
    "Devuelve fecha de caducidad",
    !Number.isNaN(
      new Date(
        creada.expiraEn
      ).getTime()
    )
  );

  comprobar(
    "Almacen incrementa una actividad",
    obtenerEstadisticasActividadesGrammar()
      .actividadesActivas ===
      estadisticasIniciales
        .actividadesActivas + 1
  );

  // ====================================================
  // 3. IDENTIDAD PEDAGOGICA
  // ====================================================

  comprobar(
    "Mantiene objetivo present-perfect",
    actividad.objetivoGrammar ===
      solicitud.necesidad.objetivo
  );

  comprobar(
    "Mantiene nivel B1",
    actividad.nivelContenido ===
      solicitud.necesidad.nivel
  );

  comprobar(
    "Mantiene tipo refuerzo",
    actividad.tipoActividad ===
      solicitud.necesidad.tipo
  );

  comprobar(
    "Genera cinco ejercicios",
    actividad.ejercicios.length === 5
  );

  // ====================================================
  // 4. SEGURIDAD DE SALIDA PUBLICA
  // ====================================================

  const textoPublico =
    JSON.stringify(
      actividad
    );

  comprobar(
    "Publico no contiene respuestaCorrecta",
    !textoPublico.includes(
      "respuestaCorrecta"
    )
  );

  comprobar(
    "Publico no contiene soluciones",
    !textoPublico.includes(
      '"soluciones"'
    )
  );

  comprobar(
    "Publico no contiene origenPedagogico",
    !textoPublico.includes(
      "origenPedagogico"
    )
  );

  comprobar(
    "Publico no contiene explicacionRespuesta",
    !textoPublico.includes(
      "explicacionRespuesta"
    )
  );

  // ====================================================
  // 5. CONSULTAR ACTIVIDAD
  // ====================================================

  const consultada =
    consultarActividadGrammar(
      actividad.actividadId
    );

  comprobar(
    "Puede consultar actividad almacenada",
    consultada.actividadId ===
      actividad.actividadId
  );

  comprobar(
    "Consulta conserva cinco ejercicios",
    consultada.ejercicios.length === 5
  );

  const textoConsultado =
    JSON.stringify(
      consultada
    );

  comprobar(
    "Consulta tampoco expone soluciones",
    !textoConsultado.includes(
      "respuestaCorrecta"
    ) &&
    !textoConsultado.includes(
      '"soluciones"'
    )
  );

  // ====================================================
  // 6. COMPROBAR SERVIDOR PRIVADO
  //
  // Esta funcion NO representa una respuesta de API.
  // Solo se utiliza aqui para construir respuestas
  // de prueba y demostrar que las soluciones siguen
  // almacenadas exclusivamente en servidor.
  // ====================================================

  const completa =
    obtenerActividadGrammarPrivada(
      actividad.actividadId
    );

  comprobar(
    "Servidor conserva cinco soluciones privadas",
    completa.privada.soluciones.length === 5
  );

  comprobar(
    "Servidor conserva origen pedagogico",
    completa.origenPedagogico.objetivo ===
      solicitud.necesidad.objetivo
  );

  // ====================================================
  // 7. SIMULAR ALUMNO CON 3/5
  //
  // Las tres primeras respuestas son correctas.
  // Las dos ultimas son deliberadamente incorrectas.
  //
  // Resultado esperado:
  // 3/5 = 60% = practicar.
  // ====================================================

  const respuestas:
    RespuestaAlumnoGrammar[] =
    actividad.ejercicios.map(
      (ejercicio, indice) => {
        const solucion =
          completa.privada.soluciones.find(
            (item) =>
              item.ejercicioId ===
              ejercicio.id
          );

        if (!solucion) {
          throw new Error(
            "No existe solucion privada para el ejercicio."
          );
        }

        return {
          ejercicioId:
            ejercicio.id,

          respuesta:
            indice < 3
              ? solucion.respuestaCorrecta
              : "__respuesta_incorrecta__",
        };
      }
    );

  // ====================================================
  // 8. CORREGIR DESDE ORQUESTADOR
  // ====================================================

  const resultado =
    corregirGrammar(
      actividad.actividadId,
      respuestas
    );

  comprobar(
    "Correccion conserva actividadId",
    resultado.actividadId ===
      actividad.actividadId
  );

  comprobar(
    "Correccion conserva objetivo",
    resultado.objetivoGrammar ===
      solicitud.necesidad.objetivo
  );

  comprobar(
    "Correccion conserva nivel",
    resultado.nivelContenido ===
      solicitud.necesidad.nivel
  );

  comprobar(
    "Correccion conserva tipo",
    resultado.tipoActividad ===
      solicitud.necesidad.tipo
  );

  comprobar(
    "Simulacion obtiene 3 de 5",
    resultado.total === 5 &&
    resultado.aciertos === 3 &&
    resultado.errores === 2
  );

  comprobar(
    "3 de 5 produce 60%",
    resultado.porcentaje === 60
  );

  comprobar(
    "60% produce estado practicar",
    resultado.estadoAprendizaje ===
      "practicar"
  );

  comprobar(
    "60% necesita refuerzo adicional",
    resultado.necesitaRefuerzo === true
  );

  comprobar(
    "Devuelve cinco correcciones individuales",
    resultado.resultados.length === 5
  );

  comprobar(
    "Cada correccion incluye explicacion",
    resultado.resultados.every(
      (item) =>
        item.explicacion.trim().length > 0
    )
  );

  // ====================================================
  // 9. RESULTADO YA PUEDE MOSTRAR SOLUCIONES
  //
  // Solo DESPUES de enviar las respuestas y corregir.
  // ====================================================

  comprobar(
    "Resultado corregido contiene respuestas correctas",
    resultado.resultados.every(
      (item) =>
        item.respuestaCorrecta
          .trim()
          .length > 0
    )
  );

  // ====================================================
  // 10. LIMPIEZA
  // ====================================================

  comprobar(
    "Elimina actividad de prueba",
    eliminarActividadGrammar(
      actividad.actividadId
    ) === true
  );

  comprobar(
    "Almacen vuelve al estado inicial",
    obtenerEstadisticasActividadesGrammar()
      .actividadesActivas ===
      estadisticasIniciales
        .actividadesActivas
  );

  // ====================================================
  // RESUMEN
  // ====================================================

  console.log(
    "\n================================"
  );

  console.log(
    "INTERESTALK - TEST ORQUESTADOR GRAMMAR V2"
  );

  console.log(
    "================================"
  );

  console.log(
    "Pruebas superadas:",
    superadas
  );

  console.log(
    "Pruebas fallidas:",
    fallidas
  );

  console.log(
    "\nACTIVIDAD:"
  );

  console.log(
    "ID:",
    actividad.actividadId
  );

  console.log(
    "Titulo:",
    actividad.titulo
  );

  console.log(
    "Objetivo:",
    actividad.objetivoGrammar
  );

  console.log(
    "Nivel:",
    actividad.nivelContenido
  );

  console.log(
    "Tipo:",
    actividad.tipoActividad
  );

  console.log(
    "\nRESULTADO SIMULADO:"
  );

  console.log(
    "Aciertos:",
    resultado.aciertos +
      "/" +
      resultado.total
  );

  console.log(
    "Porcentaje:",
    resultado.porcentaje + "%"
  );

  console.log(
    "Estado:",
    resultado.estadoAprendizaje
  );

  console.log(
    "Necesita refuerzo:",
    resultado.necesitaRefuerzo
  );

  if (fallidas === 0) {
    console.log(
      "\nTODAS LAS PRUEBAS SUPERADAS"
    );
  } else {
    console.error(
      "\nSE HAN DETECTADO FALLOS"
    );

    process.exitCode = 1;
  }
}

ejecutar().catch((error) => {
  console.error(
    "\nERROR EN TEST ORQUESTADOR GRAMMAR V2:"
  );

  console.error(error);

  process.exitCode = 1;
});