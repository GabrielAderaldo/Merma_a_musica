import { describe, expect, test } from "bun:test";
import { countDeezerRequests, timed } from "./instrument.ts";
import { testMetrics } from "./metrics.ts";

describe("deezer_request_total{status}", () => {
  test("conta a API da Deezer por classe de status, e não outros hosts", async () => {
    const metrics = testMetrics();
    const statuses = [200, 404, 429, 503];
    let i = 0;
    const fetch = countDeezerRequests(async () => new Response("{}", { status: statuses[i++] ?? 200 }), metrics);
    for (let n = 0; n < statuses.length; n++) await fetch("https://api.deezer.com/track/1");
    await fetch("https://cdnt-preview.dzcdn.net/x.mp3");
    for (const status of ["2xx", "4xx", "429", "5xx"] as const) expect(metrics.deezerRequests.value({ status })).toBe(1);
  });

  test("erro de rede conta como network_error e segue lançando", async () => {
    const metrics = testMetrics();
    const fetch = countDeezerRequests(() => Promise.reject(new Error("ECONNRESET")), metrics);
    await expect(fetch("https://api.deezer.com/track/1")).rejects.toThrow("ECONNRESET");
    expect(metrics.deezerRequests.value({ status: "network_error" })).toBe(1);
  });
});

test("timed observa a duração em segundos", async () => {
  const seen: number[] = [];
  let t = 0;
  const run = timed(async (x: number) => { t += 1500; return x * 2; }, (s) => seen.push(s), () => t);
  expect(await run(2)).toBe(4);
  expect(seen).toEqual([1.5]);
});
