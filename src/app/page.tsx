// Server Component — no "use client", no event handlers, no useState
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { HeroSection } from "@/components/home/HeroSection";
import { RecentDropsTicker } from "@/components/home/RecentDropsTicker";
import { HomepagePackCard } from "@/components/home/HomepagePackCard";
import { PokevaultLogo } from "@/components/brand/PokevaultLogo";

export const dynamic = "force-dynamic";

async function getFeaturedPacks() {
  try {
    return await prisma.pack.findMany({
      where:   { status: "ACTIVE" },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      take: 6,
      select: {
        id: true, slug: true, name: true,
        imageUrl: true, price: true, isFeatured: true,
        _count: { select: { openings: true } },
      },
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const session = await auth();
  const packs   = await getFeaturedPacks();

  return (
    <div className="min-h-screen bg-void">
      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-20 z-50" />

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background:     "rgba(6,5,15,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom:   "1px solid #1E1A35",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <PokevaultLogo variant="horizontal" height={32} priority />
          </Link>

          <div className="flex items-center gap-3">
            {session ? (
              <Link href="/packs">
                <span
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white inline-block"
                  style={{
                    background: "linear-gradient(135deg, #B44FFF, #4FC3FF)",
                    boxShadow:  "0 0 16px rgba(180,79,255,0.4)",
                  }}
                >
                  Mis Packs
                </span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Entrar
                </Link>
                <Link href="/register">
                  <span
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white inline-block"
                    style={{
                      background: "linear-gradient(135deg, #B44FFF, #FF4FA8)",
                      boxShadow:  "0 0 14px rgba(180,79,255,0.4)",
                    }}
                  >
                    Empezar gratis
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO (Client Component) ──────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4">
        <HeroSection />
      </div>

      {/* ── LIVE DROPS TICKER (Client Component) ───────────────────────── */}
      <RecentDropsTicker />

      {/* ── FEATURED PACKS ──────────────────────────────────────────────── */}
      {packs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <div
                className="w-1.5 h-6 rounded-full"
                style={{
                  background: "linear-gradient(180deg, #FF4FA8, #B44FFF)",
                  boxShadow:  "0 0 10px #B44FFF",
                }}
              />
              <h2 className="text-xl font-black font-display uppercase tracking-widest text-white">
                Packs Activos
              </h2>
            </div>
            <Link
              href="/packs"
              className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-[#B44FFF] transition-colors flex items-center gap-1"
            >
              Ver todos
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

          {/* HomepagePackCard is "use client" — handles hover safely */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {packs.map((pack) => (
              <HomepagePackCard
                key={pack.id}
                id={pack.id}
                slug={pack.slug}
                name={pack.name}
                imageUrl={pack.imageUrl}
                price={Number(pack.price)}
                isFeatured={pack.isFeatured}
                openings={pack._count.openings}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2
            className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider"
            style={{
              background: "linear-gradient(135deg, #F0EEFF, #B44FFF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ¿Cómo funciona?
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { num:"01", icon:"💳", title:"Recarga saldo",      color:"#B44FFF", desc:"Añade saldo a tu wallet de forma segura. En modo demo el saldo se añade al instante."     },
            { num:"02", icon:"🃏", title:"Abre sobres",        color:"#4FC3FF", desc:"Elige un pack y ábrelo. El resultado es 100% verificable (Provably Fair)."               },
            { num:"03", icon:"💎", title:"Colecciona o vende", color:"#4FFFB4", desc:"Guarda tus cartas o véndelas al instante al 65% del precio de mercado."                   },
          ].map((step) => (
            <div
              key={step.num}
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: `linear-gradient(160deg, ${step.color}08 0%, #0D0B1A 60%)`,
                border:     `1px solid ${step.color}20`,
              }}
            >
              <div
                className="text-3xl font-black font-mono mb-4 opacity-15 absolute top-4 right-5"
                style={{ color: step.color }}
              >
                {step.num}
              </div>
              <div className="text-3xl mb-4">{step.icon}</div>
              <h3
                className="text-base font-black font-display uppercase mb-2"
                style={{ color: step.color }}
              >
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FOOTER ──────────────────────────────────────────────────── */}
      {!session && (
        <section className="max-w-md mx-auto px-4 pb-20 text-center">
          <div
            className="rounded-3xl p-8 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(180,79,255,0.15), rgba(79,195,255,0.1))",
              border:     "1px solid rgba(180,79,255,0.3)",
              boxShadow:  "0 0 60px rgba(180,79,255,0.1)",
            }}
          >
            <p
              className="text-2xl font-black font-display mb-2"
              style={{
                background: "linear-gradient(135deg, #B44FFF, #4FC3FF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ¿Listo para abrir?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Regístrate gratis y empieza a coleccionar.
            </p>
            <Link href="/register">
              <span
                className="inline-block px-8 py-4 rounded-2xl font-black font-display text-base uppercase tracking-widest text-white"
                style={{
                  background: "linear-gradient(135deg, #B44FFF, #FF4FA8)",
                  boxShadow:  "0 0 24px rgba(180,79,255,0.5)",
                }}
              >
                Crear cuenta gratis
              </span>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
