// Sentry (ADR-0010): só erro não tratado ou reportado explicitamente (logger.error), e só com SENTRY_DSN. Sem DSN
// (dev e testes), nada sobe.
// ADR-0010.R3: o payload é sanitizado antes de sair. As integrações padrão ficam desligadas (instrumentam HTTP,
// fetch, Postgres e Redis e anexam URL, header e query, e o audio_token anda na URL), sem breadcrumbs, e o
// beforeSend monta o evento de novo por allowlist: o que não está na lista não sai, inclusive campo novo do SDK.
import * as Sentry from "@sentry/bun";
import type { ErrorEvent } from "@sentry/bun";
import { type LogFields, scrub } from "../http/logger.ts";

export type ErrorReporter = Readonly<{
  report(event: string, fields: LogFields): void;
  flush(): Promise<void>;
}>;

export const noReporter: ErrorReporter = { report: () => {}, flush: async () => {} };

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Texto livre (mensagem de erro do driver, por exemplo) pode trazer player_uuid, room_id ou match_id.
const redact = (s: string | undefined) => s?.replace(UUID, "[uuid]");

// Copia só as chaves dadas que têm valor (exactOptionalPropertyTypes não aceita `chave: undefined`).
const pick = <T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> => {
  const out: Partial<Pick<T, K>> = {};
  for (const k of keys) if (source[k] !== undefined) out[k] = source[k];
  return out as Pick<T, K>;
};

type Exception = NonNullable<NonNullable<ErrorEvent["exception"]>["values"]>[number];
type Frame = NonNullable<NonNullable<Exception["stacktrace"]>["frames"]>[number];

const sanitizeException = (x: Exception): Exception => {
  const out: Exception = pick(x, ["type", "mechanism"]);
  const value = redact(x.value);
  if (value !== undefined) out.value = value;
  // Só onde: sem vars nem linhas de contexto do código.
  const frames = x.stacktrace?.frames?.map((f): Frame => pick(f, ["filename", "module", "function", "lineno", "colno", "in_app"]));
  if (frames !== undefined) out.stacktrace = { frames };
  return out;
};

export const sanitizeEvent = (event: ErrorEvent): ErrorEvent => {
  const out: ErrorEvent = { ...pick(event, ["event_id", "timestamp", "level", "platform", "release", "environment"]), type: undefined };
  const message = redact(event.message);
  if (message !== undefined) out.message = message;
  const values = event.exception?.values?.map(sanitizeException);
  if (values !== undefined) out.exception = { values };
  if (event.tags !== undefined) out.tags = scrub(event.tags) as NonNullable<ErrorEvent["tags"]>;
  if (event.extra !== undefined) out.extra = scrub(event.extra) as NonNullable<ErrorEvent["extra"]>;
  const runtime = event.contexts?.["runtime"];
  if (runtime !== undefined) out.contexts = { runtime };
  return out;
};

type SentryOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

export const sentryReporter = (opts: {
  dsn: string;
  release: string;
  environment: string;
  // Só nos testes: troca o envio HTTP por um que guarda o envelope.
  transport?: SentryOptions["transport"];
}): ErrorReporter => {
  Sentry.init({
    dsn: opts.dsn,
    ...(opts.transport === undefined ? {} : { transport: opts.transport }),
    release: opts.release,
    environment: opts.environment,
    defaultIntegrations: false,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
    ],
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: sanitizeEvent,
  });
  return {
    report: (event, fields) => {
      const { error, ...rest } = fields;
      const context = { tags: { event }, extra: scrub(rest) as Record<string, unknown> };
      if (error instanceof Error) Sentry.captureException(error, context);
      else Sentry.captureMessage(event, { ...context, level: "error" });
    },
    flush: async () => {
      await Sentry.flush(2_000);
    },
  };
};
