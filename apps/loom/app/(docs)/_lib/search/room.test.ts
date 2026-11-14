import { describe, expect, it } from "vitest"

import { DOCS_LANDING_SLUG, docsHref, docsSections, writtenDocsSections } from "../nav"

import { buildSearchIndex, searchProse, searchProseFor } from "./build"
import { addressedProse } from "./model"
import {
  bytesPerWord,
  capsOver,
  PROSE_SECTION_GZIP_CAP,
  PROSE_SECTION_RAW_CAP,
  PROSE_TOTAL_GZIP_CAP,
  PROSE_TOTAL_RAW_CAP,
  roomIn,
  roomSentence,
  sentenceOf,
  shortestWrittenPage,
  wordsIn,
  wordsUnder,
  type ProseCap,
} from "./room"

/**
 * Whether this site has room for another page.
 *
 * Everything here is a statement about **the real site**, because that is what
 * the question is about. A fixture would answer it for a site nobody reads.
 *
 * Two of these tests are the ones that matter and they pull in opposite
 * directions. The first is that the conversion from compressed bytes to words
 * is arithmetic somebody can check, which is what makes the figure quotable.
 * The second is that the sentence the caps print **says trimming is not the
 * remedy, and says it only while that is true** — a message that always says it
 * is a message that stops being read, and a message that never says it is how
 * the next run spends a day shortening a page that was never going to fit.
 */
describe("the room this site has for another page", () => {
  /** Every word on a page, read the way `room.ts` reads it rather than from it. */
  const proseOn = (href: string): string =>
    addressedProse(buildSearchIndex().entries, searchProse())
      .filter(([at, words]) => words !== "" && (at === href || at.startsWith(`${href}#`)))
      .map(([, words]) => words)
      .join(" ")

  const caps = capsOver("the-runtime")
  const cap = (what: string, measure: ProseCap["measure"]): ProseCap => {
    const found = caps.find((candidate) => candidate.what === what && candidate.measure === measure)

    if (found === undefined) throw new Error(`loom: no cap called "${what}" (${measure})`)

    return found
  }

  it("counts a word as a run of anything that is not a space", () => {
    expect(wordsIn("a bounded vocabulary buys reviewability")).toBe(5)
    expect(wordsIn("  two   spaces\nand a newline ")).toBe(5)
    expect(wordsIn("")).toBe(0)
    expect(wordsIn("   ")).toBe(0)
  })

  /**
   * A word of this site's prose, in bytes.
   *
   * Held as a range rather than a figure: it moves a little whenever anybody
   * writes a paragraph, and pinning it would be a test that fails for the one
   * reason this lane exists. What the range rules out is the two mistakes that
   * would make every number downstream wrong — counting characters instead of
   * bytes, which would read low, and counting the markdown as words, which
   * would read high.
   */
  it("measures what a word of this site's prose weighs", () => {
    expect(bytesPerWord()).toBeGreaterThan(4)
    expect(bytesPerWord()).toBeLessThan(8)
  })

  /** Every cap over a page is one of four, and two of them are about the whole. */
  it("holds a page in a section against its own file and against the bill", () => {
    expect(caps.map((candidate) => candidate.cap).sort((a, b) => a - b)).toEqual(
      [PROSE_SECTION_GZIP_CAP, PROSE_SECTION_RAW_CAP, PROSE_TOTAL_GZIP_CAP, PROSE_TOTAL_RAW_CAP].sort(
        (a, b) => a - b
      )
    )

    expect(caps.filter((candidate) => candidate.section === "the-runtime")).toHaveLength(2)
    expect(caps.filter((candidate) => candidate.section === undefined)).toHaveLength(2)
  })

  /** What a cap says it has spent is what the file really weighs. */
  it("reads what a section has spent off the file the browser is served", () => {
    const file = JSON.stringify(searchProseFor("the-runtime"))

    expect(cap("the words of The runtime", "raw").spent).toBe(Buffer.byteLength(file, "utf8"))
  })

  /**
   * The arithmetic, on a cap nobody has to look up.
   *
   * A raw cap's headroom is bytes of prose already, so the words left under it
   * are the headroom divided by what a word weighs — and that division is the
   * whole claim this module makes. Checked against a cap made up here rather
   * than against the site's, so the test says what the function does rather
   * than repeating today's numbers back.
   */
  it("turns bytes left into words a person could write", () => {
    const made: ProseCap = { what: "a cap", spent: 1_000, cap: 2_000, measure: "raw" }

    expect(wordsUnder(made, "the-runtime")).toBe(Math.floor(1_000 / bytesPerWord()))
  })

  /**
   * A compressed cap buys more prose than its headroom, by however well that
   * section's file compresses.
   *
   * The section matters and that is the point of the assertion: the same
   * compressed byte spent on the API reference buys about seven raw bytes,
   * because sixteen pages built from one set of bands repeat themselves, and
   * about three on a hand-written section. A conversion that used one figure
   * for the site would be wrong in both places.
   */
  it("spends a compressed byte differently in a section that repeats itself", () => {
    const made: ProseCap = { what: "a cap", spent: 0, cap: 1_000, measure: "gzipped" }

    expect(wordsUnder(made, "api-reference")).toBeGreaterThan(wordsUnder(made, "the-runtime"))
  })

  it("never offers negative room for a cap already over", () => {
    expect(wordsUnder({ what: "a cap", spent: 9_000, cap: 1_000, measure: "raw" }, "the-runtime")).toBe(0)
  })

  /**
   * The shortest page, which is the comparison rather than a fact about
   * anything.
   *
   * It is a page in a section and not a landing page, it has words, and it is
   * shorter than every other page — all three asserted against the site,
   * because the one that goes wrong silently is the second: a section whose
   * landing page crept into this answer would report the site's shortest page
   * as three sentences and make a full site look roomy.
   */
  it("names the shortest page somebody has written here", () => {
    const shortest = shortestWrittenPage()

    expect(shortest).toBeDefined()
    expect(shortest?.words).toBeGreaterThan(0)
    expect(shortest?.href).toMatch(/^\/docs\/[a-z-]+\/[a-z-]+$/u)
    expect(shortest?.title).not.toBe("")

    const written = docsSections.filter((section) => section.source === "written")

    expect(written.map((section) => `/docs/${section.slug}`)).not.toContain(shortest?.href)

    /*
     * **And that it really is the shortest**, which the four assertions above
     * do not say: the *longest* page on this site satisfies every one of them.
     * A mutation that reversed the comparison survived until this was written,
     * with the sentence still reading *the shortest page already written here
     * is …* and naming a three-thousand-word page.
     */
    const pages = writtenDocsSections.flatMap((section) =>
      section.pages
        .filter((page) => page.slug !== DOCS_LANDING_SLUG)
        .map((page) => wordsIn(proseOn(docsHref(section.slug, page.slug))))
        .filter((words) => words > 0)
    )

    expect(Math.min(...pages)).toBe(shortest?.words)
    expect(pages.filter((words) => words < (shortest?.words ?? 0))).toHaveLength(0)
  })

  /**
   * Which cap a page meets first, chosen in words rather than in bytes.
   *
   * Two of the four are compressed and two are not, so their headrooms are not
   * numbers of the same kind and the smaller byte figure is not the tighter
   * cap. Converting first is what makes the comparison legitimate, and this is
   * the assertion that would fail if somebody compared `cap - spent` directly.
   */
  it("binds on the cap with the least room in words", () => {
    for (const section of docsSections) {
      const room = roomIn(section.slug)
      const least = Math.min(...capsOver(section.slug).map((candidate) => wordsUnder(candidate, section.slug)))

      expect(room.words).toBe(least)
      expect(wordsUnder(room.binding, section.slug)).toBe(least)
    }
  })

  /**
   * And the state of the site, which is the thing this unit was written to say.
   *
   * **This case said *the site is full* and asserted it of `the-runtime`, and
   * six days later it failed.** Its own comment had said the assertion would
   * flip when 0353 was answered, and that *the run that lands it has to come
   * back here and say what the site's state is now*. 0353 has not been
   * answered. What flipped it was six days of `main`: the bill fell from
   * 79,414 compressed bytes to **79,339**, which at this site's compression and
   * bytes-per-word is about 42 words, so the room in *The runtime* went from
   * 331 to **373** — past the 346 of the shortest page here — and `fits` became
   * true. The branch's own saving is not the cause and was already inside the
   * 5 November figure. Where the 75 bytes went is not isolated here and is not
   * worth isolating: two stale sentences left *What your readers do* on
   * 9 November and the reference's generated prose grew, and the net of
   * everything written on this site in six days is 75 bytes.
   *
   * So the state and the property are asserted apart, which is what the first
   * version should have done. **The property** is `sentenceOf`'s own promise —
   * the remedy clause appears exactly where a page as short as the shortest one
   * here would not fit, and nowhere else — and it holds whichever way the
   * question goes. **The state** is the case below it, and it is the one that
   * flips.
   */
  it("carries the remedy clause exactly where a short page would not fit", () => {
    expect(shortestWrittenPage()).toBeDefined()

    /*
     * **Both ways, off a constructed room**, because since 13 November no
     * section of this site fails to fit and a loop over the five would assert
     * the clause's absence five times and its presence never. `sentenceOf`
     * takes a `Room`, so the case that matters is still a case: the same room
     * with `fits` the other way round is the whole of what the clause turns on.
     */
    const tight = { ...roomIn("the-runtime"), fits: false }

    expect(sentenceOf(tight)).toContain("A shorter page is not the remedy")
    expect(sentenceOf({ ...tight, fits: true })).not.toContain("A shorter page is not the remedy")

    for (const section of docsSections) {
      const room = roomIn(section.slug)
      const sentence = roomSentence(section.slug)

      expect(sentence.includes("A shorter page is not the remedy"), section.slug).toBe(!room.fits)
      expect(sentence.includes("decisions/0353"), section.slug).toBe(!room.fits)
      /*
       * And the other place a run reaching this looks. 0353's candidates change
       * which bodies travel; `savings.ts` prices the five that change how they
       * are written, which is the class a run tries first and the class every
       * figure in it refuses. A sentence that named one and not the other would
       * send half of them to re-measure what is already measured.
       */
      expect(sentence.includes("search/savings.ts"), section.slug).toBe(!room.fits)
    }
  })

  /**
   * **Every section can now take a page as short as the shortest one on this
   * site**, which is the case that flipped on 13 November.
   *
   * It flipped without 0353 being answered. The words stopped travelling with
   * their addresses beside them — the file says once what its bodies are
   * `under` and then says the words, in the order the section's entries are
   * already in — and the bill fell 4,356 compressed bytes, which is twelve
   * times what taking the section prefix off those same addresses was worth on
   * 5 November. The tightest section went from 373 words of room to 2,335.
   *
   * Written as a count rather than as a named section, for the reason the case
   * it replaces was: it is a statement about the site. It is **a state and not
   * a property** — the property is the case above, which is why that one no
   * longer reads the site to decide what to assert. A page long enough to
   * spend 2,335 words makes this fail, and the run that writes it says what
   * the state is then.
   */
  it("can take a page as short as its shortest in every section", () => {
    const full = docsSections.filter((section) => !roomIn(section.slug).fits)

    expect(full).toEqual([])

    const shortest = shortestWrittenPage()?.words ?? 0

    expect(shortest).toBeGreaterThan(0)

    for (const section of docsSections) {
      expect(roomIn(section.slug).words, section.slug).toBeGreaterThan(shortest * 5)
    }
  })

  /**
   * What the sentence says, in the order it says it.
   *
   * The number that failed, then the room in words, then the remedy — by index,
   * which is this lane's 4 November remedy for a message whose ordering matters
   * and which nothing held. A sentence that led with the remedy would be read as
   * advice about a page rather than as the reason the number failed.
   */
  it("says what failed before it says what to do", () => {
    /*
     * The tightest section rather than a named one, because the third clause is
     * only printed where a short page would not fit and which sections those
     * are is a fact about the site on the day the test runs.
     */
    const tightest = docsSections.reduce((least, section) =>
      roomIn(section.slug).words < roomIn(least.slug).words ? section : least
    )
    const room = roomIn(tightest.slug)
    const sentence = roomSentence(tightest.slug)

    expect(sentence.startsWith("loom: ")).toBe(true)
    expect(sentence.indexOf("against a cap of")).toBeLessThan(sentence.indexOf("room for about"))
    expect(sentence).toContain(`${room.words.toLocaleString("en-GB")} more words`)

    /*
     * The third clause's place in the order, off the same constructed room the
     * property case uses — because the real site prints two clauses now and the
     * order of three is still the thing this case is about.
     */
    const firing = sentenceOf({ ...room, fits: false })

    expect(firing.indexOf("room for about")).toBeLessThan(firing.indexOf("not the remedy"))
  })

  /** A sentence about a section says what the rail calls it, not its slug. */
  it("names a section the way the site does", () => {
    expect(roomSentence("the-runtime")).toContain("a page in The runtime has room")
    expect(roomSentence("the-runtime")).not.toContain("a page in the-runtime")
  })

  /**
   * The clause the sentence drops when it is not true.
   *
   * Shown on a room made up here rather than on a section of the site, because
   * the branch has to be readable as a branch: a cap with a quarter of a
   * megabyte of headroom has room for a page, so the sentence says the number
   * and the comparison and then stops. The clause about the remedy is the one
   * thing it must not say, because a page would fit.
   */
  it("stops talking about the remedy once a page would fit", () => {
    const roomy: ProseCap = { what: "a cap", spent: 0, cap: 500_000, measure: "raw" }
    const sentence = sentenceOf({
      section: "the-runtime",
      binding: roomy,
      words: wordsUnder(roomy, "the-runtime"),
      shortest: shortestWrittenPage(),
      fits: true,
    })

    expect(sentence).toContain("room for about")
    expect(sentence).toContain("The shortest page already written here is")
    expect(sentence).not.toContain("not the remedy")
    expect(sentence).not.toContain("decisions/0353")
  })

  /**
   * And a site with no pages at all, which is the only way `shortest` is
   * absent.
   *
   * It cannot happen here and the function still has to answer, because the
   * sentence is a fault message: one that threw while being built would replace
   * a cap failure with a stack trace in the one place somebody is reading for
   * an explanation.
   */
  it("says the number alone when there is no page to compare with", () => {
    const sentence = sentenceOf({
      section: "the-runtime",
      binding: { what: "a cap", spent: 10, cap: 20, measure: "raw" },
      words: 1,
      shortest: undefined,
      fits: false,
    })

    expect(sentence).toContain("room for about 1 more words")
    expect(sentence).not.toContain("shortest page")
  })
})
