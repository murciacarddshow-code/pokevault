# PokéVault — Pack Image Generation Guide

## Format specs
- Size: 400×560px (2:2.8 ratio, vertical)  
- Format: WebP with transparency preferred, PNG accepted
- Style: Premium gacha/trading card booster pack, photorealistic 3D render
- Background: Transparent or very dark (will be composited in UI)

## Base prompt (add to ALL packs)
```
Single vertical Pokemon booster pack product photo, 3D render, photorealistic, 
holographic foil texture, glossy plastic wrap with realistic wrinkles and light 
reflections, premium collectible trading card game pack, dark background with 
atmospheric glow, isolated product shot, ultra detailed, 8k quality, 
studio lighting, subsurface scattering on plastic wrap
```

---

## Individual pack prompts

### god-hit-pack.webp
```
Single vertical Pokemon booster pack, GOD HIT PACK, black and gold premium 
holographic foil, intense radiant golden aura, glowing crown symbol, 
ultra-rare luxury collectible, dark dramatic lighting, light rays, 
divine glow effect, metallic gold texture, premium gacha pack
[base prompt]
```

### evolving-skies.webp  
```
Single vertical Pokemon booster pack, Evolving Skies expansion, 
blue and purple gradient foil, Umbreon silhouette glowing purple eyes, 
Rayquaza flying in background, rainbow holographic shimmer, 
constellation and sky theme, atmospheric clouds
[base prompt]
```

### scarlet-violet-base.webp
```
Single vertical Pokemon booster pack, Scarlet and Violet base set,
scarlet red and violet purple split gradient foil, Koraidon and Miraidon 
silhouettes facing each other, ancient meets futuristic theme,
dramatic split lighting, electric energy between the two legendaries
[base prompt]
```

### charizard-hunt.webp
```
Single vertical Pokemon booster pack, Charizard Hunt pack,
deep orange and red fire gradient foil, Charizard fire breathing 
silhouette dominating the pack art, intense flame glow, 
ember particles, obsidian black background, heat distortion effect
[base prompt]
```

### legendary-chase.webp
```
Single vertical Pokemon booster pack, Legendary Chase pack,
deep purple and cosmic blue gradient foil, multiple legendary Pokemon 
silhouettes (Mewtwo, Lugia, Rayquaza) emerging from darkness,
cosmic energy, star field, epic scale, divine light rays
[base prompt]
```

### electric-surge.webp
```
Single vertical Pokemon booster pack, Electric Surge pack,
electric yellow and white gradient foil, Pikachu lightning bolt theme,
crackling electricity on pack surface, neon yellow glow,
storm clouds, lightning strike effect, charged plasma energy
[base prompt]
```

### obsidian-flames.webp
```
Single vertical Pokemon booster pack, Obsidian Flames expansion,
black and dark crimson gradient foil, dark Charizard silhouette 
with black flames, obsidian crystal texture, ember and ash particles,
ominous atmospheric glow, volcanic smoke
[base prompt]
```

### evolving-skies.webp
```
[same as above]
```

### silver-tempest.webp
```
Single vertical Pokemon booster pack, Silver Tempest expansion,
silver and steel blue gradient foil, Lugia silhouette soaring through 
silver storm clouds, lightning and silver rain, holographic silver foil,
tempest wind effects, dramatic storm lighting
[base prompt]
```

### paldea-evolved.webp
```
Single vertical Pokemon booster pack, Paldea Evolved expansion,
deep violet and emerald gradient foil, Gardevoir glowing silhouette,
fairy energy sparkles, evolved form energy release,
Paldea region architecture in background, magical shimmer
[base prompt]
```

### fusion-strike.webp
```
Single vertical Pokemon booster pack, Fusion Strike expansion,
pink and neon magenta gradient foil, Mew and Gengar VMAX silhouettes,
fusion energy swirling, neon pink glow, dark atmospheric background,
psychic energy waves, comic-style speed lines
[base prompt]
```

### pokemon-30th.webp
```
Single vertical Pokemon booster pack, 30th Anniversary collector edition,
gold and platinum gradient foil, original 151 Pokemon silhouettes mosaic,
celebration confetti and sparkles, anniversary seal embossed,
premium commemorative collector pack, prestige gold foil texture
[base prompt]
```

### high-roller-250.webp
```
Single vertical Pokemon booster pack, High Roller 250 pack,
black and deep crimson premium foil, diamond pattern emboss,
playing card ace and crown motifs, casino luxury aesthetic,
velvet and gold trim, VIP exclusive pack feel, rich dramatic lighting
[base prompt]
```

### high-roller-500.webp
```
Single vertical Pokemon booster pack, High Roller 500 pack,
obsidian black and 24k gold ultra premium foil, crown and trophy,
diamond encrusted texture, platinum shine, ultra luxury VIP,
God-tier collectible, dark opulent lighting, maximum prestige
[base prompt]
```

### multi-set-premium.webp
```
Single vertical Pokemon booster pack, Multi Set Premium pack,
rainbow holographic foil, multiple expansion logos visible,
prismatic light refraction, collector's edition feel, 
all-in-one premium selection, spectrum glow effect
[base prompt]
```

### paradox-rift.webp
```
Single vertical Pokemon booster pack, Paradox Rift expansion,
temporal rift purple and crimson foil, past and future Pokemon 
silhouettes (Roaring Moon, Iron Valiant), time distortion visual effect,
fractured space-time on pack surface, paradox energy waves
[base prompt]
```

### pokemon-starter.webp
```
Single vertical Pokemon booster pack, Starter Pack, 
green and blue gradient foil, Bulbasaur Charmander Squirtle silhouettes,
beginner friendly bright colors, clean design, welcoming atmosphere,
starter trio energy, friendly glow
[base prompt]
```

### paldea-basics.webp
```
Single vertical Pokemon booster pack, Paldea Basics pack,
purple and teal gradient foil, Paldea region landscape silhouette,
entry-level pack design, Sprigatito Fuecoco Quaxly silhouettes,
vibrant colors, accessible design
[base prompt]
```

### fire-starter.webp
```
Single vertical Pokemon booster pack, Fire Starters pack,
orange and deep red gradient foil, all fire starters silhouettes 
from Charmander to Fuecoco, fire element energy, warm glow,
flame particle effects, fire trainer theme
[base prompt]
```

### 151-collection.webp
```
Single vertical Pokemon booster pack, 151 Collection pack,
gold and nostalgic warm gradient foil, original 151 Pokedex number emboss,
Pikachu and Mewtwo silhouettes, retro-modern fusion design,
vintage feel with premium modern finish, original era nostalgia
[base prompt]
```

### chase-all-sets.webp
```
Single vertical Pokemon booster pack, Chase All Sets pack,
rainbow shifting holographic foil, silhouettes from every major set,
collector ultimate pack, prismatic rainbow light, 
every rarity represented, ultimate opening experience
[base prompt]
```

---

## Recommended AI tools (in order of quality)

1. **Midjourney v6** (best quality) — paste prompt in Discord
2. **Adobe Firefly** — good product renders  
3. **DALL-E 3** (via ChatGPT Plus) — reliable consistency
4. **Stable Diffusion XL** + LoRA for product renders

## After generating

Place each file in: `public/packs/{slug}.webp`

The app will automatically use them — no code changes needed.
If a file is missing, it falls back to the CSS placeholder.

## File naming
```
public/packs/god-hit-pack.webp
public/packs/evolving-skies.webp  
public/packs/scarlet-violet-base.webp
public/packs/charizard-hunt.webp
public/packs/legendary-chase.webp
public/packs/electric-surge.webp
public/packs/obsidian-flames.webp
public/packs/silver-tempest.webp
public/packs/paldea-evolved.webp
public/packs/fusion-strike.webp
public/packs/pokemon-30th.webp
public/packs/high-roller-250.webp
public/packs/high-roller-500.webp
public/packs/multi-set-premium.webp
public/packs/paradox-rift.webp
public/packs/pokemon-starter.webp
public/packs/paldea-basics.webp
public/packs/fire-starter.webp
public/packs/151-collection.webp
public/packs/chase-all-sets.webp
```
