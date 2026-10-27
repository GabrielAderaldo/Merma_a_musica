// Adapters de produção do relógio e dos IDs, e as portas que ainda não têm implementação.
import { err, MatchId, RoomId, RoundId, Timestamp } from "@merma/domain";
import type { AudioResolver, Clock, Ids, MatchRepository, SongSource } from "./ports.ts";

// Os smart constructors só falham com entrada fora do formato, o que Date.now e randomUUID não produzem.
const must = <T>(r: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!r.ok) throw new Error(`adapter do sistema: ${r.error}`);
  return r.value;
};

export const systemClock: Clock = {
  now: () => must(Timestamp(Date.now())),
  schedule: (delayMs, run) => {
    const timer = setTimeout(run, delayMs);
    return () => clearTimeout(timer);
  },
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// R-004: 6 caracteres [A-Z0-9], do CSPRNG. 252 é o maior múltiplo de 36 abaixo de 256: sem viés de módulo.
const inviteCode = (): string => {
  let code = "";
  while (code.length < 6) {
    for (const byte of crypto.getRandomValues(new Uint8Array(8))) {
      if (byte < 252 && code.length < 6) code += ALPHABET[byte % 36];
    }
  }
  return code;
};

export const systemIds: Ids = {
  roomId: () => must(RoomId(crypto.randomUUID())),
  matchId: () => must(MatchId(crypto.randomUUID())),
  roundId: () => must(RoundId(crypto.randomUUID())),
  seed: () => crypto.randomUUID(),
  inviteCode,
};

// Até a Playlist Integration (apps/api/src/playlist) e o Postgres (apps/api/src/db) nascerem, ninguém escolhe
// playlist, então nenhuma partida começa e estas portas nunca chegam a tocar áudio ou gravar.
export const noPlaylists: SongSource = { playlist: async () => err("no_playlists_imported") };
export const noAudio: AudioResolver = { resolve: async () => null, token: () => "" };
export const noMatchStore: MatchRepository = { saveCompleted: async () => err("store_unavailable") };
