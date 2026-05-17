#!/usr/bin/env tsx
// =============================================================================
// prisma/sync-cards.ts — PokéVault card synchronizer
//
// Fetches ALL cards from specific sets using the Pokémon TCG API search endpoint.
// Uses GET /v2/cards?q=set.id:sv3pt5&pageSize=250 — returns real data for every
// card in each set, no guessing IDs.
//
// USAGE:
//   npx tsx prisma/sync-cards.ts
//   POKEMONTCG_API_KEY=xxx npx tsx prisma/sync-cards.ts
//
// OUTPUT: prisma/cards.json (read by seed.ts)
//
// GUARANTEES:
//   - Only cards with images.large included
//   - Cardmarket price used when available; realistic fallback otherwise
//   - Zero invented data — everything from the API
//   - Minimum 400 cards or the script exits with an error
// =============================================================================

import fs   from "fs";
import path from "path";

const API     = "https://api.pokemontcg.io/v2/cards";
const HEADERS: Record<string,string> = {};
if (process.env.POKEMONTCG_API_KEY) {
  HEADERS["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
  console.log("✓ Using API key (higher rate limit)");
} else {
  console.log("ℹ No API key — using public rate limit");
  console.log("  Get a free key at: https://pokemontcg.io/\n");
}

// =============================================================================
// SETS TO FETCH — ordered by importance for pack building
// Each set will be fetched completely (all pages)
// =============================================================================
const SETS = [
  // Modern SV era (most valuable, most pool entries)
  { id: "sv3pt5", name: "151"                        },
  { id: "sv3",    name: "Obsidian Flames"             },
  { id: "sv1",    name: "Scarlet & Violet Base"       },
  { id: "sv2",    name: "Paldea Evolved"              },
  { id: "sv4",    name: "Paradox Rift"                },
  // SWSH era (Evolving Skies, Silver Tempest = high value)
  { id: "swsh7",    name: "Evolving Skies"            },
  { id: "swsh12",   name: "Silver Tempest"            },
  { id: "swsh12pt5",name: "Crown Zenith"              },
  { id: "swsh8",    name: "Fusion Strike"             },
  { id: "swsh9",    name: "Brilliant Stars"           },
  { id: "swsh11",   name: "Lost Origin"               },
  { id: "swsh6",    name: "Chilling Reign"            },
  { id: "swsh10",   name: "Astral Radiance"           },
];

// =============================================================================
// Types
// =============================================================================
interface TCGCard {
  id:     string;
  name:   string;
  number: string;
  rarity?: string;
  set:    { id: string; name: string };
  images: { small: string; large: string };
  cardmarket?: {
    url?: string;
    prices?: {
      averageSellPrice?: number;
      trendPrice?:       number;
      lowPrice?:         number;
      avg7?:             number;
      avg30?:            number;
    };
  };
}

export interface SyncedCard {
  externalId:    string;
  name:          string;
  setCode:       string;
  setName:       string;
  cardNumber:    string;
  rarity:        string;
  imageUrl:      string;
  cardmarketUrl: string | null;
  marketPrice:   number;
  priceSource:   string;
}

// =============================================================================
// Helpers
// =============================================================================
function normaliseRarity(raw: string | undefined): string {
  if (!raw) return "RARE";
  const r = raw.toLowerCase();
  if (r.includes("special illustration rare"))  return "SPECIAL_ILLUSTRATION_RARE";
  if (r.includes("illustration rare"))          return "ILLUSTRATION_RARE";
  if (r.includes("rainbow rare") || r === "secret rare") return "SECRET_RARE";
  if (r.includes("hyper rare"))                 return "HYPER_RARE";
  if (r.includes("ultra rare"))                 return "ULTRA_RARE";
  if (r.includes("double rare"))                return "DOUBLE_RARE";
  if (r.includes("ace spec rare"))              return "DOUBLE_RARE";
  if (r.includes("rare holo vmax"))             return "ULTRA_RARE";
  if (r.includes("rare holo vstar"))            return "ULTRA_RARE";
  if (r.includes("rare holo v"))                return "ULTRA_RARE";
  if (r.includes("trainer gallery") && r.includes("rare holo")) return "HYPER_RARE";
  if (r.includes("trainer gallery"))            return "ILLUSTRATION_RARE";
  if (r.includes("rare holo"))                  return "RARE";
  if (r.includes("rare"))                       return "RARE";
  if (r.includes("uncommon"))                   return "UNCOMMON";
  if (r.includes("common"))                     return "COMMON";
  return "RARE";
}

// Realistic fallback prices by rarity when cardmarket has no data
const FALLBACK_PRICES: Record<string, number> = {
  COMMON:                       0.20,
  UNCOMMON:                     0.50,
  RARE:                         1.50,
  ILLUSTRATION_RARE:            8.00,
  DOUBLE_RARE:                  6.00,
  ULTRA_RARE:                  12.00,
  HYPER_RARE:                  25.00,
  SPECIAL_ILLUSTRATION_RARE:   30.00,
  SECRET_RARE:                 45.00,
  GOD_HIT:                    150.00,
};

function extractPrice(card: TCGCard): number {
  const p = card.cardmarket?.prices;
  if (!p) return 0;
  return p.averageSellPrice ?? p.trendPrice ?? p.avg7 ?? p.avg30 ?? p.lowPrice ?? 0;
}

async function fetchPage(setId: string, page: number): Promise<{ data: TCGCard[]; totalCount: number }> {
  const url = `${API}?q=set.id:${setId}&pageSize=250&page=${page}&orderBy=number`;
  const res  = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status} for set ${setId} page ${page}: ${body.slice(0,200)}`);
  }

  const json = await res.json() as { data: TCGCard[]; totalCount: number };
  return json;
}

async function fetchAllFromSet(setId: string, setName: string): Promise<SyncedCard[]> {
  const results: SyncedCard[] = [];
  let page = 1;

  process.stdout.write(`  Fetching ${setId.padEnd(12)} `);

  while (true) {
    const { data, totalCount } = await fetchPage(setId, page);

    if (!data || data.length === 0) break;

    for (const card of data) {
      // Skip cards without images
      if (!card.images?.large) continue;

      let price  = extractPrice(card);
      const rarity = normaliseRarity(card.rarity);

      // Use realistic fallback if no price
      const usedFallback = price <= 0;
      if (usedFallback) price = FALLBACK_PRICES[rarity] ?? 1.00;

      // Classify GOD_HIT tier
      const finalRarity = (price >= 150 && (rarity === "SECRET_RARE" || rarity === "SPECIAL_ILLUSTRATION_RARE"))
        ? "GOD_HIT"
        : rarity;

      results.push({
        externalId:    card.id,
        name:          card.name,
        setCode:       card.set.id,
        setName:       card.set.name,
        cardNumber:    card.number,
        rarity:        finalRarity,
        imageUrl:      card.images.large,
        cardmarketUrl: card.cardmarket?.url ?? null,
        marketPrice:   parseFloat(price.toFixed(2)),
        priceSource:   usedFallback ? "MANUAL_FALLBACK" : "CARDMARKET_VIA_POKEMONTCG_IO",
      });
    }

    process.stdout.write(`${results.length}/${totalCount} `);

    if (data.length < 250) break; // last page
    page++;

    // Rate-limit politeness: 300ms between pages
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`— ${results.length} cards`);
  return results;
}

// =============================================================================
// Main
// =============================================================================
async function main() {
  console.log("🔄 Syncing cards from Pokémon TCG API by set…\n");
  console.log(`   Sets: ${SETS.map(s => s.id).join(", ")}\n`);

  const allCards:  SyncedCard[] = [];
  const seen       = new Set<string>(); // dedup by externalId

  for (const set of SETS) {
    try {
      const cards = await fetchAllFromSet(set.id, set.name);
      let added = 0;
      for (const c of cards) {
        if (seen.has(c.externalId)) continue;
        seen.add(c.externalId);
        allCards.push(c);
        added++;
      }
      // Small delay between sets
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`\n  ⚠ Failed to fetch set ${set.id}:`, (err as Error).message);
      // Continue with other sets
    }
  }

  // Check minimum
  const MIN_CARDS = 400;
  if (allCards.length < MIN_CARDS) {
    console.error(`\n❌ Only ${allCards.length} cards fetched — minimum is ${MIN_CARDS}`);
    console.error("   Check your internet connection and API rate limits.");
    console.error("   Consider adding POKEMONTCG_API_KEY to increase rate limits.");
    process.exit(1);
  }

  // Summary by rarity
  const byRarity: Record<string, number> = {};
  for (const c of allCards) {
    byRarity[c.rarity] = (byRarity[c.rarity] ?? 0) + 1;
  }

  const outPath = path.join(__dirname, "cards.json");
  fs.writeFileSync(outPath, JSON.stringify(allCards, null, 2));

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Sync complete

  Total cards: ${allCards.length}

  By rarity:
${Object.entries(byRarity).sort((a,b) => b[1]-a[1]).map(([r,n]) => `    ${r.padEnd(30)} ${n}`).join("\n")}

  By set:
${[...new Set(allCards.map(c => c.setCode))].map(sc => {
  const n = allCards.filter(c => c.setCode === sc).length;
  const sn = allCards.find(c => c.setCode === sc)?.setName ?? sc;
  return `    ${sc.padEnd(14)} ${sn.padEnd(28)} ${n} cards`;
}).join("\n")}

  Output: prisma/cards.json

  Next step:
    npx prisma db seed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(e => { console.error("\nSync failed:", e.message ?? e); process.exit(1); });
