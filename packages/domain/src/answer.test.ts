import { describe, expect, test } from "bun:test";
import { calculatePoints, evaluateAnswer, levenshtein, matchThreshold, normalize } from "./answer.ts";
import { seconds } from "./brand.ts";
import { ms } from "./testing.ts";

// ADR-0007.R2: as tabelas de casos do GDD (R-111 a R-114) viram test.each.
describe("ADR-0007.R2 — tabelas do GDD", () => {
  test.each([
    ["Bohemian Rhapsody", "bohemian rhapsody"],
    ["Evidências", "evidencias"],
    ["The Weeknd", "weeknd"],
    ["Hey Jude (feat. Paul)", "hey jude"],
    ["  El   tonto  ", "tonto"],
    ["O O O", ""],
    ["Los Hermanos", "los hermanos"],
    ["", ""],
    ["   ", ""],
  ])("R-111 normaliza %p → %p", (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  test.each([
    ["bohemian rhapsody", "Bohemian Rhapsody", true],
    ["boemian rapsody", "Bohemian Rhapsody", true],
    ["Evidencias", "Evidências", true],
    ["Weekend", "The Weeknd", true],
    ["musica aleatoria", "Bohemian Rhapsody", false],
    ["(qualquer coisa)", "Bohemian Rhapsody", false],
    ["hermanos", "Los Hermanos", false],
  ])("R-112 %p contra %p → acerta=%p", (input, target, matched) => {
    expect(evaluateAnswer(input, { name: target, artist: "x" }, "song").matched).toBe(matched);
  });
});

describe("R-111 normalização", () => {
  test("R-111 remove colchetes e mantém pontuação de dentro da palavra", () => {
    expect(normalize("Don't Stop [Remastered 2011]")).toBe("don't stop");
  });
  test("R-111 `las` não é artigo", () => {
    expect(normalize("Las Ketchup")).toBe("las ketchup");
  });
});

describe("Levenshtein", () => {
  test.each([
    ["", "", 0],
    ["abc", "", 3],
    ["kitten", "sitting", 3],
    ["weekend", "weeknd", 1],
    ["hermanos", "los hermanos", 4],
  ])("d(%p, %p) = %p", (a, b, d) => {
    expect(levenshtein(a, b)).toBe(d);
  });
  test.each([["abc"], ["evidencias"], ["ção"]])("d(a, a) = 0 para %p", (a) => {
    expect(levenshtein(a, a)).toBe(0);
  });
  test.each([
    ["kitten", "sitting"],
    ["a", "bcd"],
    ["flaw", "lawn"],
  ])("simetria: d(%p, %p) = d(b, a)", (a, b) => {
    expect(levenshtein(a, b)).toBe(levenshtein(b, a));
  });
  test("compara code points, não unidades UTF-16", () => {
    expect(levenshtein("🎵", "🎶")).toBe(1);
  });
});

describe("R-112 e R-113 limite e na trave", () => {
  test.each([
    ["weeknd", 1],
    ["u2", 1],
    ["bohemian rhapsody", 2],
    ["a".repeat(40), 6],
  ])("R-112 limite de %p = %p", (target, limit) => {
    expect(matchThreshold(target)).toBe(limit);
  });
  test("R-113 errou por até limite + 2 → near_miss", () => {
    // "bohemian rhapsody": limite 2; distância 4 → na trave.
    const e = evaluateAnswer("bomian rapody", { name: "Bohemian Rhapsody", artist: "Queen" }, "song");
    expect(e).toMatchObject({ matched: false, near_miss: true, distance: 4 });
  });
  test("R-113 distância limite + 3 não é near_miss", () => {
    const e = evaluateAnswer("bomian rapod", { name: "Bohemian Rhapsody", artist: "Queen" }, "song");
    expect(e).toMatchObject({ matched: false, near_miss: false, distance: 5 });
  });
  test("R-112 entrada vazia depois de normalizar nunca é near_miss, mesmo com alvo curto", () => {
    expect(evaluateAnswer("(nada)", { name: "U2", artist: "x" }, "song")).toMatchObject({ matched: false, near_miss: false });
  });
});

describe("R-110 e R-114 modos de resposta", () => {
  const queen = { name: "Bohemian Rhapsody", artist: "Queen" };
  test("R-110 song não aceita o artista", () => {
    expect(evaluateAnswer("Queen", queen, "song").matched).toBe(false);
  });
  test("R-110 artist aceita o artista e não a música", () => {
    expect(evaluateAnswer("queen", queen, "artist").matched).toBe(true);
    expect(evaluateAnswer("bohemian rhapsody", queen, "artist").matched).toBe(false);
  });
  test.each([["bohemian rhapsody"], ["Queen"]])("R-114 both aceita %p", (input) => {
    expect(evaluateAnswer(input, queen, "both").matched).toBe(true);
  });
  test("R-114 both sem acerto devolve o alvo mais próximo", () => {
    // "qn" contra "queen": distância 3 = limite 1 + 2 → na trave pelo artista.
    const e = evaluateAnswer("qn", queen, "both");
    expect(e).toMatchObject({ matched: false, near_miss: true, distance: 3, normalized_target: "queen" });
  });
});

describe("R-201 e R-202 pontuação", () => {
  const T = seconds(30);
  test.each([
    [0, 1000],
    [5, 850],
    [10, 700],
    [15, 550],
    [20, 400],
    [25, 250],
    [30, 100],
    [35, 100],
  ])("R-202 speed_bonus: %ps de 30s → %p", (t, points) => {
    expect(calculatePoints("speed_bonus", true, seconds(t), T)).toBe(points);
  });
  test("R-202 arredonda: 1s de 30s → 970", () => {
    expect(calculatePoints("speed_bonus", true, ms(1000), T)).toBe(970);
    expect(calculatePoints("speed_bonus", true, ms(333), T)).toBe(990);
  });
  test("R-202 erro ou sem resposta → 0, sem penalidade", () => {
    expect(calculatePoints("speed_bonus", false, seconds(1), T)).toBe(0);
    expect(calculatePoints("speed_bonus", true, null, T)).toBe(0);
  });
  test("R-201 simple: acerto 1, erro 0", () => {
    expect(calculatePoints("simple", true, seconds(29), T)).toBe(1);
    expect(calculatePoints("simple", false, seconds(1), T)).toBe(0);
  });
});
