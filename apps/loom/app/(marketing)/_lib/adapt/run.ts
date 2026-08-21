import {
  composeChange,
  confirmChange,
  defaultGatePolicy,
  fixedPolicy,
  gatePolicySchema,
  noopEventSink,
  sequentialIdFactory,
  systemClock,
  type CompositionRuntime,
  type EditIntent,
  type GatePolicy,
  type LoomTree,
  type TreeDelta,
} from "@loom/runtime"

import { askInterpreter, type Ask } from "./asks"
import { nothingHappened, recordOf, type ChangeRecord } from "./record"

/**
 * A visitor's ask, run through the whole sequence, once, for one request.
 *
 * There is no store here, no session and no cookie, and that is a design rather
 * than a shortcut. The front door builds its page fresh on every visit, so the
 * change is a function of the address: `/?ask=costs` *is* the page with the
 * plans lifted, and the same address a week later is the same page. Two
 * visitors cannot undo each other, a recycled instance forgets nothing because
 * it was holding nothing, and there is nothing here for a robot to fill up.
 *
 * The portal's demo needs a session because a visitor there builds up a
 * sequence of changes and can revert any of them. This band answers a smaller
 * question — *does the page really rearrange itself, and can it really say what
 * happened?* — and answering it statelessly is what makes it affordable on a
 * page anyone can load.
 */

/**
 * The rules this site publishes under, and they are a real set of rules rather
 * than a set arranged to make a demonstration look good.
 *
 * Two things are protected: **what the site charges, and the way out of it.**
 * That is the rule an ordinary business would actually write — an AI may
 * rearrange the argument all it likes, and it may not quietly take the prices
 * or the menu off the page — and writing it produces, without any further
 * contrivance, all three answers a set of rules can give:
 *
 * - Adding a band, taking the questions away and calming the top of the page are
 *   nobody's crisis. They **land on their own**.
 * - Lifting the plans to the top *moves* something protected, which is not
 *   damage but is not a machine's call either. It **stops and asks a person**,
 *   and the person here is the visitor.
 * - Taking the plans away **destroys** something protected, and that is refused
 *   outright. Saying yes does not help, which is the point of a floor.
 *
 * A **named** set rather than an edited default
 * ([0033](../../../../../../decisions/0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md)):
 * the name is what the verdict carries, and a host that changes what a set of
 * rules contains owes it a new name. `front-door` has never meant anything else.
 */
export const FRONT_DOOR_POLICY: GatePolicy = gatePolicySchema.parse({
  ...defaultGatePolicy,
  policyId: "front-door",
  protectedPrimitiveTypes: ["loom.tier-table", "loom.nav", "loom.footer"],
})

export type AskRun = {
  /** The page as the visitor should now see it: changed if the rules allowed it. */
  readonly page: LoomTree
  readonly record: ChangeRecord
  /**
   * The change that reverses this one, written at the same time as the change
   * itself and absent only when nothing was applied.
   *
   * The panel counts its steps, and it is also the site's own proof. "Put it
   * back" on a stateless page is a link home, which rebuilds the page from
   * scratch — so the claim in the panel, that putting it back *restores* the
   * page rather than writing a fresh one that looks similar, is only true if
   * those two are the same page. `adapt.test.ts` applies this to the changed
   * page and holds the result against the one the visitor arrived on.
   */
  readonly undo?: TreeDelta
}

const intentFor = (page: LoomTree, ask: Ask, runtime: CompositionRuntime): EditIntent => ({
  intentId: runtime.idFactory.intentId(),
  treeId: page.treeId,
  baseRevision: page.revision,
  /**
   * A visitor clicking a button is a person asking for something, so this is
   * the origin it is, and it is the origin that earns the most latitude. Saying
   * otherwise to make the demonstration look better would be the site lying in
   * the one place it is claiming not to.
   */
  origin: "user-instruction",
  actor: "a visitor",
  utterance: ask.utterance,
  observedAt: runtime.clock.now(),
})

/**
 * One ask, from the request to the record.
 *
 * `approve` is the visitor answering a hold. It re-runs the judgment against
 * the page as it stands rather than trusting the one made a moment ago — which
 * is `confirmChange`'s own guarantee, not something this caller arranges — so a
 * change the rules would now refuse stays refused however emphatically it was
 * approved.
 */
export const runAsk = async (page: LoomTree, ask: Ask, approve = false): Promise<AskRun> => {
  const idFactory = sequentialIdFactory("ask")
  const runtime: CompositionRuntime = {
    interpreter: askInterpreter(ask, idFactory, systemClock),
    policySource: fixedPolicy(FRONT_DOOR_POLICY),
    events: noopEventSink,
    clock: systemClock,
    idFactory,
  }

  const intent = intentFor(page, ask, runtime)
  const composed = await composeChange(runtime, page, intent)

  if (composed.kind === "not-interpreted") {
    return { page, record: nothingHappened(ask, "There was nothing on this page for that to change.") }
  }

  if (composed.kind === "not-applicable") {
    return {
      page,
      record: nothingHappened(ask, "The change did not fit this page, so nothing was touched."),
    }
  }

  if (composed.kind === "applied") {
    return {
      page: composed.tree,
      record: recordOf(ask, composed.assessment, composed.disposition, true),
      undo: composed.inverse,
    }
  }

  if (composed.kind === "rejected" || !approve) {
    return { page, record: recordOf(ask, composed.assessment, composed.disposition, false) }
  }

  /**
   * The visitor has answered a hold, so the change is put a second time.
   *
   * The verdict that comes back still says *held* — the rules are asked again
   * and they have not changed their mind, because a person saying yes is not
   * evidence about the change. What changed is that it applied anyway, and the
   * record carries both halves. Passing the applied-ness separately rather than
   * reading it off the verdict is what keeps that pair honest.
   */
  const confirmed = confirmChange(runtime, page, composed.assessment.proposal, intent)

  return confirmed.kind === "applied"
    ? {
        page: confirmed.tree,
        record: recordOf(ask, confirmed.assessment, confirmed.disposition, true),
        undo: confirmed.inverse,
      }
    : confirmed.kind === "rejected"
      ? { page, record: recordOf(ask, confirmed.assessment, confirmed.disposition, false) }
      : {
          page,
          record: nothingHappened(ask, "The change did not fit this page, so nothing was touched."),
        }
}
