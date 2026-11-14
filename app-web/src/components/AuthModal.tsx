"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getOrCreateClientUserId } from "@/lib/voice-client";

// ======================================================
// INTERESTALK - MODAL DE AUTENTICACION CON SUPABASE OTP
// Acceso sin contraseñas en 2 pasos: Email -> Codigo 6 digitos.
// ======================================================

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
  initialMessage?: string;
};

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMessage,
}: AuthModalProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const supabase = getSupabaseBrowserClient();

  // Paso 1: Enviar codigo OTP por email
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw error;
      }

      setStep("otp");
      setInfoMessage(`Hemos enviado un código de 6 dígitos a ${cleanEmail}. Revisa tu bandeja de entrada.`);
    } catch (err: unknown) {
      console.error("[AUTH_OTP_ERROR] Error enviando OTP:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "No se pudo enviar el código. Verifica el correo e inténtalo de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Paso 2: Verificar codigo de 6 digitos y migrar invitado
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanToken = otpToken.trim();
    if (!cleanToken) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanToken,
        type: "email",
      });

      if (error) {
        throw error;
      }

      const user = data.user;
      const accessToken = data.session?.access_token;
      if (user && accessToken) {
        const guestUserId = getOrCreateClientUserId();

        // Migrar datos de invitado al usuario autenticado
        try {
          const migrationResponse = await fetch("/api/auth/migrate-guest", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              guestUserId,
              authUserId: user.id,
              email: user.email,
            }),
          });
          if (!migrationResponse.ok) {
            throw new Error("No se pudieron migrar los datos del invitado.");
          }

          // Actualizar localStorage y cookie para usar el user.id autenticado
          if (typeof window !== "undefined") {
            window.localStorage.setItem("interestalk.guest-user-id.v1", user.id);
            document.cookie = `interestalk-guest-id=${user.id}; path=/; max-age=31536000; SameSite=Lax`;
          }
        } catch (migErr) {
          console.warn("Fallo migrando datos de invitado:", migErr);
        }

        if (onSuccess) {
          onSuccess(user);
        }
        onClose();
      } else {
        throw new Error("No se pudo obtener la sesión autenticada.");
      }
    } catch (err: unknown) {
      console.error("[AUTH_VERIFY_ERROR] Error verificando OTP:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Código incorrecto o caducado. Vuelve a intentarlo."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        <div className="text-center">
          <span className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-indigo-700 text-xl font-bold text-white shadow-xs">
            I
          </span>
          <h2 className="mt-3 text-xl font-black text-slate-900 sm:text-2xl">
            {step === "email" ? "Acceso sin contraseñas" : "Introduce tu código"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {step === "email"
              ? initialMessage || "Inicia sesión o crea tu cuenta con un código de acceso único en tu correo."
              : `Introduce el código de 6 dígitos que hemos enviado a ${email}.`}
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            ⚠️ {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            ✓ {infoMessage}
          </div>
        )}

        {/* PASO 1: INTRODUCIR EMAIL */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Tu correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full rounded-xl bg-indigo-700 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-800 disabled:opacity-40"
            >
              {isLoading ? "Enviando código..." : "Enviar código de acceso →"}
            </button>
          </form>
        )}

        {/* PASO 2: INTRODUCIR CODIGO OTP */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Código de 6 dígitos
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="mt-1.5 w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/30 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-indigo-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpToken.length < 6}
              className="w-full rounded-xl bg-indigo-700 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-800 disabled:opacity-40"
            >
              {isLoading ? "Verificando..." : "Verificar y entrar →"}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-slate-500 hover:text-slate-800"
              >
                ← Cambiar email
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleSendOtp}
                className="font-semibold text-indigo-700 hover:underline"
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
