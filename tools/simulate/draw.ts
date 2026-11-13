/**
 * Randomness a simulation can replay.
 *
 * Every chance a simulated reader takes is a **draw named by where it is
 * taken**: the seed, then a path such as `["reader", treeId, day, 41, "stay", 2]`.
 * The same seed and path always give the same number, and no draw depends on
 * how many were taken before it. So a world is a pure function of its seed
 * (0384 clause 5), a surprising run can be replayed exactly, and adding a draw
 * to one reader cannot shift what another reader does.
 *
 * Not cryptographic and not meant to be: FNV-1a over the path, finished with
 * MurmurHash3's 32-bit mix so neighbouring paths land far apart.
 */

export type DrawPath = readonly (string | number)[]

const FNV_OFFSET = 0x811c9dc5

const FNV_PRIME = 0x01000193

const TWO_TO_32 = 2 ** 32

const fnv1a = (text: string): number =>
  Array.from(text).reduce(
    (hash, character) => Math.imul(hash ^ (character.codePointAt(0) ?? 0), FNV_PRIME),
    FNV_OFFSET
  ) >>> 0

const shiftXor = (hash: number, by: number): number => hash ^ (hash >>> by)

/** MurmurHash3's finaliser: every input bit reaches every output bit. */
const mix = (hash: number): number =>
  shiftXor(Math.imul(shiftXor(Math.imul(shiftXor(hash, 16), 0x85ebca6b), 13), 0xc2b2ae35), 16) >>> 0

const keyOf = (seed: number, path: DrawPath): string => `${seed}:${path.join("/")}`

/** A number in [0, 1), the same every time for the same seed and path. */
export const drawOf = (seed: number, path: DrawPath): number =>
  mix(fnv1a(keyOf(seed, path))) / TWO_TO_32

/** `count` bytes, each its own draw under `path`. What a view key is minted from. */
export const bytesOf = (seed: number, path: DrawPath, count: number): Uint8Array =>
  Uint8Array.from({ length: count }, (_, index) =>
    Math.floor(drawOf(seed, [...path, "byte", index]) * 256)
  )

/** True with probability `chance`, as drawn at `path`. */
export const happens = (seed: number, path: DrawPath, chance: number): boolean =>
  drawOf(seed, path) < chance
