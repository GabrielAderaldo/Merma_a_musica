// Cliente HTTP da Playlist Integration: só os hosts das APIs oficiais (ADR-0024.R3), com timeout, e exceção de rede
// convertida em Result antes de subir (regra da apps/api). O corpo é validado por quem chama, com Zod.
import type { z } from "zod";
import { err, ok, type Result } from "./result.ts";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// ADR-0024.R3: nada de página raspada, só API.
export const ALLOWED_HOSTS: readonly string[] = ["api.deezer.com", "www.googleapis.com", "api.spotify.com", "accounts.spotify.com"];
const TIMEOUT_MS = 10_000;

export type HttpError = "provider_unavailable" | "not_found" | "forbidden" | "unauthorized";

export const requestJson = async <S extends z.ZodType>(
  fetch: Fetch,
  url: string,
  schema: S,
  init: RequestInit = {},
): Promise<Result<z.infer<S>, HttpError>> => {
  if (!ALLOWED_HOSTS.includes(new URL(url).hostname)) return err("provider_unavailable");
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    body = await response.json();
  } catch {
    return err("provider_unavailable");
  }
  if (response.status === 404) return err("not_found");
  if (response.status === 403) return err("forbidden");
  if (response.status === 401 || response.status === 400) return err("unauthorized");
  if (!response.ok) return err("provider_unavailable");
  const parsed = schema.safeParse(body);
  return parsed.success ? ok(parsed.data) : err("provider_unavailable");
};
