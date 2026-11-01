import { gzipSync } from "node:zlib"

import { describe, expect, it } from "vitest"

import { SIGNATURE_CAP } from "./api/extract"
import { docsOrder, docsSections } from "./nav"
import { searchProseFor } from "./search/build"
import {
  docsPageWeights,
  docsTextTotals,
  generatedPageWeights,
  GENERATED_PAGE_CAP,
  heaviestPage,
  weightFaults,
  writtenPageWeights,
  WRITTEN_PAGE_CAP,
  type PageWeight,
} from "./weight"

/**
 * **What a page of this site costs a reader**, which until now was the one
 * thing about this surface nobody had a number for.
 *
 * `weight.ts` carries the argument. What this file adds is the split the rest
 * of this lane's claims are made of: the **rule** is held against the
 * fifty-three real pages, and the **reader** against weights written here, so
 * the rule is not quietly whatever today's pages happen to do.
 */
describe("what a page puts in front of a reader", () => {
  /** A page weight written here, so the reader can be held to rules the site keeps. */
  const page = (from: PageWeight["from"], prose: number, code: number, parts = 1): PageWeight => ({
    href: `/docs/made-up/${from}-${prose}-${code}`,
    from,
    prose,
    code,
    total: prose + code,
    parts,
  })

  describe("the rule, against the site", () => {
    /**
     * The one that matters. A list rather than a count, so a failure prints the
     * address and the two halves instead of `expected 1 to be 0`.
     */
    it("keeps every page inside the cap for its kind", () => {
      expect(weightFaults()).toEqual([])
    })

    /**
     * Every page, weighed once.
     *
     * The same property `search/build.test.ts` holds over the five words files
     * and for the same reason: a page that fell between the written half and
     * the generated one would be a page with no number on it, and every cap
     * here would read *smaller*, which is the direction they are written to be
     * happy about.
     */
    it("weighs every page the rail carries, once each", () => {
      expect(docsPageWeights().map((weight) => weight.href).sort()).toEqual(
        docsOrder.map((entry) => entry.href).sort()
      )
    })

    /**
     * The pair this module was written for.
     *
     * `api/extract.ts` caps **one** signature. Nothing capped how many go on a
     * page, and the two rules together permitted a page of 568 × 6,000 bytes —
     * five and a half times the cap this file now holds. So the per-symbol rule
     * is not a bound on a page, and that is asserted rather than argued: a run
     * that lowered `SIGNATURE_CAP` far enough to make it one would make this
     * test say so.
     */
    it("is not already implied by the cap on a single signature", () => {
      const heaviest = heaviestPage("generated")

      expect(heaviest).toBeDefined()
      expect(SIGNATURE_CAP * (heaviest?.parts ?? 0)).toBeGreaterThan(GENERATED_PAGE_CAP)
    })

    /**
     * Which half of a page is big, as a fact rather than an impression — this
     * is what makes `parts` worth reporting in a fault.
     *
     * A written page is prose with blocks in it. A reference page is signatures
     * with a few sentences of band over them: the heaviest one is 99.6%
     * signature, and no editing on this surface moves that number.
     */
    it("is prose where somebody wrote it and code where the repository did", () => {
      const written = docsTextTotals("written")
      const generated = docsTextTotals("generated")

      expect(written.prose).toBeGreaterThan(written.code * 3)
      expect(generated.code).toBeGreaterThan(generated.prose * 3)
    })

    /**
     * Headroom, stated rather than assumed.
     *
     * A cap sitting on the number it caps is a cap that fires on the next
     * sentence somebody writes, which is how a number stops being a rule and
     * starts being a thing people route around. Both have room; the generated
     * one has less, and the comment on it says what to do when it goes.
     */
    it("leaves both caps room to be a rule rather than an obstacle", () => {
      const written = heaviestPage("written")
      const generated = heaviestPage("generated")

      expect(written?.total ?? 0).toBeLessThan(WRITTEN_PAGE_CAP * 0.9)
      expect(generated?.total ?? 0).toBeLessThan(GENERATED_PAGE_CAP * 0.9)
    })

    /**
     * The sentence this unit exists to be able to say, as two measurements.
     *
     * This surface holds five caps on what the **search box** sends a reader,
     * the largest of them 80,000 compressed bytes for the prose of every page
     * at once. One address sends more than that on its own, compressed, before
     * a reader has typed anything — and it had no number at all.
     *
     * Asserted as the comparison rather than as either figure, so it keeps
     * meaning the same thing when both move.
     */
    it("sends more down one address than the search box sends for the whole site", () => {
      const corpus = docsSections
        .map((section) => gzipSync(JSON.stringify(searchProseFor(section.slug))).length)
        .reduce((total, size) => total + size, 0)

      expect(corpus).toBeLessThan(80_000)
      expect(heaviestPage("generated")?.total ?? 0).toBeGreaterThan(corpus)
    })

    /** Both halves are non-empty, so neither reader is silently returning nothing. */
    it("reads both kinds of page", () => {
      expect(writtenPageWeights().length).toBe(35)
      expect(generatedPageWeights().length).toBe(18)
    })
  })

  describe("the reader, against weights written here", () => {
    it("finds no fault in pages inside their caps", () => {
      expect(weightFaults([page("written", 10_000, 2_000), page("generated", 2_000, 300_000, 400)])).toEqual([])
    })

    it("faults a written page over the written cap and names the page", () => {
      const faults = weightFaults([page("written", 30_000, 1_000)])

      expect(faults).toHaveLength(1)
      expect(faults[0]).toContain("/docs/made-up/written-30000-1000")
      expect(faults[0]).toContain(String(WRITTEN_PAGE_CAP))
    })

    it("faults a generated page over the generated cap and not under it", () => {
      expect(weightFaults([page("generated", 2_000, GENERATED_PAGE_CAP, 600)])).toHaveLength(1)
      expect(weightFaults([page("generated", 2_000, GENERATED_PAGE_CAP - 2_001, 600)])).toEqual([])
    })

    /**
     * The boundary, which the word *cap* decides: a page **may** put that many
     * bytes in front of a reader, so the fault is the byte after it.
     *
     * Written down because the two spellings differ by one byte and read
     * identically to anybody skimming, and the one that is wrong is the one
     * that fires on a page nothing is wrong with.
     */
    it("faults the byte past the cap and not the cap itself", () => {
      expect(weightFaults([page("written", WRITTEN_PAGE_CAP, 0)])).toEqual([])
      expect(weightFaults([page("written", WRITTEN_PAGE_CAP, 1)])).toHaveLength(1)
    })

    /**
     * A written page is not held to the generated cap and the other way round.
     *
     * The one failure that would make every number here meaningless: the two
     * caps differ by a factor of twenty-five, so a reader that picked the wrong
     * one would either forbid the reference section outright or let a written
     * page grow to half a megabyte in silence.
     */
    it("holds each kind to its own cap", () => {
      expect(weightFaults([page("written", 25_000, 0)])).toHaveLength(1)
      expect(weightFaults([page("generated", 25_000, 0)])).toEqual([])
    })

    /**
     * The fault says where to go, because the two halves are fixed in two
     * different files by two different people.
     */
    it("says which half of a page is the big one", () => {
      const byCode = weightFaults([page("written", 1_000, 30_000, 12)])
      const byProse = weightFaults([page("written", 30_000, 1_000, 12)])

      expect(byCode[0]).toContain("12 fenced blocks")
      expect(byProse[0]).toContain("of it is prose")
    })

    /** A reference page's code is signatures, and a fault about one says so. */
    it("calls a generated page's blocks signatures", () => {
      expect(weightFaults([page("generated", 2_000, 700_000, 900)])[0]).toContain("900 published signatures")
    })

    /** A cap is an argument, so it can be moved for a test and the reader follows. */
    it("reads the caps it is given rather than the site's", () => {
      expect(weightFaults([page("written", 5_000, 0)], { written: 4_000, generated: 10 })).toHaveLength(1)
    })
  })
})
