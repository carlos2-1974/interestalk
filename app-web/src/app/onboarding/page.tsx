"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarPerfilProvisional, type NivelDeclarado, type PerfilProvisional } from "@/lib/perfil-provisional";

// =====================================================
// INTERESTALK - ONBOARDING V4 · LOOK & FEEL V2.0
// Idiomas, nivel, objetivos e intereses
// =====================================================

type Interes = {
  id: string;
  nombre: string;
  imagen: string;
};

const IDIOMAS = [
  { codigo: "es", nombre: "Español" },
  { codigo: "en", nombre: "Inglés" },
  { codigo: "fr", nombre: "Francés" },
  { codigo: "de", nombre: "Alemán" },
  { codigo: "it", nombre: "Italiano" },
  { codigo: "pt", nombre: "Portugués" },
];

const NIVELES = [
  { codigo: "A1", nombre: "Principiante" },
  { codigo: "A2", nombre: "Básico" },
  { codigo: "B1", nombre: "Intermedio" },
  { codigo: "B2", nombre: "Intermedio alto" },
  { codigo: "C1", nombre: "Avanzado" },
  { codigo: "C2", nombre: "Dominio" },
];

const OBJETIVOS = [
  "Conversar con fluidez",
  "Mejorar profesionalmente",
  "Viajar y comunicarme",
  "Preparar un examen",
  "Aprender por interés personal",
];

const INTERESES: Interes[] = [
  {
    id: "deporte",
    nombre: "Deporte y fitness",
    imagen:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&auto=format&fit=crop",
  },
  {
    id: "ia",
    nombre: "Tecnología e IA",
    imagen:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop",
  },
  {
    id: "viajes",
    nombre: "Viajes",
    imagen:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop",
  },
  {
    id: "musica",
    nombre: "Música",
    imagen:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&auto=format&fit=crop",
  },
  {
    id: "cine",
    nombre: "Cine y series",
    imagen:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop",
  },
  {
    id: "gastronomia",
    nombre: "Gastronomía",
    imagen:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop",
  },
  {
    id: "naturaleza",
    nombre: "Naturaleza",
    imagen:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format&fit=crop",
  },
  {
    id: "negocios",
    nombre: "Negocios",
    imagen:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop",
  },
  {
    id: "ciencia",
    nombre: "Ciencia",
    imagen:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop",
  },
  {
    id: "arte",
    nombre: "Arte y cultura",
    imagen:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&auto=format&fit=crop",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);

  const [idiomaNativo, setIdiomaNativo] = useState("es");
  const [idiomaAprendizaje, setIdiomaAprendizaje] =
    useState("");

  const [nivel, setNivel] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const [intereses, setIntereses] = useState<Interes[]>([]);
  const [interesPrincipal, setInteresPrincipal] =
    useState("");

  const [nuevoInteres, setNuevoInteres] = useState("");
  const [error, setError] = useState("");

  function irAlPaso(numero: number) {
    setError("");
    setPaso(numero);
  }

  function avanzarIdiomas() {
    if (!idiomaAprendizaje) {
      setError("Selecciona el idioma que quieres aprender.");
      return;
    }

    if (idiomaNativo === idiomaAprendizaje) {
      setError("Los dos idiomas deben ser diferentes.");
      return;
    }

    irAlPaso(3);
  }

  function avanzarNivel() {
    if (!nivel || !objetivo) {
      setError("Selecciona tu nivel y tu objetivo.");
      return;
    }

    irAlPaso(4);
  }

  function alternarInteres(interes: Interes) {
    const existe = intereses.some(
      (item) => item.id === interes.id
    );

    if (existe) {
      const restantes = intereses.filter(
        (item) => item.id !== interes.id
      );

      setIntereses(restantes);

      if (interesPrincipal === interes.id) {
        setInteresPrincipal("");
      }
    } else {
      if (intereses.length >= 5) {
        setError("Puedes seleccionar un máximo de 5 intereses.");
        return;
      }

      setIntereses([...intereses, interes]);
    }

    setError("");
  }

  function agregarInteres() {
    const nombre = nuevoInteres.trim();

    if (nombre.length < 2 || nombre.length > 60) {
      setError("Escribe un interés de entre 2 y 60 caracteres.");
      return;
    }

    if (intereses.length >= 5) {
      setError("Ya tienes 5 intereses seleccionados.");
      return;
    }

    const existe = [...INTERESES, ...intereses].some(
      (item) =>
        item.nombre.toLocaleLowerCase("es") ===
        nombre.toLocaleLowerCase("es")
    );

    if (existe) {
      setError("Ese interés ya existe.");
      return;
    }

    const nuevo: Interes = {
      id: "custom-" + crypto.randomUUID(),
      nombre,
      imagen: "",
    };

    setIntereses([...intereses, nuevo]);
    setNuevoInteres("");
    setError("");
  }

  function finalizarIntereses() {
    if (intereses.length === 0) {
      setError("Selecciona al menos un interés.");
      return;
    }

    if (
      !intereses.some(
        (item) => item.id === interesPrincipal
      )
    ) {
      setError("Marca cuál es tu interés favorito.");
      return;
    }

    irAlPaso(5);
  }

  function comenzarDiagnostico() {
    setError("");
    if (!idiomaAprendizaje || idiomaNativo === idiomaAprendizaje ||
        !nivel || !objetivo || intereses.length === 0 ||
        !intereses.some((item) => item.id === interesPrincipal)) {
      setError("Revisa tus preferencias antes de continuar.");
      return;
    }
    if (idiomaAprendizaje !== "en") {
      setError("El diagnóstico adaptativo está disponible por ahora solo para inglés. Puedes revisar tu idioma de aprendizaje.");
      return;
    }
    const perfil: PerfilProvisional = {
      version: 1,
      idiomaApoyo: idiomaNativo,
      idiomaAprendizaje,
      nivelDeclarado: nivel as NivelDeclarado,
      objetivo,
      intereses: intereses.map(({ id, nombre }) => ({ id, nombre })),
      interesPrincipalId: interesPrincipal,
      creadoEn: Date.now(),
    };
    if (!guardarPerfilProvisional(perfil)) {
      setError("No se ha podido guardar el perfil temporal en esta pestaña. Comprueba que el almacenamiento del navegador esté permitido.");
      return;
    }
    router.push("/diagnostico-adaptativo");
  }

  const campo =
    "w-full rounded-2xl border border-slate-300 " +
    "bg-white px-5 py-4 text-slate-900 outline-none " +
    "focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100";

  const botonPrincipal =
    "flex-1 rounded-2xl bg-indigo-700 px-6 py-4 text-white " +
    "font-semibold transition-colors hover:bg-indigo-800";

  const botonVolver =
    "rounded-2xl border border-slate-300 bg-white px-6 py-4 " +
    "font-medium text-slate-700 transition-colors hover:bg-slate-50";

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="inline-flex items-center gap-3 font-black tracking-tight text-slate-900" aria-label="Interestalk - Inicio">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4338CA] text-lg text-white">I</span>
            <span className="text-xl">INTERES<span className="text-[#4338CA]">TALK</span></span>
          </a>
          <a href="/" className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-50">Volver al inicio</a>
        </header>
        <div className="grid items-stretch gap-5 lg:min-h-[min(820px,calc(100vh-150px))] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* PANEL FOTOGRAFICO: IMAGEN INDEPENDIENTE SIN UI INCRUSTADA */}
          <section className="relative min-h-[210px] overflow-hidden rounded-[26px] bg-[#E0E7FF] sm:min-h-[280px] lg:min-h-[620px]" aria-label="Alumna aprendiendo ingles con auriculares y ordenador">
            <div className="absolute inset-0 bg-cover bg-center lg:bg-[position:center_38%]" style={{ backgroundImage: "url('/interestalk-onboarding-photo.webp')" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/75 via-indigo-950/10 to-transparent" />
            <div className="relative z-10 flex h-full min-h-[210px] flex-col justify-end p-6 text-white sm:min-h-[280px] lg:min-h-[620px] lg:p-10">
              <div className="max-w-sm">
                <span className="rounded-full border border-white/30 bg-indigo-950/30 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">LEARN WHAT YOU LOVE</span>
                <h1 className="mt-4 text-3xl font-bold leading-tight lg:text-5xl">Aprende a tu manera.</h1>
                <p className="mt-3 text-sm leading-relaxed text-white lg:text-base">Tu aprendizaje empieza con tus objetivos, tu nivel y tus intereses.</p>
              </div>
            </div>
          </section>
          {/* PANEL DE ONBOARDING */}
          <section className="flex min-w-0 items-center justify-center rounded-[26px] border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-8 lg:px-10 lg:py-10">
            <div className="w-full max-w-2xl">

            {/* PROGRESO */}
            <div className="mb-8 flex gap-2">
              {[1, 2, 3, 4].map((numero) => (
                <div
                  key={numero}
                  className={
                    "h-1.5 flex-1 rounded-full " +
                    (numero <= Math.min(paso, 4)
                      ? "bg-teal-500"
                      : "bg-slate-100")
                  }
                />
              ))}
            </div>

            {/* BIENVENIDA */}
            {paso === 1 && (
              <>
                <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
                  Tu experiencia comienza aquí
                </span>

                <h2 className="mt-5 text-3xl font-bold lg:text-4xl">
                  Un idioma nuevo.
                  <br />
                  Un mundo a tu medida.
                </h2>

                <p className="mt-5 leading-relaxed text-slate-600">
                  Vamos a conocerte para crear una experiencia
                  de aprendizaje única.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[
                    "Tus idiomas",
                    "Tu nivel y objetivo",
                    "Tus intereses",
                    "Tu experiencia",
                  ].map((titulo, indice) => (
                    <div
                      key={titulo}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <span className="text-xs text-indigo-700">
                        0{indice + 1}
                      </span>
                      <p className="mt-2 text-sm font-medium">
                        {titulo}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => irAlPaso(2)}
                  className={"mt-10 w-full " + botonPrincipal}
                >
                  Empezar mi experiencia →
                </button>
              </>
            )}

            {/* IDIOMAS */}
            {paso === 2 && (
              <>
                <span className="text-sm font-semibold text-indigo-700">
                  TUS IDIOMAS
                </span>

                <h2 className="mt-4 text-3xl font-bold">
                  ¿Qué idioma quieres aprender?
                </h2>

                <p className="mt-4 text-slate-600">
                  Elige tu idioma de aprendizaje y el idioma
                  en el que prefieres recibir explicaciones.
                </p>

                <div className="mt-8 space-y-6">
                  <div>
                    <label
                      htmlFor="idioma-apoyo"
                      className="mb-3 block text-sm text-slate-700"
                    >
                      Mi idioma de apoyo
                    </label>

                    <select
                      id="idioma-apoyo"
                      value={idiomaNativo}
                      onChange={(e) => {
                        setIdiomaNativo(e.target.value);
                        setError("");
                      }}
                      className={campo}
                    >
                      {IDIOMAS.map((item) => (
                        <option
                          key={item.codigo}
                          value={item.codigo}
                        >
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="idioma-destino"
                      className="mb-3 block text-sm text-slate-700"
                    >
                      Quiero aprender
                    </label>

                    <select
                      id="idioma-destino"
                      value={idiomaAprendizaje}
                      onChange={(e) => {
                        setIdiomaAprendizaje(e.target.value);
                        setError("");
                      }}
                      className={campo}
                    >
                      <option value="">
                        Selecciona un idioma...
                      </option>

                      {IDIOMAS.map((item) => (
                        <option
                          key={item.codigo}
                          value={item.codigo}
                        >
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-9 flex gap-3">
                  <button
                    type="button"
                    onClick={() => irAlPaso(1)}
                    className={botonVolver}
                  >
                    ← Volver
                  </button>
                  <button
                    type="button"
                    onClick={avanzarIdiomas}
                    className={botonPrincipal}
                  >
                    Continuar →
                  </button>
                </div>
              </>
            )}

            {/* NIVEL Y OBJETIVOS */}
            {paso === 3 && (
              <>
                <span className="text-sm font-semibold text-indigo-700">
                  TU NIVEL Y TUS OBJETIVOS
                </span>

                <h2 className="mt-4 text-3xl font-bold">
                  ¿Cuál es tu nivel actual?
                </h2>

                <p className="mt-3 text-slate-600">
                  Si no estás seguro, no te preocupes.
                  Después comprobaremos tu nivel.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {NIVELES.map((item) => (
                    <button
                      key={item.codigo}
                      type="button"
                      aria-pressed={nivel === item.codigo}
                      onClick={() => {
                        setNivel(item.codigo);
                        setError("");
                      }}
                      className={
                        "rounded-2xl border p-4 text-center " +
                        (nivel === item.codigo
                          ? "border-indigo-700 bg-indigo-700 text-white"
                          : "border-slate-200 bg-white hover:border-indigo-400")
                      }
                    >
                      <span className="block text-lg font-bold">
                        {item.codigo}
                      </span>
                      <span className="mt-1 block text-xs opacity-75">
                        {item.nombre}
                      </span>
                    </button>
                  ))}
                </div>

                <h3 className="mt-9 text-xl font-semibold">
                  ¿Qué quieres conseguir?
                </h3>

                <div className="mt-5 grid gap-3">
                  {OBJETIVOS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={objetivo === item}
                      onClick={() => {
                        setObjetivo(item);
                        setError("");
                      }}
                      className={
                        "rounded-2xl border p-4 text-left " +
                        (objetivo === item
                          ? "border-indigo-700 bg-indigo-700 text-white"
                          : "border-slate-200 bg-white hover:border-indigo-400")
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="mt-9 flex gap-3">
                  <button
                    type="button"
                    onClick={() => irAlPaso(2)}
                    className={botonVolver}
                  >
                    ← Volver
                  </button>
                  <button
                    type="button"
                    onClick={avanzarNivel}
                    className={botonPrincipal}
                  >
                    Continuar →
                  </button>
                </div>
              </>
            )}

            {/* INTERESES */}
            {paso === 4 && (
              <>
                <span className="text-sm font-semibold text-indigo-700">
                  UN POCO MÁS SOBRE TI
                </span>

                <h2 className="mt-4 text-3xl font-bold">
                  ¿Qué te apasiona?
                </h2>

                <p className="mt-3 text-slate-600">
                  Selecciona hasta cinco temas que te gusten.
                  Después marca cuál es tu favorito.
                </p>

                <p className="mt-4 text-sm font-medium text-indigo-700">
                  {intereses.length} de 5 seleccionados
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {INTERESES.map((item) => {
                    const seleccionado = intereses.some(
                      (i) => i.id === item.id
                    );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={seleccionado}
                        onClick={() => alternarInteres(item)}
                        className={
                          "relative h-32 overflow-hidden rounded-2xl border text-left transition-all " +
                          (seleccionado
                            ? "border-indigo-700 ring-2 ring-indigo-500/40"
                            : "border-slate-200 hover:border-indigo-400")
                        }
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 hover:scale-110"
                          style={{
                            backgroundImage:
                              "url('" + item.imagen + "')",
                          }}
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />

                        <span className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">
                          {item.nombre}
                        </span>

                        {seleccionado && (
                          <span className="absolute right-3 top-3 rounded-full bg-indigo-700 px-2 py-1 text-xs font-bold text-white">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-7">
                  <label
                    htmlFor="nuevo-interes"
                    className="mb-3 block text-sm text-slate-700"
                  >
                    ¿Te apasiona algo diferente?
                  </label>

                  <div className="flex gap-2">
                    <input
                      id="nuevo-interes"
                      type="text"
                      maxLength={60}
                      value={nuevoInteres}
                      onChange={(e) => {
                        setNuevoInteres(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          agregarInteres();
                        }
                      }}
                      placeholder="Ej. CrossFit, astronomía..."
                      className={campo + " min-w-0 flex-1"}
                    />

                    <button
                      type="button"
                      onClick={agregarInteres}
                      className="rounded-2xl bg-indigo-700 px-5 font-semibold text-white hover:bg-indigo-800"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {intereses.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold">
                      ¿Cuál es tu favorito?
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      Elige el que más te representa.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {intereses.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={
                            interesPrincipal === item.id
                          }
                          onClick={() => {
                            setInteresPrincipal(item.id);
                            setError("");
                          }}
                          className={
                            "rounded-full border px-4 py-3 text-sm " +
                            (interesPrincipal === item.id
                              ? "border-indigo-700 bg-indigo-700 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                          }
                        >
                          {interesPrincipal === item.id
                            ? "★ "
                            : "☆ "}
                          {item.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-9 flex gap-3">
                  <button
                    type="button"
                    onClick={() => irAlPaso(3)}
                    className={botonVolver}
                  >
                    ← Volver
                  </button>

                  <button
                    type="button"
                    onClick={finalizarIntereses}
                    className={botonPrincipal}
                  >
                    Continuar →
                  </button>
                </div>
              </>
            )}

            {/* FINAL PROVISIONAL */}
            {paso === 5 && (
              <>
                <span className="text-sm font-semibold text-indigo-700">
                  PERFIL PREPARADO
                </span>

                <h2 className="mt-4 text-3xl font-bold">
                  Todo listo para continuar.
                </h2>

                <p className="mt-4 leading-relaxed text-slate-600">
                  Ya tenemos tus preferencias iniciales.
                  El siguiente paso será conocer mejor
                  tu nivel mediante una prueba diagnóstica.
                </p>

                <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-700">
                    Tu configuración se mantiene
                    temporalmente en esta pantalla.
                    Todavía no se ha guardado en una cuenta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={comenzarDiagnostico}
                  className={"mt-8 w-full " + botonPrincipal}
                >
                  Comenzar mi evaluación →
                </button>

                <button
                  type="button"
                  onClick={() => irAlPaso(4)}
                  className={"mt-8 " + botonVolver}
                >
                  ← Revisar mis elecciones
                </button>
              </>
            )}

            {/* ERRORES DE VALIDACION */}
            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            </div>
          </section>
        </div>
      </div>
    </main>
  );
}