// PreToolUse (Edit|Write|MultiEdit): bloqueia mudança no corpo de ADR `accepted` ou `superseded` (ADR-0019.R2).
// No frontmatter só podem mudar status, superseded_by e revised (para marcar supersede).
// Hooks: https://code.claude.com/docs/pt/hooks-guide · exit 2 = bloqueia e devolve o stderr ao Claude.
import { existsSync, readFileSync } from "node:fs";

type Edit = { old_string: string; new_string: string; replace_all?: boolean };
type Input = {
  tool_input: { file_path?: string; content?: string; edits?: Edit[] } & Partial<Edit>;
};

const input = (await Bun.stdin.json()) as Input;
const path = input.tool_input.file_path ?? "";
if (!/\/docs\/adr\/\d{4}-[^/]+\.md$/.test(path) || !existsSync(path)) process.exit(0);

const current = readFileSync(path, "utf8");
const split = (text: string): { fm: Map<string, string>; body: string } => {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  const fm = new Map<string, string>();
  for (const line of (m?.[1] ?? "").split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv?.[1]) fm.set(kv[1], kv[2] ?? "");
  }
  return { fm, body: m?.[2] ?? text };
};

const before = split(current);
const status = before.fm.get("status") ?? "";
if (status !== "accepted" && status !== "superseded") process.exit(0);

const applyEdit = (text: string, e: Edit): string =>
  e.replace_all ? text.split(e.old_string).join(e.new_string) : text.replace(e.old_string, e.new_string);

let next = current;
if (typeof input.tool_input.content === "string") next = input.tool_input.content;
else if (input.tool_input.edits) next = input.tool_input.edits.reduce(applyEdit, current);
else if (typeof input.tool_input.old_string === "string") next = applyEdit(current, input.tool_input as Edit);

const after = split(next);
const MUTABLE = new Set(["status", "superseded_by", "revised"]);
const keys = new Set([...before.fm.keys(), ...after.fm.keys()]);
const changedImmutable = [...keys].filter((k) => !MUTABLE.has(k) && before.fm.get(k) !== after.fm.get(k));

if (before.body.trim() !== after.body.trim() || changedImmutable.length > 0) {
  console.error(
    `${path} é um ADR ${status}: o conteúdo é imutável (ADR-0019.R2). ` +
      `Para mudar a decisão, crie um ADR novo com a skill /new-adr e, neste, mude só ` +
      `'status: superseded' e 'superseded_by'.` +
      (changedImmutable.length > 0 ? ` Campos imutáveis alterados: ${changedImmutable.join(", ")}.` : ""),
  );
  process.exit(2);
}
