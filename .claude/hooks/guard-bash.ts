// PreToolUse (Bash): o projeto usa só bun/bunx (ADR-0018.R1).
// Hooks: https://code.claude.com/docs/pt/hooks-guide · exit 2 = bloqueia e devolve o stderr ao Claude.
// É uma trava contra engano, não contra quem quer burlar: cobre as formas comuns de chamar o comando.
type Input = { tool_input: { command?: string } };

const FORBIDDEN = "npm|npx|pnpm|pnpx|yarn";
// Posição de comando: início ou depois de ; & | ( $( ` ou quebra de linha, opcionalmente após wrappers
// (sudo, env, command, exec, time, nohup, xargs, com flags) e atribuições VAR=x. Aceita caminho (/usr/bin/npm).
const AT_COMMAND = new RegExp(
  String.raw`(?:^|[;&|(\n` + "`" + String.raw`]|\$\()\s*` +
    String.raw`(?:(?:sudo|env|command|exec|time|nohup|xargs)(?:\s+-\S+)*\s+|\w+=\S*\s+)*` +
    String.raw`(?:\S*/)?(${FORBIDDEN})(?=\s|$|[;&|)])`,
);
// Texto passado a um shell ou ao eval é comando de novo: bash -c "npm i", sh -lc 'yarn', eval "pnpm x".
const NESTED = /(?:\b(?:ba|z|da|k)?sh\s+(?:-\w+\s+)*-\w*c|\beval)\s+(["'])((?:\\.|(?!\1)[\s\S])*)\1/g;

const findForbidden = (command: string): string | undefined => {
  for (const [, , inner] of command.matchAll(NESTED)) {
    const hit = findForbidden(inner ?? "");
    if (hit) return hit;
  }
  // Trechos entre aspas são argumentos (ex.: `grep "pnpm"`), não comandos: removidos antes de casar.
  const bare = command.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  return AT_COMMAND.exec(bare)?.[1];
};

const { tool_input } = (await Bun.stdin.json()) as Input;
const hit = findForbidden(tool_input.command ?? "");
if (hit) {
  console.error(`'${hit}' é proibido neste projeto (ADR-0018.R1). Use bun / bunx.`);
  process.exit(2);
}
