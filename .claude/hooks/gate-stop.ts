// Stop: antes de o Claude encerrar o turno, roda os checks que o CLAUDE.md exige para dar uma tarefa por concluída.
// Só roda com mudança não commitada (turno de pergunta e resposta passa direto). Os checks custam < 1s (aferido em 2026-10-21).
// Hooks: https://code.claude.com/docs/pt/hooks-guide · exit 2 = impede o Claude de parar e devolve o stderr.
// Bloqueia de novo mesmo com stop_hook_active: o Claude está corrigindo. O teto do Claude Code (8 bloqueios seguidos) evita loop.
const ROOT = process.env["CLAUDE_PROJECT_DIR"] ?? process.cwd();
const CHECKS = ["docs:check", "typecheck", "lint", "test"] as const;
const MAX_OUTPUT = 3000;

await Bun.stdin.text();

const status = Bun.spawnSync(["git", "status", "--porcelain"], { cwd: ROOT });
if (status.exitCode !== 0 || status.stdout.toString().trim() === "") process.exit(0);

const failures: string[] = [];
for (const check of CHECKS) {
  const run = Bun.spawnSync(["bun", "run", check], { cwd: ROOT, env: { ...process.env, CLAUDECODE: "1" } });
  if (run.exitCode === 0) continue;
  const output = `${run.stdout.toString()}${run.stderr.toString()}`.trim();
  failures.push(`### bun run ${check} (exit ${run.exitCode})\n${output.slice(-MAX_OUTPUT)}`);
}

if (failures.length > 0) {
  console.error(
    `A árvore tem mudanças e ${failures.length} check(s) falharam. Corrija antes de encerrar ` +
      `(ou, se a falha não for sua, diga isso ao mantenedor com a saída):\n\n${failures.join("\n\n")}`,
  );
  process.exit(2);
}
