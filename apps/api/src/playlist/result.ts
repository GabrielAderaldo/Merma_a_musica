// O Result da apps/api. A Playlist Integration não importa a engine (ADR-0023.R1), então tem o seu, com a mesma
// forma do de @merma/domain: os dois se atribuem um ao outro.
export type Result<T, E> = Readonly<{ ok: true; value: T } | { ok: false; error: E }>;

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
