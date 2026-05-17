"use client";

import { useState } from "react";
import { PokevaultLogo } from "@/components/brand/PokevaultLogo";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "BANNED") {
          setError("Tu cuenta ha sido suspendida. Contacta con soporte.");
        } else {
          setError("Email o contraseña incorrectos.");
        }
        return;
      }

      router.push("/packs");
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex flex-col items-center gap-3 mb-4">
          <PokevaultLogo variant="principal" height={80} priority />
        </div>
        <p className="text-sm font-medium tracking-[0.2em] uppercase text-gray-500">
          Accede a tu cuenta
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
          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-4 py-3 text-sm font-medium"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#FCA5A5",
              }}
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
              style={{
                background: "#15122A",
                border: "1px solid #1E1A35",
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = "1px solid #B44FFF60";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,79,255,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = "1px solid #1E1A35";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
              style={{
                background: "#15122A",
                border: "1px solid #1E1A35",
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = "1px solid #B44FFF60";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,79,255,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = "1px solid #1E1A35";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 text-sm font-bold tracking-[0.1em] uppercase text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? "#7B2FFF80"
                : "linear-gradient(135deg, #B44FFF, #7B2FFF)",
              boxShadow: loading ? "none" : "0 0 20px #B44FFF50, 0 4px 12px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.boxShadow = "0 0 30px #B44FFF70, 0 4px 16px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.boxShadow = "0 0 20px #B44FFF50, 0 4px 12px rgba(0,0,0,0.3)";
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Entrando…
              </span>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>
      </div>

      {/* Footer link */}
      <p className="text-center text-sm text-gray-500 mt-6">
        ¿No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-semibold transition-colors"
          style={{ color: "#B44FFF" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#4FC3FF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#B44FFF")}
        >
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
}
