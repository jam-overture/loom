import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@jam-overture/loom"
import type { StoredTally } from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { revisionReadings, type CountingStanding } from "@/app/(portal)/_lib/reading-view"

import { CountedAgainst } from "./counted-against"

const treeId = treeIdSchema.parse("t_seed1")

const reading = revisionReadings([
  {
    treeId,
    revision: 2,
    nodeId: nodeIdSchema.parse("n_hero"),
    type: primitiveTypeSchema.parse("loom.card"),
    views: 40,
    reached: 40,
    engaged: 0,
    dwellMs: 0,
    activations: 0,
    opens: 0,
    closes: 0,
    updatedAt: "2026-09-15T14:05:00.000Z",
  } satisfies StoredTally,
])[0]!

const CURRENT: CountingStanding = { kind: "current", counted: 2 }
const BEHIND: CountingStanding = { kind: "behind", counted: 2, live: 4, changes: 2 }
const UNREAD: CountingStanding = { kind: "unread", counted: 2 }
const REPLACED: CountingStanding = { kind: "replaced", counted: 2, live: 1 }

const drawn = (standing: CountingStanding) =>
  render(<CountedAgainst reading={reading} standing={standing} />)

const surface = (container: HTMLElement): string => {
  const copy = container.cloneNode(true) as HTMLElement
  for (const details of copy.querySelectorAll("details")) details.remove()

  return copy.textContent ?? ""
}

const disclosed = (container: HTMLElement): string =>
  [...container.querySelectorAll("details")].map((details) => details.textContent ?? "").join(" ")

/**
 * The screen this component exists to stop is a fully populated card whose
 * every number is real and whose subject is the previous version of the page.
 * Nothing throws, nothing is empty, and the sentence above the figures is
 * false — which is why every assertion here is about a sentence rather than
 * about a value.
 */
describe("which version these numbers are about", () => {
  it("says the numbers are live when they are, rather than saying nothing", () => {
    const { container } = drawn(CURRENT)

    expect(surface(container)).toContain("the version you are serving right now")
  })

  it("says the page has moved on, and names the version with nothing against it", () => {
    const { container } = drawn(BEHIND)

    expect(surface(container)).toContain("You have changed this page twice since then")
    expect(surface(container)).toContain("nothing has been counted for version 4 yet")
  })

  /**
   * The answer to "what do I do now?" on this state is *nothing, wait* — and it
   * has to be said, because a person who has just made a change and found
   * nothing about it will go looking for a fault in their page instead.
   */
  it("tells a reader whose change is not counted yet that there is nothing to fix", () => {
    expect(surface(drawn(BEHIND).container)).toContain("Nothing is wrong and there is nothing to fix")
  })

  it("refuses to call the numbers live when the page could not be read", () => {
    const shown = surface(drawn(UNREAD).container)

    expect(shown).toContain("couldn’t read the page itself")
    expect(shown).not.toContain("the version you are serving right now")
  })

  it("tells a replaced page apart from an unreadable one", () => {
    expect(surface(drawn(REPLACED).container)).toContain("older than these numbers")
  })

  /**
   * Every figure on this screen is as of a moment and the moment is never now.
   * It is on the surface rather than one click down: a reader cannot judge a
   * number without knowing how old it is.
   */
  it("says when the numbers were last added up, in words and in the record", () => {
    const { container } = drawn(CURRENT)

    expect(surface(container)).toContain("Counted up to 15 September 2026 at 14:05 UTC")
    expect(container.querySelector("time")?.getAttribute("dateTime")).toBe(
      "2026-09-15T14:05:00.000Z"
    )
  })

  /**
   * The 20 September finding, asserted rather than eyeballed: an expression
   * beside a word in JSX renders with no space between them, and a `toContain`
   * on either half passes anyway. The whole join is the assertion.
   */
  it("keeps the space between the sentence and the moment", () => {
    expect(surface(drawn(CURRENT).container)).toContain("right now. Counted up to")
  })

  it("never draws nothing, whatever the standing", () => {
    for (const standing of [CURRENT, BEHIND, UNREAD, REPLACED]) {
      expect(surface(drawn(standing).container).trim().length, standing.kind).toBeGreaterThan(0)
    }
  })

  /**
   * The good case is not news and must not compete with the page; the other
   * three are a condition worth knowing that is not a failure. A failed read of
   * the page is not a failure of this screen — the counters came back and every
   * number on the card stands.
   */
  it("is quiet when there is no news and a notice when there is", () => {
    expect(drawn(CURRENT).container.querySelector("[data-tone]")).toBeNull()

    for (const standing of [BEHIND, UNREAD, REPLACED]) {
      expect(
        drawn(standing).container.querySelector("[data-tone]")?.getAttribute("data-tone"),
        standing.kind
      ).toBe("notice")
    }
  })
})

describe("the record one click down", () => {
  /**
   * Nothing is ever removed. The collection window is why a version can have no
   * counters at all, and a reader who wants to know that can find it — behind a
   * disclosure, because it is a property of how the measurement is taken rather
   * than of what it says.
   */
  it("keeps the reason a version can have no counters yet, one click down", () => {
    const { container } = drawn(BEHIND)

    expect(disclosed(container)).toContain("collection window")
    expect(surface(container)).not.toContain("collection window")
  })

  it("keeps both version numbers and the instant, one click down", () => {
    const shown = disclosed(drawn(BEHIND).container)

    expect(shown).toContain("Counted version")
    expect(shown).toContain("against version 4 being served")
    expect(shown).toContain("2026-09-15T14:05:00.000Z")
  })

  it("says the page could not be read rather than printing a version it does not have", () => {
    expect(disclosed(drawn(UNREAD).container)).toContain("could not be read")
  })

  /**
   * The plain-language rule: no sentence shown unasked carries a word from the
   * runtime's vocabulary. `revision` is exempted at the point of use because it
   * is the portal's own label on every other screen — `/portal/history` numbers
   * its rows *Revision 4* — and a reader matching one against the other needs
   * the same word.
   */
  it("says everything on the surface without the runtime's vocabulary", () => {
    for (const standing of [CURRENT, BEHIND, UNREAD, REPLACED]) {
      const shown = surface(drawn(standing).container)

      expect(runtimeWordsIn(shown), shown).toEqual([])
    }
  })
})
