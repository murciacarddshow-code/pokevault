# Generate all pack SVGs programmatically
import os

PACKS = [
    # (filename, title, subtitle, color1, color2, accent, symbol)
    ("starter",     "STARTER",     "PACK",         "#27AE60", "#0d2818", "#4FFFB4",  "⬡"),
    ("electric",    "ELECTRIC",    "PACK",         "#F1C40F", "#1a1200", "#FFE066",  "⚡"),
    ("fire",        "FIRE",        "PACK",         "#E74C3C", "#1a0500", "#FF6B6B",  "🔥"),
    ("scarlet",     "SCARLET &",   "VIOLET",       "#9B59B6", "#0d0515", "#D4A8FF",  "◈"),
    ("evolving",    "EVOLVING",    "SKIES",        "#27AE60", "#051308", "#7DFFB4",  "◆"),
    ("onepiece",    "ONE PIECE",   "TREASURE",     "#E74C3C", "#1a0505", "#FF9F9F",  "⚓"),
    ("pirate",      "PIRATE",      "KING",         "#8E44AD", "#0d0518", "#C39BD3",  "☠"),
    ("anniversary", "30TH",        "ANNIVERSARY",  "#FFD700", "#1a1400", "#FFE566",  "★"),
    ("charizard",   "CHARIZARD",   "HUNT",         "#E74C3C", "#1a0300", "#FF8C66",  "◉"),
    ("legendary",   "LEGENDARY",   "CHASE",        "#9B59B6", "#0d0518", "#B44FFF",  "✦"),
    ("sealed",      "SEALED",      "PREMIUM",      "#2C3E50", "#05080d", "#4FC3FF",  "▣"),
    ("god-hit",     "GOD HIT",     "PACK",         "#FFD700", "#1a1000", "#FFF066",  "⬟"),
    ("hr250",       "HIGH ROLLER", "€250",         "#E74C3C", "#1a0505", "#FF6666",  "◈"),
    ("hr500",       "HIGH ROLLER", "€500",         "#FFD700", "#1a1200", "#FFE833",  "✦"),
    ("allin",       "ALL-IN",      "MIX",          "#4FC3FF", "#05101a", "#9BE8FF",  "◇"),
]

TEMPLATE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <defs>
    <linearGradient id="bg{idx}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{dark};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#05050f;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="card{idx}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{c1};stop-opacity:0.9"/>
      <stop offset="100%" style="stop-color:{c2};stop-opacity:0.5"/>
    </linearGradient>
    <filter id="f{idx}"><feGaussianBlur stdDeviation="15"/></filter>
    <filter id="g{idx}">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="300" height="420" fill="url(#bg{idx})" rx="16"/>
  <!-- Glow -->
  <ellipse cx="150" cy="180" rx="110" ry="130" fill="{c1}" filter="url(#f{idx})" opacity="0.25"/>
  <!-- Outer border -->
  <rect x="2" y="2" width="296" height="416" fill="none" stroke="{c1}" stroke-width="1.5" rx="15" opacity="0.7"/>
  <!-- Inner border -->
  <rect x="8" y="8" width="284" height="404" fill="none" stroke="{c2}" stroke-width="0.5" rx="12" opacity="0.35"/>
  <!-- Top decorative line -->
  <rect x="20" y="28" width="260" height="1" fill="{c1}" opacity="0.3"/>
  <!-- Bottom decorative line -->
  <rect x="20" y="390" width="260" height="1" fill="{c1}" opacity="0.3"/>
  <!-- Center symbol -->
  <text x="150" y="215" text-anchor="middle" font-size="88" fill="{c1}" opacity="0.12" font-family="Arial">{sym}</text>
  <!-- Hexagon grid pattern -->
  <circle cx="150" cy="180" r="72" fill="none" stroke="{c1}" stroke-width="0.8" opacity="0.15" stroke-dasharray="4,4"/>
  <circle cx="150" cy="180" r="50" fill="none" stroke="{c2}" stroke-width="0.5" opacity="0.2"/>
  <circle cx="150" cy="180" r="28" fill="none" stroke="{c1}" stroke-width="1" opacity="0.25"/>
  <!-- Center dot -->
  <circle cx="150" cy="180" r="8" fill="{c1}" opacity="0.3"/>
  <!-- Cross lines -->
  <line x1="78" y1="180" x2="222" y2="180" stroke="{c1}" stroke-width="0.5" opacity="0.2"/>
  <line x1="150" y1="108" x2="150" y2="252" stroke="{c1}" stroke-width="0.5" opacity="0.2"/>
  <!-- Corner marks -->
  <text x="20" y="22" font-size="10" fill="{c1}" opacity="0.4" font-family="monospace">{sym}</text>
  <text x="270" y="22" font-size="10" fill="{c1}" opacity="0.4" font-family="monospace">{sym}</text>
  <text x="20" y="412" font-size="10" fill="{c1}" opacity="0.4" font-family="monospace">{sym}</text>
  <text x="270" y="412" font-size="10" fill="{c1}" opacity="0.4" font-family="monospace">{sym}</text>
  <!-- Title -->
  <text x="150" y="315" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="22" font-weight="900" fill="{c2}" filter="url(#g{idx})" letter-spacing="1.5">{title}</text>
  <text x="150" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="{c1}" letter-spacing="5" opacity="0.85">{sub}</text>
  <!-- Brand -->
  <text x="150" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="{c2}" opacity="0.4" letter-spacing="3">POKÉVAULT</text>
  <!-- Shine effect -->
  <rect x="12" y="12" width="60" height="396" fill="white" opacity="0.018" rx="8"/>
</svg>
'''

for i, (fname, title, sub, c1, dark, c2, sym) in enumerate(PACKS):
    svg = TEMPLATE.format(idx=i, c1=c1, dark=dark, c2=c2, sym=sym, title=title, sub=sub)
    path = f"/home/claude/pokevault/public/packs/{fname}.svg"
    with open(path, 'w') as f:
        f.write(svg)

print(f"Generated {len(PACKS)} pack SVGs")
