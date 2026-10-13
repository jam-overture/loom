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
  counting: true,
}

/**
 * Where a field may be read: the page builders, and the two modules a builder
 * hands a whole context to.
 *
 * `chrome.ts` is in the list because the header and the footer are built from a
 * `ChromeContext` spread out of the page's own, so `theme` and `counting` are
 * read there rather than in any page. `requested.ts` is in it for the same
 * reason at the other end of the request.
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
 * `context.theme`, `chrome.counting`, `record.landed` — and it is not what a
 * declaration looks like. A field consumed only by being spread onward is not
 * matched and is not meant to be: the spread hands it to something, and that
 * something names it or nobody does.
 */
const reads = (source: string, field: string): boolean =>
  new RegExp(`\\.${field}\\b`).test(source)

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
})
