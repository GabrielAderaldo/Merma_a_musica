// Configuração lida do ambiente uma vez, ao subir. A lista canônica das variáveis é o .env.example.
import { err, ok, type Result } from "@merma/domain";

export type Config = {
  port: number;
  hostname: string;
  sessionSecret: string;
  // HMAC do audio_token (ADR-0004), separado do da sessão.
  audioSecret: string;
  // Origins aceitos no CORS e no handshake do WS (S-02).
  allowedOrigins: string[];
  logLevel: LogLevel;
  version: string;
  // Snapshot das salas (ADR-0009). Sem ele (dev e testes), o snapshot fica na memória e não sobrevive a um restart.
  redisUrl: string | null;
  // Histórico de partidas (ADR-0006). Sem ele (dev e testes), a partida concluída não é gravada.
  postgresUrl: string | null;
  // Link do YouTube (ADR-0024). Sem a chave, só esse tipo de link fica indisponível.
  youtubeApiKey: string | null;
  // OAuth do Spotify, opcional (R-002). Ligado só com SPOTIFY_CLIENT_ID, e aí exige a chave de cifra (ADR-0006.R3).
  spotify: { clientId: string; redirectUri: string; tokenKey: string } | null;
  // Bearer de GET /metrics (ADR-0010). Sem ele, a rota não existe.
  metricsToken: string | null;
  // Sentry (ADR-0010). Sem ele (dev), nada vai ao Sentry.
  sentryDsn: string | null;
};

export type LogLevel = "debug" | "info" | "warn" | "error";
const LEVELS: readonly string[] = ["debug", "info", "warn", "error"] satisfies LogLevel[];
const isLogLevel = (s: string): s is LogLevel => LEVELS.includes(s);

export type ConfigError =
  | "invalid_port"
  | "session_secret_too_short"
  | "audio_secret_too_short"
  | "invalid_public_base_url"
  | "invalid_log_level"
  | "invalid_spotify_redirect_uri"
  | "invalid_oauth_token_encryption_key"
  | "metrics_token_too_short"
  | "invalid_sentry_dsn";

export const loadConfig = (env: Record<string, string | undefined>, version: string): Result<Config, ConfigError> => {
  const port = Number(env["PORT"] ?? "3000");
  if (!Number.isInteger(port) || port < 0 || port > 65535) return err("invalid_port");
  // HMAC-SHA256 do cookie de sessão: 32 bytes em base64 dão 44 caracteres (`openssl rand -base64 32`).
  const sessionSecret = env["SESSION_SECRET"] ?? "";
  if (sessionSecret.length < 32) return err("session_secret_too_short");
  const audioSecret = env["AUDIO_HMAC_SECRET"] ?? "";
  if (audioSecret.length < 32) return err("audio_secret_too_short");
  const base = URL.parse(env["PUBLIC_BASE_URL"] ?? "");
  if (!base) return err("invalid_public_base_url");
  const logLevel = env["LOG_LEVEL"] ?? "info";
  if (!isLogLevel(logLevel)) return err("invalid_log_level");
  const spotify = spotifyConfig(env);
  if (!spotify.ok) return spotify;
  // Mesmo tamanho dos outros segredos (`openssl rand -base64 32`).
  const metricsToken = env["METRICS_AUTH_TOKEN"] || null;
  if (metricsToken !== null && metricsToken.length < 32) return err("metrics_token_too_short");
  const sentryDsn = env["SENTRY_DSN"] || null;
  if (sentryDsn !== null && !URL.canParse(sentryDsn)) return err("invalid_sentry_dsn");
  return ok({
    port,
    // Só loopback: o Caddy é quem fala com a internet (docs/operations.md).
    hostname: "127.0.0.1",
    sessionSecret,
    audioSecret,
    allowedOrigins: [base.origin],
    logLevel,
    version,
    redisUrl: env["REDIS_URL"] || null,
    postgresUrl: env["POSTGRES_URL"] || null,
    youtubeApiKey: env["YOUTUBE_API_KEY"] || null,
    spotify: spotify.value,
    metricsToken,
    sentryDsn,
  });
};

const spotifyConfig = (env: Record<string, string | undefined>): Result<Config["spotify"], ConfigError> => {
  const clientId = env["SPOTIFY_CLIENT_ID"];
  if (!clientId) return ok(null);
  const redirect = URL.parse(env["SPOTIFY_REDIRECT_URI"] ?? "");
  if (!redirect || !redirect.pathname.endsWith("/auth/spotify/callback")) return err("invalid_spotify_redirect_uri");
  // AES-256: 32 bytes em base64 (`openssl rand -base64 32`).
  const tokenKey = env["OAUTH_TOKEN_ENCRYPTION_KEY"] ?? "";
  if (Buffer.from(tokenKey, "base64").length !== 32) return err("invalid_oauth_token_encryption_key");
  return ok({ clientId, redirectUri: redirect.toString(), tokenKey });
};
