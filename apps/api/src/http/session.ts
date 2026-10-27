// Sessão anônima emitida pelo servidor no cookie __Host-session (ADR-0013). É a única fonte do player_uuid.
import { PlayerUuid } from "@merma/domain";
import type { Context } from "hono";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

export type Session = Readonly<{ session_id: string; player_uuid: PlayerUuid }>;
export type SessionVariables = { session: Session };

const NAME = "session"; // com prefix "host", o cookie é __Host-session
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
// "Renovado no uso" sem um Set-Cookie por requisição: reemite quando o cookie tem mais de um dia.
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

type Stored = { session_id: string; player_uuid: PlayerUuid; issued_at: number };

// Valor assinado: session_id:player_uuid:issued_at (ms). Qualquer formato diferente vale como sem sessão.
const parse = (raw: string): Stored | null => {
  const [sessionId, uuid, issuedAt, ...rest] = raw.split(":");
  if (rest.length > 0 || sessionId === undefined || uuid === undefined || issuedAt === undefined) return null;
  const playerUuid = PlayerUuid(uuid);
  const issued = Number(issuedAt);
  if (!playerUuid.ok || !Number.isSafeInteger(issued)) return null;
  return { session_id: sessionId, player_uuid: playerUuid.value, issued_at: issued };
};

const fresh = (now: number): Stored | null => {
  const playerUuid = PlayerUuid(crypto.randomUUID());
  return playerUuid.ok ? { session_id: crypto.randomUUID(), player_uuid: playerUuid.value, issued_at: now } : null;
};

const isUpgrade = (c: Context) => c.req.header("upgrade")?.toLowerCase() === "websocket";

const issue = (c: Context, secret: string, stored: Stored) =>
  setSignedCookie(c, NAME, `${stored.session_id}:${stored.player_uuid}:${stored.issued_at}`, secret, {
    prefix: "host",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Strict",
    maxAge: MAX_AGE_SECONDS,
  });

// ADR-0013.R4: no login OAuth, um session_id novo para o mesmo player_uuid. Apaga antes os Set-Cookie já postos
// nesta resposta (o middleware emite uma sessão nova no callback, que chega sem o cookie Strict).
export const rotateSession = async (c: Context, opts: { secret: string; now: () => number }, player_uuid: PlayerUuid) => {
  c.header("Set-Cookie", undefined);
  const rotated = { session_id: crypto.randomUUID(), player_uuid, issued_at: opts.now() };
  await issue(c, opts.secret, rotated);
  c.set("session", { session_id: rotated.session_id, player_uuid });
};

export const session = (opts: { secret: string; now: () => number }) =>
  createMiddleware<{ Variables: SessionVariables }>(async (c, next) => {
    const now = opts.now();
    const raw = await getSignedCookie(c, opts.secret, NAME, "host");
    const current = typeof raw === "string" ? parse(raw) : null;
    if (current === null && isUpgrade(c)) {
      // A resposta 101 do upgrade não leva Set-Cookie: o cliente faz uma requisição REST antes e já chega com a
      // sessão. Sem ela, o handshake é recusado em vez de abrir um WS sem identidade (ADR-0013.R3, S-02).
      return c.json({ code: "unauthenticated", message: "sessão ausente" }, 401);
    }
    const stored = current ?? fresh(now);
    if (stored === null) return c.json({ code: "internal_error", message: "falha ao criar a sessão" }, 500);
    if (current === null || now - stored.issued_at > RENEW_AFTER_MS) await issue(c, opts.secret, { ...stored, issued_at: now });
    c.set("session", { session_id: stored.session_id, player_uuid: stored.player_uuid });
    await next();
  });
