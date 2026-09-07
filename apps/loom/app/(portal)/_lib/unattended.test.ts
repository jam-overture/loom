import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  intentIdSchema,
  nodeIdSchema,
  proposalIdSchema,
  treeIdSchema,
  type TreeDelta,
} from "@loom/runtime"
import type { IntentEpisode, ProposalEpisode } from "@loom/runtime/telemetry"

import { unattendedIn, unattendedSummary } from "./unattended"
import { readingOf } from "./vocabulary"

/**
 * What this pins is one claim and the two ways of getting it wrong.
 *
 * The claim: **these changes reached a page with nobody asked.** A screen that
 * says that about a change somebody actually approved is lying in the direction
 * that matters — it invites a person to go and undo something they said yes to
 * — and a screen that leaves one out is the under-report the front door's
 * partial-sweep notice exists to prevent, in the half that has no notice.
 */

const treeId = treeIdSchema.parse("t_1")
const other = treeIdSchema.parse("t_2")

const delta = (id: string, nodeId: string): TreeDelta => ({
  deltaId: deltaIdSchema.parse(id),
  treeId,
  baseRevision: 1,
  operations: [
    {
      op: "configure",
      nodeId: nodeIdSchema.parse(nodeId),
      set: { title: "Autumn arrivals" },
      unset: [],
    },
  ],
})

const proposal = (id: string, overrides: Partial<ProposalEpisode> = {}): ProposalEpisode => ({
  proposalId: proposalIdSchema.parse(id),
  provenance: {
    origin: "user-instruction",
    interpreter: "test",
    authoredBy: "model",
    confidence: 0.94,
    interpretedAt: "2026-09-07T09:00:00.000Z",
  },
  rationale: "The heading is the first thing a visitor reads.",
  delta: delta(`d_${id.replace(/_/gu, "")}`, "n_head"),
  proposedAt: "2026-09-07T09:00:00.000Z",
  disposition: {
    kind: "accepted",
    reason: { code: "within-policy", detail: "nothing watched was touched" },
    stakes: "low",
    reversible: true,
    confidence: 0.94,
    policyId: "default",
  },
  held: false,
  repairRequested: false,
  settledAt: "2026-09-07T09:00:10.000Z",
  committedRevision: 4,
  ...overrides,
})

const episode = (
  id: string,
  proposals: readonly ProposalEpisode[],
  resolution: IntentEpisode["resolution"],
  overrides: Partial<IntentEpisode> = {}
): IntentEpisode => ({
  intentId: intentIdSchema.parse(id),
  treeId,
  intent: {
    intentId: intentIdSchema.parse(id),
    origin: "user-instruction",
    actor: "ana@loom.local",
    baseRevision: 1,
    utteranceLength: 42,
    observedAt: "2026-09-07T08:59:00.000Z",
  },
  startedAt: "2026-09-07T08:59:00.000Z",
  proposals,
  resolution,
  ...overrides,
})

const committed = (proposalId: string, revision: number): IntentEpisode["resolution"] => ({
  kind: "committed",
  proposalId: proposalIdSchema.parse(proposalId),
  revision,
})

describe("which committed changes nobody was asked about", () => {
  it("finds a change the Gate applied on its own", () => {
    const sweep = unattendedIn([episode("i_1", [proposal("p_1")], committed("p_1", 4))])

    expect(sweep.changes).toHaveLength(1)
    expect(sweep.changes[0]?.revision).toBe(4)
    expect(sweep.unclear).toBe(0)
  })

  /**
   * The failure that would make this screen actively harmful. A held proposal
   * is one the Gate stopped on and a person answered; putting it in a list
   * headed "changed without asking you" tells a reader they were bypassed when
   * they were not.
   */
  it("leaves out a change a person was asked about", () => {
    const sweep = unattendedIn([
      episode(
        "i_1",
        [proposal("p_1", { held: true, answeredBy: "ana@loom.local" })],
        committed("p_1", 4)
      ),
    ])

    expect(sweep.changes).toEqual([])
  })

  /**
   * `held` and `answeredBy` are separate facts and either one settles it. A
   * proposal answered by somebody without the hold flag surviving is still a
   * proposal somebody answered.
   */
  it("leaves out a change somebody answered even when it does not read as held", () => {
    const sweep = unattendedIn([
      episode("i_1", [proposal("p_1", { answeredBy: "ana@loom.local" })], committed("p_1", 4)),
    ])

    expect(sweep.changes).toEqual([])
  })

  it("leaves out everything that was not committed", () => {
    const sweep = unattendedIn([
      episode("i_1", [proposal("p_1")], {
        kind: "refused",
        proposalId: proposalIdSchema.parse("p_1"),
      }),
      episode("i_2", [proposal("p_2")], {
        kind: "awaiting-answer",
        proposalId: proposalIdSchema.parse("p_2"),
      }),
      episode("i_3", [proposal("p_3")], { kind: "open" }),
    ])

    expect(sweep.changes).toEqual([])
    expect(sweep.unclear).toBe(0)
  })

  /**
   * The other direction, and the one that has to be counted rather than
   * guessed: a window that opened after a proposal was proposed sees the commit
   * and not the proposal. It is neither attended nor unattended as far as this
   * fold can tell, and putting it in the list on the strength of a record it did
   * not read would be the same lie as the held case.
   */
  it("counts a committed change it never saw proposed, rather than claiming it either way", () => {
    const sweep = unattendedIn([episode("i_1", [], committed("p_gone", 9))])

    expect(sweep.changes).toEqual([])
    expect(sweep.unclear).toBe(1)
  })

  it("reads newest first, whichever order the fold arrives in", () => {
    const sweep = unattendedIn([
      episode("i_1", [proposal("p_1")], committed("p_1", 4)),
      episode("i_2", [proposal("p_2")], committed("p_2", 5)),
    ])

    expect(sweep.changes.map((change) => change.revision)).toEqual([5, 4])
  })
})

describe("what one of those changes says", () => {
  const [change] = unattendedIn([episode("i_1", [proposal("p_1")], committed("p_1", 4))]).changes

  it("leads with what it did, as a sentence rather than a delta", () => {
    expect(change?.did.map(readingOf)).toEqual(["Changed n_head's title."])
  })

  it("says who set it off in the words Activity and History use", () => {
    expect(change?.who).toBe("ana@loom.local asked for this.")
  })

  /**
   * The sentence this whole screen turns on, and it is the Gate's own reason
   * rather than a reassurance this module wrote. `within-policy` is the code the
   * runtime records when nothing the policy watches for was involved.
   */
  it("says why nobody was asked, in the Gate's own reason", () => {
    expect(change?.why).toBe(
      "Nothing this project watches for was involved, so it went ahead on its own."
    )
  })

  /**
   * A clause that follows a stakes label elsewhere stands alone here, beside
   * the link, so it arrives shaped as a sentence. The first screenshot had
   * `you could undo it` in grey next to a button, reading as a caption somebody
   * forgot to finish.
   */
  it("says whether it can be taken back, as a sentence rather than a fragment", () => {
    expect(change?.undo).toBe("You could undo it.")
  })

  it("keeps the number in the technical record and the word in the sentence", () => {
    expect(change?.sure).toBe("The AI says it is very sure.")
    expect(change?.technical.confidence).toBe(0.94)
    expect(change?.technical.reason).toBe("within-policy")
    expect(change?.technical.policyId).toBe("default")
  })

  /**
   * The one thing a reader can do about a change that has already happened, and
   * the reason this list is worth reading at all: the revision is where its
   * inverse is, and the link has to arrive holding it rather than at the top of
   * the page's history.
   */
  it("points at the revision it became, not at the page's history in general", () => {
    expect(change?.href).toBe("/portal/history?tree=t_1&at=4")
  })

  it("dates it by when it settled rather than when it was proposed", () => {
    expect(change?.whenIso).toBe("2026-09-07T09:00:10.000Z")
    expect(change?.when).toBe("7 September 2026 at 09:00 UTC")
  })

  /**
   * A delta the runtime computed carries a confidence and it means nothing —
   * only a model grades itself (0007). Saying "the AI says it is very sure"
   * over an inverse would attribute a claim to a model that never made one.
   */
  it("does not put words in a model's mouth about a delta the runtime wrote", () => {
    const derived = unattendedIn([
      episode(
        "i_1",
        [
          proposal("p_1", {
            provenance: {
              origin: "developer",
              interpreter: "runtime",
              authoredBy: "runtime",
              confidence: 1,
              interpretedAt: "2026-09-07T09:00:00.000Z",
            },
          }),
        ],
        committed("p_1", 4)
      ),
    ])

    expect(derived.changes[0]?.sure).not.toContain("The AI says")
  })

  /**
   * The judgment is optional on the record and the card renders around its
   * absence. What must not happen is this module inventing one — a change with
   * no recorded disposition has no stakes and no reason, and saying "low risk"
   * because that is the commonest answer would be a guess printed as a record.
   */
  it("says nothing about a judgment the record does not carry", () => {
    const { disposition, ...unjudged } = proposal("p_1")

    /** Guards the fixture: without this the case below could pass vacuously. */
    expect(disposition).toBeDefined()

    const sweep = unattendedIn([episode("i_1", [unjudged], committed("p_1", 4))])

    expect(sweep.changes[0]?.why).toBeUndefined()
    expect(sweep.changes[0]?.stakes).toBeUndefined()
    expect(sweep.changes[0]?.undo).toBeUndefined()
    expect(sweep.changes[0]?.technical.reason).toBeUndefined()
  })

  it("names the page from the episode, so a change on another page keeps its own", () => {
    const elsewhere = unattendedIn([
      episode("i_1", [proposal("p_1")], committed("p_1", 4), { treeId: other }),
    ])

    expect(elsewhere.changes[0]?.treeId).toBe("t_2")
    expect(elsewhere.changes[0]?.href).toBe("/portal/history?tree=t_2&at=4")
  })

  /**
   * An ask with no actor is not an ask by nobody: the origin says what set it
   * off, and a schedule that rewrites a page overnight is the case a reader
   * most wants named.
   */
  it("names the origin when no person is on the ask", () => {
    const scheduled = unattendedIn([
      episode("i_1", [proposal("p_1")], committed("p_1", 4), {
        intent: {
          intentId: intentIdSchema.parse("i_1"),
          origin: "scheduled-adaptation",
          baseRevision: 1,
          utteranceLength: 0,
          observedAt: "2026-09-07T08:59:00.000Z",
        },
      }),
    ])

    expect(scheduled.changes[0]?.who).toBe("A schedule asked for this.")
  })
})

describe("what the list adds up to, said before a reader meets a card", () => {
  const sweepOf = (count: number) =>
    unattendedIn(
      Array.from({ length: count }, (_, index) =>
        episode(`i_${index}`, [proposal(`p_${index}`)], committed(`p_${index}`, index + 1))
      )
    )

  it("says so plainly when there is nothing, rather than leaving an absence to be read", () => {
    expect(unattendedSummary(sweepOf(0))).toBe("Loom asked you about every change it made recently.")
  })

  it("counts one without pluralising it", () => {
    expect(unattendedSummary(sweepOf(1))).toContain("1 recent change was made without anyone")
  })

  it("counts several", () => {
    expect(unattendedSummary(sweepOf(3))).toContain("3 recent changes were made without anyone")
  })

  /**
   * The gap is said in the same sentence as the count, never left to a
   * disclosure. A count over part of a record that reads as a count over all of
   * it is the defect the scoped screens shipped in August.
   */
  it("says what it could not judge, beside the count and not under it", () => {
    const sweep = unattendedIn([
      episode("i_1", [proposal("p_1")], committed("p_1", 4)),
      episode("i_2", [], committed("p_gone", 5)),
    ])

    expect(unattendedSummary(sweep)).toContain("1 more change started before this stretch")
  })

  it("says what it could not judge even when it found nothing at all", () => {
    const sweep = unattendedIn([episode("i_1", [], committed("p_gone", 5))])

    expect(unattendedSummary(sweep)).toContain("Loom asked you about every change it made")
    expect(unattendedSummary(sweep)).toContain("cannot say either way")
  })
})
