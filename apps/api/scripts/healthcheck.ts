// HealthCmd da merma-api.container (ADR-0017.R7): a imagem distroless não tem shell nem curl.
const port = process.env["PORT"] ?? "3000";
const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(3_000) }).catch(() => null);
process.exit(res?.ok ? 0 : 1);
