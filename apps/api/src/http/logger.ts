// Log estruturado: um objeto JSON por linha no stdout, guardado pelo journald (ADR-0010).
import type { LogLevel } from "../config.ts";

export type LogFields = Record<string, unknown>;

export type Logger = {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
};

const RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

// ADR-0010.R1: answer_text, nickname, cookies e tokens (OAuth, audio_token, Authorization) nunca chegam ao log.
// A chave inteira some, em qualquer profundidade; secret e password entram pelo mesmo motivo.
const FORBIDDEN_KEY = /answer_text|nickname|cookie|token|authorization|secret|password/i;

export const scrub = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(scrub);
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !FORBIDDEN_KEY.test(key))
      .map(([key, v]) => [key, scrub(v)]),
  );
};

export const createLogger = (opts: {
  level: LogLevel;
  write?: (line: string) => void;
  now?: () => number;
  // logger.error é o "reportado explicitamente" do ADR-0010: segue também para o Sentry, com os campos crus (o
  // Error inteiro, com a stack); quem recebe sanitiza (ADR-0010.R3).
  onError?: (event: string, fields: LogFields) => void;
}): Logger => {
  const write = opts.write ?? ((line) => process.stdout.write(`${line}\n`));
  const now = opts.now ?? Date.now;
  const log = (level: LogLevel) => (event: string, fields: LogFields = {}) => {
    if (RANK[level] < RANK[opts.level]) return;
    // ts, level e event vêm por último para nenhum campo do evento sobrescrevê-los.
    write(JSON.stringify({ ...(scrub(fields) as LogFields), ts: new Date(now()).toISOString(), level, event }));
    if (level === "error") opts.onError?.(event, fields);
  };
  return { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") };
};
