import { gzipSync } from "node:zlib"

import { describe, expect, it } from "vitest"

import { SIGNATURE_CAP } from "./api/extract"
import { docsOrder, docsSections } from "./nav"
import { searchProseFor } from "./search/build"
import {
  cutAddressFor,
  cutClause,
  cutContentsRows,
  docsPageWeights,
  DOCS_PAGE_CAPS,
  docsTextTotals,
  generatedPageWeights,
  GENERATED_PAGE_CAP,
  groupWeightsOn,
  heaviestPage,
  pageCutOf,
  weightFaults,
  writtenPageWeights,
  WRITTEN_PAGE_CAP,
  type GroupWeight,
  type PageCut,
  type PageWeight,
} from "./weight"

import { apiReference } from "./api/reference"
import { DOCS_LANDING_SLUG } from "./nav"

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

    /**
     * The modules of a page add up to the page.
     *
     * The one failure that would make every sentence a fault prints wrong: the
     * total comes from `symbolsOn` and the modules from `groupWeightsOn`, and
     * they walk the same entry by two routes. A page whose modules summed to
     * something else would be a page whose fault offered a cut of a different
     * page, and nothing would say so.
     */
    it("weighs a generated page's modules to the same bytes as the page", () => {
      const heaviest = heaviestPage("generated")

      expect(heaviest).toBeDefined()
      expect(groupWeightsOn(heaviest?.href.split("/").at(-1) ?? "").reduce((total, group) => total + group.code, 0)).toBe(
        heaviest?.code
      )
    })

    /**
     * **The cap cannot fire without naming a remedy.**
     *
     * This is the property the unit exists for. The cap's only answer is a cut,
     * the cut is along modules, and a page that reached the cap with no modules
     * to cut along would fire a fault that says a page is too heavy and
     * nothing a reader could do about it. Held against whichever page is
     * heaviest rather than against `signals` by name, because the page that
     * fires it is whichever one is in front when it goes.
     */
    it("has a cut to offer for the page the cap would fire on", () => {
      const heaviest = heaviestPage("generated")

      expect(heaviest).toBeDefined()

      const cut = pageCutOf(heaviest?.href.split("/").at(-1) ?? "")

      expect(cut).toBeDefined()
      expect(cut?.addresses).toBeGreaterThan(1)
      expect(cut?.heaviest.length).toBeGreaterThan(0)
      expect(cut?.contents).toBeGreaterThan(cut?.addresses ?? 0)
    })

    /**
     * **The addresses of a cut are distinct, on every door.**
     *
     * The assertion that kills the obvious implementation. Taking a module's
     * last segment reads well and is wrong on three of the eighteen doors:
     * `@jam-overture/loom/runtime` publishes eighty-six modules whose leaves
     * are seventy-six distinct words, so a cut spelled that way would quietly
     * serve ten of them at an address another one already had.
     *
     * Over every door rather than the heaviest, because the door this breaks on
     * is not the door the cap fires on.
     */
    it("gives every module of every door its own address", () => {
      for (const entry of apiReference.entries) {
        const addresses = entry.groups.map((group) => cutAddressFor(group.module))

        expect(new Set(addresses).size, entry.slug).toBe(entry.groups.length)
      }
    })

    /**
     * **Heaviest first, as the order rather than as a word in a sentence.**
     *
     * The clause says *heaviest first* and a mutation that dropped the sort
     * left every assertion green: the three modules it named were simply the
     * first three the package declares, which on `signals` is
     * `signals/action-change` rather than the one carrying 18,574 bytes. A run
     * reading that fault would cut the wrong three modules first.
     *
     * Asserted as the order being non-increasing over the real site, and as
     * the head being the maximum — the second is not implied by the first for
     * a list the mutation left in declaration order, because such a list can
     * be non-increasing by luck over the two the clause prints.
     */
    it("reports a page's modules heaviest first", () => {
      for (const entry of apiReference.entries) {
        const groups = groupWeightsOn(entry.slug)
        const codes = groups.map((group) => group.code)

        expect(codes, entry.slug).toEqual([...codes].sort((one, other) => other - one))
        expect(groups[0]?.code, entry.slug).toBe(Math.max(...codes))
      }
    })

    /**
     * **A cut is one address per module, derived rather than counted.**
     *
     * The mutation this is written against replaced `addresses` with the
     * literal `60`, which is the true answer for `signals` and the false one
     * for every other door — and the suite was green, because every assertion
     * about a cut was about the page the cap is going to fire on. A figure
     * beside a derivation is a claim about the derivation, and a claim can lie;
     * what kills it is asking every door at once.
     */
    it("gives a cut one address per module, on every door", () => {
      for (const entry of apiReference.entries) {
        const cut = pageCutOf(entry.slug)

        expect(cut?.addresses, entry.slug).toBe(groupWeightsOn(entry.slug).length)
        expect(cutContentsRows(entry.slug, groupWeightsOn(entry.slug)).length, entry.slug).toBe(cut?.addresses)
      }
    })

    /**
     * A cut's price is in rows the contents file would really publish.
     *
     * `cutContentsRows` builds `TravellingEntry`, which is the shape
     * `searchContents` travels as, so the byte figure in a fault is the rows
     * rather than an idea of them. What is asserted is the part a wrong shape
     * would get wrong: the address sits under the page being cut, and the row
     * is a page of the import family like the door it came off.
     */
    it("prices a cut as rows under the page being cut", () => {
      const rows = cutContentsRows("signals", groupWeightsOn("signals"))

      expect(rows.length).toBe(groupWeightsOn("signals").length)

      for (const row of rows) {
        expect(row.href.startsWith("/docs/api-reference/signals/"), row.href).toBe(true)
        expect(row.kind).toBe("page")
        expect(row.family).toBe("imports")
      }
    })

    /**
     * **The price is the rows, measured as the rows.**
     *
     * A mutation that measured the modules themselves instead —
     * `JSON.stringify(groups)` — was invisible, because every assertion about
     * the price was about a number rather than about where it came from. The
     * two halves below are what a wrong source gets wrong: the figure is the
     * rows a cut would publish, derived here from the package by a second
     * route, and it is **bigger** than the same rows without the module
     * sentences, because a row carries the module's own opening paragraph and
     * that paragraph is the heaviest thing in it.
     */
    it("prices a cut as the bytes of the rows it would publish", () => {
      const entry = apiReference.entries.find((candidate) => candidate.slug === "signals")

      expect(entry).toBeDefined()

      const groups = groupWeightsOn("signals")
      const summaries = new Map((entry?.groups ?? []).map((group) => [group.module, group.summary] as const))
      const bytesOf = (rows: unknown) => new TextEncoder().encode(JSON.stringify(rows)).length

      expect(pageCutOf("signals")?.contents).toBe(bytesOf(cutContentsRows("signals", groups, summaries)))
      expect(pageCutOf("signals")?.contents).toBeGreaterThan(bytesOf(cutContentsRows("signals", groups)))
    })

    /**
     * The landing page has no modules, and that is not the same answer as a
     * page the reference does not serve — it is, here, and deliberately:
     * neither is a page with a cut, and `pageCutOf` says so for both rather
     * than offering a cut of nought addresses.
     */
    it("offers no cut for the section's landing page or for an address it does not serve", () => {
      expect(pageCutOf(DOCS_LANDING_SLUG)).toBeUndefined()
      expect(pageCutOf("not-a-door")).toBeUndefined()
      expect(groupWeightsOn(DOCS_LANDING_SLUG)).toEqual([])
    })

    /** Both halves are non-empty, so neither reader is silently returning nothing. */
    it("reads both kinds of page", () => {
      expect(writtenPageWeights().length).toBe(36)
      expect(generatedPageWeights().length).toBe(20)
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

    /** A module written here, so the clause can be held to a stated cut. */
    const group = (module: string, code: number): GroupWeight => ({
      module,
      title: module,
      symbols: 1,
      code,
    })

    const cut = (over: Partial<PageCut> = {}): PageCut => ({
      href: "/docs/api-reference/made-up",
      addresses: 7,
      contents: 1_234,
      heaviest: [group("made/one", 900), group("made/two", 800)],
      ...over,
    })

    /**
     * **A page with no cut produces no clause.**
     *
     * The mutation this is written against leaves a fault ending *and cutting
     * it along its modules is undefined more addresses*, which is a sentence
     * about nothing printed at the one moment somebody is reading carefully.
     */
    it("says nothing about a cut where there is none", () => {
      expect(cutClause(undefined)).toBe("")
    })

    /** The clause carries the three figures a run acting on it needs. */
    it("names the addresses, the price and the modules carrying the most", () => {
      const clause = cutClause(cut())

      expect(clause).toContain("7 more addresses")
      expect(clause).toContain("1234 bytes")
      expect(clause).toContain("table of contents")
      expect(clause).toContain("made/one (900)")
      expect(clause).toContain("made/two (800)")
    })

    /**
     * **The price is of the other file, and the clause says which.**
     *
     * The figure is bytes in the table of contents and not bytes on the page,
     * and a clause that dropped the file would read as though the cut cost
     * nothing but addresses. That is the mistake the clause exists to prevent,
     * so it is asserted rather than left to the wording.
     */
    it("says the price is paid in the file a reader waits for", () => {
      expect(cutClause(cut({ contents: 13_105 }))).toContain("every reader waits for")
    })

    /**
     * A generated fault carries the clause and a written one does not.
     *
     * Both halves, because a clause on a written page would offer a cut along
     * modules to a page that has none, and the absence is as much the claim as
     * the presence.
     */
    it("offers a cut on a generated page and not on a written one", () => {
      const reader = () => cut()

      expect(weightFaults([page("generated", 2_000, 700_000, 900)], DOCS_PAGE_CAPS, reader)[0]).toContain(
        "7 more addresses"
      )
      expect(weightFaults([page("written", 30_000, 1_000)], DOCS_PAGE_CAPS, reader)[0]).not.toContain("more addresses")
    })

    /** The cut is an argument too, so a fault can be held without the package. */
    it("reads the cut it is given rather than the package's", () => {
      expect(
        weightFaults([page("generated", 2_000, 700_000, 900)], DOCS_PAGE_CAPS, () => undefined)[0]
      ).not.toContain("more addresses")
    })

    /**
     * A module is spelled with its slashes flattened, which is the only
     * spelling unique per door — `store/store` and `project/store` are two
     * modules of one import and one word apart.
     */
    it("spells an address from the whole module path", () => {
      expect(cutAddressFor("signals/window")).toBe("signals-window")
      expect(cutAddressFor("project/store")).not.toBe(cutAddressFor("store/store"))
    })

    /**
     * **A door with no modules is offered no cut.**
     *
     * Not a state this package reaches, which is why the guard was dead and a
     * mutation deleting it changed nothing. Stated here rather than hunted for
     * in the reference: a real door, no modules, and the answer is no cut
     * rather than a cut of nought addresses whose clause ends on a colon.
     */
    it("offers no cut for a door that publishes no modules", () => {
      expect(pageCutOf("signals", [])).toBeUndefined()
      expect(cutClause(pageCutOf("signals", []))).toBe("")
    })

    /** A cap is an argument, so it can be moved for a test and the reader follows. */
    it("reads the caps it is given rather than the site's", () => {
      expect(weightFaults([page("written", 5_000, 0)], { written: 4_000, generated: 10 })).toHaveLength(1)
    })
  })
})
