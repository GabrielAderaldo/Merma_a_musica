// HealthCmd da API (a imagem distroless não tem shell nem curl).
const res = await fetch("http://127.0.0.1:3000/api/health").catch(() => null);
process.exit(res?.ok ? 0 : 1);
