import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import type { MechanismContext } from "./how-it-works"

/**
 * Every field a page of this site may be handed, and the rule that one of them
 * has to read it.
 *
 * **This is the test that was missing on 26 September**, and the fortnight it
 * cost is the argument for it. The band that printed a `PaperTrail` was
 * rewritten away that day; the `trail` field stayed on the context, `render.ts`
 * went on resolving one for every asked request, and the two comments covering
 * it explained the arrangement as deliberate — one of them naming a reader,
 * *"the front door's notice"*, which has no such field. Nothing was broken,
 * nothing was red, and every asked request ran the whole sequence twice more
 * than it needed to for a value that was thrown away.
 *
 * None of the instruments this surface already has could see it. The type
 * checker is happy with an optional field nobody reads, the page tests assert
 * what the page *does* contain, and a screenshot of a correct page is a
 * screenshot of a correct page.
 *
 * So the invariant is the general one rather than a line about the trail: **a
 * context field is a promise that some page reads it.** A field nothing reads
 * is either work being done for nobody, as this one was, or a page that forgot
 * to read it, which is the same test going red from the other direction.
 */

/**
 * The fields, listed here and held against the type by the compiler.
 *
 * `Required<MechanismContext>` means a field added to the context and left out
 * of this object is a build error rather than a quietly unchecked field, which
 * is what makes the sweep below exhaustive rather than a list somebody
 * remembers to extend. The values are placeholders and nothing reads them; it
 * is the **keys** that are the subject.
 */
const EVERY_FIELD: Record<keyof Required<MechanismContext>, true> = {
  origin: true,
  theme: true,
  ask: true,
  approve: true,
  back: true,
  backApprove: true,
  record: true,
  undone: true,
}

/**
 * Where a field may be read: the page builders, and the two modules a builder
 * hands a whole context to.
 *
 * `chrome.ts` is in the list because the header and the footer are built from a
 * `ChromeContext` spread out of the page's own, so a field may be read there
 * rather than in any page. `requested.ts` is in it for the same reason at the
 * other end of the request.
 */
const sourceOf = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")

const PAGES = readdirSync(fileURLToPath(new URL(".", import.meta.url)))
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .map((name) => sourceOf(`./${name}`))

/**
 * What counts as reading one, and why it is a property access rather than the
 * name appearing.
 *
 * The first draft of this test looked for the name, and it passed against the
 * exact bug it was written for: a field's own declaration is in one of the
 * files being swept, so `readonly trail?: PaperTrail` was read as a reader of
 * `trail`. A test that is green on the thing it is about is worse than no test,
 * because it is also an argument that somebody checked.
 *
 * `.field` is what a read looks like in every shape this surface uses it in —
 * `context.theme`, `record.landed`, `askHref(context.origin, …)` — and it is
 * not what a declaration looks like. A field consumed only by being spread
 * onward is not matched and is not meant to be: the spread hands it to
 * something, and that something names it or nobody does.
 */

/**
 * **A courier is not a reader**, which is the half this file got wrong until
 * 21 October.
 *
 * `counting` was a field nothing on this site read, and this sweep passed it,
 * because `home.ts` said `counting: context.counting === true` while building
 * the `ChromeContext` — and what it handed that to was the one file in the
 * list that does not name the field. One reader is enough for the rule, the
 * reader was a courier, and the recipient was checked by the same pass that
 * had already accepted the courier.
 *
 * So a hand-off is struck out before the sweep looks: `field: thing.field` is
 * a field being passed along, and whether it is *read* is a question about
 * wherever it was passed to. Every recipient on this surface is in the list
 * below, so nothing is lost by refusing to count the courier — the recipient
 * names it or the field goes unread, which is the finding.
 *
 * **The source of the hand-off has to be a plain name.** `ask: context.ask` is
 * a hand-off; `ask: context.record.ask` is a read of a record, and striking it
 * out would be this rule going red at a page that is doing nothing wrong. So
 * the pattern allows one identifier and a single step, and
 * *what counts as reading a field* below holds both
 * halves of it against the predicate directly, which is the only way to say
 * the distinction is live rather than a precaution nothing exercises.
 */
const HANDED_ON = (field: string): RegExp =>
  new RegExp(`\\b${field}\\s*:\\s*[A-Za-z_$][\\w$]*\\.${field}\\b`, "g")

const reads = (source: string, field: string): boolean =>
  new RegExp(`\\.${field}\\b`).test(source.replace(HANDED_ON(field), ""))

const READERS: readonly string[] = [
  ...PAGES,
  sourceOf("../chrome.ts"),
  sourceOf("../requested.ts"),
]

describe("every field a page may be handed", () => {
  it("has at least one page that reads it", () => {
    const unread = Object.keys(EVERY_FIELD).filter(
      (field) => !READERS.some((source) => reads(source, field))
    )

    expect(unread).toEqual([])
  })

  /**
   * The half the sweep above cannot see, written as the one case it missed.
   *
   * A field can be mentioned in a builder and still be read by nobody, because
   * a mention in a comment is a mention. That is exactly how `trail` survived:
   * it was named in two docblocks arguing that resolving it was deliberate. So
   * the names are also checked against the source with its comments taken out,
   * which is the text that actually runs.
   */
  it("is read by code rather than by a comment about it", () => {
    const withoutComments = READERS.map((source) =>
      source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
    )

    const onlyInProse = Object.keys(EVERY_FIELD).filter(
      (field) => !withoutComments.some((source) => reads(source, field))
    )

    expect(onlyInProse).toEqual([])
  })

  /**
   * And the hand-offs are real, so the strike-out above is not dead code.
   *
   * Counted on this surface's own sources rather than stated: if no page ever
   * handed a field on by name, the rule would be strict about nothing and the
   * next `counting` would pass exactly as that one did.
   */
  it("is strict about hand-offs this surface actually writes", () => {
    const couriered = Object.keys(EVERY_FIELD).filter((field) =>
      READERS.some((source) => HANDED_ON(field).test(source))
    )

    expect(couriered.length).toBeGreaterThanOrEqual(4)
  })
})

/**
 * The predicate itself, held against the two shapes it has to tell apart.
 *
 * It is tested directly because what it gets wrong is invisible in the sweep:
 * a predicate that is too generous passes a field nobody reads, which is the
 * fortnight `trail` cost and the nine days `counting` cost, and one that is
 * too strict fails a page that is reading a field perfectly well. Neither
 * shows up as anything but a green or a red on a list of field names.
 */
describe("what counts as reading a field", () => {
  it("does not count a field being handed along under its own name", () => {
    expect(reads("const chrome = { counting: context.counting === true }", "counting")).toBe(false)
    expect(reads("answerBand(ids, { origin: context.origin, theme: context.theme })", "theme")).toBe(
      false
    )
  })

  it("counts it where something does something with it", () => {
    expect(reads("SITE_THEMES[context.theme].selection", "theme")).toBe(true)
    expect(reads("askHref(context.origin, { ask: record.ask })", "origin")).toBe(true)
    expect(reads("variant: context.ask === ask.id ? \"primary\" : \"secondary\"", "ask")).toBe(true)
  })

  /**
   * A step through another field is not a hand-off of this one, which is the
   * distinction that keeps the rule from going red at `answer.ts`: it builds
   * an address out of the record it was given, and `ask: context.record.ask`
   * is a read of a record rather than an `ask` being passed along.
   */
  it("counts a read that arrives through another field", () => {
    expect(reads("askPath({ ask: context.record.ask })", "ask")).toBe(true)
  })

  /** And a declaration is still not a read, which is this file's first lesson. */
  it("does not count the field's own declaration", () => {
    expect(reads("readonly counting?: boolean", "counting")).toBe(false)
  })
})
