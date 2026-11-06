import { beforeAll, describe, expect, it } from "vitest"

import { SERVED_STATE_COUNT, servedPages, sweepCover, type ServedPage } from "./served"
import { PAGES_AT_LEAST, SITE_PATHS } from "./site"
import { readerCopy, SOURCE_PANEL_TEXT, type ReaderString } from "./words"

/**
 * **Copy that names a position is copy that is wrong at one of the two widths
 * this site is photographed at.**
 *
 * The instance it was written for: *Who is reading it* on `/why-use-it` shows
 * two arrangements of one page in a `loom.split`, and its opening sentence read
 * *"The page on the left is the one above. On the right is what a visitor who
 * came looking for a gift gets."* The primitive wraps to one column when there
 * is no room — by flex-basis, which is why it needs no media query and why it
 * is the reason the band works on a phone at all — so **at 390 there is no left
 * and no right, there is a first and a second.** A reader with a phone was told
 * to compare two things against positions their screen does not have.
 *
 * It was true in every photograph this lane had taken of the band, because the
 * phone shot is the one where a reader cannot be seen reading. Nothing could
 * catch it: `pages.test.ts` holds the stacking, `balance.test.ts` holds the
 * cells, and neither can read a sentence.
 *
 * ## The second reason, which is this product's own
 *
 * `loom.split` takes `reverse`, and its whole design is that a model asked to
 * swap the sides emits one `configure` rather than two `move`s. So on this
 * site, a sentence naming a side is a sentence an accepted change can falsify
 * **without touching the sentence** — on the one surface whose argument is that
 * Loom can say what really happened. Naming the order survives both the phone
 * and the swap, because document order is what a screen reader follows and what
 * `configure` does not move.
 *
 * ## Why it is every page rather than the bands that stack
 *
 * The narrower rule is the obvious one: ask it only of a band holding a
 * side-by-side layout. It is not what this file does, and the reason is a
 * measurement rather than a preference. Every horizontal arrangement this site
 * composes reflows to a column on a phone — there is no band here whose columns
 * stay columns — so scoping the rule to the ones that stack is scoping it to all
 * of them, with a classification to maintain and a way to be wrong.
 *
 * Measured over the three served pages before the instance was fixed:
 *
 * | | |
 * | --- | --- |
 * | strings matching a horizontal phrase | **1** — the instance, which is now gone |
 * | strings matching `above` | **7**, every one of them true |
 * | strings matching `top` | **7**, every one of them true |
 *
 * So the rule is the horizontal pair and nothing else, and that boundary is the
 * measurement's. **Vertical words are fine and are deliberately not swept.**
 * Bands stack down the page at every width, so *"the page above"* and *"the
 * list above"* are true at 390 and at 1280 alike; *"the top of this page"* and
 * *"built on top of"* are not about layout at all. A rule over them would flag
 * seven good sentences to catch nothing, which is `docs/positioning.md`' own
 * lesson about the headline rule: the boundary was measured rather than guessed.
 */

/**
 * The phrases that name a horizontal position, as phrases.
 *
 * **Not the words `left` and `right`.** *Right* is the ordinary English word for
 * correct and this site uses it that way — the front door says *"That is not the
 * same as being right"* — so a sweep for the word reports a sentence with
 * nothing wrong with it, and a rule whose failures are usually false is a rule
 * the next run switches off. Measured: the word hits 2 strings, the phrases hit
 * the 1 that was actually wrong.
 *
 * Each entry is matched against lower-cased copy, so a sentence opening on
 * *"On the right…"* is caught exactly as one carrying it mid-way is. That case
 * is not hypothetical: it is the second half of the instance.
 */
const NAMES_A_SIDE: readonly string[] = [
  "on the left",
  "on the right",
  "to the left",
  "to the right",
  "the left of",
  "the right of",
  "left-hand",
  "right-hand",
  "leftmost",
  "rightmost",
  "side by side",
  "side-by-side",
  "beside",
  "next to",
]

/**
 * The one string on a served page of this site that is not copy.
 *
 * `/why-use-it` prints a primitive's own source in a `loom.code` panel, and
 * the file it prints carries `import … from "zod"` and a comment or two. It
 * matched `beside` when this list was first measured, which is a true reading
 * of a thing nobody is being asked to read as prose: it is a file, shown so a
 * reader can see what one looks like.
 *
 * `voice.test.ts` takes the same panel out for the same reason and names the
 * constant; this reads that constant rather than spelling the type again.
 */
const isCopy = (string: ReaderString): boolean => string.field !== SOURCE_PANEL_TEXT

/** A failure that says the page, the field and the sentence, in that order. */
const describeHit = (page: ServedPage, string: ReaderString, phrase: string): string =>
  `${page.route.path} ${string.field} says "${phrase}": ${string.text}`

describe("the copy on every page of this site", () => {
  let pages: readonly ServedPage[] = []
  let copy: readonly { readonly page: ServedPage; readonly string: ReaderString }[] = []

  beforeAll(async () => {
    pages = await servedPages()
    copy = pages.flatMap((page) =>
      readerCopy(page.tree.root)
        .filter(isCopy)
        .map((string) => ({ page, string }))
    )
  })

  /**
   * What this sweep reached, stated by the caller rather than read off itself.
   * `sweepCover`'s docblock has the measurement behind this being three
   * assertions and not one.
   */
  it("is swept on every page, in every state the site has", () => {
    const cover = sweepCover(pages)

    expect(cover).toEqual({ states: SERVED_STATE_COUNT, routes: SITE_PATHS })
    expect(cover.routes.length).toBeGreaterThanOrEqual(PAGES_AT_LEAST)
  })

  /**
   * And that there was copy to read, which is the half the cover above cannot
   * say: three pages that each came back as an empty tree satisfy it.
   *
   * The floor is hand-written for `sweepShare`'s reason — a floor computed from
   * the thing it is guarding passes when that thing goes to nothing. This site
   * served **437** strings on the day it was written, against a floor roughly a
   * third of that.
   */
  it("is enough strings for the rule below to mean anything", () => {
    expect(copy.length).toBeGreaterThanOrEqual(150)
  })

  it.each(NAMES_A_SIDE)("never tells a reader to look %s", (phrase) => {
    const hits = copy
      .filter(({ string }) => string.text.toLowerCase().includes(phrase))
      .map(({ page, string }) => describeHit(page, string, phrase))

    expect(hits, "name the order rather than the side: on a phone there is no side").toEqual([])
  })
})
