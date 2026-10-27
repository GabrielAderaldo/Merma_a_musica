// Lista colada (R-002, R-010): uma música por linha, de qualquer lugar. Cada linha vira uma busca na Deezer.
import type { SourcePlaylist } from "./types.ts";

const MAX_LINE = 200;

// Tira marcadores de lista ("1.", "-", "•") do começo da linha; o separador "Artista - Música" fica, porque a
// busca ignora pontuação.
const clean = (line: string) => line.replace(/^\s*(?:\d{1,4}[.)]|[-*•])\s+/u, "").trim();

export const textPlaylist = (name: string, text: string, maxSongs: number): SourcePlaylist => {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = clean(raw).slice(0, MAX_LINE);
    const key = line.toLowerCase();
    if (line === "" || seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
    if (lines.length === maxSongs) break;
  }
  return {
    platform: "text",
    external_id: null,
    name,
    cover_url: null,
    candidates: lines.map((line) => ({ kind: "lookup", label: line, query: line, isrc: null })),
  };
};
