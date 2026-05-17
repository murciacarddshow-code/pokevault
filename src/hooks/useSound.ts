// =============================================================================
// hooks/useSound.ts  v2
// File-first audio system with Web Audio API synthesis fallback.
// Drop real MP3 files in /public/sounds/ — they take priority automatically.
// Falls back to procedural synthesis so nothing breaks without assets.
// =============================================================================

export type SoundEffect =
  | "pack_woosh"
  | "pack_shake"
  | "pack_open"
  | "card_flip"
  | "card_rare"
  | "card_epic"
  | "card_ultra"
  | "card_god"
  | "fakeout"
  | "big_hit"
  | "sell"
  | "coin"
  | "keep"
  | "hover";

const SOUND_FILES: Record<SoundEffect, string> = {
  pack_woosh:  "/sounds/pack_woosh.mp3",
  pack_shake:  "/sounds/pack_shake.mp3",
  pack_open:   "/sounds/pack_open.mp3",
  card_flip:   "/sounds/card_flip.mp3",
  card_rare:   "/sounds/card_rare.mp3",
  card_epic:   "/sounds/card_epic.mp3",
  card_ultra:  "/sounds/card_ultra.mp3",
  card_god:    "/sounds/card_god.mp3",
  fakeout:     "/sounds/fakeout.mp3",
  big_hit:     "/sounds/big_hit.mp3",
  sell:        "/sounds/sell.mp3",
  coin:        "/sounds/coin.mp3",
  keep:        "/sounds/keep.mp3",
  hover:       "/sounds/hover.mp3",
};

const fileCache = new Map<string, boolean>();

async function fileExists(path: string): Promise<boolean> {
  if (fileCache.has(path)) return fileCache.get(path)!;
  try {
    const res = await fetch(path, { method: "HEAD" });
    const ok  = res.ok;
    fileCache.set(path, ok);
    return ok;
  } catch {
    fileCache.set(path, false);
    return false;
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try { return new (window.AudioContext || (window as any).webkitAudioContext)(); }
  catch { return null; }
}

function playTone(
  freq: number, duration: number,
  type: OscillatorType = "sine", gain = 0.07, freqEnd?: number
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.connect(vol); vol.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
  } catch { /* silent */ }
}

const SYNTHESIS: Record<SoundEffect, () => void> = {
  pack_woosh: () => { playTone(120, 0.6, "sawtooth", 0.06, 40); },
  pack_shake: () => { playTone(80, 0.35, "sawtooth", 0.05, 60); },
  pack_open:  () => { playTone(180, 0.15, "sine", 0.09); setTimeout(() => playTone(360, 0.2, "sine", 0.07), 110); },
  card_flip:  () => { playTone(700, 0.1, "sine", 0.05, 500); },
  card_rare:  () => { playTone(440, 0.1, "sine", 0.06); setTimeout(() => playTone(880, 0.3, "sine", 0.05), 70); },
  card_epic:  () => {
    playTone(330, 0.12, "sine", 0.08);
    setTimeout(() => playTone(660, 0.2, "sine", 0.07), 90);
    setTimeout(() => playTone(990, 0.35, "sine", 0.06), 200);
  },
  card_ultra: () => {
    [0,60,130,220].forEach((d, i) => setTimeout(() => playTone(280 + i*160, 0.28, "sine", 0.09), d));
  },
  card_god: () => {
    [0,70,150,250,380].forEach((d, i) => setTimeout(() => playTone(250 + i*180, 0.4, "sine", 0.1), d));
  },
  fakeout: () => {
    playTone(800, 0.08, "square", 0.05);
    setTimeout(() => playTone(400, 0.1, "sawtooth", 0.04), 80);
  },
  big_hit: () => {
    playTone(200, 0.08, "square", 0.1);
    setTimeout(() => playTone(400, 0.1, "sine", 0.09), 80);
    setTimeout(() => playTone(600, 0.15, "sine", 0.08), 180);
    setTimeout(() => playTone(1000, 0.5, "sine", 0.07), 300);
  },
  sell:  () => { playTone(520, 0.12, "sine", 0.07); setTimeout(() => playTone(780, 0.15, "sine", 0.06), 100); },
  coin:  () => { playTone(1046, 0.07, "sine", 0.08); setTimeout(() => playTone(1318, 0.12, "sine", 0.06), 55); },
  keep:  () => { playTone(360, 0.1, "sine", 0.05); },
  hover: () => { playTone(900, 0.04, "sine", 0.02); },
};

export function useSound() {
  async function play(effect: SoundEffect, volume = 1) {
    const path   = SOUND_FILES[effect];
    const exists = await fileExists(path);
    if (exists) {
      try {
        const audio = new Audio(path);
        audio.volume = Math.min(1, Math.max(0, volume));
        await audio.play();
        return;
      } catch { /* fall through */ }
    }
    SYNTHESIS[effect]?.();
  }

  // Sync version for event handlers — synthesis only, instant
  function playSync(effect: SoundEffect) {
    SYNTHESIS[effect]?.();
  }

  return { play, playSync };
}
