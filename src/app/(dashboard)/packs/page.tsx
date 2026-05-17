import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { PackCard } from "@/components/packs/PackCard";

export const dynamic = "force-dynamic";

async function getPacks() {
  try { return await prisma.pack.findMany({
    where:   { status: "ACTIVE" },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id:          true,
      slug:        true,
      name:        true,
      description: true,
      imageUrl:    true,
      price:       true,
      isFeatured:  true,
      cardsPerOpening: true,
      _count: { select: { cardPool: true } },
    },
  }); } catch { return []; }
}

export default async function PacksPage() {
  await requireAuth();
  const packs = await getPacks();

  const featured = packs.filter((p) => p.isFeatured);
  const regular  = packs.filter((p) => !p.isFeatured);

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-600 mb-2">
          Colección actual
        </p>
        <h1
          className="text-4xl sm:text-5xl font-black font-display leading-none"
          style={{
            background: "linear-gradient(135deg, #F0EEFF 0%, #B44FFF 50%, #4FC3FF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          PACKS
        </h1>
      </div>

      {/* Empty state */}
      {packs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-6xl mb-6">📦</div>
          <p className="text-lg font-bold text-gray-400 mb-2">
            No hay packs disponibles
          </p>
          <p className="text-sm text-gray-600">
            Vuelve pronto — estamos preparando algo increíble.
          </p>
        </div>
      )}

      {/* Featured packs */}
      {featured.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-1.5 h-5 rounded-full"
              style={{ background: "linear-gradient(180deg, #FF4FA8, #B44FFF)", boxShadow: "0 0 8px #B44FFF" }}
            />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
              Destacados
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((pack) => (
              <PackCard
                key={pack.id}
                id={pack.id}
                slug={pack.slug}
                name={pack.name}
                description={pack.description}
                imageUrl={pack.imageUrl}
                price={pack.price.toFixed(2)}
                isFeatured
              />
            ))}
          </div>
        </section>
      )}

      {/* Regular packs */}
      {regular.length > 0 && (
        <section>
          {featured.length > 0 && (
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-1.5 h-5 rounded-full"
                style={{ background: "linear-gradient(180deg, #4FC3FF, #4FFFB4)", boxShadow: "0 0 8px #4FC3FF" }}
              />
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
                Todos los packs
              </h2>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {regular.map((pack) => (
              <PackCard
                key={pack.id}
                id={pack.id}
                slug={pack.slug}
                name={pack.name}
                description={pack.description}
                imageUrl={pack.imageUrl}
                price={pack.price.toFixed(2)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
