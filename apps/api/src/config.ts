// Configuração lida do ambiente uma vez, ao subir. A lista canônica das variáveis é o .env.example.
import { err, ok, type Result } from "@merma/domain";

export type Config = {
  port: number;
  hostname: string;
  sessionSecret: string;
  // Origins aceitos no CORS e no handshake do WS (S-02).
  allowedOrigins: string[];
  logLevel: LogLevel;
  version: string;
  // Snapshot das salas (ADR-0009). Sem ele (dev e testes), o snapshot fica na memória e não sobrevive a um restart.
  redisUrl: string | null;
};

export type LogLevel = "debug" | "info" | "warn" | "error";
const LEVELS: readonly string[] = ["debug", "info", "warn", "error"] satisfies LogLevel[];
const isLogLevel = (s: string): s is LogLevel => LEVELS.includes(s);

export type ConfigError = "invalid_port" | "session_secret_too_short" | "invalid_public_base_url" | "invalid_log_level";

export const loadConfig = (env: Record<string, string | undefined>, version: string): Result<Config, ConfigError> => {
  const port = Number(env["PORT"] ?? "3000");
  if (!Number.isInteger(port) || port < 0 || port > 65535) return err("invalid_port");
  // HMAC-SHA256 do cookie de sessão: 32 bytes em base64 dão 44 caracteres (`openssl rand -base64 32`).
  const sessionSecret = env["SESSION_SECRET"] ?? "";
  if (sessionSecret.length < 32) return err("session_secret_too_short");
  const base = URL.parse(env["PUBLIC_BASE_URL"] ?? "");
  if (!base) return err("invalid_public_base_url");
  const logLevel = env["LOG_LEVEL"] ?? "info";
  if (!isLogLevel(logLevel)) return err("invalid_log_level");
  return ok({
    port,
    // Só loopback: o Caddy é quem fala com a internet (docs/operations.md).
    hostname: "127.0.0.1",
    sessionSecret,
    allowedOrigins: [base.origin],
    logLevel,
    version,
    redisUrl: env["REDIS_URL"] || null,
  });
};
