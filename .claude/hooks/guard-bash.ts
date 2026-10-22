// PreToolUse (Bash): o projeto usa só bun/bunx (ADR-0016.R1).
// Hooks: https://code.claude.com/docs/pt/hooks-guide · exit 2 = bloqueia e devolve o stderr ao Claude.
type Input = { tool_input: { command?: string } };

const { tool_input } = (await Bun.stdin.json()) as Input;
// Trechos entre aspas são argumentos (ex.: `grep "pnpm"`), não comandos: removidos antes de casar.
const command = (tool_input.command ?? "").replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
// Só em posição de comando: início, ou depois de ; && || | ( $( — opcionalmente após sudo/env VAR=x.
const hit = /(?:^|[;&|(]|\$\()\s*(?:sudo\s+|env\s+|\w+=\S*\s+)*(npm|npx|pnpm|pnpx|yarn)(?=\s|$)/.exec(command);

if (hit) {
  console.error(`'${hit[1]}' é proibido neste projeto (ADR-0016.R1). Use bun / bunx.`);
  process.exit(2);
}
