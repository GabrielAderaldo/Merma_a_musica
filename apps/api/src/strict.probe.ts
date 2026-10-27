// Sonda do S-27, rodada por strict.test.ts num processo com a flag de produção. Imprime um JSON com o que o
// processo recusou e se o Zod ainda valida, sem o JIT de `new Function`.
import { WsClientMessage } from "@merma/schema";

const refused = (run: () => unknown): boolean => {
  try {
    run();
    return false;
  } catch {
    return true;
  }
};

const zodWorks =
  WsClientMessage.safeParse({ type: "submit_answer", answer_text: "Evidências" }).success &&
  !WsClientMessage.safeParse({ type: "submit_answer", answer_text: "x", player_uuid: "forjado" }).success;

console.log(
  JSON.stringify({
    // oxlint-disable-next-line no-eval -- a sonda precisa tentar o eval para provar que a flag o recusa.
    eval: refused(() => (0, eval)("1")),
    function: refused(() => new Function("return 1")),
    zod: zodWorks,
  }),
);
