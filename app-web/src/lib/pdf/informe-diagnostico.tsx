import "server-only";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import type {
  InformePedagogico,
} from "../diagnostico/informe-pedagogico";

import type {
  Competencia,
} from "../diagnostico/preguntas-v2";

// ======================================================
// INTERESTALK - INFORME PDF V1
// Documento generado exclusivamente en el servidor.
// No contiene respuestas correctas ni claves privadas.
// ======================================================

export type DatosInformePDF = {
  fecha: string;
  idioma: string;
  estado: string;
  preguntasRespondidas: number;
  aciertos: number;
  porcentaje: number;
  informePedagogico: InformePedagogico;
};

const COLORES = {
  fondo: "#0B0D15",
  tarjeta: "#171923",
  violeta: "#A78BFA",
  blanco: "#FFFFFF",
  gris: "#B8BDCA",
  tenue: "#858C9D",
  linea: "#343747",
};

const estilos = StyleSheet.create({
  pagina: {
    backgroundColor: COLORES.fondo,
    color: COLORES.blanco,
    padding: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  marca: {
    fontSize: 19,
    fontWeight: "bold",
    color: COLORES.blanco,
    marginBottom: 8,
  },
  subtituloMarca: {
    fontSize: 9,
    color: COLORES.violeta,
    marginBottom: 28,
  },
  titulo: {
    fontSize: 25,
    fontWeight: "bold",
    marginBottom: 13,
  },
  tituloSeccion: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 16,
  },
  descripcion: {
    color: COLORES.gris,
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 18,
  },
  tarjeta: {
    backgroundColor: COLORES.tarjeta,
    borderColor: COLORES.linea,
    borderWidth: 1,
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
  },
  etiqueta: {
    color: COLORES.gris,
    fontSize: 10,
    marginBottom: 8,
  },
  valorGrande: {
    color: COLORES.violeta,
    fontSize: 28,
    fontWeight: "bold",
  },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  textoFila: {
    fontSize: 11,
    color: COLORES.blanco,
  },
  valorFila: {
    fontSize: 11,
    color: COLORES.violeta,
    fontWeight: "bold",
  },
  bloque: {
    marginBottom: 18,
  },
  objetivo: {
    color: COLORES.blanco,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  detalle: {
    color: COLORES.gris,
    fontSize: 10,
    lineHeight: 1.5,
  },
  nota: {
    color: COLORES.tenue,
    fontSize: 9,
    lineHeight: 1.5,
    marginTop: 12,
  },
  pie: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
    color: COLORES.tenue,
    fontSize: 8,
  },
});

const NOMBRES: Record<Competencia, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading",
};

const OBJETIVOS: Record<string, string> = {
  "verb-to-be": "Uso del verbo to be",
  "present-simple": "Presente simple",
  articles: "Articulos en ingles",
  family: "Vocabulario familiar",
  "daily-routines": "Rutinas cotidianas",
  "basic-adjectives": "Adjetivos basicos",
  "personal-information": "Comprension de informacion personal",
  "free-time": "Actividades de tiempo libre",
  "past-simple": "Pasado simple",
  comparatives: "Comparativos",
  "present-continuous": "Presente continuo",
  travel: "Vocabulario de viajes",
  health: "Salud y bienestar",
  shopping: "Compras y comercio",
  "travel-plans": "Comprension de planes de viaje",
  "work-schedule": "Comprension de horarios",
  "weather-plans": "Planes y condiciones meteorologicas",
  "second-conditional": "Segundo condicional",
  "present-perfect": "Presente perfecto",
  "relative-clauses": "Oraciones de relativo",
  synonyms: "Sinonimos y matices de significado",
  "phrasal-verbs": "Phrasal verbs",
  "work-vocabulary": "Vocabulario profesional",
  "remote-work": "Comprension de textos sobre trabajo",
  environment: "Comprension de textos medioambientales",
  "learning-strategies": "Estrategias de aprendizaje",
  "past-perfect": "Pasado perfecto",
  inversion: "Estructuras de inversion",
  "passive-voice": "Voz pasiva",
  collocations: "Combinaciones habituales de palabras",
  "abstract-vocabulary": "Vocabulario abstracto",
  "critical-reading": "Lectura critica",
  argumentation: "Comprension de argumentos",
  inference: "Deduccion de informacion implicita",
  "advanced-inversion": "Inversion gramatical avanzada",
  subjunctive: "Subjuntivo en ingles formal",
  "mixed-conditionals": "Condicionales mixtos",
  "nuanced-vocabulary": "Matices de vocabulario",
  "formal-register": "Registro formal",
  "academic-language": "Lenguaje academico",
  "author-stance": "Interpretacion de la postura del autor",
  "implicit-meaning": "Comprension del significado implicito",
  "rhetorical-purpose": "Proposito comunicativo del texto",
  "complex-inversion": "Inversion gramatical compleja",
  "formal-conditionals": "Condicionales formales",
  "advanced-concession": "Estructuras concesivas avanzadas",
  precision: "Precision lexica",
  "advanced-register": "Vocabulario de registro avanzado",
  "semantic-nuance": "Matices semanticos",
  "rhetorical-irony": "Interpretacion de la ironia",
  "argumentative-nuance": "Matices argumentativos",
  "qualified-conclusion": "Interpretacion de conclusiones matizadas",
};

function nombreObjetivo(objetivo: string): string {
  return OBJETIVOS[objetivo] ??
    objetivo.replace(/-/g, " ");
}

function Cabecera({
  seccion,
}: {
  seccion: string;
}) {
  return (
    <View>
      <Text style={estilos.marca}>INTERESTALK</Text>
      <Text style={estilos.subtituloMarca}>
        LEARN WHAT YOU LOVE · {seccion}
      </Text>
    </View>
  );
}

function Pie() {
  return (
    <Text style={estilos.pie}>
      INTERESTALK · Evaluacion orientativa.
      No constituye una certificacion oficial MCER.
    </Text>
  );
}

export function InformeDiagnosticoPDF({
  datos,
}: {
  datos: DatosInformePDF;
}) {
  const informe = datos.informePedagogico;

  const competenciasOrdenadas = [
    ...informe.competencias,
  ].sort(
    (a, b) => b.porcentaje - a.porcentaje
  );

  const competenciasRefuerzo = [
    ...informe.competencias,
  ]
    .filter((item) => item.errores > 0)
    .sort(
      (a, b) => a.porcentaje - b.porcentaje
    );

  return (
    <Document
      title="Interestalk - Informe de evaluacion inicial"
      author="Interestalk"
      subject="Informe pedagogico orientativo"
    >
      {/* PAGINA 1 - RESUMEN */}
      <Page size="A4" style={estilos.pagina}>
        <Cabecera seccion="INFORME DE EVALUACION" />

        <Text style={estilos.titulo}>
          Tu punto de partida
        </Text>

        <Text style={estilos.descripcion}>
          Este informe resume los resultados de tu
          evaluacion inicial y propone los siguientes
          objetivos de aprendizaje.
        </Text>

        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>
            Respuestas correctas
          </Text>
          <Text style={estilos.valorGrande}>
            {datos.aciertos}/{datos.preguntasRespondidas}
          </Text>
        </View>

        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>
            Puntuacion global
          </Text>
          <Text style={estilos.valorGrande}>
            {datos.porcentaje}%
          </Text>
        </View>

        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>
            Fecha de evaluacion
          </Text>
          <Text style={estilos.textoFila}>
            {datos.fecha}
          </Text>
        </View>

        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>
            Idioma evaluado
          </Text>
          <Text style={estilos.textoFila}>
            {datos.idioma === "en"
              ? "Ingles"
              : datos.idioma}
          </Text>
        </View>

        <Text style={estilos.nota}>
          El porcentaje global no equivale a un nivel
          MCER. La dificultad de los ejercicios y su
          calibracion son necesarias para interpretar
          el rendimiento.
        </Text>

        <Pie />
      </Page>

      {/* PAGINA 2 - COMPETENCIAS */}
      <Page size="A4" style={estilos.pagina}>
        <Cabecera seccion="COMPETENCIAS" />

        <Text style={estilos.tituloSeccion}>
          Tus competencias
        </Text>

        <Text style={estilos.descripcion}>
          Resultados observados en Grammar,
          Vocabulary y Reading.
        </Text>

        {informe.competencias.map((item) => (
          <View
            key={item.competencia}
            style={estilos.tarjeta}
          >
            <Text style={estilos.objetivo}>
              {NOMBRES[item.competencia]}
            </Text>

            <View style={estilos.fila}>
              <Text style={estilos.textoFila}>
                Respuestas correctas
              </Text>
              <Text style={estilos.valorFila}>
                {item.aciertos}/{item.total}
              </Text>
            </View>

            <View style={estilos.fila}>
              <Text style={estilos.textoFila}>
                Rendimiento
              </Text>
              <Text style={estilos.valorFila}>
                {item.porcentaje}%
              </Text>
            </View>
          </View>
        ))}

        <Text style={estilos.nota}>
          Estos resultados son observaciones iniciales.
          Se actualizaran con nuevas actividades.
        </Text>

        <Pie />
      </Page>

      {/* PAGINA 3 - DIFICULTAD */}
      <Page size="A4" style={estilos.pagina}>
        <Cabecera seccion="DIFICULTAD" />

        <Text style={estilos.tituloSeccion}>
          Dificultad de las preguntas
        </Text>

        <Text style={estilos.descripcion}>
          Distribucion de respuestas por nivel
          de dificultad de los ejercicios.
        </Text>

        <View style={estilos.tarjeta}>
          {informe.niveles
            .filter((item) => item.total > 0)
            .map((item) => (
              <View
                key={item.nivel}
                style={estilos.fila}
              >
                <Text style={estilos.textoFila}>
                  Nivel {item.nivel}
                </Text>

                <Text style={estilos.valorFila}>
                  {item.aciertos}/{item.total}
                  {" · "}
                  {item.porcentaje}%
                </Text>
              </View>
            ))}
        </View>

        <Text style={estilos.nota}>
          Los niveles indican la dificultad asignada
          a las preguntas. No representan un nivel
          MCER certificado del alumno.
        </Text>

        <Pie />
      </Page>

      {/* PAGINA 4 - FORTALEZAS Y REFUERZO */}
      <Page size="A4" style={estilos.pagina}>
        <Cabecera seccion="PERFIL DE APRENDIZAJE" />

        <Text style={estilos.tituloSeccion}>
          Fortalezas observadas
        </Text>

        {competenciasOrdenadas
          .filter((item) => item.total > 0)
          .map((item) => (
            <View
              key={item.competencia}
              style={estilos.tarjeta}
            >
              <Text style={estilos.objetivo}>
                {NOMBRES[item.competencia]}
              </Text>
              <Text style={estilos.detalle}>
                {item.aciertos} respuestas correctas
                de {item.total}. Rendimiento observado:
                {" "}{item.porcentaje}%.
              </Text>
            </View>
          ))}

        <Text style={estilos.tituloSeccion}>
          Objetivos de refuerzo
        </Text>

        {informe.recomendaciones.length > 0 ? (
          informe.recomendaciones.map((item) => (
            <View
              key={item.prioridad}
              style={estilos.bloque}
            >
              <Text style={estilos.objetivo}>
                {item.prioridad}.{" "}
                {nombreObjetivo(item.objetivo)}
              </Text>

              <Text style={estilos.detalle}>
                {NOMBRES[item.competencia]}
                {" · "}
                {item.nivel}
              </Text>
            </View>
          ))
        ) : (
          <Text style={estilos.detalle}>
            No se han registrado errores en los
            objetivos evaluados.
          </Text>
        )}

        <Pie />
      </Page>

      {/* PAGINA 5 - PLAN INICIAL */}
      <Page size="A4" style={estilos.pagina}>
        <Cabecera seccion="PLAN DE APRENDIZAJE" />

        <Text style={estilos.tituloSeccion}>
          Tu plan inicial
        </Text>

        <Text style={estilos.descripcion}>
          Esta propuesta utiliza las competencias
          que necesitan nuevas comprobaciones.
          Se revisara conforme avances.
        </Text>

        {competenciasRefuerzo.length > 0 ? (
          competenciasRefuerzo.map(
            (item, indice) => (
              <View
                key={item.competencia}
                style={estilos.tarjeta}
              >
                <Text style={estilos.objetivo}>
                  Paso {indice + 1}
                  {" · "}
                  {NOMBRES[item.competencia]}
                </Text>

                <Text style={estilos.detalle}>
                  Practicar contenidos de esta
                  competencia y comprobar el
                  progreso con nuevas actividades.
                </Text>

                <Text style={estilos.nota}>
                  Resultado inicial:
                  {" "}{item.aciertos}/{item.total}
                  {" · "}{item.porcentaje}%
                </Text>
              </View>
            )
          )
        ) : (
          <View style={estilos.tarjeta}>
            <Text style={estilos.detalle}>
              Continuar con actividades de
              consolidacion y nuevas evaluaciones.
            </Text>
          </View>
        )}

        <Text style={estilos.nota}>
          El plan es orientativo. No representa
          una evaluacion clinica, una certificacion
          oficial ni una garantia de aprendizaje.
        </Text>

        <Pie />
      </Page>
    </Document>
  );
}