// Refresh token do Spotify cifrado em repouso com AES-256-GCM e a OAUTH_TOKEN_ENCRYPTION_KEY (ADR-0006.R3).
// Formato guardado: base64(iv de 12 bytes ‖ texto cifrado com a tag de 16 bytes).
import { err, ok, type Result } from "./result.ts";

export type TokenCipher = Readonly<{
  encrypt(plain: string): Promise<string>;
  decrypt(sealed: string): Promise<Result<string, "invalid_ciphertext">>;
}>;

const IV_BYTES = 12;

// A chave é base64 de 32 bytes (`openssl rand -base64 32`); fora disso, null.
export const tokenCipher = async (keyBase64: string): Promise<TokenCipher | null> => {
  const raw = Buffer.from(keyBase64, "base64");
  if (raw.length !== 32) return null;
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  return {
    encrypt: async (plain) => {
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
      const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
      return Buffer.concat([iv, new Uint8Array(sealed)]).toString("base64");
    },
    decrypt: async (sealed) => {
      const bytes = Buffer.from(sealed, "base64");
      try {
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.subarray(0, IV_BYTES) }, key, bytes.subarray(IV_BYTES));
        return ok(new TextDecoder().decode(plain));
      } catch {
        // Tag inválida: chave trocada ou dado adulterado.
        return err("invalid_ciphertext");
      }
    },
  };
};
