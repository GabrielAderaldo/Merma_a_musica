// SessionStart: confere o ambiente antes do primeiro pedido, para o gate do Stop não ser a primeira notícia.
// Hooks: https://code.claude.com/docs/pt/hooks-guide · no SessionStart, o stdout vira contexto do Claude; nunca bloqueia.
// Silencioso quando está tudo certo. Checa o Bun fixado (ADR-0018.R4, R5) e o node_modules.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.env["CLAUDE_PROJECT_DIR"] ?? process.cwd();
await Bun.stdin.text();

const pkg: { packageManager?: string } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const pinned = /^bun@(\d+\.\d+\.\d+)$/.exec(pkg.packageManager ?? "")?.[1];
const problems: string[] = [];

if (pinned) {
  const order = Bun.semver.order(Bun.version, pinned);
  if (order < 0) {
    problems.push(`O Bun local é ${Bun.version}, mais antigo que o fixado (${pinned}): \`bun check\` e testes podem falhar. Peça ao mantenedor \`bun upgrade\`.`);
  } else if (order > 0) {
    problems.push(
      `O Bun local é ${Bun.version} e o projeto fixa ${pinned} (CI e produção). O teste da ADR-0018.R5 fica pulado; ` +
        `se o mantenedor quiser subir a versão, é ADR novo (/new-adr).`,
    );
  }
}
if (!existsSync(join(ROOT, "node_modules"))) {
  problems.push("Falta o node_modules: rode `bun install` antes de `bun run lint` e `bun run typecheck`.");
}

if (problems.length > 0) console.log(`Ambiente do projeto:\n- ${problems.join("\n- ")}`);
