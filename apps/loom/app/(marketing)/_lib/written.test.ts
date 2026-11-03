import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import type { JsonObject } from "@jam-overture/loom"
import { createStarterPrimitiveRegistry } from "@jam-overture/loom/primitives"
import { describeRegistryError } from "@jam-overture/loom/sdk"
import { describe, expect, it } from "vitest"

import { priceTag } from "./written/register"
import {
  REGISTERED_TYPE,
  SHOWN_MARKER,
  THE_REGISTRATION,
  WRITTEN_FILES,
  YOUR_COMPONENT,
} from "./written"

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * The published region of a specimen: everything after the marker, trimmed of
 * the blank line the marker leaves behind and of the trailing newline the file
 * ends with.
 *
 * Reading the file here rather than in `written.ts` is the whole arrangement —
 * `written.ts` says why at length. A test runs in the repository; a marketing
 * route runs in a function that does not have one.
 */
const publishedRegionOf = (from: string): string => {
  const text = readFileSync(join(HERE, from), "utf8")
  const at = text.indexOf(SHOWN_MARKER)

  if (at === -1) throw new Error(`loom: ${from} has no published-region marker`)

  return text.slice(at + SHOWN_MARKER.length).trim()
}

describe("the code this site prints under what you write", () => {
  /**
   * The assertion the whole arrangement exists for. If `definePrimitive` grows
   * a required field, or `LoomPrimitiveProps` moves, the specimen stops
   * compiling and `pnpm verify` says so; if somebody fixes the specimen and
   * forgets the page, this says so. There is no third way for the two to
   * disagree.
   */
  it.each(WRITTEN_FILES)("$caption is the published region of $from, exactly", (file) => {
    expect(file.source).toBe(publishedRegionOf(file.from))
  })

  /**
   * And the reader is checking something: a marker that stopped matching would
   * otherwise make every region empty and the assertion above pass on `"" ===
   * ""`. This is the shape `budget.test.ts` and `balance.test.ts` both carry,
   * and the failure it guards against is one this lane has filed once already.
   */
  it.each(WRITTEN_FILES)("$caption has a region with code in it", (file) => {
    expect(file.source.length).toBeGreaterThan(80)
    expect(publishedRegionOf(file.from).length).toBeGreaterThan(80)
  })

  it("prints no comment to the reader, in either panel", () => {
    for (const file of WRITTEN_FILES) {
      expect(file.source).not.toContain("//")
      expect(file.source).not.toContain("/*")
    }
  })

  /**
   * The panels are two halves of one claim, so the first may not mention us and
   * the second has to. A specimen that imported Loom into the reader's own
   * component would be making the opposite point to the one the band makes.
   */
  it("keeps Loom out of the reader's own component", () => {
    expect(YOUR_COMPONENT.source).not.toContain("@jam-overture/loom")
    expect(YOUR_COMPONENT.source).not.toContain("loom")
  })

  it("names the component the reader just read, in the panel beside it", () => {
    expect(THE_REGISTRATION.source).toContain("PriceTag")
    expect(THE_REGISTRATION.source).toContain("./price-tag")
  })

  /**
   * `loom.editable` is how the portal finds an element on a live page, and the
   * framework's own note on the field says a component that drops it renders
   * correctly and becomes invisible there. Showing a reader the shape that
   * silently costs them the review screen is the one error in this panel that
   * no reader could catch, so it is pinned.
   */
  it("shows the attributes the portal needs, rather than the shape that loses them", () => {
    expect(THE_REGISTRATION.source).toContain("loom.editable")
  })
})

/**
 * The budget that replaces the one the prose ledger stopped keeping.
 *
 * `measure.ts` no longer counts what is inside a source panel, and
 * `voice.test.ts` no longer reads it for sentences. `SOURCE_PANEL` in
 * `words.ts` argues why, and the argument only holds while **something** bounds
 * these two panels. This is that something.
 *
 * Stated in the units a code panel is actually read in — lines, and how far a
 * line runs — rather than in words, which is the whole point of moving it here.
 * The numbers are literals a little above today's measurement, in the shape
 * `budget.test.ts` uses and for its stated reason: a ceiling that moves with
 * the thing it measures is not a ceiling.
 *
 * **Why a line length is in here at all.** Both panels say `wrap: false`,
 * because a wrapped line of TypeScript reads as two statements. The cost is
 * that a long line scrolls sideways, and on the phone viewport a reader sees
 * roughly the first forty characters of it. Sixty-six is already past that, so
 * this is not a promise that nothing scrolls — it is a bound on how far, and it
 * is why the registration was reformatted onto the library's own
 * `z\n  .object()\n  .strict()` shape rather than left on one ninety-one
 * character line.
 */
describe("the budget these two panels are kept to", () => {
  const LINES_IN_A_PANEL = 28
  const CHARACTERS_IN_A_PANEL = 900
  const CHARACTERS_IN_A_LINE = 80
  const LINES_IN_THE_BAND = 36
  const A_CEILING_IS_BINDING_ABOVE = 0.6

  const linesOf = (file: { readonly source: string }): readonly string[] =>
    file.source.split("\n")

  it.each(WRITTEN_FILES)("$caption is a file a reader takes in, not a tutorial", (file) => {
    expect(linesOf(file).length).toBeLessThanOrEqual(LINES_IN_A_PANEL)
    expect(file.source.length).toBeLessThanOrEqual(CHARACTERS_IN_A_PANEL)
  })

  it.each(WRITTEN_FILES)("$caption runs no line further than a reader can see", (file) => {
    const over = linesOf(file)
      .filter((line) => line.length > CHARACTERS_IN_A_LINE)
      .map((line) => `${line.length}: ${line}`)

    expect(over).toEqual([])
  })

  it("is two panels and the band is the pair of them", () => {
    expect(WRITTEN_FILES.length).toBe(2)
    expect(
      WRITTEN_FILES.reduce((total, file) => total + linesOf(file).length, 0)
    ).toBeLessThanOrEqual(LINES_IN_THE_BAND)
  })

  /**
   * And every ceiling above is one the panels are near, so none of them can be
   * raised quietly to let the next run paste a longer file in. The same guard
   * `budget.test.ts` puts under its own numbers, for the same reason.
   */
  it("every ceiling is a ceiling these panels are near", () => {
    const lines = WRITTEN_FILES.map((file) => linesOf(file).length)
    const nearest: Readonly<Record<string, readonly [number, number]>> = {
      "a panel's lines": [Math.max(...lines), LINES_IN_A_PANEL],
      "a panel's characters": [
        Math.max(...WRITTEN_FILES.map((file) => file.source.length)),
        CHARACTERS_IN_A_PANEL,
      ],
      "a line": [
        Math.max(...WRITTEN_FILES.flatMap((file) => linesOf(file).map((line) => line.length))),
        CHARACTERS_IN_A_LINE,
      ],
      "the band": [lines.reduce((total, count) => total + count, 0), LINES_IN_THE_BAND],
    }

    for (const [what, [widest, ceiling]] of Object.entries(nearest)) {
      expect(
        widest / ceiling,
        `${what}: widest is ${widest} against a ceiling of ${ceiling} — either the ceiling is too high to mean anything, or the code it was set for is gone`
      ).toBeGreaterThanOrEqual(A_CEILING_IS_BINDING_ABOVE)
    }
  })
})

describe("the registration this site prints", () => {
  /**
   * Not a transcription check: the module the page quotes is imported and the
   * entry it produces is put through the same door a deployment uses. The code
   * on the page is therefore known to **work**, not merely to compile.
   */
  it("is accepted beside the starter set, under the name the copy quotes", () => {
    const built = createStarterPrimitiveRegistry([priceTag])

    expect(built.ok ? "ok" : describeRegistryError(built.error)).toBe("ok")
    expect(priceTag.type).toBe(REGISTERED_TYPE)
  })

  it("accepts the props it declares and refuses what it does not", () => {
    const outcomeOf = (props: JsonObject): string => priceTag.validate(props).outcome

    expect(outcomeOf({ amount: "£18.00" })).toBe("valid")
    expect(outcomeOf({ amount: "£18.00", was: "£24.00" })).toBe("valid")
    expect(outcomeOf({ amount: 18 })).toBe("invalid")
    expect(outcomeOf({ amount: "£18.00", colour: "red" })).toBe("invalid")
  })
})
