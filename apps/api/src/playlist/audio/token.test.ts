import { describe, expect, test } from "bun:test";
import { AudioTokens } from "./token.ts";

const SECRET = "audio-secret-with-at-least-32-characters";
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const ROUND = "00000000-0000-4000-8000-000000001000";
const NOW = 1_000_000;

const tokens = new AudioTokens(SECRET);
const token = tokens.sign({ player_uuid: A, round_id: ROUND, expires_at: NOW + 13_000 });

describe("audio_token: HMAC-SHA256 de (player_uuid, round_id, expiry)", () => {
  test("válido para o jogador da sessão, antes do prazo", () => {
    expect(tokens.verify(token, A, NOW)).toEqual({ ok: true, value: { player_uuid: A, round_id: ROUND, expires_at: NOW + 13_000 } });
  });

  test("S-11: de outro jogador → player_mismatch", () => {
    expect(tokens.verify(token, B, NOW)).toEqual({ ok: false, error: "player_mismatch" });
  });

  test("S-14: no prazo ou depois → expired", () => {
    expect(tokens.verify(token, A, NOW + 13_000)).toEqual({ ok: false, error: "expired" });
  });

  test("S-11: payload trocado (outro jogador com a assinatura antiga) → invalid_signature", () => {
    const [mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ p: B, r: ROUND, x: NOW + 13_000 })).toString("base64url");
    expect(tokens.verify(`${mac}.${forged}`, B, NOW)).toEqual({ ok: false, error: "invalid_signature" });
  });

  test("outro segredo → invalid_signature", () => {
    expect(new AudioTokens("x".repeat(40)).verify(token, A, NOW)).toEqual({ ok: false, error: "invalid_signature" });
  });

  test.each(["", "abc", "a.b.c", ".x", "x."])("malformado %p → malformed", (raw) => {
    expect(tokens.verify(raw, A, NOW)).toEqual({ ok: false, error: "malformed" });
  });

  test("assinatura de outro tamanho não chega ao timingSafeEqual (que lançaria) e vira invalid_signature", () => {
    const [, payload] = token.split(".");
    expect(tokens.verify(`AAAA.${payload}`, A, NOW)).toEqual({ ok: false, error: "invalid_signature" });
  });

  test("payload assinado mas fora do formato → malformed", () => {
    const evil = new AudioTokens(SECRET);
    const payload = Buffer.from(JSON.stringify({ p: A })).toString("base64url");
    const mac = new Bun.CryptoHasher("sha256", SECRET).update(payload).digest("base64url");
    expect(evil.verify(`${mac}.${payload}`, A, NOW)).toEqual({ ok: false, error: "malformed" });
  });
});
