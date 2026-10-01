import type { ElementNode, LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { runsIn, wordsIn } from "./measure"
import { treeFor } from "./render"
import { SITE_ROUTES, type SiteRoute } from "./site"

/**
 * How much this site is allowed to say.
 *
 * **This is the guard the site's own worst failure named and nobody built.**
 * On 26 September the maintainer read these pages and gave four instructions:
 * it is too detailed and too complex, it should be simple enough for a high
 * schooler, there is **60–75% too much of it**, and three pages should become
 * cliff notes under `/how-it-works`. The measurement taken that day was ten
 * pages and **13,208 words**. The cut worked — the site is three pages and
 * about 2,500 words now, which is well inside what he asked for.
 *
 * The entry filed about it in `FINDINGS.md` then named the three things that
 * would have caught the growth and said none of them existed. The first was
 * **a budget**: *"There was no assertion anywhere about how much copy a page or
 * a site may carry. Every other property this site claims has one."* It
 * recorded that the cliff-notes branch added a word ceiling per band to the
 * mechanism page as the smallest version of it.
 *
 * **It did not.** Nothing in this route group has ever bounded a band, a page
 * or the site: `voice.test.ts` caps a *sentence* at 30 words, `pages.test.ts`
 * caps an FAQ answer at 60 and a card body at 280 characters, and above the
 * sentence there has never been a number. A grep for the ceiling the finding
 * claims comes back empty, and `git log -S` finds it in no commit this
 * repository holds. So the lane's own account of how it stopped growing was
 * one remedy short, for five days, in the ledger the next run reads first.
 *
 * ### Why the growth is the failure worth bounding and not the size
 *
 * The finding's own diagnosis is the part that generalises: *"Every page was
 * added by a run that had just found a real gap… each was a defensible answer
 * to a genuine question, each was reviewed on its own, and no run ever saw the
 * ten together. A lane that adds one good page a day builds a documentation
 * site in a fortnight, and every individual step is correct."*
 *
 * That is not a failure a reviewer can catch in a diff, because the diff is
 * always an improvement. It is only visible as a total, and a total is a thing
 * a test can hold.
 *
 * ### The numbers, and where each comes from
 *
 * Measured on this branch over the three routes, in both deployments — the one
 * that counts its readers and the one that does not, because the footer says
 * more when it is counting:
 *
 * | | widest today | ceiling | at |
 * | --- | --- | --- | --- |
 * | a band read straight down | 101 — `/what-you-run`'s *What this page counts* | 120 | 84% |
 * | one cell of a run | 94 — the front door's longest question | 110 | 85% |
 * | a band of cells | 247 — the front door's *Questions* | 300 | 82% |
 * | a page | 1,143 — the front door | 1,500 | 76% |
 * | the site | 2,499 | 3,300 | 76% |
 *
 * **The split between a plain band and a band of cells is the measurement that
 * made this soundly checkable rather than a number somebody liked.** The first
 * attempt was one ceiling per band, and the distribution refuses it: across
 * three pages, a band a reader reads straight down never exceeds **101** words,
 * while a band laid out as cells reaches **247**. That is not drift, it is
 * geometry — four cards side by side carry four bodies of about sixty words,
 * and a reader meets one of them at a time. One ceiling over both would have to
 * be loose enough for the row, which makes it meaningless for the paragraph.
 *
 * So the numbers above are a measurement plus one judgment each, and the
 * judgment is the headroom. 120 is also four of this site's own 30-word
 * sentences, which is the one number here with two independent derivations.
 * 1,500 leaves the front door about a band's worth of lead and heading to
 * improve in and not a section to grow by.
 *
 * **110 is the one that turned out to be the only rule of its kind, and that
 * is worth saying plainly.** The nearest existing cap is `pages.test.ts`'s on a
 * cliff-note band — 60 words of answer and 30 of example, so **90** for one
 * unit of reading — and the widest cell here is 94: the front door's longest
 * question with its answer, which is the same kind of unit. So 110 is that 90
 * with a question's worth of words in front of it. The reason it reads as a
 * separate paragraph is that the cliff-note cap is scoped to `SHORT_ANSWERS`
 * and **nothing on this site has ever bounded an FAQ answer at all**: measured
 * by lengthening one by 38 words on this branch, all 119 tests in
 * `pages.test.ts` stayed green. This file's first draft cited that cap as the
 * justification for 110 and was wrong about which copy it governs.
 *
 * **The site's ceiling is the one number the maintainer set himself.** 3,300 is
 * 25% of the 13,208 measured on 26 September — the strict end of *60–75% too
 * much*. The site is at 76% of it, so there is a fourth page of headroom, which
 * is deliberate: the per-page and per-band ceilings are the ones meant to bind
 * on an ordinary edit, and this one is the outer bound that says a fourth page
 * is a decision rather than an afternoon.
 *
 * ### What this is not, because it looks like something this ledger warns about
 *
 * Three entries in `FINDINGS.md` are about a check derived from the thing it
 * checks, which cannot see a defect that moves both of its sides. A ceiling set
 * near today's measurement is **the opposite shape**: it is a literal that does
 * not move when the page moves, which is the whole of what makes it a budget.
 * The measurement chose the number once, in a comment, in front of a reviewer
 * who can overrule it; the assertion reads a constant.
 *
 * What it genuinely does not see is **scroll length**, and that is filed rather
 * than claimed. Photographed on a production build of this branch at 1280, the
 * front door is **5,207px** tall — 5.8 of the harness's 900px screens — against
 * 4,688px for `/how-it-works` and 2,783px for `/what-you-run`. Across the three
 * pages that is 162 to 197 words a screen, which is close enough to call words
 * a stand-in for scroll at page scale. **Per band it is not**: the hero says 67
 * words in 0.89 of a screen while a rail of five says 222 in 1.12, so the same
 * word buys two and a half times the height depending on the band it is in. A
 * word count is a proxy for how much a visitor is asked to *read*, which is
 * what the maintainer's instruction was about. Nothing here should be read as a
 * bound on how far they scroll, and no check in this repository is one.
 */

/** A band a reader reads straight down, with no run of cells in it. */
const MOST_WORDS_IN_A_PLAIN_BAND = 120

/** One cell of a run: a card, a rung, a question and its answer. */
const MOST_WORDS_IN_A_CELL = 110

/** A whole band, however it is laid out. */
const MOST_WORDS_IN_A_BAND = 300

const MOST_WORDS_ON_A_PAGE = 1_500

const MOST_WORDS_ON_THE_SITE = 3_300

/**
 * And the floor, because a cap on its own is passed by deleting the site.
 *
 * The failure this file exists to catch has an opposite that is just as real: a
 * marketing site that says too little to make its case. Every assertion above
 * goes green on an empty page, and the lane has already been told once that a
 * front door with nothing on it reads thin.
 *
 * It is the same number as a page's ceiling, and that is the rule rather than a
 * coincidence: **no one page may say more than the whole site must say.** A
 * site that has fallen under it has lost a page rather than been edited.
 */
const FEWEST_WORDS_ON_THE_SITE = 1_500

/**
 * How much of a ceiling the site has to be using for the ceiling to be doing
 * anything — and this is the clause that makes the rest of the file hard to
 * get around.
 *
 * The cheapest way to turn a budget green is to raise it. A number nothing is
 * near constrains nothing, and it would sit here looking exactly like a rule.
 * So each ceiling is held from *below* too: something on this site has to be
 * within three fifths of it. Raising a ceiling now requires the copy to justify
 * it, and copy falling far under one reports the ceiling as stale instead of
 * passing quietly.
 *
 * Three fifths rather than something tighter, and that margin was measured
 * against a moving site rather than guessed. The numbers above were first set
 * while `#464` was open — a branch moving the *See it happen* band off the
 * front door — so both states were measured before any ceiling was chosen: the
 * front door at 1,360 words and 1,143, `/how-it-works` at 638 and 856. It has
 * since landed, which took the page ceiling from 91% used to 76% and left
 * every other figure here unchanged, and this file did not have to move. A band
 * crossing between two pages is exactly the edit a budget should not punish.
 */
const A_CEILING_IS_BINDING_ABOVE = 0.6

const ORIGIN = "https://loom.example"

/**
 * Both deployments, because the footer of a deployment that counts its readers
 * says 85 words where the other says 59, and a budget swept over only one of
 * them is a budget for half the site.
 *
 * Palettes are deliberately not swept. What a theme changes is colour and type,
 * and neither is a word.
 */
const DEPLOYMENTS: readonly boolean[] = [false, true]

const pagesOf = (route: SiteRoute): readonly LoomTree[] =>
  DEPLOYMENTS.map((counting) => treeFor(route, { origin: ORIGIN, theme: "minimal", counting }))

const bandsOf = (page: LoomTree): readonly ElementNode[] =>
  page.root.children.filter((node): node is ElementNode => node.kind === "element")

/** Every band on the site, with the route and the deployment it was found in. */
const allBands = (): readonly { route: string; band: ElementNode }[] =>
  SITE_ROUTES.flatMap((route) =>
    pagesOf(route).flatMap((page) => bandsOf(page).map((band) => ({ route: route.path, band })))
  )

/** A band holds a run when some element inside it holds two siblings of one type. */
const isPlain = (band: ElementNode): boolean => runsIn(band).length === 0

const describeBand = (route: string, band: ElementNode): string =>
  `${route} — ${band.type} ${String(band.props["eyebrow"] ?? band.props["title"] ?? band.id)}`

const siteWords = (counting: boolean): number =>
  SITE_ROUTES.reduce(
    (total, route) =>
      total + wordsIn(treeFor(route, { origin: ORIGIN, theme: "minimal", counting }).root),
    0
  )

describe("the site has a copy budget, and every part of it is inside one", () => {
  it.each(SITE_ROUTES.map((route) => [route.path, route] as const))(
    "%s: no band a reader reads straight down becomes an essay",
    (path, route) => {
      for (const page of pagesOf(route)) {
        for (const band of bandsOf(page).filter(isPlain)) {
          expect(wordsIn(band), describeBand(path, band)).toBeLessThanOrEqual(
            MOST_WORDS_IN_A_PLAIN_BAND
          )
        }
      }
    }
  )

  it.each(SITE_ROUTES.map((route) => [route.path, route] as const))(
    "%s: no one cell of a run asks for more than a cell's worth of reading",
    (path, route) => {
      for (const page of pagesOf(route)) {
        for (const band of bandsOf(page)) {
          for (const run of runsIn(band)) {
            expect(
              Math.max(...run.words),
              `${describeBand(path, band)} — ${run.container} of ${run.cell} [${run.words.join(", ")}]`
            ).toBeLessThanOrEqual(MOST_WORDS_IN_A_CELL)
          }
        }
      }
    }
  )

  it.each(SITE_ROUTES.map((route) => [route.path, route] as const))(
    "%s: no band is a page",
    (path, route) => {
      for (const page of pagesOf(route)) {
        for (const band of bandsOf(page)) {
          expect(wordsIn(band), describeBand(path, band)).toBeLessThanOrEqual(MOST_WORDS_IN_A_BAND)
        }
      }
    }
  )

  it.each(SITE_ROUTES.map((route) => [route.path, route] as const))(
    "%s: no page is the site",
    (path, route) => {
      for (const page of pagesOf(route)) {
        expect(wordsIn(page.root), path).toBeLessThanOrEqual(MOST_WORDS_ON_A_PAGE)
      }
    }
  )

  /**
   * The total, which is the one quantity the failure was ever visible in.
   *
   * Taken over the deployment that says the most, because a budget should be
   * spent at its worst case rather than its best.
   */
  it("the whole site is inside its budget, and still says enough to make its case", () => {
    const widest = Math.max(...DEPLOYMENTS.map(siteWords))

    expect(widest).toBeLessThanOrEqual(MOST_WORDS_ON_THE_SITE)
    expect(widest).toBeGreaterThanOrEqual(FEWEST_WORDS_ON_THE_SITE)
  })

  /**
   * And every ceiling above is one the site is actually near, so none of them
   * can be quietly raised to make this file green.
   */
  it("every ceiling is a ceiling something on this site is near", () => {
    const bands = allBands()
    const plain = bands.filter(({ band }) => isPlain(band)).map(({ band }) => wordsIn(band))
    const cells = bands.flatMap(({ band }) => runsIn(band).flatMap((run) => run.words))

    const nearest: Readonly<Record<string, readonly [number, number]>> = {
      "a plain band": [Math.max(...plain), MOST_WORDS_IN_A_PLAIN_BAND],
      "a cell": [Math.max(...cells), MOST_WORDS_IN_A_CELL],
      "a band": [Math.max(...bands.map(({ band }) => wordsIn(band))), MOST_WORDS_IN_A_BAND],
      "a page": [
        Math.max(
          ...SITE_ROUTES.flatMap((route) => pagesOf(route).map((page) => wordsIn(page.root)))
        ),
        MOST_WORDS_ON_A_PAGE,
      ],
      "the site": [Math.max(...DEPLOYMENTS.map(siteWords)), MOST_WORDS_ON_THE_SITE],
    }

    for (const [what, [widest, ceiling]] of Object.entries(nearest)) {
      expect(
        widest / ceiling,
        `${what}: widest is ${widest} against a ceiling of ${ceiling} — either the ceiling is too high to mean anything, or the copy it was set for is gone`
      ).toBeGreaterThanOrEqual(A_CEILING_IS_BINDING_ABOVE)
    }
  })

  /**
   * The clause whose only job is that the sweep cannot pass by having nothing
   * to look at — the shape `balance.test.ts` carries for the same reason, and
   * the one the 29 September entry in `FINDINGS.md` says to write.
   *
   * A budget stated over `SITE_ROUTES` is a budget over however many routes
   * that list has, and it has had three since the cut. Deleting one would turn
   * every assertion above greener.
   */
  it("is measuring the whole site, and a site with bands of both kinds on it", () => {
    const bands = allBands()

    expect(SITE_ROUTES.length).toBeGreaterThanOrEqual(3)
    expect(bands.filter(({ band }) => isPlain(band)).length).toBeGreaterThan(0)
    expect(bands.filter(({ band }) => !isPlain(band)).length).toBeGreaterThan(0)
    expect([...new Set(bands.map(({ route }) => route))].sort()).toEqual(
      [...SITE_ROUTES.map((route) => route.path)].sort()
    )
  })
})
