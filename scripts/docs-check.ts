// Detecta documentação apodrecida (ADR-0012). Rode com `bun run docs:check`.
// Sem dependências: só Bun + node:fs/path.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const errors: string[] = [];
const fail = (file: string, msg: string): void => {
  errors.push(`${relative(ROOT, file)}: ${msg}`);
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

const frontmatter = (text: string): Record<string, string> => {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  const fields: Record<string, string> = {};
  if (!m?.[1]) return fields;
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv?.[1]) fields[kv[1]] = (kv[2] ?? "").replace(/^["']|["']$/g, "");
  }
  return fields;
};

// Remove blocos de código: links e IDs dentro deles são exemplos, não referências.
const stripCode = (text: string): string => text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");

const docsFiles = walk(join(ROOT, "docs")).filter((f) => f.endsWith(".md"));
const harnessFiles = walk(join(ROOT, ".claude")).filter((f) => f.endsWith(".md"));
const rootFiles = ["CLAUDE.md", "README.md"].map((f) => join(ROOT, f)).filter(existsSync);
const mdFiles = [...docsFiles, ...harnessFiles, ...rootFiles];

// 1. CLAUDE.md raiz curto (ADR-0012.R1)
const claudeMd = join(ROOT, "CLAUDE.md");
if (existsSync(claudeMd)) {
  const lines = read(claudeMd).split("\n").length;
  if (lines > 100) fail(claudeMd, `${lines} linhas; o teto é 100 (ADR-0012.R1)`);
}

// 2. Links relativos resolvem (ADR-0012.R5)
for (const file of mdFiles) {
  for (const [, target] of stripCode(read(file)).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    if (!target || /^(https?:|mailto:|#)/.test(target)) continue;
    const path = decodeURIComponent(target.split("#")[0] ?? "");
    if (path && !existsSync(resolve(dirname(file), path))) fail(file, `link quebrado → ${target}`);
  }
}

// 3. IDs de regra do GDD únicos e referências existentes (ADR-0012.R5)
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

// 4. ADRs bem formados (ADR-0012.R3)
const adrDir = join(ROOT, "docs/adr");
const adrFiles = walk(adrDir).filter((f) => /\/\d{4}-[a-z0-9-]+\.md$/.test(f));
const adrNumbers = new Set(adrFiles.map((f) => basename(f).slice(0, 4)));
const STATUSES = new Set(["proposed", "accepted", "superseded", "deprecated"]);
for (const file of adrFiles) {
  const text = read(file);
  const fm = frontmatter(text);
  const num = basename(file).slice(0, 4);
  for (const key of ["id", "title", "status", "date"]) {
    if (!fm[key]) fail(file, `frontmatter sem '${key}'`);
  }
  if (fm["id"] && fm["id"] !== `ADR-${num}`) fail(file, `id '${fm["id"]}' não bate com o arquivo (ADR-${num})`);
  if (fm["status"] && !STATUSES.has(fm["status"])) fail(file, `status inválido '${fm["status"]}'`);
  if (fm["status"] === "superseded") {
    const by = /ADR-(\d{4})/.exec(fm["superseded_by"] ?? "")?.[1];
    if (!by || !adrNumbers.has(by)) fail(file, "superseded sem 'superseded_by' apontando para ADR existente");
    continue;
  }
  const section = /## Restrições\n([\s\S]*?)(\n## |$)/.exec(text)?.[1];
  if (section === undefined) {
    fail(file, "sem seção '## Restrições'");
    continue;
  }
  for (const line of section.split("\n").filter((l) => l.startsWith("- **"))) {
    if (!line.startsWith(`- **ADR-${num}.R`)) fail(file, `restrição com ID fora do padrão ADR-${num}.Rn: ${line.slice(0, 60)}`);
    if (!/Check:|Review:/.test(line)) fail(file, `restrição sem 'Check:' nem 'Review:': ${line.slice(0, 60)}`);
  }
}

// 5. Specs pré-código vencidos (ADR-0012.R4)
for (const file of walk(join(ROOT, "docs/specs")).filter((f) => f.endsWith(".md"))) {
  const until = frontmatter(read(file))["until"];
  if (!until) fail(file, "spec pré-código sem 'until:' no frontmatter");
  else if (existsSync(join(ROOT, until))) {
    fail(file, `${until} já existe: migre este spec para tipos e testes e apague o arquivo (ADR-0012.R4)`);
  }
}

// 6. Termos da stack antiga fora do histórico de ADRs (CLAUDE.md lista os termos de propósito)
const BANNED = /\b(Gleam|Elixir|Phoenix|SvelteKit|GenServer)\b/;
for (const file of [...docsFiles, ...harnessFiles]) {
  if (file.startsWith(adrDir)) continue;
  const hit = BANNED.exec(read(file));
  if (hit) fail(file, `menciona stack antiga '${hit[1]}'`);
}

// 7. Níveis do Atomic Design não viram pasta no apps/web (ADR-0019.R4)
for (const file of walk(join(ROOT, "apps/web"))) {
  const rel = relative(ROOT, file);
  if (/(^|\/)(atoms|molecules|organisms|templates)\//.test(rel)) fail(file, "pasta por nível do Atomic Design no apps/web (ADR-0019.R4)");
}

// 8. Sem snapshot de doc de terceiros (ADR-0011.R1)
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (/(^|\/)references\/|llms-full|api[_-]reference/i.test(rel)) fail(file, "parece snapshot de doc de terceiros (ADR-0011.R1)");
}

if (errors.length > 0) {
  console.error(`docs:check — ${errors.length} problema(s):\n` + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`docs:check — ok (${mdFiles.length} arquivos, ${ruleIds.size} regras, ${adrFiles.length} ADRs)`);
