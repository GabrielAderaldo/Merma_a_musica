// Pontos de medição que embrulham um adapter sem mudar o contrato dele (ADR-0010).
import type { Fetch } from "../playlist/http.ts";
import type { DeezerStatus, Metrics } from "./metrics.ts";

const DEEZER_API = "api.deezer.com";

const statusClass = (status: number): DeezerStatus =>
  status === 429 ? "429" : status >= 500 ? "5xx" : status >= 400 ? "4xx" : "2xx";

// deezer_request_total{status}: só as chamadas à API (não o download do MP3, que vai à CDN).
export const countDeezerRequests =
  (fetch: Fetch, metrics: Metrics): Fetch =>
  async (url, init) => {
    if (URL.parse(url)?.hostname !== DEEZER_API) return fetch(url, init);
    try {
      const response = await fetch(url, init);
      metrics.deezerRequests.inc({ status: statusClass(response.status) });
      return response;
    } catch (error) {
      metrics.deezerRequests.inc({ status: "network_error" });
      throw error;
    }
  };

// Mede quanto uma chamada assíncrona leva, em segundos, inclusive quando ela devolve "não achei".
export const timed =
  <A extends unknown[], R>(run: (...args: A) => Promise<R>, observe: (seconds: number) => void, now: () => number = performance.now.bind(performance)) =>
  async (...args: A): Promise<R> => {
    const start = now();
    try {
      return await run(...args);
    } finally {
      observe((now() - start) / 1000);
    }
  };
