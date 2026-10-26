// Sorteio determinístico: a mesma seed dá o mesmo resultado, o que permite testar e restaurar do snapshot.
// A seed (string) vira um estado de 32 bits por FNV-1a; o gerador é Mulberry32 e o embaralhamento é Fisher-Yates.

export type Rng = () => number;

const fnv1a = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

// Número em [0, 1).
export const createRng = (seed: string): Rng => {
  let state = fnv1a(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const shuffle = <T>(items: readonly T[], rng: Rng): readonly T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
};
