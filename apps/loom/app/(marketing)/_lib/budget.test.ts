import type { ElementNode, LoomTree } from "@jam-overture/loom"
import { beforeAll, describe, expect, it } from "vitest"

import { runsIn, wordsIn } from "./measure"
import { treeFor } from "./render"
import { SERVED_STATE_COUNT, servedPages, type ServedPage } from "./served"
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
 * | a band read straight down | 99 — `/what-you-run`'s *What this page counts* | 120 | 82% |
 * | one cell of a run | 86 — the front door's longest question | 110 | 78% |
 * | a band of cells | 258 — the front door's *Questions* | 300 | 86% |
 * | a page | 1,151 — the front door | 1,500 | 77% |
 * | the site | 2,512 | 3,300 | 76% |
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
 * front door is **5,234px** tall — 5.8 of the harness's 900px screens — against
 * 4,688px for `/how-it-works` and 2,808px for `/what-you-run`. Across the three
 * pages that is 160 to 198 words a screen, which is close enough to call words
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
 *
 * **Then `#469` landed — a copy pass over the whole site — and it is the better
 * evidence of the two, because this file had never seen it and nobody writing
 * it was thinking about a budget.** Every ceiling held. The widest cell fell
 * from 94 words to 86 and the widest plain band from 101 to 99, while the
 * widest *band of cells* **grew from 247 to 258**, taking *Questions* from 82%
 * of its ceiling to 86%. A pass whose stated job was to make the site read
 * better out loud still added eleven words to the band nearest a limit. Nothing
 * was over budget and nothing needed changing — which is the point. That is the
 * drift no reviewer sees in a diff, measured rather than supposed, on the
 * second day this file existed, by a good edit made for an unrelated reason.
 *
 * **The figures above are the post-`#469` ones, and they reached `main` one
 * pull request late.** `#468` merged while they were being retaken, so it
 * landed carrying the pre-`#469` measurements for its first few hours. The
 * ledger entry of 1 October has the shape of that and the cheap way to avoid
 * it; nothing about the ceilings or the assertions was affected, only what this
 * comment claimed to have measured.
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

/**
 * **And the half of the site this file could not see when it was written.**
 *
 * Every ceiling above is measured against `treeFor`, which is the page as it is
 * *published*. The page a visitor is served is `pageTreeFor`, and on
 * `/how-it-works` that page carries the record of whatever they asked for.
 * Measured on the branch that added this section:
 *
 * | | as published | as served |
 * | --- | --- | --- |
 * | `/how-it-works` | 862 | **1,318** |
 * | the site | 2,516 | **2,972** |
 * | the widest band | 259 (*Questions*, on `/`) | **638** (*See it happen*) |
 *
 * So **456 words of this site had no ceiling over them at all**, including the
 * band that is more than twice the number this file calls the most a band may
 * carry. Nothing was over budget, because nothing was being counted: a budget
 * that measures the published tree reports a 259-word widest band on a site
 * that serves a 638-word one.
 *
 * It is the same oversight `voice.test.ts` carried and is recorded in
 * `served.ts`, which is where the sweep lives now so that the next rule written
 * in this lane inherits it instead of repeating it.
 *
 * ## Why the generated half gets its own numbers
 *
 * **Because they are a bound on a different thing, and raising one may not
 * loosen the other.** The ceilings above bound what a writer may write. These
 * bound what a *request* may add, and the length of that is a function of the
 * change a visitor asked for: a request at the refusal floor fires five of the
 * rules and the record names all five. Shortening it would mean truncating the
 * record, which is the one thing a site whose whole argument is the record may
 * never do.
 *
 * So the authored ceilings stay on the authored tree, where every word was
 * chosen, and these say how much the machinery may add on top. The page and
 * site ceilings are the exception and are deliberately *not* duplicated: a
 * visitor reads one page, and what they read is the served one, so
 * `MOST_WORDS_ON_A_PAGE` and `MOST_WORDS_ON_THE_SITE` are held over both
 * readings at the same numbers. Neither was raised to do it — 1,318 against
 * 1,500, and 2,972 against 3,300.
 */

/**
 * The most a request may add to a page, over and above what it publishes.
 *
 * 600 against 456 measured, which is 76% used and so inside the binding clause
 * above. It is stated as a *difference* rather than as a served total on
 * purpose: a page that grew by 200 authored words and shrank its record by 200
 * should move the authored figure and leave this one alone, and a served total
 * would hide exactly that.
 */
const MOST_WORDS_A_REQUEST_ADDS = 600

/**
 * The most one band may carry once a request has been answered in it.
 *
 * 700 against the 638 measured, and it is larger than `MOST_WORDS_IN_A_BAND`
 * because it is a bound on a different kind of reading. A 300-word band is as
 * much as this site may ask of somebody scrolling past; *See it happen* is
 * read by somebody who pressed a button in it and is waiting to see what
 * happened, which is the one band on this site a visitor is reading on purpose.
 *
 * **It is the tightest ceiling in this file at 91% used**, and that is the
 * right side to err on. The band is the site's whole argument and the thing a
 * competitor cannot copy; it is also where every future rung, every extra
 * factor and every new stage of the record will land, so a loose number here
 * would be a number that never says anything.
 */
const MOST_WORDS_IN_AN_ANSWERED_BAND = 700

const servedBandsOf = (page: ServedPage): readonly ElementNode[] =>
  page.tree.root.children.filter((node): node is ElementNode => node.kind === "element")

/** The widest this route publishes, which is what a request is measured on top of. */
const publishedWidth = (route: SiteRoute): number =>
  Math.max(...pagesOf(route).map((tree) => wordsIn(tree.root)))

const addedBy = (page: ServedPage): number =>
  wordsIn(page.tree.root) - publishedWidth(page.route)

describe("what a request adds to a page is inside a budget too", () => {
  let served: readonly ServedPage[] = []

  beforeAll(async () => {
    served = await servedPages()
  })

  /** The sweep says how much it looked at. Same clause, same reason. */
  it("looked at every state this site can be served in", () => {
    expect(served.length).toBe(SERVED_STATE_COUNT)
    expect([...new Set(served.map(({ route }) => route.path))].sort()).toEqual(
      [...SITE_ROUTES.map((route) => route.path)].sort()
    )
  })

  it("no request turns a page into a longer page than the site may have", () => {
    for (const page of served) {
      expect(wordsIn(page.tree.root), `${page.route.path} (${page.state})`).toBeLessThanOrEqual(
        MOST_WORDS_ON_A_PAGE
      )
    }
  })

  it("no request adds more to a page than the page was allowed to publish", () => {
    for (const page of served) {
      expect(addedBy(page), `${page.route.path} (${page.state})`).toBeLessThanOrEqual(
        MOST_WORDS_A_REQUEST_ADDS
      )
    }
  })

  it("no band becomes a page once the request has been answered in it", () => {
    for (const page of served) {
      for (const band of servedBandsOf(page)) {
        expect(
          wordsIn(band),
          `${page.route.path} (${page.state}) — ${band.type} ${String(band.props["eyebrow"] ?? band.id)}`
        ).toBeLessThanOrEqual(MOST_WORDS_IN_AN_ANSWERED_BAND)
      }
    }
  })

  /**
   * A cell and a plain band are held at the authored numbers on the served page
   * as well, and that is not an oversight of the paragraph above.
   *
   * Those two ceilings bound *one thing a reader takes in at once* — a rung, a
   * card, a band with no run in it — and a rung built from a record is still a
   * rung somebody has to read in one go. What the record's length is free to do
   * is add more rungs and more panels, which is the band and the page, not any
   * one cell. Measured: the widest cell and the widest plain band are the same
   * on both readings, 86 and 99, and both are authored copy on the front door.
   */
  it("no cell and no plain band grows past its authored ceiling", () => {
    for (const page of served) {
      for (const band of servedBandsOf(page)) {
        const where = `${page.route.path} (${page.state}) — ${band.type}`

        if (runsIn(band).length === 0) {
          expect(wordsIn(band), where).toBeLessThanOrEqual(MOST_WORDS_IN_A_PLAIN_BAND)
        }

        for (const run of runsIn(band)) {
          expect(
            Math.max(...run.words),
            `${where} — ${run.container} of ${run.cell} [${run.words.join(", ")}]`
          ).toBeLessThanOrEqual(MOST_WORDS_IN_A_CELL)
        }
      }
    }
  })

  it("the site is inside its budget in the state that says the most", () => {
    const widest = Math.max(
      ...DEPLOYMENTS.map((counting) =>
        SITE_ROUTES.reduce((total, route) => {
          const states = served.filter(
            (page) => page.route.path === route.path && page.counting === counting
          )

          return total + Math.max(...states.map((page) => wordsIn(page.tree.root)))
        }, 0)
      )
    )

    expect(widest).toBeLessThanOrEqual(MOST_WORDS_ON_THE_SITE)
    expect(widest).toBeGreaterThanOrEqual(FEWEST_WORDS_ON_THE_SITE)
  })

  /** Both new ceilings, held from below like the five above them. */
  it("every ceiling here is one the site is actually near", () => {
    const added = served.map(addedBy)
    const bands = served.flatMap((page) => servedBandsOf(page).map((band) => wordsIn(band)))

    const nearest: Readonly<Record<string, readonly [number, number]>> = {
      "what a request adds": [Math.max(...added), MOST_WORDS_A_REQUEST_ADDS],
      "an answered band": [Math.max(...bands), MOST_WORDS_IN_AN_ANSWERED_BAND],
    }

    for (const [what, [widest, ceiling]] of Object.entries(nearest)) {
      expect(
        widest / ceiling,
        `${what}: widest is ${widest} against a ceiling of ${ceiling} — either the ceiling is too high to mean anything, or the copy it was set for is gone`
      ).toBeGreaterThanOrEqual(A_CEILING_IS_BINDING_ABOVE)
    }
  })

  /**
   * And the states are genuinely different pages, which is what stops all of
   * the above from being the published tree measured many times.
   *
   * The failure it guards is not a sweep over nothing but a sweep over the same
   * thing: `servedPages` crossing six choices with two answers and two
   * deployments is worth nothing if `pageTreeFor` ignored the lot, and the
   * assertions here would all pass on three identical trees.
   */
  it("is looking at pages a request actually changed", () => {
    const sizes = new Set(served.map((page) => wordsIn(page.tree.root)))

    const added = served.map(addedBy)

    expect(sizes.size).toBeGreaterThanOrEqual(6)
    expect(Math.max(...added) - Math.min(...added)).toBeGreaterThan(100)
  })
})
