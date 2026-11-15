// INTERESTALK - Perfil provisional del piloto.
// Solo navegador: no es una cuenta, ni almacenamiento permanente.

export type NivelDeclarado = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type InteresProvisional = { id: string; nombre: string };
export type PerfilProvisional = {
  version: 1;
  idiomaApoyo: string;
  idiomaAprendizaje: string;
  nivelDeclarado: NivelDeclarado;
  objetivo: string;
  intereses: InteresProvisional[];
  interesPrincipalId: string;
  creadoEn: number;
};

const CLAVE = "interestalk.perfil-provisional.v1";
const DURACION_MS = 2 * 60 * 60 * 1000;
const IDIOMAS = ["es", "en", "fr", "de", "it", "pt"];
const NIVELES: NivelDeclarado[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
let perfilProvisionalEnMemoria: PerfilProvisional | null = null;

export function perfilValido(valor: unknown): valor is PerfilProvisional {
  if (!valor || typeof valor !== "object") return false;
  const p = valor as Partial<PerfilProvisional>;
  if (p.version !== 1 || !IDIOMAS.includes(p.idiomaApoyo ?? "") ||
      !IDIOMAS.includes(p.idiomaAprendizaje ?? "") ||
      p.idiomaApoyo === p.idiomaAprendizaje ||
      !NIVELES.includes(p.nivelDeclarado as NivelDeclarado) ||
      typeof p.objetivo !== "string" || !p.objetivo.trim() || p.objetivo.length > 120 ||
      typeof p.creadoEn !== "number" || !Number.isFinite(p.creadoEn) ||
      p.creadoEn > Date.now() + 60000 || Date.now() - p.creadoEn > DURACION_MS ||
      !Array.isArray(p.intereses) || p.intereses.length < 1 || p.intereses.length > 5 ||
      typeof p.interesPrincipalId !== "string") return false;
  const ids = new Set<string>();
  for (const i of p.intereses) {
    if (!i || typeof i.id !== "string" || !i.id || i.id.length > 100 ||
        typeof i.nombre !== "string" || i.nombre.length < 2 || i.nombre.length > 60 ||
        ids.has(i.id)) return false;
    ids.add(i.id);
  }
  return ids.has(p.interesPrincipalId);
}

export function guardarPerfilProvisional(perfil: PerfilProvisional): boolean {
  if (typeof window === "undefined" || !perfilValido(perfil)) return false;
  perfilProvisionalEnMemoria = perfil;
  try {
    window.sessionStorage.setItem(CLAVE, JSON.stringify(perfil));
    return true;
  } catch {
    return true;
  }
}

export function leerPerfilProvisional(): PerfilProvisional | null {
  if (typeof window === "undefined") return null;
  if (perfilProvisionalEnMemoria && perfilValido(perfilProvisionalEnMemoria)) {
    return perfilProvisionalEnMemoria;
  }
  try {
    const guardado = window.sessionStorage.getItem(CLAVE);
    if (!guardado) return null;
    const valor: unknown = JSON.parse(guardado);
    if (perfilValido(valor)) {
      perfilProvisionalEnMemoria = valor;
      return valor;
    }
    window.sessionStorage.removeItem(CLAVE);
  } catch {
    return perfilProvisionalEnMemoria;
  }
  return null;
}

// ======================================================
// PERFIL EXTENDIDO DE APRENDIZAJE E INTERESES (PILOTO / DB)
// ======================================================

export type UserLearningProfile = {
  userId: string;
  level: "B1" | "B2";
  interests: string[];
  customTopics: string[];
  updatedAt: string;
  diagnosticCompleted?: boolean;
};

const LEARNING_PROFILE_KEY = "interestalk.learning-profile.v1";
let perfilAprendizajeEnMemoria: UserLearningProfile | null = null;

export const DEFAULT_PRESET_INTERESTS = [
  "CrossFit & Fitness",
  "Inteligencia Artificial",
  "Motor & Motos",
  "Negocios & Ventas",
  "Viajes",
  "Tecnología",
  "Finanzas",
  "Cine & Series",
  "Salud & Nutrición",
  "Deportes",
  "Música & Festivales",
  "Gastronomía",
];

export function guardarPerfilAprendizajeLocal(
  profile: UserLearningProfile
): void {
  if (typeof window === "undefined") return;
  const interests = Array.isArray(profile.interests)
    ? profile.interests.filter((name) => typeof name === "string")
    : [];
  const customTopics = Array.isArray(profile.customTopics)
    ? profile.customTopics.filter((name) => typeof name === "string")
    : [];
  perfilAprendizajeEnMemoria = profile;
  try {
    window.localStorage.setItem(
      LEARNING_PROFILE_KEY,
      JSON.stringify(profile)
    );
  } catch (e) {
    console.warn("Fallo guardando perfil local:", e);
  }

  // Mantener sincronizado con perfil provisional para componentes antiguos
  const provisionalExistente = leerPerfilProvisional();
  const interesesProvisionales = Array.from(
    new Set([...interests, ...customTopics])
  )
    .map((name) => name.trim().slice(0, 60))
    .filter((name) => name.length >= 2)
    .slice(0, 5);
  if (interesesProvisionales.length === 0) {
    interesesProvisionales.push("Tecnología");
  }
  const interesesConIds = interesesProvisionales.map((nombre, index) => ({
    id: `${nombre.toLowerCase().replace(/[^a-z0-9]/g, "-") || "tema"}-${index}`,
    nombre,
  }));
  const provisionalActualizado: PerfilProvisional = {
    version: 1,
    idiomaApoyo: provisionalExistente?.idiomaApoyo || "es",
    idiomaAprendizaje: provisionalExistente?.idiomaAprendizaje || "en",
    nivelDeclarado: profile.level,
    objetivo: provisionalExistente?.objetivo || "Mejorar fluidez oral",
    intereses: interesesConIds,
    interesPrincipalId: interesesConIds[0].id,
    creadoEn: Date.now(),
  };
  guardarPerfilProvisional(provisionalActualizado);
}

export function leerPerfilAprendizajeLocal(): UserLearningProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEARNING_PROFILE_KEY);
    if (!raw) return perfilAprendizajeEnMemoria;
    const parsed = JSON.parse(raw) as Partial<UserLearningProfile>;
    if (
      parsed &&
      (parsed.level === "B1" || parsed.level === "B2") &&
      Array.isArray(parsed.interests)
    ) {
      const profile: UserLearningProfile = {
        userId: typeof parsed.userId === "string" ? parsed.userId : "",
        level: parsed.level,
        interests: parsed.interests.filter(
          (name): name is string => typeof name === "string"
        ),
        customTopics: Array.isArray(parsed.customTopics)
          ? parsed.customTopics.filter(
              (name): name is string => typeof name === "string"
            )
          : [],
        updatedAt:
          typeof parsed.updatedAt === "string"
            ? parsed.updatedAt
            : new Date().toISOString(),
        diagnosticCompleted: parsed.diagnosticCompleted === true,
      };
      perfilAprendizajeEnMemoria = profile;
      return profile;
    }
  } catch {
    return perfilAprendizajeEnMemoria;
  }
  return perfilAprendizajeEnMemoria;
}

export async function fetchPerfilAprendizaje(
  userId: string,
  forceRemote = false
): Promise<UserLearningProfile> {
  const local = leerPerfilAprendizajeLocal();
  if (!forceRemote && local && local.userId === userId) {
    return local;
  }

  try {
    const res = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      cache: "no-store",
    });

    if (res.ok) {
      const data = (await res.json()) as {
        profile?: {
          user_id?: unknown;
          level?: unknown;
          interests?: unknown;
          custom_topics?: unknown;
          updated_at?: unknown;
          diagnostic_completed?: unknown;
        };
      };
      if (data?.profile) {
        const remoteProfile: UserLearningProfile = {
          userId:
            typeof data.profile.user_id === "string"
              ? data.profile.user_id
              : userId,
          level: data.profile.level === "B2" ? "B2" : "B1",
          interests: Array.isArray(data.profile.interests)
            ? data.profile.interests.filter(
                (name): name is string => typeof name === "string"
              )
            : ["Tecnología", "Viajes"],
          customTopics: Array.isArray(data.profile.custom_topics)
            ? data.profile.custom_topics.filter(
                (name): name is string => typeof name === "string"
              )
            : [],
          updatedAt:
            typeof data.profile.updated_at === "string"
              ? data.profile.updated_at
              : new Date().toISOString(),
          diagnosticCompleted: data.profile.diagnostic_completed === true,
        };
        guardarPerfilAprendizajeLocal(remoteProfile);
        return remoteProfile;
      }
      throw new Error("La respuesta no contiene un perfil de aprendizaje.");
    }
    throw new Error(`No se pudo consultar el perfil (HTTP ${res.status}).`);
  } catch (err) {
    console.warn("Fallo al obtener perfil remoto:", err);
  }

  if (!forceRemote && local?.userId === userId) {
    return local;
  }

  const fallback: UserLearningProfile = {
    userId,
    level: "B1",
    interests: ["Tecnología", "Viajes", "Deportes"],
    customTopics: [],
    updatedAt: new Date().toISOString(),
    diagnosticCompleted: false,
  };
  if (!forceRemote) {
    guardarPerfilAprendizajeLocal(fallback);
  }
  return fallback;
}

export async function syncPerfilAprendizaje(
  userId: string,
  data: {
    level: "B1" | "B2";
    interests: string[];
    customTopics?: string[];
  }
): Promise<UserLearningProfile> {
  const existingProfile = leerPerfilAprendizajeLocal();
  const profile: UserLearningProfile = {
    userId,
    level: data.level,
    interests: data.interests,
    customTopics: data.customTopics || [],
    updatedAt: new Date().toISOString(),
    diagnosticCompleted:
      existingProfile?.userId === userId
        ? existingProfile.diagnosticCompleted
        : undefined,
  };

  guardarPerfilAprendizajeLocal(profile);

  try {
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        userId,
        level: data.level,
        interests: data.interests,
        customTopics: data.customTopics || [],
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(
        payload?.error || `No se pudo sincronizar el perfil (HTTP ${response.status}).`
      );
    }

    const payload = (await response.json()) as {
      profile?: { diagnostic_completed?: boolean };
    };
    if (!payload.profile) {
      throw new Error("La respuesta de Supabase no contiene el perfil guardado.");
    }
    profile.diagnosticCompleted =
      payload.profile.diagnostic_completed === true;
    guardarPerfilAprendizajeLocal(profile);
  } catch (err) {
    console.error("Fallo sincronizando perfil con Supabase:", err);
    throw err;
  }

  return profile;
}
