// Detecta documentação apodrecida (ADR-0022). Rode com `bun run docs:check`.
// Sem dependências: só Bun + node:fs/path + git.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const errors: string[] = [];
const fail = (file: string, msg: string): void => {
  errors.push(`${relative(ROOT, file) || "."}: ${msg}`);
};

const walk = (dir: string, out: string[] = []): string[] => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === ".DS_Store") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

const read = (file: string): string => readFileSync(file, "utf8");

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const frontmatter = (text: string): Record<string, string> => {
  const m = FRONTMATTER.exec(text);
  const fields: Record<string, string> = {};
  if (!m?.[1]) return fields;
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv?.[1]) fields[kv[1]] = (kv[2] ?? "").replace(/^["']|["']$/g, "");
  }
  return fields;
};
const body = (text: string): string => (FRONTMATTER.exec(text)?.[2] ?? text).trim();

// Remove blocos de código: links e IDs dentro deles são exemplos, não referências.
const stripCode = (text: string): string => text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");

const docsFiles = walk(join(ROOT, "docs")).filter((f) => f.endsWith(".md"));
const harnessFiles = walk(join(ROOT, ".claude")).filter((f) => f.endsWith(".md"));
const rootFiles = ["CLAUDE.md", "README.md"].map((f) => join(ROOT, f)).filter(existsSync);
const mdFiles = [...docsFiles, ...harnessFiles, ...rootFiles];

// 1. CLAUDE.md raiz curto (ADR-0022.R1)
const claudeMd = join(ROOT, "CLAUDE.md");
if (existsSync(claudeMd)) {
  const lines = read(claudeMd).split("\n").length;
  if (lines > 100) fail(claudeMd, `${lines} linhas; o teto é 100 (ADR-0022.R1)`);
}

// 2. Links relativos resolvem (ADR-0022.R5). Exceção: ADR linkando spec vencido, que só existe no git.
const specsDir = join(ROOT, "docs/specs") + "/";
const inAdrs = (file: string): boolean => file.startsWith(join(ROOT, "docs/adr") + "/");
for (const file of mdFiles) {
  for (const [, target] of stripCode(read(file)).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    if (!target || /^(https?:|mailto:|#)/.test(target)) continue;
    const path = decodeURIComponent(target.split("#")[0] ?? "");
    if (!path) continue;
    const full = resolve(dirname(file), path);
    if (existsSync(full) || (inAdrs(file) && full.startsWith(specsDir))) continue;
    fail(file, `link quebrado → ${target}`);
  }
}

// 3. IDs de regra do GDD únicos e referências existentes (ADR-0022.R5)
const gdd = join(ROOT, "docs/gdd.md");
const ruleIds = new Set<string>();
if (existsSync(gdd)) {
  for (const [, id] of read(gdd).matchAll(/\*\*(R-\d{3})\*\*/g)) {
    if (!id) continue;
    if (ruleIds.has(id)) fail(gdd, `ID de regra duplicado: ${id}`);
    ruleIds.add(id);
  }
  for (const file of mdFiles) {
    for (const [id] of stripCode(read(file)).matchAll(/(?<![A-Za-z])R-\d{3}(?!\d)/g)) {
      if (!ruleIds.has(id)) fail(file, `cita ${id}, que não existe em docs/gdd.md`);
    }
  }
}

// 4. ADRs bem formados (ADR-0022.R3) e restrições ativas
type Restriction = { id: string; file: string; kind: "check" | "pending" | "review"; scope: string | undefined };
const adrDir = join(ROOT, "docs/adr");
const adrFiles = walk(adrDir).filter((f) => /\/\d{4}-[a-z0-9-]+\.md$/.test(f));
const adrNumbers = new Set(adrFiles.map((f) => basename(f).slice(0, 4)));
const STATUSES = new Set(["proposed", "accepted", "superseded", "deprecated"]);
const restrictions = new Map<string, Restriction>();
const supersededIds = new Set<string>();
for (const file of adrFiles) {
  const text = read(file);
  const fm = frontmatter(text);
  const num = basename(file).slice(0, 4);
  for (const key of ["id", "title", "status", "date"]) {
    if (!fm[key]) fail(file, `frontmatter sem '${key}'`);
  }
  if (fm["id"] && fm["id"] !== `ADR-${num}`) fail(file, `id '${fm["id"]}' não bate com o arquivo (ADR-${num})`);
  if (fm["status"] && !STATUSES.has(fm["status"])) fail(file, `status inválido '${fm["status"]}'`);
  const section = /## Restrições\n([\s\S]*?)(\n## |$)/.exec(text)?.[1];
  const lines = (section ?? "").split("\n").filter((l) => l.startsWith("- **"));
  if (fm["status"] === "superseded") {
    const by = /ADR-(\d{4})/.exec(fm["superseded_by"] ?? "")?.[1];
    if (!by || !adrNumbers.has(by)) fail(file, "superseded sem 'superseded_by' apontando para ADR existente");
  }
  // Restrição de ADR superseded ou deprecated não vale mais: não é cobrada, e citá-la é erro.
  if (fm["status"] === "superseded" || fm["status"] === "deprecated") {
    for (const line of lines) supersededIds.add(/\*\*(ADR-\d{4}\.R\d+)\*\*/.exec(line)?.[1] ?? "");
    continue;
  }
  if (section === undefined) {
    fail(file, "sem seção '## Restrições'");
    continue;
  }
  for (const line of lines) {
    const id = /^- \*\*(ADR-\d{4}\.R\d+)\*\*/.exec(line)?.[1];
    if (!id || !id.startsWith(`ADR-${num}.R`)) {
      fail(file, `restrição com ID fora do padrão ADR-${num}.Rn: ${line.slice(0, 60)}`);
      continue;
    }
    const check = /Check:\s*(.*)$/.exec(line)?.[1];
    if (check === undefined && !line.includes("Review:")) {
      fail(file, `restrição sem 'Check:' nem 'Review:': ${line.slice(0, 60)}`);
      continue;
    }
    const kind = check === undefined || check.startsWith("Review:") ? "review" : check.startsWith("pendente") ? "pending" : "check";
    restrictions.set(id, { id, file, kind, scope: /^pendente \(([^)]+)\)/.exec(check ?? "")?.[1] });
  }
}

// 5. Specs pré-código vencidos (ADR-0022.R4)
for (const file of walk(join(ROOT, "docs/specs")).filter((f) => f.endsWith(".md"))) {
  const until = frontmatter(read(file))["until"];
  if (!until) fail(file, "spec pré-código sem 'until:' no frontmatter");
  else if (existsSync(join(ROOT, until))) {
    fail(file, `${until} já existe: migre este spec para tipos e testes e apague o arquivo (ADR-0022.R4)`);
  }
}

// 6. Termos da stack antiga fora do histórico de ADRs (CLAUDE.md lista os termos de propósito)
const BANNED = /\b(Gleam|Elixir|Phoenix|SvelteKit|GenServer)\b/;
for (const file of [...docsFiles, ...harnessFiles]) {
  if (file.startsWith(adrDir)) continue;
  const hit = BANNED.exec(read(file));
  if (hit) fail(file, `menciona stack antiga '${hit[1]}'`);
}

// 7. Sem snapshot de doc de terceiros (ADR-0020.R1)
const allFiles = walk(ROOT);
for (const file of allFiles) {
  const rel = relative(ROOT, file);
  if (/(^|\/)references\/|llms-full|api[_-]reference/i.test(rel)) fail(file, "parece snapshot de doc de terceiros (ADR-0020.R1)");
}

// 8. Restrições citadas pelos verificadores (ADR-0022.R7, R8, R9).
// Onde nasce o verificador das restrições `pendente` dos ADRs aceitos antes do ADR-0022, que não dizem o caminho.
// As chaves vêm sem o prefixo "ADR-" para esta tabela não contar como citação.
const PENDING_SCOPE: Record<string, string> = {
  "0002.R1": "apps/api", "0002.R3": "apps/api",
  "0004.R1": "apps/api", "0004.R2": "apps/api", "0004.R3": "apps/api", "0004.R4": "apps/api", "0004.R5": "apps/api",
  "0006.R1": "apps/api", "0006.R2": "apps/api", "0006.R3": "apps/api",
  "0007.R2": "packages/domain",
  "0008.R1": "apps/web",
  "0009.R2": "apps/api", "0009.R4": "apps/api",
  "0010.R1": "apps/api", "0010.R2": "apps/api", "0010.R3": "apps/api",
  "0013.R1": "apps/api", "0013.R2": "apps/web", "0013.R3": "apps/api", "0013.R4": "apps/api",
  "0014.R1": "packages/schema", "0014.R2": "apps/api",
  "0015.R3": "packages/domain",
};
const citations = new Map<string, string[]>();
for (const file of allFiles) {
  const rel = relative(ROOT, file);
  if (rel.startsWith("docs/") || rel.endsWith(".md") || rel === "bun.lock") continue;
  for (const [id] of read(file).matchAll(/ADR-\d{4}\.R\d+/g)) {
    citations.set(id, [...(citations.get(id) ?? []), rel]);
  }
}
for (const [id, files] of citations) {
  if (restrictions.has(id)) continue;
  const why = supersededIds.has(id) ? "é de um ADR superseded ou deprecated: cite a restrição que vale hoje" : "não existe";
  for (const f of new Set(files)) fail(join(ROOT, f), `cita ${id}, que ${why} (ADR-0022.R9)`);
}
const tally = { verified: 0, pending: 0, review: 0 };
for (const r of restrictions.values()) {
  if (citations.has(r.id)) {
    tally.verified++;
    continue;
  }
  if (r.kind === "review") tally.review++;
  else if (r.kind === "check") fail(r.file, `${r.id} diz ter Check, mas nenhum teste, hook ou config cita o ID (ADR-0022.R7)`);
  else {
    const scope = r.scope ?? PENDING_SCOPE[r.id.slice(4)];
    if (!scope) fail(r.file, `${r.id} está pendente sem caminho: use 'Check: pendente (<caminho>) — …' (ADR-0022.R8)`);
    else if (existsSync(join(ROOT, scope))) fail(r.file, `${r.id} está pendente, mas ${scope} já existe: cite o ID no verificador (ADR-0022.R8)`);
    else tally.pending++;
  }
}

// 9. Corpo de ADR aceito igual ao do commit em que foi aceito (ADR-0022.R2).
// A comparação começa em f3d58ea, o commit em que a imutabilidade passou a valer.
const BASELINE = "f3d58ea";
const git = (...args: string[]): { ok: boolean; out: string } => {
  const run = Bun.spawnSync(["git", ...args], { cwd: ROOT });
  return { ok: run.exitCode === 0, out: run.stdout.toString() };
};
if (git("rev-parse", "--is-shallow-repository").out.trim() !== "false" || !git("cat-file", "-e", `${BASELINE}^{commit}`).ok) {
  fail(ROOT, `sem o histórico do git desde ${BASELINE}: rode num clone completo (no CI, fetch-depth: 0) (ADR-0022.R2)`);
} else {
  for (const file of adrFiles) {
    const text = read(file);
    if (!["accepted", "superseded"].includes(frontmatter(text)["status"] ?? "")) continue;
    const rel = relative(ROOT, file);
    const later = git("log", "--reverse", "--format=%H", `${BASELINE}..HEAD`, "--", rel).out.split("\n").filter(Boolean);
    for (const commit of [BASELINE, ...later]) {
      const old = git("show", `${commit}:${rel}`);
      if (!old.ok || frontmatter(old.out)["status"] !== "accepted") continue;
      if (body(old.out) !== body(text)) fail(file, `o corpo mudou desde que o ADR foi aceito (${commit.slice(0, 7)}); crie um ADR novo (ADR-0022.R2)`);
      break;
    }
  }
}

if (errors.length > 0) {
  console.error(`docs:check — ${errors.length} problema(s):\n` + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(
  `docs:check — ok (${mdFiles.length} arquivos, ${ruleIds.size} regras, ${adrFiles.length} ADRs; ` +
    `restrições: ${tally.verified} verificadas, ${tally.pending} pendentes, ${tally.review} por revisão)`,
);
