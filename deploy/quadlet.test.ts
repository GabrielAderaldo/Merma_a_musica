// Checks das restrições do ADR-0017 sobre os arquivos Quadlet de deploy/quadlet/.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dir, "quadlet");
const units = readdirSync(DIR)
  .filter((f) => /\.(pod|container|volume)$/.test(f))
  .map((name) => ({ name, text: readFileSync(join(DIR, name), "utf8") }));
const containers = units.filter((u) => u.name.endsWith(".container"));

const values = (text: string, key: string): string[] =>
  text
    .split("\n")
    .filter((line) => line.startsWith(`${key}=`))
    .map((line) => line.slice(key.length + 1));

describe("ADR-0017 — arquivos Quadlet", () => {
  test("existem o pod e os quatro containers", () => {
    expect(units.map((u) => u.name)).toEqual(
      expect.arrayContaining(["merma.pod", "merma-api.container", "merma-caddy.container", "merma-postgres.container", "merma-redis.container"]),
    );
  });

  test.each(containers)("ADR-0017.R1 $name está no pod merma", ({ text }) => {
    expect(values(text, "Pod")).toEqual(["merma.pod"]);
  });

  test("ADR-0017.R2 só o pod publica portas, e só 80 e 443", () => {
    for (const { name, text } of containers) expect(values(text, "PublishPort"), name).toEqual([]);
    const pod = units.find((u) => u.name === "merma.pod")?.text ?? "";
    expect(values(pod, "PublishPort").sort()).toEqual(["443:443", "443:443/udp", "80:80"]);
  });

  test("ADR-0017.R2 Postgres e Redis escutam só em 127.0.0.1", () => {
    const exec = (name: string) => values(containers.find((u) => u.name === name)?.text ?? "", "Exec").join(" ");
    expect(exec("merma-postgres.container")).toContain("listen_addresses=127.0.0.1");
    expect(exec("merma-redis.container")).toContain("--bind 127.0.0.1");
  });

  test("ADR-0009.R3 Redis só em loopback, com requirepass e AOF", () => {
    const exec = values(containers.find((u) => u.name === "merma-redis.container")?.text ?? "", "Exec").join(" ");
    expect(exec).toContain("--bind 127.0.0.1");
    expect(exec).toContain("requirepass");
    expect(exec).toContain("--appendonly yes");
  });

  test.each(containers)("ADR-0017.R3 $name referencia a imagem por digest", ({ name, text }) => {
    // A API recebe a imagem do drop-in escrito pelo deploy/merma-deploy; a do arquivo base é só um placeholder local.
    for (const image of values(text, "Image")) {
      if (name === "merma-api.container") expect(image).toStartWith("localhost/");
      else expect(image).toMatch(/@sha256:[0-9a-f]{64}$/);
    }
  });

  test.each(containers)("ADR-0017.R4 $name não põe segredo em Environment=", ({ text }) => {
    for (const env of values(text, "Environment").flatMap((v) => v.split(/\s+/))) {
      expect(env).not.toMatch(/^[A-Z_]*(PASSWORD|SECRET|TOKEN|KEY)[A-Z_]*=(?!\/run\/secrets\/)/);
    }
  });

  test.each(containers)("ADR-0017.R6 $name não usa AutoUpdate= (num pod ele reinicia o pod inteiro)", ({ text }) => {
    expect(values(text, "AutoUpdate")).toEqual([]);
  });

  test.each(containers)("ADR-0017.R7 $name espera o healthcheck (Notify=healthy + HealthCmd=)", ({ text }) => {
    expect(values(text, "Notify")).toEqual(["healthy"]);
    expect(values(text, "HealthCmd")).toHaveLength(1);
  });
});
