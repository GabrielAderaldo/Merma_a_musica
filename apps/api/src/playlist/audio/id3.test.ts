import { describe, expect, test } from "bun:test";
import { stripId3 } from "./id3.ts";

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

// Cabeçalho ID3v2 com corpo de `size` bytes (tamanho syncsafe).
const id3v2 = (size: number, body = 0x41, footer = false) => [
  ...ascii("ID3"),
  4,
  0,
  footer ? 0x10 : 0,
  (size >> 21) & 0x7f,
  (size >> 14) & 0x7f,
  (size >> 7) & 0x7f,
  size & 0x7f,
  ...Array<number>(size).fill(body),
  ...(footer ? [...ascii("3DI"), 4, 0, 0x10, 0, 0, 0, 0] : []),
];
const id3v1 = () => [...ascii("TAG"), ...Array<number>(125).fill(0x42)];
// Um frame MP3 começa com 11 bits de sincronia (0xFFE).
const frame = (n: number) => [0xff, 0xfb, 0x90, 0x64, ...Array<number>(n).fill(0x55)];

const strip = (bytes: number[]) => [...stripId3(new Uint8Array(bytes))];

describe("S-10: stripId3 tira título, artista e capa do MP3", () => {
  test.each([
    ["sem tag", [], []],
    ["ID3v2 no início", id3v2(20), []],
    ["ID3v2 com footer", id3v2(20, 0x41, true), []],
    ["dois ID3v2 seguidos", [...id3v2(5), ...id3v2(7)], []],
    ["ID3v1 no fim", [], id3v1()],
    ["os dois", id3v2(300), id3v1()],
  ])("%s", (_name, before, after) => {
    expect(strip([...before, ...frame(400), ...after])).toEqual(frame(400));
  });

  test("tamanho maior que o arquivo não estoura: sobra vazio", () => {
    expect(strip(id3v2(10).slice(0, 12))).toEqual([]);
  });

  test("propriedade: a saída nunca tem tag e continua começando num frame MP3", () => {
    let seed = 7;
    const random = (max: number) => {
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
      return seed % max;
    };
    for (let i = 0; i < 500; i++) {
      const tags = Array.from({ length: random(3) }, () => id3v2(random(2_000), random(256), random(2) === 1)).flat();
      const audio = frame(random(3_000));
      const out = strip([...tags, ...audio, ...(random(2) === 1 ? id3v1() : [])]);
      expect(out).toEqual(audio);
      expect(String.fromCharCode(...out.slice(0, 3))).not.toBe("ID3");
      expect(((out[0] ?? 0) << 8 | (out[1] ?? 0)) & 0xffe0).toBe(0xffe0);
      expect(String.fromCharCode(...out.slice(-128, -125))).not.toBe("TAG");
    }
  });
});
