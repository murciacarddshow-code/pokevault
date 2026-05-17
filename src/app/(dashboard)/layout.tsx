import { requireAuth } from "@/lib/auth/guards";
import LogoutButton from "@/components/ui/LogoutButton";
import { WalletDisplay } from "@/components/layout/WalletDisplay";
import Link from "next/link";
import { PokevaultLogo } from "@/components/brand/PokevaultLogo";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const user = session.user;

  return (
    <div className="min-h-screen bg-void">

      {/* Navbar */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: "rgba(13,11,26,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1E1A35",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/packs" className="flex items-center">
            <PokevaultLogo variant="horizontal" height={36} priority />
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: "/packs",     label: "Packs"      },
              { href: "/inventory", label: "Inventario" },
              { href: "/wallet",    label: "Wallet"     },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                style={{ letterSpacing: "0.05em" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="flex items-center gap-3">

            {/* Wallet balance — live from store */}
            <WalletDisplay />

            {/* Avatar + username */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                style={{
                  background: "linear-gradient(135deg, #B44FFF40, #4FC3FF40)",
                  border: "1px solid #B44FFF50",
                  color: "#B44FFF",
                }}
              >
                {(user.username ?? user.name ?? user.email ?? "?")[0].toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-300">
                {user.username ?? user.name ?? "Trainer"}
              </span>
            </div>

            {/* Logout */}
            <LogoutButton
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-red-400 transition-colors"
              style={{ letterSpacing: "0.08em" } as React.CSSProperties}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden sm:inline">Salir</span>
            </LogoutButton>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
