// R-010: toda música importada é procurada na Deezer, por ISRC e, sem ele, por busca em texto. A busca devolve sempre
// alguma coisa, então só se aceita o resultado cujo título e artista aparecem no que o jogador trouxe.
import type { DeezerClient } from "./deezer.ts";
import { ok, type Result } from "./result.ts";
import type { Candidate, StoredSong } from "./types.ts";

// Os artigos de R-111, que a busca não exige. A engine tem a mesma lista, mas este contexto não a importa (ADR-0023.R1).
const ARTICLES = new Set(["o", "a", "os", "as", "the", "el", "la"]);

// Minúsculas, sem acento, sem o que está entre parênteses ou colchetes e só letras e dígitos.
export const searchText = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const words = (s: string) => searchText(s).split(" ").filter((w) => w !== "" && !ARTICLES.has(w));

// Todas as palavras do título e ao menos uma do artista estão na consulta.
export const matches = (query: string, song: StoredSong): boolean => {
  const asked = new Set(words(query));
  const title = words(song.name);
  return title.length > 0 && title.every((w) => asked.has(w)) && words(song.artist).some((w) => asked.has(w));
};

export const resolveCandidate = async (
  deezer: DeezerClient,
  candidate: Candidate,
): Promise<Result<StoredSong | null, "provider_unavailable">> => {
  if (candidate.kind === "found") return ok(candidate.song);
  if (candidate.isrc !== null) {
    const byIsrc = await deezer.byIsrc(candidate.isrc);
    if (!byIsrc.ok || byIsrc.value !== null) return byIsrc;
  }
  const query = searchText(candidate.query);
  if (query === "") return ok(null);
  const found = await deezer.search(query);
  if (!found.ok) return found;
  return ok(found.value.find((s) => matches(query, s)) ?? null);
};
