import { describe, expect, it } from "vitest"

import {
  datedSentencesIn,
  NOT_DATED_CLAIMS,
  publishedVersion,
  SITE_ABSENCES,
  type SiteAbsence,
} from "./absences"
import { collapse, writtenPages, type WrittenPage } from "./cross-references"

/**
 * The instrument for the one kind of claim this site had no instrument for.
 *
 * Everything else here checks that something is so. This checks that something
 * is **not** so, and does it by going and looking rather than by trusting the
 * sentence — which is the whole of `absences.ts`' argument and the reason four
 * pages were wrong when it was written.
 *
 * Three groups. The first holds each registered claim against the thing that
 * would contradict it. The second holds the registry against the pages, in both
 * directions, so neither a guard without a sentence nor a sentence without a
 * guard can survive. The third is the sweep.
 */

const pages = writtenPages()

const pageAt = (href: string): WrittenPage => {
  const page = pages.find((candidate) => candidate.href === href)

  if (page === undefined) {
    throw new Error(`loom: absences.ts registers a claim on ${href}, which is not a written page`)
  }

  return page
}

const fragmentsOf = (absence: SiteAbsence): readonly string[] => absence.says

const EVERY_FRAGMENT: readonly string[] = [
  ...SITE_ABSENCES.flatMap(fragmentsOf),
  ...NOT_DATED_CLAIMS.flatMap((group) => group.says),
]

describe("every registered claim, against the thing that would contradict it", () => {
  /**
   * The assertion the whole file exists for.
   *
   * It reads the published doors and the published version, not the page, so
   * there is nothing here a prose edit can satisfy. When one of these goes red
   * the fix is on the page named in the failure, and `whenItLands` says what to
   * write.
   */
  for (const absence of SITE_ABSENCES) {
    it(`${absence.id} is still true`, () => {
      expect(
        absence.found(),
        [
          `${absence.page} says this and it is no longer true:`,
          `  ${absence.of}`,
          `measured from ${absence.from}.`,
          `What to write instead: ${absence.whenItLands}`,
        ].join("\n")
      ).toEqual([])
    })
  }

  it("names each claim once", () => {
    expect(new Set(SITE_ABSENCES.map((absence) => absence.id)).size).toBe(SITE_ABSENCES.length)
  })
})

describe("the registry and the pages, held against each other", () => {
  /**
   * A guard whose sentence somebody deleted is worse than no guard: it passes
   * forever, it reads as cover, and the next writer believes a claim is held
   * when nothing is holding anything.
   */
  for (const absence of SITE_ABSENCES) {
    for (const fragment of absence.says) {
      it(`${absence.id} still says "${fragment}" on its page`, () => {
        expect(collapse(pageAt(absence.page).source)).toContain(fragment)
      })
    }
  }

  /**
   * The same rule for the other list, and the reason it is one rule.
   *
   * A reason for a sentence nobody writes any more is a line that teaches the
   * next reader about a problem the site does not have. The sweep is over the
   * whole site rather than one page because these sentences move between pages
   * as prose is reorganised, and moving one is not a reason to edit this file.
   */
  const everyDatedSentence = pages.flatMap((page) => datedSentencesIn(page.source))

  for (const group of NOT_DATED_CLAIMS) {
    for (const fragment of group.says) {
      it(`"${fragment}" is still written somewhere`, () => {
        expect(everyDatedSentence.some((sentence) => sentence.includes(fragment))).toBe(true)
      })
    }
  }
})

describe("the sweep", () => {
  /**
   * Every dated sentence on the site is in one of the two lists.
   *
   * This is the net under the habit rather than the habit itself: it cannot
   * tell a claim about Loom from a claim about the reader's own page, so it
   * asks for both to be named and lets a person say which. A new sentence here
   * costs one line in `absences.ts` — either a measurement, or a reason it does
   * not need one.
   */
  for (const page of pages) {
    const dated = datedSentencesIn(page.source)
    const unregistered = dated.filter(
      (sentence) => !EVERY_FRAGMENT.some((fragment) => sentence.includes(fragment))
    )

    it(`${page.id} registers every dated sentence it writes`, () => {
      expect(
        unregistered,
        [
          "A sentence here reads as dated and is in neither list in `_lib/absences.ts`.",
          "If it says Loom does not have something, add it to SITE_ABSENCES with the",
          "measurement that will contradict it. If it does not, add it to",
          "NOT_DATED_CLAIMS with one line saying why.",
        ].join("\n")
      ).toEqual([])
    })
  }

  /** The sweep reads something, so an empty sweep is a broken sweep. */
  it("finds the dated sentences it is registered against", () => {
    expect(pages.flatMap((page) => datedSentencesIn(page.source)).length).toBeGreaterThan(
      EVERY_FRAGMENT.length / 2
    )
  })

  it("leaves a compiled fence alone", () => {
    const source = ["before", "", "```ts", "/* nothing here yet. */", "```", "", "after"].join("\n")

    expect(datedSentencesIn(source)).toEqual([])
  })

  it("keeps a heading apart from the paragraph under it", () => {
    const source = ["## What this does not do yet", "", "A sentence with no marker in it."].join("\n")

    expect(datedSentencesIn(source)).toEqual(["## What this does not do yet"])
  })
})

describe("the version the installation page types", () => {
  /**
   * Here rather than in `packages.test.ts` because it is the other half of one
   * callout. *"Both packages are on npm at `0.1.0`, and neither is stable
   * yet"* makes two claims in one sentence: the number, and the absence. The
   * absence is measured above; the number was typed by hand and read off
   * nothing, which is the same defect `counts.ts` exists for and would not have
   * been caught by it, because a version is not a count of anything.
   */
  it("is the version the manifest publishes", () => {
    expect(collapse(pageAt("/docs/getting-started/installation").source)).toContain(
      `on npm at \`${publishedVersion()}\``
    )
  })
})
