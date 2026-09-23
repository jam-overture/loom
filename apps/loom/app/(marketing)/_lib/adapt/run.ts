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
  type EventSink,
  type GatePolicy,
  type LoomTree,
  type TreeDelta,
} from "@loom/runtime"

import { propsVocabularyFor, registeredTypesFor } from "@loom/runtime/sdk"

import { siteRegistry } from "../registry"

import { askInterpreter, type Ask } from "./asks"
import { nothingHappened, recordOf, requestOf, type ChangeRecord } from "./record"

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
 * Two things are protected: **what the site says it is for, and the way out of
 * it.** That is the rule an ordinary business would actually write — an AI may
 * rearrange the argument all it likes, and it may not quietly take away the
 * statement of what the product does, or the menu that leads out — and writing
 * it produces, without any further contrivance, all three answers a set of rules
 * can give:
 *
 * - Adding a band, taking the questions away and calming the top of the page are
 *   nobody's crisis. They **land on their own**.
 * - Lifting the point of the product to the top *moves* something protected,
 *   which is not damage but is not a machine's call either. It **stops and asks
 *   a person**, and the person here is the visitor.
 * - Taking that band away **destroys** something protected, and that is refused
 *   outright. Saying yes does not help, which is the point of a floor.
 *
 * It was the pricing table here until 21 August, when the maintainer took
 * pricing off the front door. `loom.mosaic` is the band that replaced it and is
 * what the list now names — the type is the handle the rules have, and the words
 * a visitor reads for it are "what this site says it is for".
 *
 * A **named** set rather than an edited default
 * ([0033](../../../../../../decisions/0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md)):
 * the name is what the verdict carries, and a host that changes what a set of
 * rules contains owes it a new name. `front-door` has never meant anything else.
 *
 * **Two floors were added under it on 23 September, and neither is a rule
 * anybody wrote.** `/your-components` has said since 11 September that there are
 * *three things no request gets past*, and two of the three were claims this
 * deployment was not in a position to make: a request naming a piece nobody
 * described, or setting one of ours to a value its own description does not
 * allow, reached the rules, passed them and was committed — and what the reader
 * got was a hole where the piece should be, on every visit, until somebody
 * looked at a screen rather than at a test.
 *
 * `registeredPrimitiveTypes` closes the first
 * ([0173](../../../../../../decisions/0173-a-change-may-not-add-a-node-the-deployment-cannot-draw.md))
 * and `propsVocabulary` on the runtime below closes the second
 * ([0179](../../../../../../decisions/0179-what-a-primitive-accepts-is-a-vocabulary-the-write-path-is-handed-not-a-field-on-a-policy.md)).
 * Both are read off `siteRegistry` — the same list the renderer resolves against
 * — rather than kept beside it, because a deployment whose rules and whose
 * renderer disagree about what can be drawn has a hole that no test of either
 * one alone would find.
 *
 * **It is not an edit to what this set of rules protects**, which is what keeps
 * the name honest: the three protected types are unchanged, and every answer the
 * five buttons get is unchanged. What the two add is a floor under *every*
 * request, including the ones this site offers no button for. `floors.ts` puts
 * two of those and prints what came back.
 */
export const FRONT_DOOR_POLICY: GatePolicy = gatePolicySchema.parse({
  ...defaultGatePolicy,
  policyId: "front-door",
  protectedPrimitiveTypes: ["loom.mosaic", "loom.nav", "loom.footer"],
  registeredPrimitiveTypes: registeredTypesFor(siteRegistry),
})

/**
 * What this site's pieces accept, in the shape the write path takes.
 *
 * One value rather than a call per composition root, because all three of this
 * lane's roots are the same deployment asking the same question — and a root
 * that quietly wired a different one would be a second answer to *what can this
 * site draw*, with nothing holding the two together.
 */
export const SITE_PROPS_VOCABULARY = propsVocabularyFor(siteRegistry)

/**
 * What each protected type is, said the way a visitor would say it.
 *
 * The band has to tell a reader what this site protects *before* offering the
 * button that will be refused for exactly that reason — a refusal the reader
 * did not see coming reads as the page breaking rather than as a rule holding.
 * So the sentence exists, and the sentence is the thing that goes stale: it
 * still said "what it charges" for one commit after pricing left the front door.
 *
 * Deriving it from the list is what stops that happening twice. A protected type
 * with no plain words here throws while the page is being built, which is a
 * failing test rather than a landing page quietly making a promise its rules no
 * longer keep.
 */
export const PROTECTED_IN_PLAIN_WORDS: Readonly<Record<string, string>> = {
  "loom.mosaic": "what it says it is for",
  "loom.nav": "the way out of it",
  "loom.footer": "the way out of it",
}

/**
 * The protected list as a reader meets it: no type names, and deduplicated,
 * because the menu and the closing band are two pieces of one promise and a
 * visitor told "the way out of it, and the way out of it" is being read a list
 * of implementation details.
 */
export const protectedInPlainWords = (): readonly string[] => [
  ...new Set(
    FRONT_DOOR_POLICY.protectedPrimitiveTypes.map((type) => {
      const words = PROTECTED_IN_PLAIN_WORDS[type]

      if (words === undefined) {
        throw new Error(`loom: ${type} is protected and nothing on the front door says so`)
      }

      return words
    })
  ),
]

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
/**
 * The namespace the ids of anything this request adds are drawn from.
 *
 * One request is one run, so a fresh factory per run is right — and on the
 * front door, where exactly one request is ever run against a page, the
 * namespace never needs to differ. A *history* runs several against the same
 * page, and two runs of the same namespace hand out the same ids: the second
 * request to add a band asks the page to hold a piece it is already holding,
 * and the page refuses it. That refusal is correct and the request was not, so
 * the caller says which run this is rather than the page being asked to
 * tolerate a collision.
 *
 * Lowercase letters and digits only, and `sequentialIdFactory` says so.
 */
const RUN_NAMESPACE = "ask"

/**
 * Who is listening, and why anyone would be.
 *
 * The front door itself listens to nothing: the panel it shows is built from
 * what `composeChange` *returned*, and a landing page has nowhere to put a log.
 * A deployment does. Every stage of the sequence narrates itself to whatever
 * the host hands in here, including the stages that fail, and that stream is
 * the thing this site claims exists — so the mechanism page runs one real
 * request with an ordinary listener attached and prints what it heard.
 *
 * It stays a parameter with a do-nothing default rather than something this
 * module keeps, because a listener that survived the request would be state on
 * a page whose whole design is that it holds none (0081).
 */
export const runAsk = async (
  page: LoomTree,
  ask: Ask,
  approve = false,
  namespace: string = RUN_NAMESPACE,
  events: EventSink = noopEventSink
): Promise<AskRun> => {
  const idFactory = sequentialIdFactory(namespace)
  const runtime: CompositionRuntime = {
    interpreter: askInterpreter(ask, idFactory, systemClock),
    policySource: fixedPolicy(FRONT_DOOR_POLICY),
    propsVocabulary: SITE_PROPS_VOCABULARY,
    events,
    clock: systemClock,
    idFactory,
  }

  const intent = intentFor(page, ask, runtime)
  const composed = await composeChange(runtime, page, intent)

  if (composed.kind === "not-interpreted") {
    return {
      page,
      record: nothingHappened(requestOf(ask), "There was nothing on this page for that to change."),
    }
  }

  if (composed.kind === "not-applicable") {
    return {
      page,
      record: nothingHappened(requestOf(ask), "The change did not fit this page, so nothing was touched."),
    }
  }

  if (composed.kind === "applied") {
    return {
      page: composed.tree,
      record: recordOf(requestOf(ask), composed.assessment, composed.disposition, true),
      undo: composed.inverse,
    }
  }

  if (composed.kind === "rejected" || !approve) {
    return { page, record: recordOf(requestOf(ask), composed.assessment, composed.disposition, false) }
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
        record: recordOf(requestOf(ask), confirmed.assessment, confirmed.disposition, true),
        undo: confirmed.inverse,
      }
    : confirmed.kind === "rejected"
      ? { page, record: recordOf(requestOf(ask), confirmed.assessment, confirmed.disposition, false) }
      : {
          page,
          record: nothingHappened(requestOf(ask), "The change did not fit this page, so nothing was touched."),
        }
}
