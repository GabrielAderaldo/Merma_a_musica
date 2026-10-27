// drizzle-kit (ADR-0006): `bun run db:generate` gera o .sql da migração a partir do schema. Quem aplica é a API ao subir.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
});
