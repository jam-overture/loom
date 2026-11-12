/**
 * A list of names as one short line, and back.
 *
 * The names file carries every name the runtime publishes, and on 11 November
 * it had **148 bytes left under its 40,000-byte cap** with 2,093 of them in it,
 * so the next lane to export a function would have turned `pnpm verify` red.
 * Much of a name's cost was not news. Written as a JSON array, each one paid
 * two quotes and a comma; and names come in families — `policyLogOf`,
 * `policyLogRow`, `policyLogRows` — so in alphabetical order most of a name
 * repeats the one before it.
 *
 * So a list is **sorted and front-coded**: each name says how much of the one
 * before it to keep, as one base-36 digit, then writes the rest, and the names
 * are joined by spaces. `policyLogOf policyLogRow policyLogRows` is written
 * `0policyLogOf 9Row cs` — the last keeps twelve characters and adds an `s`.
 * That took the file from 39,852 bytes to about 27,000, which is room for
 * roughly another thousand names rather than another ten.
 *
 * A space is a safe separator because a name is an identifier and an
 * identifier has none — and `encodeNames` refuses one that does rather than
 * write a file that decodes to the wrong names. The digit tops out at 35
 * (`z`), so a longer shared run simply keeps 35 and writes the rest out; the
 * file is a little bigger and still exactly right.
 *
 * **Sorting is what makes it small, not what makes it right.** `decodeNames`
 * reads any list `encodeNames` could write, in any order, so a list that came
 * here unsorted would round-trip exactly and merely cost more.
 */

const SEPARATOR = " "
const RADIX = 36
const LONGEST_KEPT = RADIX - 1

const sharedLength = (before: string, name: string): number => {
  const limit = Math.min(before.length, name.length, LONGEST_KEPT)
  const at = [...Array(limit).keys()].find((index) => before[index] !== name[index])

  return at ?? limit
}

const encodeOne = (before: string, name: string): string => {
  const kept = sharedLength(before, name)

  return `${kept.toString(RADIX)}${name.slice(kept)}`
}

/** Sorts `names` and writes them as one front-coded line. */
export const encodeNames = (names: readonly string[]): string => {
  const spaced = names.find((name) => name.includes(SEPARATOR))

  if (spaced !== undefined) throw new Error(`loom: "${spaced}" has a space in it, so it cannot be a name`)

  const sorted = [...names].sort()

  return sorted.map((name, at) => encodeOne(sorted[at - 1] ?? "", name)).join(SEPARATOR)
}

const DIGIT = /^[0-9a-z]$/

/**
 * The names a line stands for, or `undefined` when it is not a line
 * `encodeNames` could have written.
 *
 * A broken line is refused whole rather than read as far as it goes, because
 * every name after a bad one is built on it and would be wrong in a way no
 * reader could see — a result titled with a name the runtime never published.
 */
export const decodeNames = (line: string): readonly string[] | undefined => {
  if (line === "") return []

  return line.split(SEPARATOR).reduce<readonly string[] | undefined>((names, token) => {
    if (names === undefined) return undefined

    const digit = token.charAt(0)
    const before = names.at(-1) ?? ""
    const kept = parseInt(digit, RADIX)

    if (!DIGIT.test(digit) || kept > before.length) return undefined

    const name = `${before.slice(0, kept)}${token.slice(1)}`

    return name === "" ? undefined : [...names, name]
  }, [])
}
