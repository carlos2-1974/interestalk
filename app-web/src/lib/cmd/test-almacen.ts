import {
  registrarEventoEducativo,
  obtenerHistoricoAlumno,
  obtenerEstadoAlumno,
  existeAlumnoCMD,
  eliminarAlumnoCMD,
  obtenerEstadisticasCMD,
} from "./almacen";

import type {
  EventoEducativo,
  EstadoAprendizaje,
} from "./memoria-educativa";

// ======================================================
// INTERESTALK - CMD
// TEST ALMACEN TEMPORAL V1
//
// Comprueba:
// - aislamiento entre alumnos;
// - historico acumulativo;
// - estado agregado;
// - prioridad pedagogica;
// - duplicados;
// - copias defensivas;
// - eliminacion independiente;
// - caducidad;
// - renovacion de caducidad;
// - estadisticas.
//
// No utiliza Gemini.
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

function rechaza(
  accion: () => unknown
): boolean {
  try {
    accion();

    return false;
  } catch {
    return true;
  }
}

// ======================================================
// CREAR EVENTO DE PRUEBA
// ======================================================

function crearEvento(
  datos: {
    eventoId: string;
    actividadId: string;
    objetivo: string;
    intento: number;
    porcentaje: number;
    estado: EstadoAprendizaje;
    fecha: string;
  }
): EventoEducativo {
  const preguntas = 5;

  const aciertos =
    Math.round(
      (
        datos.porcentaje /
        100
      ) * preguntas
    );

  const errores =
    preguntas -
    aciertos;

  return {
    version: 1,

    eventoId:
      datos.eventoId,

    actividadId:
      datos.actividadId,

    competencia:
      "grammar",

    objetivo:
      datos.objetivo,

    nivelContenido:
      "B1",

    tipoActividad:
      datos.estado ===
      "consolidar"
        ? "consolidacion"
        : "refuerzo",

    origen:
      datos.intento === 1
        ? "diagnostico"
        : "actividad",

    evidenciaOrigen:
      datos.intento === 1
        ? {
            preguntas: 2,
            aciertos: 1,
            errores: 1,
            porcentaje: 50,
          }
        : null,

    resultado: {
      preguntas,
      aciertos,
      errores,
      porcentaje:
        datos.porcentaje,
    },

    estadoAprendizaje:
      datos.estado,

    necesitaRefuerzo:
      datos.estado !==
      "consolidar",

    contextoPersonalizacion: {
      interesPrincipal:
        "Tecnologia e IA",
    },

    intento:
      datos.intento,

    fechaActividad:
      datos.fecha,

    nivelMCERCertificado:
      false,
  };
}

// ======================================================
// DATOS DE PRUEBA
// ======================================================

const alumnoA =
  "alumno-test-a";

const alumnoB =
  "alumno-test-b";

const eventoA1 =
  crearEvento({
    eventoId:
      "evento-a-1",

    actividadId:
      "actividad-a-1",

    objetivo:
      "second-conditional",

    intento:
      1,

    porcentaje:
      40,

    estado:
      "reforzar",

    fecha:
      "2026-11-01T10:00:00.000Z",
  });

const eventoA2 =
  crearEvento({
    eventoId:
      "evento-a-2",

    actividadId:
      "actividad-a-2",

    objetivo:
      "second-conditional",

    intento:
      2,

    porcentaje:
      60,

    estado:
      "practicar",

    fecha:
      "2026-11-05T10:00:00.000Z",
  });

const eventoA3 =
  crearEvento({
    eventoId:
      "evento-a-3",

    actividadId:
      "actividad-a-3",

    objetivo:
      "present-perfect",

    intento:
      1,

    porcentaje:
      40,

    estado:
      "reforzar",

    fecha:
      "2026-11-10T10:00:00.000Z",
  });

const eventoB1 =
  crearEvento({
    eventoId:
      "evento-b-1",

    actividadId:
      "actividad-b-1",

    objetivo:
      "past-simple",

    intento:
      1,

    porcentaje:
      80,

    estado:
      "consolidar",

    fecha:
      "2026-11-03T10:00:00.000Z",
  });

// ======================================================
// RELOJ SIMULADO
// ======================================================

const relojOriginal =
  Date.now;

const inicio =
  relojOriginal();

let tiempoSimulado =
  inicio;

const HORA =
  60 * 60 * 1000;

try {
  Date.now = () =>
    tiempoSimulado;

  // ====================================================
  // 1. ESTADO INICIAL
  // ====================================================

  const estadisticasIniciales =
    obtenerEstadisticasCMD();

  comprobar(
    "Almacen comienza sin alumnos",
    estadisticasIniciales
      .alumnosActivos === 0
  );

  comprobar(
    "Almacen comienza sin eventos",
    estadisticasIniciales
      .eventosTotales === 0
  );

  comprobar(
    "Duracion configurada en 24 horas",
    estadisticasIniciales
      .duracionHoras === 24
  );

  // ====================================================
  // 2. REGISTRAR PRIMER EVENTO ALUMNO A
  // ====================================================

  const registroA1 =
    registrarEventoEducativo(
      alumnoA,
      eventoA1
    );

  comprobar(
    "Registra primer evento del alumno A",
    registroA1.alumnoId ===
      alumnoA &&
    registroA1.eventoId ===
      eventoA1.eventoId
  );

  comprobar(
    "Alumno A tiene un evento",
    registroA1.totalEventos === 1
  );

  comprobar(
    "Primer evento caduca en 24 horas",
    new Date(
      registroA1.expiraEn
    ).getTime() ===
      inicio +
      24 * HORA
  );

  comprobar(
    "Alumno A existe",
    existeAlumnoCMD(
      alumnoA
    )
  );

  comprobar(
    "Alumno B todavia no existe",
    !existeAlumnoCMD(
      alumnoB
    )
  );

  // ====================================================
  // 3. HISTORICO ALUMNO A
  // ====================================================

  const historicoA1 =
    obtenerHistoricoAlumno(
      alumnoA
    );

  comprobar(
    "Historico A contiene un evento",
    historicoA1.totalEventos ===
      1 &&
    historicoA1.eventos.length ===
      1
  );

  comprobar(
    "Historico A conserva objetivo",
    historicoA1.eventos[0]
      .objetivo ===
      "second-conditional"
  );

  // ====================================================
  // 4. COPIA DEFENSIVA
  // ====================================================

  historicoA1.eventos[0]
    .objetivo =
    "objetivo-modificado";

  historicoA1.eventos[0]
    .resultado.porcentaje =
    100;

  const historicoA1OtraVez =
    obtenerHistoricoAlumno(
      alumnoA
    );

  comprobar(
    "Modificar copia no altera objetivo interno",
    historicoA1OtraVez
      .eventos[0]
      .objetivo ===
      "second-conditional"
  );

  comprobar(
    "Modificar copia no altera resultado interno",
    historicoA1OtraVez
      .eventos[0]
      .resultado
      .porcentaje === 40
  );

  // ====================================================
  // 5. REGISTRAR ALUMNO B
  // ====================================================

  const registroB1 =
    registrarEventoEducativo(
      alumnoB,
      eventoB1
    );

  comprobar(
    "Registra alumno B",
    registroB1.alumnoId ===
      alumnoB
  );

  comprobar(
    "Alumno B tiene un evento",
    registroB1.totalEventos ===
      1
  );

  comprobar(
    "Existen dos alumnos activos",
    obtenerEstadisticasCMD()
      .alumnosActivos === 2
  );

  comprobar(
    "Existen dos eventos globales",
    obtenerEstadisticasCMD()
      .eventosTotales === 2
  );

  // ====================================================
  // 6. AISLAMIENTO ENTRE ALUMNOS
  // ====================================================

  const historicoB =
    obtenerHistoricoAlumno(
      alumnoB
    );

  comprobar(
    "Alumno B solo ve su evento",
    historicoB.totalEventos ===
      1 &&
    historicoB.eventos[0]
      .actividadId ===
      "actividad-b-1"
  );

  comprobar(
    "Alumno B no contiene eventos de A",
    !historicoB.eventos.some(
      (evento) =>
        evento.actividadId
          .startsWith(
            "actividad-a-"
          )
    )
  );

  const historicoA =
    obtenerHistoricoAlumno(
      alumnoA
    );

  comprobar(
    "Alumno A no contiene eventos de B",
    !historicoA.eventos.some(
      (evento) =>
        evento.actividadId ===
        "actividad-b-1"
    )
  );

  // ====================================================
  // 7. SEGUNDO EVENTO DEL ALUMNO A
  //
  // Avanzamos una hora.
  // La nueva actividad debe renovar la caducidad.
  // ====================================================

  tiempoSimulado =
    inicio + HORA;

  const registroA2 =
    registrarEventoEducativo(
      alumnoA,
      eventoA2
    );

  comprobar(
    "Alumno A acumula segundo evento",
    registroA2.totalEventos ===
      2
  );

  comprobar(
    "Segundo evento renueva caducidad",
    new Date(
      registroA2.expiraEn
    ).getTime() ===
      inicio +
      25 * HORA
  );

  comprobar(
    "Caducidad renovada supera la original",
    new Date(
      registroA2.expiraEn
    ).getTime() >
    new Date(
      registroA1.expiraEn
    ).getTime()
  );

  // ====================================================
  // 8. ESTADO AGREGADO ALUMNO A
  // ====================================================

  const estadoA2 =
    obtenerEstadoAlumno(
      alumnoA
    );

  comprobar(
    "Estado A registra dos eventos",
    estadoA2.totalEventos ===
      2
  );

  comprobar(
    "Estado A detecta un objetivo",
    estadoA2
      .objetivosTrabajados === 1
  );

  comprobar(
    "Second Conditional tiene dos intentos",
    estadoA2.objetivos[0]
      .intentos === 2
  );

  comprobar(
    "Second Conditional mejora de 40 a 60",
    estadoA2.objetivos[0]
      .variacionDesdePrimero ===
      20
  );

  comprobar(
    "Second Conditional tiene tendencia mejora",
    estadoA2.objetivos[0]
      .tendencia ===
      "mejora"
  );

  comprobar(
    "Estado actual es practicar",
    estadoA2.objetivos[0]
      .estadoActual ===
      "practicar"
  );

  comprobar(
    "Second Conditional es prioridad actual",
    estadoA2.prioridadActual
      ?.objetivo ===
      "second-conditional"
  );

  // ====================================================
  // 9. TERCER EVENTO A · OTRO OBJETIVO
  // ====================================================

  tiempoSimulado =
    inicio +
    2 * HORA;

  const registroA3 =
    registrarEventoEducativo(
      alumnoA,
      eventoA3
    );

  comprobar(
    "Alumno A acumula tres eventos",
    registroA3.totalEventos ===
      3
  );

  const estadoA3 =
    obtenerEstadoAlumno(
      alumnoA
    );

  comprobar(
    "Alumno A tiene dos objetivos",
    estadoA3
      .objetivosTrabajados === 2
  );

  comprobar(
    "Alumno A tiene un objetivo reforzar",
    estadoA3.estados
      .reforzar === 1
  );

  comprobar(
    "Alumno A tiene un objetivo practicar",
    estadoA3.estados
      .practicar === 1
  );

  comprobar(
    "Present Perfect pasa a prioridad",
    estadoA3.prioridadActual
      ?.objetivo ===
      "present-perfect"
  );

  comprobar(
    "Present Perfect tiene prioridad alta",
    estadoA3.prioridadActual
      ?.prioridad ===
      "alta"
  );

  // ====================================================
  // 10. DUPLICADO EVENTO ID
  // ====================================================

  comprobar(
    "Rechaza eventoId duplicado",
    rechaza(() =>
      registrarEventoEducativo(
        alumnoA,
        {
          ...eventoA3,

          actividadId:
            "actividad-a-nueva",
        }
      )
    )
  );

  comprobar(
    "Duplicado evento no altera historico",
    obtenerHistoricoAlumno(
      alumnoA
    ).totalEventos === 3
  );

  // ====================================================
  // 11. DUPLICADO ACTIVIDAD ID
  // ====================================================

  comprobar(
    "Rechaza actividadId duplicado",
    rechaza(() =>
      registrarEventoEducativo(
        alumnoA,
        {
          ...eventoA3,

          eventoId:
            "evento-a-nuevo",
        }
      )
    )
  );

  comprobar(
    "Duplicado actividad no altera historico",
    obtenerHistoricoAlumno(
      alumnoA
    ).totalEventos === 3
  );

  // ====================================================
  // 12. MISMO EVENTO ID EN OTRO ALUMNO
  //
  // El aislamiento es por alumno.
  //
  // Un ID globalmente unico seria preferible en
  // persistencia real, pero el almacen V1 aisla
  // duplicados dentro de cada alumno.
  // ====================================================

  const eventoB2:
    EventoEducativo = {
    ...eventoA2,

    actividadId:
      "actividad-b-2",
  };

  comprobar(
    "Otro alumno puede tener eventoId independiente",
    registrarEventoEducativo(
      alumnoB,
      eventoB2
    ).totalEventos === 2
  );

  // ====================================================
  // 13. ESTADISTICAS
  // ====================================================

  const estadisticas =
    obtenerEstadisticasCMD();

  comprobar(
    "Estadisticas mantienen dos alumnos",
    estadisticas
      .alumnosActivos === 2
  );

  comprobar(
    "Estadisticas suman cinco eventos",
    estadisticas
      .eventosTotales === 5
  );

  comprobar(
    "Limite alumnos es 100",
    estadisticas
      .limiteAlumnos === 100
  );

  comprobar(
    "Limite eventos por alumno es 500",
    estadisticas
      .limiteEventosPorAlumno ===
      500
  );

  // ====================================================
  // 14. CADUCIDAD DEL ALUMNO B
  //
  // B recibio su ultimo evento en tiempo inicio + 2h
  // porque eventoB2 se registro con el reloj actual.
  //
  // Por tanto caduca en inicio + 26h.
  // ====================================================

  tiempoSimulado =
    inicio +
    25 * HORA;

  comprobar(
    "Alumno A sigue activo antes de caducar",
    existeAlumnoCMD(
      alumnoA
    )
  );

  comprobar(
    "Alumno B sigue activo antes de caducar",
    existeAlumnoCMD(
      alumnoB
    )
  );

  // ====================================================
  // 15. CADUCIDAD EXACTA
  //
  // A tuvo su ultimo evento en inicio + 2h.
  // B tambien tuvo su ultimo evento en inicio + 2h.
  //
  // Ambos caducan en inicio + 26h.
  // ====================================================

  tiempoSimulado =
    inicio +
    26 * HORA;

  comprobar(
    "Alumno A caduca a las 24h desde ultima actividad",
    !existeAlumnoCMD(
      alumnoA
    )
  );

  comprobar(
    "Alumno B caduca a las 24h desde ultima actividad",
    !existeAlumnoCMD(
      alumnoB
    )
  );

  comprobar(
    "Historico caducado no se recupera",
    rechaza(() =>
      obtenerHistoricoAlumno(
        alumnoA
      )
    )
  );

  comprobar(
    "Estado caducado no se recupera",
    rechaza(() =>
      obtenerEstadoAlumno(
        alumnoB
      )
    )
  );

  comprobar(
    "Limpieza elimina alumnos caducados",
    obtenerEstadisticasCMD()
      .alumnosActivos === 0
  );

  comprobar(
    "Limpieza elimina eventos caducados",
    obtenerEstadisticasCMD()
      .eventosTotales === 0
  );

  // ====================================================
  // 16. REUTILIZAR DESPUES DE CADUCIDAD
  // ====================================================

  const eventoNuevo =
    crearEvento({
      eventoId:
        "evento-nuevo",

      actividadId:
        "actividad-nueva",

      objetivo:
        "present-perfect",

      intento:
        1,

      porcentaje:
        80,

      estado:
        "consolidar",

      fecha:
        "2026-11-12T10:00:00.000Z",
    });

  comprobar(
    "Puede crear nueva memoria tras caducidad",
    registrarEventoEducativo(
      alumnoA,
      eventoNuevo
    ).totalEventos === 1
  );

  comprobar(
    "Nueva memoria vuelve a estar activa",
    existeAlumnoCMD(
      alumnoA
    )
  );

  // ====================================================
  // 17. ELIMINACION MANUAL
  // ====================================================

  comprobar(
    "Elimina alumno A manualmente",
    eliminarAlumnoCMD(
      alumnoA
    ) === true
  );

  comprobar(
    "Alumno eliminado deja de existir",
    !existeAlumnoCMD(
      alumnoA
    )
  );

  comprobar(
    "Eliminar alumno inexistente devuelve false",
    eliminarAlumnoCMD(
      alumnoA
    ) === false
  );

  comprobar(
    "Almacen termina vacio",
    obtenerEstadisticasCMD()
      .alumnosActivos === 0 &&
    obtenerEstadisticasCMD()
      .eventosTotales === 0
  );

} finally {
  Date.now =
    relojOriginal;
}

// ======================================================
// RESUMEN
// ======================================================

console.log(
  "\n================================"
);

console.log(
  "INTERESTALK - TEST ALMACEN CMD V1"
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
  "\nCONFIGURACION:"
);

console.log(
  "Duracion:",
  obtenerEstadisticasCMD()
    .duracionHoras,
  "horas"
);

console.log(
  "Limite alumnos:",
  obtenerEstadisticasCMD()
    .limiteAlumnos
);

console.log(
  "Limite eventos/alumno:",
  obtenerEstadisticasCMD()
    .limiteEventosPorAlumno
);

console.log(
  "Alumnos activos al finalizar:",
  obtenerEstadisticasCMD()
    .alumnosActivos
);

console.log(
  "Eventos activos al finalizar:",
  obtenerEstadisticasCMD()
    .eventosTotales
);

if (
  fallidas === 0
) {
  console.log(
    "\nTODAS LAS PRUEBAS SUPERADAS"
  );
} else {
  console.error(
    "\nSE HAN DETECTADO FALLOS"
  );

  process.exitCode = 1;
}