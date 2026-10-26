// Toda função que pode falhar retorna Result; a engine não usa throw (ADR-0015.R3).
export type Result<T, E> = Readonly<{ ok: true; value: T } | { ok: false; error: E }>;

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Erro que só acontece se um invariante da engine quebrou. Também é err, nunca exceção.
export type InternalDomainError = "internal_error";
