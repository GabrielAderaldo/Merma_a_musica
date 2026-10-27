// S-10: o MP3 sai do proxy sem as tags ID3, que trazem título, artista e capa. ID3v2 fica no início (pode haver mais
// de uma) e ID3v1 nos últimos 128 bytes. Recorta a mesma memória, sem copiar.

const ID3V2_HEADER = 10;
const ID3V1_SIZE = 128;

const startsWith = (bytes: Uint8Array, at: number, magic: string): boolean =>
  at >= 0 && at + magic.length <= bytes.length && [...magic].every((ch, i) => bytes[at + i] === ch.charCodeAt(0));

// Tamanho syncsafe: 4 bytes de 7 bits (ID3v2.4, seção 6.2).
const syncsafe = (bytes: Uint8Array, at: number): number =>
  ((bytes[at] ?? 0) << 21) | ((bytes[at + 1] ?? 0) << 14) | ((bytes[at + 2] ?? 0) << 7) | (bytes[at + 3] ?? 0);

export const stripId3 = <T extends ArrayBufferLike>(bytes: Uint8Array<T>): Uint8Array<T> => {
  let start = 0;
  while (startsWith(bytes, start, "ID3") && start + ID3V2_HEADER <= bytes.length) {
    const footer = ((bytes[start + 5] ?? 0) & 0x10) !== 0 ? ID3V2_HEADER : 0;
    start += ID3V2_HEADER + syncsafe(bytes, start + 6) + footer;
  }
  let end = bytes.length;
  if (end - ID3V1_SIZE >= start && startsWith(bytes, end - ID3V1_SIZE, "TAG")) end -= ID3V1_SIZE;
  return bytes.subarray(Math.min(start, end), end);
};
