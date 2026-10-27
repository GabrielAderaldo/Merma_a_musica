// Close codes que o servidor usa no WebSocket da sala. O servidor sempre passa o código: no Bun ≥ 1.4.4,
// `close()` sem código manda 1005 e `server.stop(true)` manda 1001 (ADR-0018; o teste está em
// apps/api/src/http/socket.test.ts).
// Frame malformado, UTF-8 inválido e mensagem acima de `maxPayloadLength` o próprio Bun fecha com 1002, 1007 e
// 1009, antes de a mensagem chegar ao Zod.
export const CloseCode = {
  normal: 1000,
  server_shutdown: 1001, // SIGTERM: o snapshot já foi gravado, o cliente reconecta (ADR-0017.R8)
  invalid_payload_repeated: 1003, // 3 payloads inválidos (S-24)
  origin_not_allowed: 1008,
  duplicate_identity: 4001, // mesma identidade abriu outra conexão
  rate_limited_repeated: 4029, // 3ª violação de rate limit (S-23)
} as const;

export type CloseCode = (typeof CloseCode)[keyof typeof CloseCode];
