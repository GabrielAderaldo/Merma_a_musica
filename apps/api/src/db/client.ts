// Conexão com o Postgres por bun:sql (ADR-0006) e as migrações, aplicadas pela própria API ao subir.
import { join } from "node:path";
import { err, ok, type Result } from "@merma/domain";
import { SQL } from "bun";
import { type BunSQLDatabase, drizzle } from "drizzle-orm/bun-sql/postgres";
import { migrate } from "drizzle-orm/bun-sql/postgres/migrator";

export type Database = BunSQLDatabase & { $client: SQL };

// Os .sql gerados pelo `drizzle-kit generate` (bun run db:generate), versionados no git.
export const MIGRATIONS_DIR = join(import.meta.dir, "migrations");
// ADR-0006: pool de 10 conexões por instância.
const POOL_SIZE = 10;

export const connect = (url: string): Database => drizzle({ client: new SQL({ url, max: POOL_SIZE }) });

// Antes da recuperação e do Bun.serve. Se falhar, a API não sobe, o healthcheck não fica verde e o
// merma-deploy volta para a imagem anterior (ADR-0017).
export const migrateDatabase = async (db: Database): Promise<Result<void, "migration_failed">> => {
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    return ok(undefined);
  } catch {
    return err("migration_failed");
  }
};
