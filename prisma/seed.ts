// =============================================================================
// prisma/seed.ts — PokéVault v7
//
// REQUIRES: prisma/cards.json  (run `npx tsx prisma/sync-cards.ts` first)
//
// VALIDATIONS (throws before creating packs if not met):
//   - Minimum 400 cards in cards.json
//   - Every active pack has ≥ 40 pool entries
//   - No packs with empty pools
//   - No PackCardPool with dropWeight ≤ 0
//   - No Card.imageUrl with placehold.co
// =============================================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs    from "fs";
import path  from "path";

const prisma = new PrismaClient();
const MARGIN = 0.65;
const MIN_CARDS        = 400;
const MIN_POOL_SIZE    = 40;

const P = (slug: string) => `/packs/${slug}.webp`;

// ── cards.json type ───────────────────────────────────────────────────────────
interface SyncedCard {
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

function loadCards(): SyncedCard[] {
  const p = path.join(__dirname, "cards.json");
  if (!fs.existsSync(p)) throw new Error(
    "\n❌ prisma/cards.json not found!\n" +
    "   Run first: npx tsx prisma/sync-cards.ts\n" +
    "   Then:      npx prisma db seed"
  );
  const cards = JSON.parse(fs.readFileSync(p, "utf-8")) as SyncedCard[];
  if (cards.length < MIN_CARDS) throw new Error(
    `\n❌ cards.json has only ${cards.length} cards (minimum: ${MIN_CARDS})\n` +
    "   Re-run: npx tsx prisma/sync-cards.ts"
  );
  return cards;
}

// =============================================================================
// POOL BUILDER
// All pool-building functions operate on the full CARDS array.
// They return [setCode, cardNumber, weight] tuples for cards that actually
// exist in the cardIdMap (i.e. were successfully upserted into the DB).
// =============================================================================
type PoolEntry = [string, string, number];

// Returns cards matching given set codes AND rarities, with specified weight
function bySetRarity(
  cardIdMap: Map<string, string>,
  CARDS: SyncedCard[],
  sets:    string[],
  rarities:string[],
  weight:  number,
): PoolEntry[] {
  return CARDS
    .filter(c =>
      sets.includes(c.setCode) &&
      rarities.includes(c.rarity) &&
      cardIdMap.has(`${c.setCode}-${c.cardNumber}`)
    )
    .map(c => [c.setCode, c.cardNumber, weight] as PoolEntry);
}

// Returns all cards from given sets with specified weight
function bySet(
  cardIdMap: Map<string, string>,
  CARDS: SyncedCard[],
  sets:   string[],
  weight: number,
): PoolEntry[] {
  return CARDS
    .filter(c => sets.includes(c.setCode) && cardIdMap.has(`${c.setCode}-${c.cardNumber}`))
    .map(c => [c.setCode, c.cardNumber, weight] as PoolEntry);
}

// Returns cards within a price range
function byPrice(
  cardIdMap: Map<string, string>,
  CARDS: SyncedCard[],
  min:    number,
  max:    number,
  weight: number,
): PoolEntry[] {
  return CARDS
    .filter(c =>
      c.marketPrice >= min &&
      c.marketPrice <= max &&
      cardIdMap.has(`${c.setCode}-${c.cardNumber}`)
    )
    .map(c => [c.setCode, c.cardNumber, weight] as PoolEntry);
}

// Returns cards whose name contains any of the keywords
function byName(
  cardIdMap: Map<string, string>,
  CARDS: SyncedCard[],
  keywords: string[],
  weight:   number,
): PoolEntry[] {
  const kw = keywords.map(k => k.toLowerCase());
  return CARDS
    .filter(c =>
      kw.some(k => c.name.toLowerCase().includes(k)) &&
      cardIdMap.has(`${c.setCode}-${c.cardNumber}`)
    )
    .map(c => [c.setCode, c.cardNumber, weight] as PoolEntry);
}

// Returns cards with given rarities across ALL sets
function byRarity(
  cardIdMap: Map<string, string>,
  CARDS: SyncedCard[],
  rarities: string[],
  weight:   number,
): PoolEntry[] {
  return CARDS
    .filter(c => rarities.includes(c.rarity) && cardIdMap.has(`${c.setCode}-${c.cardNumber}`))
    .map(c => [c.setCode, c.cardNumber, weight] as PoolEntry);
}

// Merge pool: deduplicate by setCode+cardNumber, keep highest weight per card
function merge(entries: PoolEntry[]): PoolEntry[] {
  const best = new Map<string, PoolEntry>();
  for (const e of entries) {
    const k = `${e[0]}-${e[1]}`;
    if (!best.has(k) || e[2] > best.get(k)![2]) best.set(k, e);
  }
  return [...best.values()];
}

// =============================================================================
// PACK DEFINITIONS — 20 themed packs, each with a different pool strategy
// =============================================================================
interface PackDef {
  slug:           string;
  name:           string;
  description:    string;
  category:       string;
  price:          number;
  houseEdge:      number;
  cardsPerOpening:number;
  isFeatured:     boolean;
  sortOrder:      number;
  imageUrl:       string;
  buildPool:      (cardIdMap: Map<string, string>, CARDS: SyncedCard[]) => PoolEntry[];
}

// Shorthand set groups
const SV_SETS   = ["sv1","sv2","sv3","sv3pt5","sv4"];
const SWSH_SETS = ["swsh6","swsh7","swsh8","swsh9","swsh10","swsh11","swsh12","swsh12pt5"];
const ALL_SETS  = [...SV_SETS, ...SWSH_SETS];
const COMMONS_UNCOMMONS = ["COMMON","UNCOMMON"];
const ALL_RARE  = ["RARE","DOUBLE_RARE","ILLUSTRATION_RARE","ULTRA_RARE","HYPER_RARE",
                   "SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"];

const PACKS: PackDef[] = [

  // ── ENTRY TIER (€1–€5) ─────────────────────────────────────────────────────

  {
    slug:"pokemon-starter", name:"Pokémon Starter Pack", category:"pokemon",
    description:"El pack perfecto para empezar. Cartas de todos los sets actuales.",
    price:1, houseEdge:40, cardsPerOpening:3, isFeatured:false, sortOrder:50, imageUrl:P("starter"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["sv3pt5"],       ["COMMON"],   9000),
      ...bySetRarity(cm, C, ["sv3pt5"],       ["UNCOMMON"], 2000),
      ...bySetRarity(cm, C, ["sv1","sv2"],    ["COMMON"],   3000),
      ...bySetRarity(cm, C, ["sv3"],          ["COMMON"],   3000),
      ...bySetRarity(cm, C, ["sv3pt5"],       ["RARE"],      200),
    ]),
  },

  {
    slug:"paldea-basics", name:"Paldea Basics", category:"pokemon",
    description:"Explora la región de Paldea con sus cartas básicas.",
    price:2, houseEdge:38, cardsPerOpening:4, isFeatured:false, sortOrder:51, imageUrl:P("scarlet"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["sv1","sv2"],    ["COMMON"],   8000),
      ...bySetRarity(cm, C, ["sv1","sv2"],    ["UNCOMMON"], 3000),
      ...bySetRarity(cm, C, ["sv3","sv4"],    ["COMMON"],   4000),
      ...bySetRarity(cm, C, ["sv3","sv4"],    ["UNCOMMON"], 2000),
      ...bySetRarity(cm, C, ["sv1","sv2"],    ["RARE"],      500),
      ...bySetRarity(cm, C, ["sv1","sv2"],    ["DOUBLE_RARE"], 30),
    ]),
  },

  {
    slug:"electric-surge", name:"Electric Surge ⚡", category:"pokemon",
    description:"Pikachu, Raichu, Jolteon y todos los Pokémon eléctricos.",
    price:3, houseEdge:35, cardsPerOpening:5, isFeatured:false, sortOrder:45, imageUrl:P("electric"),
    buildPool: (cm, C) => merge([
      ...byName(cm, C, ["pikachu","raichu","jolteon","zapdos","ampharos","raikou",
        "manectric","electivire","rotom","zebstrika","dedenne","heliolisk",
        "boltund","morpeko","regieleki","miraidon","iron hands"], 4000),
      ...bySetRarity(cm, C, ["sv3pt5","swsh12pt5"], ["COMMON","UNCOMMON"], 5000),
      ...bySetRarity(cm, C, ["sv3pt5"],             ["RARE","DOUBLE_RARE"], 800),
      ...bySetRarity(cm, C, ["swsh12pt5"],          ["ILLUSTRATION_RARE","ULTRA_RARE"], 200),
      ...bySetRarity(cm, C, ["swsh12pt5"],          ["HYPER_RARE","SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"], 15),
    ]),
  },

  {
    slug:"fire-starter", name:"Fire Starters 🔥", category:"pokemon",
    description:"Todos los iniciales de fuego: Charmander, Cyndaquil, Torchic y más.",
    price:4, houseEdge:35, cardsPerOpening:5, isFeatured:false, sortOrder:46, imageUrl:P("fire"),
    buildPool: (cm, C) => merge([
      ...byName(cm, C, ["charmander","charmeleon","charizard","cyndaquil","quilava","typhlosion",
        "torchic","combusken","blaziken","chimchar","monferno","infernape",
        "tepig","pignite","emboar","fennekin","braixen","delphox",
        "litten","torracat","incineroar","scorbunny","raboot","cinderace",
        "fuecoco","crocalor","skeledirge"], 4000),
      ...bySetRarity(cm, C, ["sv3pt5","sv3"],        ["COMMON","UNCOMMON"], 5000),
      ...bySetRarity(cm, C, ["sv3"],                 ["RARE","DOUBLE_RARE"], 600),
      ...bySetRarity(cm, C, ["sv3"],                 ["ILLUSTRATION_RARE","ULTRA_RARE"], 150),
      ...bySetRarity(cm, C, ["sv3"],                 ["HYPER_RARE","SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"], 8),
    ]),
  },

  // ── STANDARD TIER (€8–€18) ─────────────────────────────────────────────────

  {
    slug:"151-collection", name:"Pokémon 151 Collection", category:"pokemon",
    description:"Los 151 originales en su colección definitiva. Todo puede aparecer.",
    price:8, houseEdge:33, cardsPerOpening:5, isFeatured:false, sortOrder:20, imageUrl:P("scarlet"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["sv3pt5"], ["COMMON"],                        12000),
      ...bySetRarity(cm, C, ["sv3pt5"], ["UNCOMMON"],                       5000),
      ...bySetRarity(cm, C, ["sv3pt5"], ["RARE"],                           1500),
      ...bySetRarity(cm, C, ["sv3pt5"], ["DOUBLE_RARE"],                     350),
      ...bySetRarity(cm, C, ["sv3pt5"], ["ILLUSTRATION_RARE"],               120),
      ...bySetRarity(cm, C, ["sv3pt5"], ["ULTRA_RARE"],                       30),
      ...bySetRarity(cm, C, ["sv3pt5"], ["HYPER_RARE"],                        7),
      ...bySetRarity(cm, C, ["sv3pt5"], ["SPECIAL_ILLUSTRATION_RARE"],         2),
      ...bySetRarity(cm, C, ["sv3pt5"], ["SECRET_RARE","GOD_HIT"],           0.5),
    ]),
  },

  {
    slug:"obsidian-flames", name:"Obsidian Flames", category:"pokemon",
    description:"Charizard de fuego oscuro. La expansión más buscada de Escarlata.",
    price:12, houseEdge:30, cardsPerOpening:5, isFeatured:true, sortOrder:8, imageUrl:P("fire"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["sv3"], ["COMMON"],                           10000),
      ...bySetRarity(cm, C, ["sv3"], ["UNCOMMON"],                          4000),
      ...bySetRarity(cm, C, ["sv3"], ["RARE"],                              1200),
      ...bySetRarity(cm, C, ["sv3"], ["DOUBLE_RARE"],                        350),
      ...bySetRarity(cm, C, ["sv3"], ["ILLUSTRATION_RARE"],                  120),
      ...bySetRarity(cm, C, ["sv3"], ["ULTRA_RARE"],                          30),
      ...bySetRarity(cm, C, ["sv3"], ["HYPER_RARE"],                           8),
      ...bySetRarity(cm, C, ["sv3"], ["SPECIAL_ILLUSTRATION_RARE"],            2.5),
      ...bySetRarity(cm, C, ["sv3"], ["SECRET_RARE","GOD_HIT"],               0.4),
    ]),
  },

  {
    slug:"scarlet-violet-base", name:"Scarlet & Violet Base", category:"pokemon",
    description:"El comienzo de una nueva era. Koraidon y Miraidon te esperan.",
    price:10, houseEdge:32, cardsPerOpening:5, isFeatured:true, sortOrder:7, imageUrl:P("scarlet"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["sv1"], ["COMMON"],                           10000),
      ...bySetRarity(cm, C, ["sv1"], ["UNCOMMON"],                          4000),
      ...bySetRarity(cm, C, ["sv1"], ["RARE"],                              1200),
      ...bySetRarity(cm, C, ["sv1"], ["DOUBLE_RARE"],                        300),
      ...bySetRarity(cm, C, ["sv1"], ["ILLUSTRATION_RARE"],                  100),
      ...bySetRarity(cm, C, ["sv1"], ["ULTRA_RARE"],                          28),
      ...bySetRarity(cm, C, ["sv1"], ["HYPER_RARE"],                           7),
      ...bySetRarity(cm, C, ["sv1"], ["SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"], 1),
    ]),
  },

  {
    slug:"paldea-evolved", name:"Paldea Evolved", category:"pokemon",
    description:"Gardevoir, Gengar, Tinkaton. Los ex más poderosos de Paldea.",
    price:12, houseEdge:31, cardsPerOpening:5, isFeatured:false, sortOrder:9, imageUrl:P("scarlet"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["sv2"], ["COMMON"],                           10000),
      ...bySetRarity(cm, C, ["sv2"], ["UNCOMMON"],                          4000),
      ...bySetRarity(cm, C, ["sv2"], ["RARE"],                              1200),
      ...bySetRarity(cm, C, ["sv2"], ["DOUBLE_RARE"],                        320),
      ...bySetRarity(cm, C, ["sv2"], ["ILLUSTRATION_RARE"],                  100),
      ...bySetRarity(cm, C, ["sv2"], ["ULTRA_RARE"],                          25),
      ...bySetRarity(cm, C, ["sv2"], ["HYPER_RARE"],                           6),
      ...bySetRarity(cm, C, ["sv2"], ["SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"], 1),
    ]),
  },

  {
    slug:"silver-tempest", name:"Silver Tempest", category:"pokemon",
    description:"Lugia V vuelve. Alolan Vulpix, Ho-Oh y el legado de Galar.",
    price:15, houseEdge:30, cardsPerOpening:5, isFeatured:false, sortOrder:10, imageUrl:P("evolving"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["swsh12"],    ["COMMON"],                       9000),
      ...bySetRarity(cm, C, ["swsh12"],    ["UNCOMMON"],                     4000),
      ...bySetRarity(cm, C, ["swsh12"],    ["RARE"],                         1200),
      ...bySetRarity(cm, C, ["swsh12"],    ["DOUBLE_RARE"],                   300),
      ...bySetRarity(cm, C, ["swsh12"],    ["ILLUSTRATION_RARE"],             100),
      ...bySetRarity(cm, C, ["swsh12"],    ["ULTRA_RARE"],                     25),
      ...bySetRarity(cm, C, ["swsh12"],    ["HYPER_RARE"],                      7),
      ...bySetRarity(cm, C, ["swsh12"],    ["SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"], 1.2),
    ]),
  },

  {
    slug:"evolving-skies", name:"Evolving Skies", category:"pokemon",
    description:"Umbreon, Espeon, Glaceon, Rayquaza. Las cartas más buscadas del mundo.",
    price:18, houseEdge:29, cardsPerOpening:5, isFeatured:true, sortOrder:5, imageUrl:P("evolving"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["swsh7"],     ["COMMON"],                       8000),
      ...bySetRarity(cm, C, ["swsh7"],     ["UNCOMMON"],                     3500),
      ...bySetRarity(cm, C, ["swsh7"],     ["RARE"],                         1200),
      ...bySetRarity(cm, C, ["swsh7"],     ["DOUBLE_RARE"],                   350),
      ...bySetRarity(cm, C, ["swsh7"],     ["ILLUSTRATION_RARE"],             120),
      ...bySetRarity(cm, C, ["swsh7"],     ["ULTRA_RARE"],                     30),
      ...bySetRarity(cm, C, ["swsh7"],     ["HYPER_RARE"],                      9),
      ...bySetRarity(cm, C, ["swsh7"],     ["SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"], 1.5),
    ]),
  },

  {
    slug:"fusion-strike", name:"Fusion Strike", category:"pokemon",
    description:"Gengar VMAX, Mew VMAX. La fusión más explosiva de Galar.",
    price:14, houseEdge:30, cardsPerOpening:5, isFeatured:false, sortOrder:11, imageUrl:P("legendary"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["swsh8"],     ["COMMON"],                       9000),
      ...bySetRarity(cm, C, ["swsh8"],     ["UNCOMMON"],                     3800),
      ...bySetRarity(cm, C, ["swsh8"],     ["RARE"],                         1100),
      ...bySetRarity(cm, C, ["swsh8"],     ["DOUBLE_RARE"],                   300),
      ...bySetRarity(cm, C, ["swsh8"],     ["ILLUSTRATION_RARE"],              90),
      ...bySetRarity(cm, C, ["swsh8"],     ["ULTRA_RARE"],                     22),
      ...bySetRarity(cm, C, ["swsh8"],     ["HYPER_RARE"],                      6),
      ...bySetRarity(cm, C, ["swsh8"],     ["SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"], 0.8),
    ]),
  },

  {
    slug:"paradox-rift", name:"Paradox Rift", category:"pokemon",
    description:"Roaring Moon, Iron Valiant. El pasado y el futuro en tus manos.",
    price:16, houseEdge:30, cardsPerOpening:5, isFeatured:false, sortOrder:12, imageUrl:P("scarlet"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, ["sv4"],       ["COMMON"],                       9500),
      ...bySetRarity(cm, C, ["sv4"],       ["UNCOMMON"],                     4000),
      ...bySetRarity(cm, C, ["sv4"],       ["RARE"],                         1200),
      ...bySetRarity(cm, C, ["sv4"],       ["DOUBLE_RARE"],                   350),
      ...bySetRarity(cm, C, ["sv4"],       ["ILLUSTRATION_RARE"],             110),
      ...bySetRarity(cm, C, ["sv4"],       ["ULTRA_RARE"],                     28),
      ...bySetRarity(cm, C, ["sv4"],       ["HYPER_RARE"],                      7),
      ...bySetRarity(cm, C, ["sv4"],       ["SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"], 1),
    ]),
  },

  // ── PREMIUM TIER (€25–€75) ─────────────────────────────────────────────────

  {
    slug:"charizard-hunt", name:"Charizard Hunt 🔥", category:"pokemon",
    description:"El pack de Charizard. Desde Obsidian Flames hasta 151. Todas sus formas.",
    price:35, houseEdge:28, cardsPerOpening:5, isFeatured:true, sortOrder:3, imageUrl:P("charizard"),
    buildPool: (cm, C) => merge([
      // Charizard variants from all sets — highest priority
      ...byName(cm, C, ["charizard"], 8000),
      // Charmander line as filler
      ...byName(cm, C, ["charmander","charmeleon"], 3000),
      // Full OBF set (best Charizard set)
      ...bySetRarity(cm, C, ["sv3"], ["COMMON","UNCOMMON"],                  2000),
      ...bySetRarity(cm, C, ["sv3"], ["RARE","DOUBLE_RARE"],                  600),
      ...bySetRarity(cm, C, ["sv3"], ["ILLUSTRATION_RARE","ULTRA_RARE"],      200),
      ...bySetRarity(cm, C, ["sv3"], ["HYPER_RARE","SPECIAL_ILLUSTRATION_RARE"], 20),
      ...bySetRarity(cm, C, ["sv3"], ["SECRET_RARE","GOD_HIT"],                 2),
      // 151 Charizard
      ...bySetRarity(cm, C, ["sv3pt5"], ["ULTRA_RARE","HYPER_RARE"],          120),
      ...bySetRarity(cm, C, ["sv3pt5"], ["SPECIAL_ILLUSTRATION_RARE","SECRET_RARE","GOD_HIT"], 8),
    ]),
  },

  {
    slug:"legendary-chase", name:"Legendary Chase ✨", category:"pokemon",
    description:"Mewtwo, Lugia, Rayquaza, Koraidon. Solo las cartas más épicas.",
    price:45, houseEdge:27, cardsPerOpening:5, isFeatured:true, sortOrder:4, imageUrl:P("legendary"),
    buildPool: (cm, C) => merge([
      // Legendary Pokémon by name
      ...byName(cm, C, ["mewtwo","mew","lugia","ho-oh","rayquaza","arceus","dialga",
        "palkia","giratina","xerneas","yveltal","solgaleo","lunala",
        "zacian","zamazenta","eternatus","calyrex","koraidon","miraidon",
        "iron valiant","roaring moon","iron hands"], 5000),
      // High-value Ultra Rares and above from all sets
      ...bySetRarity(cm, C, ALL_SETS,  ["ULTRA_RARE"],                       800),
      ...bySetRarity(cm, C, ALL_SETS,  ["HYPER_RARE"],                       250),
      ...bySetRarity(cm, C, ALL_SETS,  ["SPECIAL_ILLUSTRATION_RARE"],         80),
      ...bySetRarity(cm, C, ALL_SETS,  ["SECRET_RARE"],                       25),
      ...bySetRarity(cm, C, ALL_SETS,  ["GOD_HIT"],                            5),
      // Fill with valuable SWSH sets
      ...bySetRarity(cm, C, ["swsh7","swsh12","swsh12pt5"], ["DOUBLE_RARE","ILLUSTRATION_RARE"], 400),
    ]),
  },

  {
    slug:"pokemon-30th", name:"30th Anniversary 🎂", category:"pokemon",
    description:"Tres décadas de Pokémon. Las cartas más icónicas, de 151 a Paldea.",
    price:30, houseEdge:28, cardsPerOpening:5, isFeatured:true, sortOrder:6, imageUrl:P("anniversary"),
    buildPool: (cm, C) => merge([
      // Mostly 151 — the anniversary set
      ...bySetRarity(cm, C, ["sv3pt5"], ["COMMON","UNCOMMON"],               5000),
      ...bySetRarity(cm, C, ["sv3pt5"], ["RARE","DOUBLE_RARE"],              1200),
      ...bySetRarity(cm, C, ["sv3pt5"], ["ILLUSTRATION_RARE","ULTRA_RARE"],   350),
      ...bySetRarity(cm, C, ["sv3pt5"], ["HYPER_RARE","SPECIAL_ILLUSTRATION_RARE"], 40),
      ...bySetRarity(cm, C, ["sv3pt5"], ["SECRET_RARE","GOD_HIT"],             2),
      // Crown Zenith (Galarian Gallery = iconic art)
      ...bySetRarity(cm, C, ["swsh12pt5"], ["ILLUSTRATION_RARE","ULTRA_RARE","HYPER_RARE"], 200),
      // Evolving Skies (Eeveelution icons)
      ...bySetRarity(cm, C, ["swsh7"], ["DOUBLE_RARE","ILLUSTRATION_RARE","ULTRA_RARE"], 300),
      // SV sets
      ...bySetRarity(cm, C, ["sv1","sv2"], ["DOUBLE_RARE","ULTRA_RARE"],      200),
    ]),
  },

  {
    slug:"multi-set-premium", name:"Multi-Set Premium", category:"pokemon",
    description:"Lo mejor de todas las expansiones actuales en un solo sobre.",
    price:50, houseEdge:26, cardsPerOpening:5, isFeatured:false, sortOrder:13, imageUrl:P("sealed"),
    buildPool: (cm, C) => merge([
      // Double Rare + Illustration Rare from ALL sets
      ...bySetRarity(cm, C, SV_SETS,   ["DOUBLE_RARE","ILLUSTRATION_RARE"],  2000),
      ...bySetRarity(cm, C, SWSH_SETS, ["DOUBLE_RARE","ILLUSTRATION_RARE"],  1500),
      // Ultra Rare from all sets
      ...bySetRarity(cm, C, ALL_SETS,  ["ULTRA_RARE"],                        600),
      // Hyper Rare from all sets
      ...bySetRarity(cm, C, ALL_SETS,  ["HYPER_RARE"],                        180),
      // SIR
      ...bySetRarity(cm, C, ALL_SETS,  ["SPECIAL_ILLUSTRATION_RARE"],          50),
      // Secret / GOD
      ...bySetRarity(cm, C, ALL_SETS,  ["SECRET_RARE"],                        15),
      ...bySetRarity(cm, C, ALL_SETS,  ["GOD_HIT"],                             3),
    ]),
  },

  // ── HIGH ROLLER (€100–€500) ─────────────────────────────────────────────────

  {
    slug:"god-hit-pack", name:"God Hit Pack 🏆", category:"pokemon",
    description:"Solo lo mejor. Ultra Rare garantizado. ¿Saldrá el GOD HIT?",
    price:150, houseEdge:22, cardsPerOpening:5, isFeatured:true, sortOrder:1, imageUrl:P("god-hit"),
    buildPool: (cm, C) => merge([
      ...byRarity(cm, C, ["DOUBLE_RARE"],                                   10000),
      ...byRarity(cm, C, ["ULTRA_RARE"],                                     8000),
      ...byRarity(cm, C, ["ILLUSTRATION_RARE"],                              4000),
      ...byRarity(cm, C, ["HYPER_RARE"],                                      800),
      ...byRarity(cm, C, ["SPECIAL_ILLUSTRATION_RARE"],                       200),
      ...byRarity(cm, C, ["SECRET_RARE"],                                      50),
      ...byRarity(cm, C, ["GOD_HIT"],                                           8),
    ]),
  },

  {
    slug:"high-roller-250", name:"High Roller €250 💎", category:"pokemon",
    description:"Solo Ultra Rares y superiores. El EV más alto del catálogo.",
    price:250, houseEdge:20, cardsPerOpening:5, isFeatured:false, sortOrder:2, imageUrl:P("hr250"),
    buildPool: (cm, C) => merge([
      ...byRarity(cm, C, ["ULTRA_RARE"],                                     5000),
      ...byRarity(cm, C, ["ILLUSTRATION_RARE"],                              2000),
      ...byRarity(cm, C, ["HYPER_RARE"],                                      500),
      ...byRarity(cm, C, ["SPECIAL_ILLUSTRATION_RARE"],                       150),
      ...byRarity(cm, C, ["SECRET_RARE"],                                      40),
      ...byRarity(cm, C, ["GOD_HIT"],                                          10),
      ...byPrice(cm, C, 50, 99999,                                            300),
    ]),
  },

  {
    slug:"high-roller-500", name:"High Roller €500 👑", category:"pokemon",
    description:"El pack definitivo. SIR garantizado. Todo es posible.",
    price:500, houseEdge:18, cardsPerOpening:5, isFeatured:false, sortOrder:3, imageUrl:P("hr500"),
    buildPool: (cm, C) => merge([
      ...byRarity(cm, C, ["HYPER_RARE"],                                     3000),
      ...byRarity(cm, C, ["SPECIAL_ILLUSTRATION_RARE"],                      1500),
      ...byRarity(cm, C, ["SECRET_RARE"],                                     500),
      ...byRarity(cm, C, ["GOD_HIT"],                                         100),
      ...byPrice(cm, C, 80, 99999,                                            800),
      ...byPrice(cm, C, 200, 99999,                                           400),
    ]),
  },

  {
    slug:"chase-all-sets", name:"Chase All Sets ⭐", category:"pokemon",
    description:"Chase cards de TODAS las expansiones. Cada sobre es una aventura.",
    price:75, houseEdge:24, cardsPerOpening:5, isFeatured:true, sortOrder:0, imageUrl:P("legendary"),
    buildPool: (cm, C) => merge([
      ...bySetRarity(cm, C, SV_SETS,   ["ILLUSTRATION_RARE","DOUBLE_RARE"],  2000),
      ...bySetRarity(cm, C, SWSH_SETS, ["ILLUSTRATION_RARE","DOUBLE_RARE"],  1500),
      ...byRarity(cm, C, ["ULTRA_RARE"],                                      600),
      ...byRarity(cm, C, ["HYPER_RARE"],                                      150),
      ...byRarity(cm, C, ["SPECIAL_ILLUSTRATION_RARE"],                        40),
      ...byRarity(cm, C, ["SECRET_RARE"],                                      10),
      ...byRarity(cm, C, ["GOD_HIT"],                                         1.5),
    ]),
  },
];

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log("🌱 Seeding PokéVault v7…\n");

  // ── Load and validate cards.json ─────────────────────────────────────────────
  const CARDS = loadCards();
  console.log(`✓ Loaded ${CARDS.length} cards from cards.json\n`);

  // ── AppSettings ──────────────────────────────────────────────────────────────
  await prisma.appSettings.upsert({
    where:  { id: "singleton" },
    create: { id:"singleton", minDepositEur:1, maxDepositEur:10000, instantSellMargin:MARGIN,
      globalDailyPackLimit:0, priceSyncEnabled:false, priceSyncIntervalHours:24,
      preferredPriceSource:"CARDMARKET", maintenanceMode:false, allowNewRegistrations:true },
    update: { instantSellMargin:MARGIN },
  });
  console.log("✓ AppSettings");

  // ── Remove ALL legacy packs (including all-in-pack, all-in-mix, etc.) ────────
  // Delete any pack whose slug is NOT in our new PACKS list
  const newSlugs      = new Set(PACKS.map(p => p.slug));
  const legacyPacks   = await prisma.pack.findMany({
    where: { NOT: { slug: { in: [...newSlugs] } } },
    select: { id:true, slug:true },
  });
  if (legacyPacks.length) {
    const ids = legacyPacks.map(p => p.id);
    await prisma.packCardPool.deleteMany({ where: { packId: { in: ids } } });
    await prisma.pack.deleteMany({ where: { id: { in: ids } } });
    console.log(`✓ Removed ${legacyPacks.length} legacy pack(s): ${legacyPacks.map(p=>p.slug).join(", ")}`);
  } else {
    console.log("✓ No legacy packs to remove");
  }

  // ── Users ────────────────────────────────────────────────────────────────────
  const [ah, dh] = await Promise.all([bcrypt.hash("admin123456",12), bcrypt.hash("demo123456",12)]);
  for (const u of [
    { email:"admin@pokevault.local", username:"admin",        name:"Admin",        hash:ah, role:"ADMIN", bal:1000 },
    { email:"demo@pokevault.local",  username:"trainer_demo", name:"Demo Trainer", hash:dh, role:"USER",  bal:1000 },
  ]) {
    const ex = await prisma.user.findUnique({ where: { email:u.email } });
    if (ex) {
      await prisma.user.update({ where:{ email:u.email }, data:{ passwordHash:u.hash, role:u.role } });
      await prisma.wallet.upsert({ where:{ userId:ex.id }, create:{ userId:ex.id, balance:u.bal, currency:"EUR" }, update:{} });
    } else {
      const usr = await prisma.user.create({ data:{ email:u.email, username:u.username, name:u.name, passwordHash:u.hash, role:u.role } });
      await prisma.wallet.create({ data:{ userId:usr.id, balance:u.bal, currency:"EUR" } });
    }
    console.log(`  ↻/+ ${u.email}`);
  }
  console.log("✓ Users");

  const now = new Date();

  // ==========================================================================
  // STEP 0 — Delete cards with fake setCode or non-TCG imageUrl
  // ==========================================================================
  console.log("\n🗑️  Removing legacy/fake cards…");
  const realSetCodes = new Set(CARDS.map(c => c.setCode));
  const allDb = await prisma.card.findMany({ select:{ id:true, setCode:true, imageUrl:true } });
  const toDelete = allDb
    .filter(c => !realSetCodes.has(c.setCode) || !c.imageUrl.startsWith("https://images.pokemontcg.io"))
    .map(c => c.id);

  if (toDelete.length) {
    await prisma.packCardPool.deleteMany({ where:{ cardId:{ in:toDelete } } });
    await prisma.packOpeningCard.deleteMany({ where:{ cardId:{ in:toDelete } } });
    await prisma.instantSell.deleteMany({ where:{ cardId:{ in:toDelete } } });
    await prisma.inventoryItem.deleteMany({ where:{ cardId:{ in:toDelete } } });
    await prisma.physicalRedemption.deleteMany({ where:{ cardId:{ in:toDelete } } });
    await prisma.cardPriceHistory.deleteMany({ where:{ cardId:{ in:toDelete } } });
    await prisma.card.deleteMany({ where:{ id:{ in:toDelete } } });
    console.log(`  Deleted ${toDelete.length} legacy rows`);
  } else {
    console.log("  None found");
  }

  // ==========================================================================
  // STEP 1 — Repair imageUrl for existing cards
  // ==========================================================================
  console.log("\n📸 Repairing existing cards…");
  let repaired = 0;
  for (const c of CARDS) {
    const ip = parseFloat((c.marketPrice * MARGIN).toFixed(2));
    const r  = await prisma.card.updateMany({
      where: { setCode:c.setCode, cardNumber:c.cardNumber },
      data:  {
        name:c.name, rarity:c.rarity, setName:c.setName, imageUrl:c.imageUrl,
        currentPrice:c.marketPrice, priceCurrency:"EUR", priceSource:c.priceSource,
        priceLastSyncedAt:now, priceUpdatedAt:now,
        cardmarketUrl:c.cardmarketUrl ?? null, instantSellPrice:ip,
      },
    });
    repaired += r.count;
  }
  console.log(`✓ ${repaired} rows repaired`);

  // ==========================================================================
  // STEP 2 — Normalise externalId
  // ==========================================================================
  console.log("\n🔑 Normalising externalIds…");
  let normalised = 0;
  const dbCards = await prisma.card.findMany({ select:{ id:true, setCode:true, cardNumber:true, externalId:true } });
  for (const row of dbCards) {
    const correct = `${row.setCode}-${row.cardNumber}`;
    if (row.externalId === correct) continue;
    const conflict = await prisma.card.findUnique({ where:{ externalId:correct } });
    if (!conflict) {
      await prisma.card.update({ where:{ id:row.id }, data:{ externalId:correct } });
      normalised++;
    }
  }
  console.log(`✓ ${normalised} normalised`);

  // ==========================================================================
  // STEP 3 — Upsert cards
  // ==========================================================================
  console.log("\n🃏 Upserting cards…");
  const cardIdMap = new Map<string, string>();
  const seen      = new Set<string>();
  let   upserted  = 0;

  for (const c of CARDS) {
    const key = `${c.setCode}-${c.cardNumber}`;
    if (seen.has(key)) {
      const ex = await prisma.card.findFirst({ where:{ setCode:c.setCode, cardNumber:c.cardNumber }, select:{ id:true } });
      if (ex) cardIdMap.set(key, ex.id);
      continue;
    }
    seen.add(key);

    const ip = parseFloat((c.marketPrice * MARGIN).toFixed(2));
    const card = await prisma.card.upsert({
      where:  { setCode_cardNumber:{ setCode:c.setCode, cardNumber:c.cardNumber } },
      create: {
        externalId:key, name:c.name, rarity:c.rarity, setCode:c.setCode, setName:c.setName,
        cardNumber:c.cardNumber, imageUrl:c.imageUrl, currentPrice:c.marketPrice,
        priceCurrency:"EUR", priceSource:c.priceSource, priceLastSyncedAt:now, priceUpdatedAt:now,
        cardmarketUrl:c.cardmarketUrl ?? null, instantSellPrice:ip, isActive:true,
      },
      update: {
        externalId:key, name:c.name, rarity:c.rarity, setName:c.setName, imageUrl:c.imageUrl,
        currentPrice:c.marketPrice, priceCurrency:"EUR", priceSource:c.priceSource,
        priceLastSyncedAt:now, priceUpdatedAt:now,
        cardmarketUrl:c.cardmarketUrl ?? null, instantSellPrice:ip,
      },
    });
    cardIdMap.set(key, card.id);
    upserted++;
  }
  console.log(`✓ ${upserted} cards upserted, ${cardIdMap.size} in map`);

  // ==========================================================================
  // STEP 4 — Validate cards before building pools
  // ==========================================================================
  console.log("\n🔍 Validating cards…");

  if (cardIdMap.size < MIN_CARDS) {
    throw new Error(
      `Only ${cardIdMap.size} cards in DB (minimum: ${MIN_CARDS}).\n` +
      "Re-run: npx tsx prisma/sync-cards.ts"
    );
  }

  const badCards = await prisma.card.findMany({
    where: { OR:[
      { imageUrl:{ contains:"placehold.co" } },
      { imageUrl:{ not:{ startsWith:"https://images.pokemontcg.io" } } },
      { currentPrice:{ lte:0 } },
    ]},
    select: { name:true, setCode:true, cardNumber:true, imageUrl:true, currentPrice:true },
  });
  if (badCards.length) {
    console.error(`\n❌ ${badCards.length} bad cards:`);
    badCards.slice(0,10).forEach(c => console.error(`  [${c.setCode}/${c.cardNumber}] ${c.name}: ${c.imageUrl} €${c.currentPrice}`));
    throw new Error(`${badCards.length} invalid cards`);
  }

  const tcgCount = await prisma.card.count({ where:{ imageUrl:{ startsWith:"https://images.pokemontcg.io" } } });
  const totCount = await prisma.card.count();
  console.log(`  ✓ ${tcgCount}/${totCount} cards have real TCG images`);
  console.log(`  ✓ No placehold.co`);
  console.log(`  ✓ No zero prices`);

  // ==========================================================================
  // STEP 5 — Build packs + pools
  // ==========================================================================
  console.log("\n📦 Seeding packs…");

  async function rebuildPool(packId: string, entries: PoolEntry[]): Promise<number> {
    await prisma.packCardPool.deleteMany({ where:{ packId } });

    // Deduplicate by cardId, summing weights
    const byCardId = new Map<string, number>();
    for (const [sc, cn, w] of entries) {
      const weight = Math.round(w);
      if (weight <= 0) continue;
      const cardId = cardIdMap.get(`${sc}-${cn}`);
      if (!cardId) continue;
      byCardId.set(cardId, (byCardId.get(cardId) ?? 0) + weight);
    }

    for (const [cardId, dropWeight] of byCardId) {
      await prisma.packCardPool.create({ data:{ packId, cardId, dropWeight } });
    }
    return byCardId.size;
  }

  const packImgMap = new Map(PACKS.map(p => [p.slug, p.imageUrl]));
  let   newPacks   = 0;

  for (const def of PACKS) {
    const poolEntries = def.buildPool(cardIdMap, CARDS);
    const poolSize    = new Set(poolEntries.map(([sc,cn]) => `${sc}-${cn}`)).size;

    if (poolSize < MIN_POOL_SIZE) {
      console.warn(`  ⚠ ${def.slug}: pool has only ${poolSize} unique cards (min ${MIN_POOL_SIZE}) — SKIPPING`);
      continue;
    }

    const existing = await prisma.pack.findUnique({ where:{ slug:def.slug } });
    if (existing) {
      await prisma.pack.update({ where:{ slug:def.slug }, data:{
        name:def.name, price:def.price, status:"ACTIVE", imageUrl:def.imageUrl,
      }});
      const n = await rebuildPool(existing.id, poolEntries);
      console.log(`  ↻ ${def.slug.padEnd(25)} ${n} pool entries`);
      continue;
    }

    const pack = await prisma.pack.create({ data:{
      slug:def.slug, name:def.name, description:def.description,
      imageUrl:def.imageUrl, category:def.category,
      price:def.price, houseEdgePercent:def.houseEdge,
      cardsPerOpening:def.cardsPerOpening, status:"ACTIVE",
      isFeatured:def.isFeatured, sortOrder:def.sortOrder,
    }});
    const n = await rebuildPool(pack.id, poolEntries);
    newPacks++;
    console.log(`  + ${def.name.padEnd(30)} €${def.price} — ${n} pool entries`);
  }
  console.log(`\n✓ Packs: ${newPacks} new`);

  // Repair stale pack images
  const badPackImgs = await prisma.pack.findMany({
    where: { NOT:{ imageUrl:{ startsWith:"/" } } }, select:{ id:true, slug:true },
  });
  for (const p of badPackImgs) {
    await prisma.pack.update({ where:{ id:p.id }, data:{ imageUrl: packImgMap.get(p.slug) ?? "/packs/fallback-pack.png" } });
    console.log(`  Repaired: ${p.slug}`);
  }

  // ==========================================================================
  // STEP 6 — Final validation
  // ==========================================================================
  console.log("\n🔍 Final validation…");

  const emptyPools = await prisma.pack.findMany({
    where: { status:"ACTIVE", cardPool:{ none:{} } }, select:{ slug:true },
  });
  if (emptyPools.length) throw new Error(`Empty pools: ${emptyPools.map(p=>p.slug).join(", ")}`);

  const zeroW = await prisma.packCardPool.count({ where:{ dropWeight:{ lte:0 } } });
  if (zeroW) throw new Error(`${zeroW} PackCardPool entries with dropWeight ≤ 0`);

  const activePacks = await prisma.pack.findMany({
    where: { status:"ACTIVE" },
    include: { _count: { select: { cardPool: true } } },
  });
  const tooSmall = activePacks.filter(p => p._count.cardPool < MIN_POOL_SIZE);
  if (tooSmall.length) {
    throw new Error(`${tooSmall.length} packs have < ${MIN_POOL_SIZE} pool entries: ${tooSmall.map(p=>`${p.slug}(${p._count.cardPool})`).join(", ")}`);
  }

  console.log(`  ✓ No empty pools`);
  console.log(`  ✓ No zero-weight entries`);
  console.log(`  ✓ All active packs have ≥ ${MIN_POOL_SIZE} pool entries`);
  console.log(`  ✓ Active packs: ${activePacks.length}`);

  if (activePacks.length < 10) {
    console.warn(`  ⚠ Only ${activePacks.length} active packs — some were skipped due to small pools.`);
    console.warn(`    Check that sync-cards.ts fetched enough cards for all sets.`);
  }

  // Demo opening
  const demo = await prisma.user.findUnique({ where:{ email:"demo@pokevault.local" } });
  if (demo) {
    const cnt = await prisma.packOpening.count({ where:{ userId:demo.id } });
    if (!cnt) {
      const wallet = await prisma.wallet.findUnique({ where:{ userId:demo.id } });
      const pack   = await prisma.pack.findFirst({ where:{ status:"ACTIVE" } });
      if (wallet && pack) {
        const tx = await prisma.walletTransaction.create({ data:{
          walletId:wallet.id, userId:demo.id, type:"PACK_PURCHASE", status:"COMPLETED",
          amount:-pack.price, balanceBefore:Number(wallet.balance), balanceAfter:Number(wallet.balance)-pack.price,
          description:`Demo: ${pack.name}`, metadata:"{}",
        }});
        const topCards = await prisma.card.findMany({
          where: { rarity:{ in:["HYPER_RARE","SECRET_RARE","GOD_HIT"] } }, take:3,
        });
        if (topCards.length) {
          await prisma.packOpening.create({ data:{
            userId:demo.id, packId:pack.id, walletTransactionId:tx.id,
            pricePaid:pack.price, serverSeed:"demo", serverSeedHash:"demo_hash",
            clientSeed:"demo_client", revealed:true,
            cards:{ create: topCards.map((c,i) => ({
              cardId:c.id, position:i+1,
              marketPriceAtDrop:c.currentPrice, instantSellPriceAtDrop:c.instantSellPrice,
            }))},
          }});
          console.log("✓ Demo opening created");
        }
      }
    }
  }

  const ft = await prisma.card.count();
  const fp = await prisma.pack.count({ where:{ status:"ACTIVE" } });
  const fi = await prisma.card.count({ where:{ imageUrl:{ startsWith:"https://images.pokemontcg.io" } } });

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Seed complete!

  Admin:  admin@pokevault.local / admin123456
  Demo:   demo@pokevault.local  / demo123456

  Cards:  ${ft} (${fi} with real TCG images)
  Packs:  ${fp} active  (all with ≥ ${MIN_POOL_SIZE} pool entries)

  Card.imageUrl  → https://images.pokemontcg.io/ ✓
  Pack.imageUrl  → /packs/*.png                  ✓
  placehold.co   → 0                             ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .catch(e => { console.error("\n❌ Seed failed:", e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
