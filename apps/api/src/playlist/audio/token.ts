// audio_token (ADR-0025, S-11): HMAC-SHA256 de (player_uuid, round_id, expiry), no formato
// base64url(HMAC(payload)) + "." + payload, com payload = base64url(JSON { p, r, x }). Quem verifica passa o jogador
// da sessão (ADR-0013), nunca um que veio na requisição.
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { err, ok, type Result } from "../result.ts";

export type AudioClaims = Readonly<{ player_uuid: string; round_id: string; expires_at: number }>;
export type TokenError = "malformed" | "invalid_signature" | "player_mismatch" | "expired";

const Payload = z.strictObject({ p: z.string(), r: z.string(), x: z.int().nonnegative() });

const base64url = (bytes: Uint8Array | string) => Buffer.from(bytes).toString("base64url");

export class AudioTokens {
  readonly #secret: string;

  constructor(secret: string) {
    this.#secret = secret;
  }

  sign(claims: AudioClaims): string {
    const payload = base64url(JSON.stringify({ p: claims.player_uuid, r: claims.round_id, x: claims.expires_at }));
    return `${base64url(this.#mac(payload))}.${payload}`;
  }

  // As falhas na ordem do proxy: formato, assinatura, jogador e prazo.
  verify(token: string, player_uuid: string, now: number): Result<AudioClaims, TokenError> {
    const [mac, payload, ...rest] = token.split(".");
    if (mac === undefined || payload === undefined || rest.length > 0 || mac === "" || payload === "") return err("malformed");
    const given = Buffer.from(mac, "base64url");
    const expected = this.#mac(payload);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return err("invalid_signature");
    let json: unknown;
    try {
      json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      return err("malformed");
    }
    const parsed = Payload.safeParse(json);
    if (!parsed.success) return err("malformed");
    if (parsed.data.p !== player_uuid) return err("player_mismatch");
    if (parsed.data.x <= now) return err("expired");
    return ok({ player_uuid: parsed.data.p, round_id: parsed.data.r, expires_at: parsed.data.x });
  }

  #mac(payload: string): Buffer {
    return new Bun.CryptoHasher("sha256", this.#secret).update(payload).digest();
  }
}
