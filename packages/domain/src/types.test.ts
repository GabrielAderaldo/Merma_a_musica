import { expect, test } from "bun:test";
import { ErrorCode } from "@merma/schema";
import { DOMAIN_ERRORS, INTERNAL_ONLY_ERRORS } from "./types.ts";

test("todo erro da engine que o cliente pode provocar existe no ErrorCode do fio", () => {
  const wire: readonly string[] = ErrorCode.options;
  const clientFacing = DOMAIN_ERRORS.filter((e) => !INTERNAL_ONLY_ERRORS.includes(e));
  expect(clientFacing.filter((e) => !wire.includes(e))).toEqual([]);
});

test("erro só interno não vaza para o fio", () => {
  const wire: readonly string[] = ErrorCode.options;
  expect(INTERNAL_ONLY_ERRORS.filter((e) => wire.includes(e))).toEqual([]);
});
