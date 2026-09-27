import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { deltaIdSchema, intentIdSchema, nodeIdSchema, proposalIdSchema, treeIdSchema } from "@jam-overture/loom"
import type { IntentEpisode, ProposalEpisode } from "@jam-overture/loom/telemetry"

import { EpisodeCard } from "./episode-card"

/**
 * One ask, as somebody who has read no decision record meets it.
 *
 * The card's badge used to carry the runtime's resolution kind — `not
 * interpreted`, `not written`, `discarded` — and under it a monospace run of
 * five facts about the ask with nothing saying which was which. Both are still
 * on the card. These pin that neither is the first thing anybody reads.
 */

const treeId = treeIdSchema.parse("t_1")
const intentId = intentIdSchema.parse("i_1")
const proposalId = proposalIdSchema.parse("p_1")

const proposal: ProposalEpisode = {
  proposalId,
  provenance: {
    origin: "user-instruction",
    interpreter: "claude-test-1",
    authoredBy: "model",
    confidence: 0.6,
    interpretedAt: "2026-07-31T09:04:00.000Z",
  },
  rationale: "Shorten the heading.",
  delta: { deltaId: deltaIdSchema.parse("d_1"), treeId, baseRevision: 0, operations: [] },
  proposedAt: "2026-07-31T09:04:00.000Z",
  held: false,
  repairRequested: false,
}

const intent: IntentEpisode["intent"] = {
  intentId,
  origin: "user-instruction",
  actor: "ana@loom.local",
  baseRevision: 3,
  utteranceLength: 24,
  observedAt: "2026-07-31T09:04:00.000Z",
}

/**
 * `intent` is optional in the record rather than nullable, so an episode
 * without one omits the key. Passing `intent: undefined` would be a different
 * thing under `exactOptionalPropertyTypes` and would not compile.
 */
const episode = (overrides: Partial<IntentEpisode> = {}): IntentEpisode => ({
  intentId,
  treeId,
  intent,
  startedAt: "2026-07-31T09:04:00.000Z",
  proposals: [proposal],
  resolution: { kind: "committed", proposalId, revision: 4 },
  ...overrides,
})

const episodeWithoutIntent = (resolution: IntentEpisode["resolution"]): IntentEpisode => ({
  intentId,
  treeId,
  startedAt: "2026-07-31T09:04:00.000Z",
  proposals: [],
  resolution,
})

/**
 * The card's own disclosure, not the one belonging to a proposal inside it. A
 * bare `querySelector("details")` finds the proposal's, which is why every
 * assertion here names the summary it means.
 */
const cardDisclosure = (container: HTMLElement): HTMLDetailsElement | undefined =>
  [...container.querySelectorAll("details")].find(
    (details) => details.querySelector("summary")?.textContent === "What the record says"
  )

const unasked = (container: HTMLElement): string => {
  const disclosures = [...container.querySelectorAll("details")].map(
    (details) => details.textContent ?? ""
  )

  return disclosures.reduce((text, disclosure) => text.replace(disclosure, ""), container.textContent ?? "")
}

describe("EpisodeCard", () => {
  it("leads with what became of the ask, in a word", () => {
    render(
      <ul>
        <EpisodeCard episode={episode()} />
      </ul>
    )

    expect(screen.getByText("Done")).toBeTruthy()
    expect(screen.getByText(/Loom made this change, and it is live on the page/)).toBeTruthy()
  })

  /**
   * The three the runtime spelled straight into the badge. Each is a real and
   * different answer (0019 turns on the difference), so each keeps its own word.
   */
  it("puts no runtime kind in the badge, for any resolution", () => {
    const cases = [
      { resolution: { kind: "not-interpreted" as const, failure: { stage: "interpretation" as const, code: "x", detail: "y" } }, label: "Not understood" },
      { resolution: { kind: "not-writable" as const, failure: { stage: "commit" as const, code: "x", detail: "y" } }, label: "Not saved" },
      { resolution: { kind: "discarded" as const, proposalId }, label: "You said no" },
      { resolution: { kind: "refused" as const, proposalId }, label: "Not allowed" },
      { resolution: { kind: "awaiting-answer" as const, proposalId }, label: "Waiting on you" },
    ]

    for (const { resolution, label } of cases) {
      const { container, unmount } = render(
        <ul>
          <EpisodeCard episode={episode({ resolution })} />
        </ul>
      )

      expect(unasked(container), resolution.kind).toContain(label)
      expect(unasked(container), resolution.kind).not.toContain(resolution.kind)
      unmount()
    }
  })

  /**
   * The revision an ask produced is somewhere a reviewer can go (0043), not a
   * number in a sentence they have to retype.
   */
  it("links the version an applied ask produced", () => {
    render(
      <ul>
        <EpisodeCard episode={episode()} />
      </ul>
    )

    const link = screen.getByRole("link", { name: "version 4" })

    expect(link.getAttribute("href")).toContain("/portal/history")
  })

  it("links the version the ask was written against", () => {
    render(
      <ul>
        <EpisodeCard episode={episode()} />
      </ul>
    )

    expect(screen.getByRole("link", { name: "version 3" })).toBeTruthy()
  })

  /**
   * "Not allowed" reads very differently when a schedule asked than when a
   * person did, so who asked is the sentence directly under the outcome — and
   * it was a monospace run of five facts.
   */
  it("says who asked and what it was aimed at, as sentences", () => {
    const { container } = render(
      <ul>
        <EpisodeCard episode={episode()} />
      </ul>
    )

    expect(unasked(container)).toContain("ana@loom.local asked for this")
    expect(unasked(container)).toContain("It was aimed at the whole page.")
    expect(unasked(container)).not.toContain("user-instruction")
    expect(unasked(container)).not.toContain("24 characters")
  })

  it("says an ask was aimed at one part without printing the part's name unasked", () => {
    const scopeNodeId = nodeIdSchema.parse("n_card")
    const { container } = render(
      <ul>
        <EpisodeCard
          episode={episode({
            intent: {
              intentId,
              origin: "developer",
              baseRevision: 1,
              scopeNodeId,
              utteranceLength: 9,
              observedAt: "2026-07-31T09:04:00.000Z",
            },
          })}
        />
      </ul>
    )

    expect(unasked(container)).toContain("It was aimed at one part of the page.")
    expect(unasked(container)).not.toContain(scopeNodeId)
    expect(cardDisclosure(container)?.textContent).toContain(scopeNodeId)
  })

  /**
   * Nothing is removed to make a screen simple. The ask's id is what somebody
   * greps the journal for and the resolution's kind is what a bug report quotes.
   */
  it("keeps the ask's id, the tree's id and the resolution's kind one click down", () => {
    const { container } = render(
      <ul>
        <EpisodeCard episode={episode()} />
      </ul>
    )
    const disclosure = cardDisclosure(container)

    expect(disclosure?.open).toBe(false)
    expect(disclosure?.textContent).toContain(intentId)
    expect(disclosure?.textContent).toContain(treeId)
    expect(disclosure?.textContent).toContain("committed")
    expect(disclosure?.textContent).toContain("user-instruction")
    expect(disclosure?.textContent).toContain("2026-07-31T09:04:00.000Z")
  })

  /** The ISO instant reads as a date, and stays machine-readable in `datetime`. */
  it("reads the time as a date and keeps the instant on the element", () => {
    const { container } = render(
      <ul>
        <EpisodeCard episode={episode()} />
      </ul>
    )
    const time = container.querySelector("time")

    expect(time?.textContent).toBe("31 July 2026 at 09:04 UTC")
    expect(time?.getAttribute("datetime")).toBe("2026-07-31T09:04:00.000Z")
  })

  /**
   * An ask the model never turned into a change is a real outcome, and the
   * commonest one worth noticing — so it is said rather than left as an empty
   * list.
   */
  it("says so when the AI never wrote a change", () => {
    render(
      <ul>
        <EpisodeCard episode={episode({ proposals: [], resolution: { kind: "open" } })} />
      </ul>
    )

    expect(screen.getByText("The AI never got as far as writing a change.")).toBeTruthy()
  })

  /**
   * And says it once. A screenshot of the real screen showed "It never got as
   * far as proposing anything" and "The AI never got as far as writing a change"
   * one line apart — the same fact twice, from two components that could not see
   * each other. The more specific sentence is the one that survives.
   */
  it("does not repeat itself when a failure has already said the same thing", () => {
    const { container } = render(
      <ul>
        <EpisodeCard
          episode={episode({
            proposals: [],
            resolution: {
              kind: "not-interpreted",
              failure: { stage: "interpretation", code: "x", detail: "the model returned nothing" },
            },
          })}
        />
      </ul>
    )

    expect(unasked(container)).toContain("It never got as far as proposing anything")
    expect(unasked(container)).not.toContain("The AI never got as far as writing a change.")
  })

  /**
   * The reassurance a failure needs and never had: whatever broke, the page was
   * not left half-changed.
   */
  it("says what a failure meant for the page, and keeps the runtime's account below", () => {
    const { container } = render(
      <ul>
        <EpisodeCard
          episode={episode({
            resolution: {
              kind: "failed",
              proposalId,
              failure: { stage: "commit", code: "conflict", detail: "the base revision moved" },
            },
          })}
        />
      </ul>
    )

    expect(unasked(container)).toContain("while the change was being written down")
    expect(unasked(container)).not.toContain("the base revision moved")
    expect(cardDisclosure(container)?.textContent).toContain("the base revision moved")
  })

  /** A window can open mid-episode, and saying so beats rendering a blank line. */
  it("says so when the ask itself was not recorded, and offers no version to go to", () => {
    const { container } = render(
      <ul>
        <EpisodeCard episode={episodeWithoutIntent({ kind: "open" })} />
      </ul>
    )

    expect(unasked(container)).toContain("further back than this page reaches")
    expect(screen.queryByRole("link", { name: /^revision/ })).toBeNull()
  })

  /**
   * Found by looking at a scoped Activity rather than by any assertion: the id
   * was printed once in the lead sentence, once on the strip's "The page", and
   * again on every card — three cards, five printings of one fact.
   */
  it("names the page on every card when the screen could be about any page", () => {
    const { container } = render(
      <ul>
        <EpisodeCard episode={episode()} />
      </ul>
    )

    expect(unasked(container)).toContain(treeId)
  })

  it("stops repeating the page's name once the screen has already said it", () => {
    const { container } = render(
      <ul>
        <EpisodeCard episode={episode()} scoped />
      </ul>
    )

    expect(unasked(container)).not.toContain(treeId)
    expect(cardDisclosure(container)?.textContent).toContain(treeId)
  })

  /**
   * The repeat goes; the way to the page does not. Dropping the link outright
   * would strand a reader on a screen full of changes to a page they cannot
   * open, which is why this asserts the card is the *only* thing that changed.
   */
  it("keeps everything else it says when it stops naming the page", () => {
    const { container } = render(
      <ul>
        <EpisodeCard episode={episode()} scoped />
      </ul>
    )

    expect(unasked(container)).toContain("Loom made this change, and it is live on the page")
    expect(screen.getByText("Done")).toBeTruthy()
  })
})
