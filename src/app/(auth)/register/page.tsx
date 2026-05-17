"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PokevaultLogo } from "@/components/brand/PokevaultLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "" }));
    setGlobalError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGlobalError(null);
    setLoading(true);

    try {
      // 1. Llamar a la API de registro
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        // Intentar mapear el error a un campo específico
        const msg = data.error as string;
        if (msg.toLowerCase().includes("email")) {
          setErrors({ email: msg });
        } else if (msg.toLowerCase().includes("usuario") || msg.toLowerCase().includes("username")) {
          setErrors({ username: msg });
        } else {
          setGlobalError(msg);
        }
        return;
      }

      // 2. Auto-login tras registro exitoso
      const result = await signIn("credentials", {
        email:    form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        // Registro OK pero login falló (raro) — redirigir al login
        router.push("/login?registered=true");
        return;
      }

      router.push("/packs");
      router.refresh();
    } catch {
      setGlobalError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-200";
  const inputStyle = { background: "#15122A", border: "1px solid #1E1A35" };

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.border = "1px solid #B44FFF60";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,79,255,0.1)";
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.border = "1px solid #1E1A35";
    e.currentTarget.style.boxShadow = "none";
  }

  return (
    <div>
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex flex-col items-center gap-3 mb-4">
          <PokevaultLogo variant="principal" height={80} priority />
        </div>
        <p className="text-sm font-medium tracking-[0.2em] uppercase text-gray-500">
          Crea tu cuenta gratis
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl p-8"
        style={{
          background: "#0D0B1A",
          border: "1px solid #1E1A35",
          boxShadow: "0 0 40px rgba(180,79,255,0.08), 0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Global error */}
          {globalError && (
            <div
              className="rounded-lg px-4 py-3 text-sm font-medium"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#FCA5A5",
              }}
            >
              {globalError}
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
              Email
            </label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              className={inputClass}
              style={{
                ...inputStyle,
                ...(errors.email ? { border: "1px solid rgba(239,68,68,0.5)" } : {}),
              }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            {errors.email && (
              <p className="text-xs" style={{ color: "#FCA5A5" }}>{errors.email}</p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
              Nombre de usuario
            </label>
            <input
              type="text"
              name="username"
              autoComplete="username"
              required
              value={form.username}
              onChange={handleChange}
              placeholder="trainer123"
              className={inputClass}
              style={{
                ...inputStyle,
                ...(errors.username ? { border: "1px solid rgba(239,68,68,0.5)" } : {}),
              }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            {errors.username ? (
              <p className="text-xs" style={{ color: "#FCA5A5" }}>{errors.username}</p>
            ) : (
              <p className="text-xs text-gray-600">
                3–20 caracteres. Solo letras, números y guión bajo.
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              className={inputClass}
              style={{
                ...inputStyle,
                ...(errors.password ? { border: "1px solid rgba(239,68,68,0.5)" } : {}),
              }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            {errors.password && (
              <p className="text-xs" style={{ color: "#FCA5A5" }}>{errors.password}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 text-sm font-bold tracking-[0.1em] uppercase text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? "#B44FFF40"
                : "linear-gradient(135deg, #FF4FA8, #B44FFF)",
              boxShadow: loading ? "none" : "0 0 20px #FF4FA850, 0 4px 12px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.boxShadow = "0 0 30px #FF4FA870, 0 4px 16px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.boxShadow = "0 0 20px #FF4FA850, 0 4px 12px rgba(0,0,0,0.3)";
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creando cuenta…
              </span>
            ) : (
              "Crear cuenta"
            )}
          </button>
        </form>

        {/* Terms */}
        <p className="text-center text-xs text-gray-600 mt-5">
          Al registrarte aceptas los{" "}
          <span className="text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
            Términos de uso
          </span>{" "}
          y la{" "}
          <span className="text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
            Política de privacidad
          </span>
          .
        </p>
      </div>

      {/* Footer link */}
      <p className="text-center text-sm text-gray-500 mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold transition-colors"
          style={{ color: "#B44FFF" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#4FC3FF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#B44FFF")}
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
