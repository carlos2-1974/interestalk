// ======================================================
// INTERESTALK - GRAMMAR V2
// TEST HTTP END-TO-END V1
//
// Requisitos:
// - Next.js ejecutandose en localhost:3000
// - .env.local cargado por Next.js
//
// Recorrido:
//
// HTTP diagnostico adaptativo
// -> completar diagnostico
// -> obtener continuidadId real
// -> HTTP Grammar generar
// -> Gemini
// -> actividad publica
// -> HTTP Grammar corregir
// -> resultado pedagogico
//
// Este test NO importa motores internos.
// Utiliza exclusivamente las APIs.
// ======================================================

const BASE_URL =
  "http://localhost:3000";

const DIAGNOSTICO_URL =
  `${BASE_URL}/api/diagnostico-adaptativo`;

const GRAMMAR_URL =
  `${BASE_URL}/api/grammar`;

let superadas = 0;
let fallidas = 0;

// ======================================================
// TIPOS MINIMOS DEL TEST
// ======================================================

type PreguntaPublica = {
  id: string;
  opciones: string[];
};

type SesionHttp = {
  sesionId: string;
  estado: string;
  pregunta: PreguntaPublica | null;
  preguntasRespondidas: number;
  maxPreguntas: number;
  expiraEn: string;
};

type RespuestaSesionHttp = {
  estado: string;
  sesion: SesionHttp;
};

type ResultadoDiagnosticoHttp = {
  estado: string;

  resultado: {
    estado: string;
    preguntasRespondidas: number;

    continuidad: {
      continuidadId: string;
      expiraEn: string;
    };

    perfilPedagogico: {
      nivelDeclarado: string;
      idiomaEvaluado: string;

      grammar:
        | {
            objetivo: string;
            nivel: string;
            tipo:
              | "refuerzo"
              | "consolidacion";
          }
        | null;
    };
  };
};

type EjercicioPublicoHttp = {
  id: string;

  tipo:
    | "opcion_multiple"
    | "completar"
    | "transformar";

  enunciado: string;
  opciones: string[] | null;
};

type ActividadPublicaHttp = {
  actividadId: string;
  objetivoGrammar: string;
  nivelContenido: string;
  tipoActividad:
    | "refuerzo"
    | "consolidacion";
  titulo: string;
  ejercicios: EjercicioPublicoHttp[];
};

type GeneracionGrammarHttp = {
  estado: string;
  actividad: ActividadPublicaHttp;
  expiraEn: string;
};

type CorreccionGrammarHttp = {
  estado: string;

  resultado: {
    actividadId: string;
    objetivoGrammar: string;
    total: number;
    aciertos: number;
    errores: number;
    porcentaje: number;

    estadoAprendizaje:
      | "reforzar"
      | "practicar"
      | "consolidar";

    necesitaRefuerzo: boolean;

    resultados: Array<{
      ejercicioId: string;
      respuestaAlumno: string;
      respuestaCorrecta: string;
      correcto: boolean;
      explicacion: string;
    }>;
  };
};

// ======================================================
// COMPROBACION
// ======================================================

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
// FETCH JSON
// ======================================================

async function fetchJson<T>(
  url: string,
  opciones?: RequestInit
): Promise<T> {
  const respuesta =
    await fetch(
      url,
      opciones
    );

  const texto =
    await respuesta.text();

  let datos: unknown;

  try {
    datos =
      JSON.parse(texto);
  } catch {
    throw new Error(
      `Respuesta HTTP no es JSON. ` +
        `Status: ${respuesta.status}. ` +
        `Body: ${texto}`
    );
  }

  if (!respuesta.ok) {
    throw new Error(
      `HTTP ${respuesta.status}: ` +
        JSON.stringify(datos)
    );
  }

  return datos as T;
}

// ======================================================
// POST JSON
// ======================================================

async function postJson<T>(
  url: string,
  datos: unknown
): Promise<T> {
  return fetchJson<T>(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          datos
        ),
    }
  );
}

// ======================================================
// EJECUCION
// ======================================================

async function ejecutar(): Promise<void> {
  console.log(
    "\n================================"
  );

  console.log(
    "INTERESTALK - HTTP END-TO-END"
  );

  console.log(
    "================================"
  );

  console.log(
    "Servidor:",
    BASE_URL
  );

  // ====================================================
  // 1. INICIAR DIAGNOSTICO REAL
  // ====================================================

  console.log(
    "\n1. Iniciando diagnostico B1..."
  );

  const inicio =
    await postJson<RespuestaSesionHttp>(
      DIAGNOSTICO_URL,
      {
        accion:
          "iniciar",

        idioma:
          "en",

        nivel:
          "B1",
      }
    );

  let sesion =
    inicio.sesion;

  comprobar(
    "API crea sesion adaptativa",
    Boolean(
      sesion.sesionId
    )
  );

  comprobar(
    "Diagnostico comienza en curso",
    sesion.estado ===
      "en_curso"
  );

  comprobar(
    "Diagnostico entrega pregunta publica",
    sesion.pregunta !== null
  );

  // ====================================================
  // 2. RESPONDER HASTA FINALIZAR
  //
  // No necesitamos conocer las soluciones.
  // Utilizamos indices validos 0-3.
  // ====================================================

  console.log(
    "\n2. Completando diagnostico..."
  );

  let iteraciones = 0;

  const preguntasUsadas =
    new Set<string>();

  let sinRepeticiones =
    true;

  while (
    sesion.estado === "en_curso" &&
    sesion.pregunta !== null &&
    iteraciones < 30
  ) {
    const pregunta =
      sesion.pregunta;

    if (
      preguntasUsadas.has(
        pregunta.id
      )
    ) {
      sinRepeticiones =
        false;
    }

    preguntasUsadas.add(
      pregunta.id
    );

    // Respuesta valida y reproducible.
    //
    // No asumimos que sea correcta.
    const respuesta =
      iteraciones % 4;

    if (
      respuesta >=
      pregunta.opciones.length
    ) {
      throw new Error(
        "El banco ha devuelto menos opciones " +
          "de las esperadas para el test."
      );
    }

    const procesada =
      await postJson<RespuestaSesionHttp>(
        DIAGNOSTICO_URL,
        {
          accion:
            "responder",

          sesionId:
            sesion.sesionId,

          preguntaId:
            pregunta.id,

          respuesta,
        }
      );

    sesion =
      procesada.sesion;

    iteraciones++;
  }

  comprobar(
    "Diagnostico finaliza",
    sesion.estado !==
      "en_curso"
  );

  comprobar(
    "No repite preguntas",
    sinRepeticiones
  );

  comprobar(
    "Respeta maximo de preguntas",
    sesion.preguntasRespondidas <=
      sesion.maxPreguntas
  );

  comprobar(
    "Contador coincide con respuestas HTTP",
    sesion.preguntasRespondidas ===
      iteraciones
  );

  if (
    sesion.estado ===
    "en_curso"
  ) {
    throw new Error(
      "El diagnostico HTTP no ha finalizado."
    );
  }

  console.log(
    "Preguntas respondidas:",
    sesion.preguntasRespondidas
  );

  // ====================================================
  // 3. OBTENER RESULTADO Y CONTINUIDAD REAL
  // ====================================================

  console.log(
    "\n3. Obteniendo perfil y continuidad..."
  );

  const urlResultado =
    `${DIAGNOSTICO_URL}` +
    `?sesionId=${encodeURIComponent(
      sesion.sesionId
    )}` +
    `&tipo=resultado`;

  const resultadoDiagnostico =
    await fetchJson<ResultadoDiagnosticoHttp>(
      urlResultado
    );

  const resultado =
    resultadoDiagnostico.resultado;

  comprobar(
    "API devuelve resultado",
    resultadoDiagnostico.estado ===
      "resultado_disponible"
  );

  comprobar(
    "Resultado conserva nivel B1",
    resultado.perfilPedagogico
      .nivelDeclarado === "B1"
  );

  comprobar(
    "Resultado conserva idioma ingles",
    resultado.perfilPedagogico
      .idiomaEvaluado === "en"
  );

  comprobar(
    "Resultado genera continuidadId real",
    Boolean(
      resultado.continuidad
        .continuidadId
    )
  );

  comprobar(
    "Continuidad tiene caducidad",
    !Number.isNaN(
      new Date(
        resultado.continuidad
          .expiraEn
      ).getTime()
    )
  );

  if (
    resultado.perfilPedagogico
      .grammar === null
  ) {
    throw new Error(
      "El diagnostico no ha producido " +
        "una seleccion Grammar."
    );
  }

  console.log(
    "Continuidad ID:",
    resultado.continuidad
      .continuidadId
  );

  console.log(
    "Objetivo Grammar:",
    resultado.perfilPedagogico
      .grammar.objetivo
  );

  console.log(
    "Tipo:",
    resultado.perfilPedagogico
      .grammar.tipo
  );

  // ====================================================
  // 4. PERFIL PERSONAL
  //
  // Simula los datos que actualmente mantiene
  // sessionStorage en el navegador.
  // ====================================================

  const perfilPersonal = {
    version: 1,

    idiomaApoyo:
      "es",

    idiomaAprendizaje:
      "en",

    nivelDeclarado:
      "B1",

    objetivo:
      "Conversar con fluidez",

    intereses: [
      {
        id:
          "deporte",

        nombre:
          "Deporte",
      },

      {
        id:
          "tecnologia",

        nombre:
          "Tecnologia",
      },

      {
        id:
          "viajes",

        nombre:
          "Viajes",
      },
    ],

    interesPrincipalId:
      "deporte",

    creadoEn:
      Date.now(),
  };

  // ====================================================
  // 5. GENERAR GRAMMAR POR HTTP
  //
  // Aqui ocurre la llamada real a Gemini.
  // ====================================================

  console.log(
    "\n4. Generando Grammar por HTTP..."
  );

  const generacion =
    await postJson<GeneracionGrammarHttp>(
      GRAMMAR_URL,
      {
        accion:
          "generar",

        continuidadId:
          resultado.continuidad
            .continuidadId,

        perfil:
          perfilPersonal,
      }
    );

  const actividad =
    generacion.actividad;

  comprobar(
    "API Grammar genera actividad",
    generacion.estado ===
      "actividad_generada"
  );

  comprobar(
    "Actividad tiene ID",
    Boolean(
      actividad.actividadId
    )
  );

  comprobar(
    "Actividad conserva objetivo del diagnostico",
    actividad.objetivoGrammar ===
      resultado.perfilPedagogico
        .grammar.objetivo
  );

  comprobar(
    "Actividad conserva nivel pedagogico",
    actividad.nivelContenido ===
      resultado.perfilPedagogico
        .grammar.nivel
  );

  comprobar(
    "Actividad conserva tipo pedagogico",
    actividad.tipoActividad ===
      resultado.perfilPedagogico
        .grammar.tipo
  );

  comprobar(
    "Actividad contiene cinco ejercicios",
    actividad.ejercicios.length === 5
  );

  comprobar(
    "Actividad tiene caducidad",
    !Number.isNaN(
      new Date(
        generacion.expiraEn
      ).getTime()
    )
  );

  // ====================================================
  // 6. SEGURIDAD HTTP
  // ====================================================

  const textoActividad =
    JSON.stringify(
      actividad
    );

  comprobar(
    "HTTP no expone respuestaCorrecta",
    !textoActividad.includes(
      "respuestaCorrecta"
    )
  );

  comprobar(
    "HTTP no expone soluciones",
    !textoActividad.includes(
      '"soluciones"'
    )
  );

  comprobar(
    "HTTP no expone origenPedagogico",
    !textoActividad.includes(
      "origenPedagogico"
    )
  );

  comprobar(
    "HTTP no expone explicacionRespuesta",
    !textoActividad.includes(
      "explicacionRespuesta"
    )
  );

  console.log(
    "Actividad ID:",
    actividad.actividadId
  );

  console.log(
    "Titulo:",
    actividad.titulo
  );

  // ====================================================
  // 7. SIMULAR RESPUESTAS DEL ALUMNO
  //
  // No conocemos las soluciones desde HTTP.
  //
  // Esto es intencionado:
  // simulamos respuestas como haria el navegador.
  //
  // Para opcion multiple elegimos la primera opcion.
  // Para abiertas enviamos una respuesta generica.
  // ====================================================

  const respuestas =
    actividad.ejercicios.map(
      (ejercicio) => ({
        ejercicioId:
          ejercicio.id,

        respuesta:
          ejercicio.tipo ===
            "opcion_multiple" &&
          ejercicio.opciones &&
          ejercicio.opciones.length > 0
            ? ejercicio.opciones[0]
            : "test answer",
      })
    );

  // ====================================================
  // 8. CORREGIR POR HTTP
  // ====================================================

  console.log(
    "\n5. Corrigiendo actividad por HTTP..."
  );

  const correccion =
    await postJson<CorreccionGrammarHttp>(
      GRAMMAR_URL,
      {
        accion:
          "corregir",

        actividadId:
          actividad.actividadId,

        respuestas,
      }
    );

  const resultadoGrammar =
    correccion.resultado;

  comprobar(
    "API corrige actividad",
    correccion.estado ===
      "actividad_corregida"
  );

  comprobar(
    "Correccion conserva actividadId",
    resultadoGrammar.actividadId ===
      actividad.actividadId
  );

  comprobar(
    "Correccion conserva objetivo",
    resultadoGrammar.objetivoGrammar ===
      actividad.objetivoGrammar
  );

  comprobar(
    "Correccion procesa cinco respuestas",
    resultadoGrammar.total === 5 &&
      resultadoGrammar.resultados
        .length === 5
  );

  comprobar(
    "Aciertos y errores suman cinco",
    resultadoGrammar.aciertos +
      resultadoGrammar.errores ===
      5
  );

  comprobar(
    "Porcentaje esta entre 0 y 100",
    resultadoGrammar.porcentaje >= 0 &&
      resultadoGrammar.porcentaje <= 100
  );

  comprobar(
    "Devuelve decision pedagogica",
    [
      "reforzar",
      "practicar",
      "consolidar",
    ].includes(
      resultadoGrammar
        .estadoAprendizaje
    )
  );

  comprobar(
    "Tras corregir devuelve explicaciones",
    resultadoGrammar.resultados
      .every(
        (item) =>
          item.explicacion
            .trim()
            .length > 0
      )
  );

  comprobar(
    "Tras corregir puede mostrar respuestas correctas",
    resultadoGrammar.resultados
      .every(
        (item) =>
          item.respuestaCorrecta
            .trim()
            .length > 0
      )
  );

  // ====================================================
  // RESUMEN
  // ====================================================

  console.log(
    "\n================================"
  );

  console.log(
    "RESULTADO HTTP END-TO-END"
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
    "\nDIAGNOSTICO:"
  );

  console.log(
    "Preguntas:",
    sesion.preguntasRespondidas
  );

  console.log(
    "Continuidad:",
    resultado.continuidad
      .continuidadId
  );

  console.log(
    "Objetivo Grammar:",
    actividad.objetivoGrammar
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
    "\nCORRECCION:"
  );

  console.log(
    "Aciertos:",
    resultadoGrammar.aciertos +
      "/" +
      resultadoGrammar.total
  );

  console.log(
    "Porcentaje:",
    resultadoGrammar.porcentaje +
      "%"
  );

  console.log(
    "Estado:",
    resultadoGrammar
      .estadoAprendizaje
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

ejecutar().catch(
  (error) => {
    console.error(
      "\nERROR EN HTTP END-TO-END:"
    );

    console.error(
      error
    );

    process.exitCode = 1;
  }
);
