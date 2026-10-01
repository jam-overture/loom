import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  intentIdSchema,
  nodeIdSchema,
  proposalIdSchema,
  treeIdSchema,
} from "@jam-overture/loom"
import type { IntentEpisode } from "@jam-overture/loom/telemetry"

import type { PageName } from "@/app/(portal)/_lib/page-name"
import { unattendedIn, type UnattendedChange } from "@/app/(portal)/_lib/unattended"

import { UnattendedCard } from "./unattended-card"

/**
 * The card for a change that has already happened.
 *
 * What these pin is the order a reader meets it in, and the one thing it must
 * not do: read as an alarm. A change the Gate applied correctly is news, not a
 * warning, and a portal that dresses its own runtime working properly in the
 * refusal color teaches a reader to ignore the color.
 */

const treeId = treeIdSchema.parse("t_1")

const episode: IntentEpisode = {
  intentId: intentIdSchema.parse("i_1"),
  treeId,
  intent: {
    intentId: intentIdSchema.parse("i_1"),
    origin: "user-instruction",
    actor: "ana@loom.local",
    baseRevision: 1,
    utteranceLength: 42,
    observedAt: "2026-09-07T08:59:00.000Z",
  },
  startedAt: "2026-09-07T08:59:00.000Z",
  proposals: [
    {
      proposalId: proposalIdSchema.parse("p_1"),
      provenance: {
        origin: "user-instruction",
        interpreter: "test",
        authoredBy: "model",
        confidence: 0.94,
        interpretedAt: "2026-09-07T09:00:00.000Z",
      },
      rationale: "The heading is the first thing a visitor reads.",
      delta: {
        deltaId: deltaIdSchema.parse("d_1"),
        treeId,
        baseRevision: 1,
        operations: [
          {
            op: "configure",
            nodeId: nodeIdSchema.parse("n_head"),
            set: { title: "Autumn arrivals" },
            unset: [],
          },
        ],
      },
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
    },
  ],
  resolution: { kind: "committed", proposalId: proposalIdSchema.parse("p_1"), revision: 4 },
}

const change = unattendedIn([episode]).changes[0] as UnattendedChange

const page: PageName = { name: "Autumn arrivals", treeId: "t_1", derived: true }

describe("a change nobody was asked about", () => {
  it("leads with what it did", () => {
    const { container } = render(<UnattendedCard change={change} page={page} />)

    expect(container.textContent).toContain("Changed n_head's title.")
  })

  /**
   * Order, at the source of the rendered text rather than by inspection. What
   * it did comes before who set it off, which comes before why nobody was
   * asked: a reader who stops after one line has the fact, and a reader who
   * stops after two knows whose ask it was.
   */
  it("says what it did, then who asked, then why nobody was", () => {
    const { container } = render(<UnattendedCard change={change} page={page} />)
    const text = container.textContent ?? ""

    expect(text.indexOf("Changed n_head")).toBeLessThan(text.indexOf("ana@loom.local"))
    expect(text.indexOf("ana@loom.local")).toBeLessThan(text.indexOf("Nothing this project"))
  })

  it("names the page in words with its id beside it, never instead of it", () => {
    const { container } = render(<UnattendedCard change={change} page={page} />)

    expect(container.textContent).toContain("Autumn arrivals")
    expect(container.textContent).toContain("t_1")
  })

  /**
   * The one thing a reader can do about it. A link rather than a button, for
   * the reason `WaitingCard`'s primary action is a link: undoing a change from
   * a screen that cannot show you the page is the unlooked-at write this
   * surface exists to prevent (0019).
   */
  it("offers the inverse rather than an undo button", () => {
    render(<UnattendedCard change={change} page={page} />)

    const link = screen.getByRole("link", { name: /undoing it would put back/iu })

    expect(link.getAttribute("href")).toBe("/portal/history?tree=t_1&at=4")
    expect(screen.queryByRole("button")).toBeNull()
  })

  /**
   * Not an alarm. The Gate applying a change it was allowed to apply is the
   * runtime working, and a card in the refusal color would teach a reader that
   * the color means nothing. `bg-applied` is the same green the portal already
   * uses for a change that went through.
   */
  it("is colored as something that happened, not as something that went wrong", () => {
    const { container } = render(<UnattendedCard change={change} page={page} />)
    const markup = container.innerHTML

    expect(markup).toContain("bg-applied")
    expect(markup).not.toContain("bg-rejected")
    expect(markup).not.toContain("bg-awaiting")
  })

  /**
   * The governing principle, at the one place a reader would meet it broken:
   * the confidence as a number, the rule code and the policy id are all still
   * on the card, and none of them is on it before a person has asked.
   */
  it("keeps the record and does not lead with it", () => {
    const { container } = render(<UnattendedCard change={change} page={page} />)
    const text = container.textContent ?? ""

    expect(text).toContain("0.94")
    expect(text).toContain("within-policy")
    expect(text).toContain("default")
    expect(text.indexOf("Changed n_head")).toBeLessThan(text.indexOf("0.94"))
    expect(container.querySelector("details")).not.toBeNull()
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(false)
  })

  /**
   * The record is optional and the card renders around its absence rather than
   * printing an empty label. A judgment the journal never saw must not become a
   * blank "Why you weren't asked" box, which reads as Loom declining to say.
   */
  it("drops the reason rather than emptying it, when the record has none", () => {
    const bare: UnattendedChange = {
      ...change,
      why: undefined,
      stakes: undefined,
      undo: undefined,
      technical: { ...change.technical, reason: undefined, policyId: undefined },
    }
    const { container } = render(<UnattendedCard change={bare} page={page} />)

    expect(container.textContent).not.toContain("Why you weren")
    expect(container.textContent).toContain("Changed n_head's title.")
  })
})
