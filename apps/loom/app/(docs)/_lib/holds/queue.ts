import {
  gatePolicySchema,
  type DispositionReasonCode,
  type GatePolicy,
  type StakeLevel,
} from "@jam-overture/loom"
import {
  describeWriteOutcome,
  type HeldProposal,
  type WriteOutcome,
  type WriteOutcomeKind,
} from "@jam-overture/loom/write"

import { addASentence, demoteTheHeading, quietenTheSentence } from "../bench/changes"
import { applied, DANA, heldIn, nodeOfType, openBench, plans, RAVI, type Bench } from "../bench/page"
import { docsGatePolicy } from "../propose/policy"

/**
 * The queue a person answers from, produced by putting things in one.
 *
 * *What the Gate decides* ends with a verdict — yes, ask a person, or no — and
 * the middle one is the only verdict that is somebody's job. Nothing on this
 * site said what that job looks like: what is waiting, what a reviewer is shown
 * about each item, what saying yes actually does, and the thing a queue cannot
 * tell you without being asked twice.
 *
 * So every row on the page is a real hold. One store is opened, four ordinary
 * asks are sent through `commitIntent`, two of them are held for the two
 * different reasons a hold happens, and the answers are `confirmHeld` and
 * `discardHeld` being called on them.
 *
 * **The number that has to be produced rather than written is the stale one.**
 * A hold names the revision it was judged against and the page moves on without
 * it; whether the change can still land is that comparison and nothing else.
 * A page that asserted it in prose would be making the claim a reader is here
 * to check.
 */

/**
 * A change held because of **how sure the planner was**, rather than because of
 * what it does.
 *
 * Those are the two different reasons the Gate holds things, and the difference
 * is the whole reason a queue shows a reason at all. `demoteTheHeading` is the
 * first kind: this site protects its headings, so reconfiguring one is above the
 * ceiling an instruction may apply on its own. This one is the second: a
 * confidence under the policy's minimum is a hold whatever the change touches,
 * and a reviewer answers it by checking different things.
 *
 * It is the same shape of small change as the ordinary asks, planned by
 * something that says it was only half sure.
 *
 * This is the one place on the site that stages a planner's uncertainty. It is
 * staged rather than real because a documentation build does not call a model
 * (0057) — and it is honest rather than invented, because `confidence` is the
 * field a model interpreter fills in and 0.5 is under the 0.7 this policy
 * inherits. The events go to a sink that drops them, so no graded number
 * reaches calibration.
 */
const aGuessAtTheWording = plans(
  "One configure. The opening sentence goes to the small size.",
  (tree) => [
    { op: "configure", nodeId: nodeOfType(tree, "loom.prose").id, set: { size: "small" }, unset: [] },
  ],
  { authoredBy: "model", confidence: 0.5 }
)

/** One row of the queue: a change waiting, and everything a reviewer is owed about it. */
export type QueuedChange = {
  /** The change in a sentence, which is the asker's own words. */
  readonly asked: string
  readonly askedBy: string
  /** What the planner says it did about those words. */
  readonly rationale: string
  /** Why the Gate would not apply it on its own. */
  readonly reason: DispositionReasonCode
  readonly detail: string
  readonly stakes: StakeLevel
  /** How sure whatever planned it said it was. */
  readonly confidence: number
  /** The revision it was judged against. */
  readonly heldAgainst: number
  /**
   * Whether it can still be applied at all — `baseRevision` against head, and
   * nothing else. The subtraction a host makes; see the finding this page
   * carries.
   */
  readonly stillAnswerable: boolean
}

export type ReviewQueue = {
  /** Where the page has got to while these were waiting. */
  readonly head: number
  readonly waiting: readonly QueuedChange[]
  readonly answerable: number
  /** Waiting, and already impossible. */
  readonly dead: number
}

const rowFor = (hold: HeldProposal, head: number): QueuedChange => ({
  asked: hold.intent.utterance,
  askedBy: hold.intent.actor ?? "nobody named",
  rationale: hold.proposal.rationale,
  reason: hold.disposition.reason.code,
  detail: hold.disposition.reason.detail,
  stakes: hold.disposition.stakes,
  confidence: hold.disposition.confidence,
  heldAgainst: hold.baseRevision,
  stillAnswerable: hold.baseRevision === head,
})

/**
 * Two people, four asks, and a queue with one of each kind in it.
 *
 * The order is the ordinary one, which is the point: a change is held, the page
 * carries on without it, and by the time anybody looks at the queue one of the
 * things in it is about a page that no longer exists. Nobody did anything wrong
 * and nothing is broken.
 */
const buildQueue = async (namespace: string): Promise<Bench> => {
  const bench = await openBench(namespace)

  applied(
    await bench.ask({
      actor: DANA,
      utterance: "add a sentence at the end",
      interpret: addASentence,
    }),
    "the first ordinary change"
  )

  heldIn(
    await bench.ask({
      actor: RAVI,
      utterance: "make the title smaller",
      interpret: demoteTheHeading,
    }),
    "the change to a protected heading"
  )

  applied(
    await bench.ask({
      actor: DANA,
      utterance: "make the opening sentence quieter",
      interpret: quietenTheSentence,
    }),
    "the change that landed while the first was waiting"
  )

  heldIn(
    await bench.ask({
      actor: RAVI,
      utterance: "tighten up the opening line",
      interpret: aGuessAtTheWording,
    }),
    "the change the planner was unsure about"
  )

  return bench
}

export const produceQueue = async (): Promise<ReviewQueue> => {
  const bench = await buildQueue("queue")
  const head = (await bench.head()).revision
  const rows = (await bench.waiting()).map((hold) => rowFor(hold, head))

  return {
    head,
    waiting: rows,
    answerable: rows.filter((row) => row.stillAnswerable).length,
    dead: rows.filter((row) => !row.stillAnswerable).length,
  }
}

/** One thing a reviewer can do to a waiting change, and what the runtime did about it. */
export type AnsweredChange = {
  /** What the person did, in their words. */
  readonly answer: string
  /** The call their click became. */
  readonly call: "confirmHeld" | "discardHeld"
  /** The ending it reached. */
  readonly ending: WriteOutcomeKind | "released"
  /** The runtime's own account of it, never a sentence this page wrote. */
  readonly said: string
  readonly headBefore: number
  readonly headAfter: number
  /** How many changes are still waiting afterwards. */
  readonly waitingAfter: number
}

/**
 * Three answers, in one sitting, on the queue above.
 *
 * A reviewer opens the queue and works down it. The second row is the one worth
 * reading twice: saying yes to the older change does not apply it, does not
 * leave it in the queue, and does not ask again — the change was judged against
 * a page that has since moved, so custody ends and the queue is one shorter.
 *
 * The third is what a reviewer does most of the time, and it is the answer with
 * the least machinery behind it: no revision is written and nothing is judged
 * again.
 */
export const produceAnswers = async (): Promise<readonly AnsweredChange[]> => {
  const bench = await buildQueue("answers")
  const queue = await bench.waiting()

  const stale = queue[0]
  const live = queue[1]

  if (stale === undefined || live === undefined) {
    throw new Error("loom: the answering table needs two changes waiting, and the queue is shorter")
  }

  const answers: AnsweredChange[] = []

  const record = async (
    answer: string,
    call: AnsweredChange["call"],
    act: () => Promise<Answer>
  ): Promise<void> => {
    const headBefore = (await bench.head()).revision
    const { ending, said } = await act()

    answers.push({
      answer,
      call,
      ending,
      said,
      headBefore,
      headAfter: (await bench.head()).revision,
      waitingAfter: (await bench.waiting()).length,
    })
  }

  await record("yes to the newer one", "confirmHeld", async () =>
    describeAnswer(await bench.confirm(live.proposalId, DANA))
  )

  await record("yes to the older one", "confirmHeld", async () =>
    describeAnswer(await bench.confirm(stale.proposalId, DANA))
  )

  const third = heldIn(
    await bench.ask({
      actor: RAVI,
      utterance: "make the title smaller",
      interpret: demoteTheHeading,
    }),
    "the change a reviewer turns down"
  )

  await record("no to a third", "discardHeld", async () => {
    const discarded = await bench.discard(third.proposalId, DANA)

    if (!discarded.ok) {
      throw new Error(`loom: the reviewer's no did not land — ${discarded.error.code}`)
    }

    return {
      ending: "released",
      said: `${discarded.value.proposalId} is out of custody, and no revision was written`,
    }
  })

  return answers
}

type Answer = { readonly ending: AnsweredChange["ending"]; readonly said: string }

const describeAnswer = (outcome: WriteOutcome): Answer => ({
  ending: outcome.kind,
  said: describeWriteOutcome(outcome),
})

/**
 * What a policy that narrowed while a change waited does to the answer.
 *
 * The Gate is asked again on the way through a confirmation, against the policy
 * as it resolves *now* — so a host that tightened its rules between the hold and
 * the answer tightened them for the queue too.
 */
export type SecondLook = {
  /** What the policy was called when the change was held, and why it was held. */
  readonly heldUnder: string
  readonly heldReason: DispositionReasonCode
  readonly heldDetail: string
  /** What it is called now. A host that changes a policy's contents renames it. */
  readonly answeredUnder: string
  readonly ending: WriteOutcomeKind
  readonly nowReason: DispositionReasonCode
  readonly nowDetail: string
  /** Whether saying yes wrote anything. */
  readonly head: number
  readonly waitingAfter: number
}

/**
 * The same policy with one line different, and a new name because of it.
 *
 * `refusalFloor` goes from `critical` to `high`, which is a host deciding that
 * changes to the things it called protected are not to be offered at all. The
 * name changes with the contents, which is the contract `policyId` carries: a
 * disposition written under `loom-docs` claims to have been judged by what
 * `loom-docs` meant then.
 */
const tightenedPolicy: GatePolicy = gatePolicySchema.parse({
  ...docsGatePolicy,
  policyId: "loom-docs-tightened",
  refusalFloor: "high",
})

export const produceSecondLook = async (): Promise<SecondLook> => {
  const bench = await openBench("secondlook")

  const held = heldIn(
    await bench.ask({
      actor: RAVI,
      utterance: "make the title smaller",
      interpret: demoteTheHeading,
    }),
    "the change that waits while the rules change"
  )

  const answered = await bench.confirm(held.proposalId, DANA, tightenedPolicy)

  if (answered.kind !== "refused") {
    throw new Error(
      `loom: a narrowed policy was expected to refuse the change it once held, and the answer ended ${answered.kind}`
    )
  }

  return {
    heldUnder: held.disposition.policyId,
    heldReason: held.disposition.reason.code,
    heldDetail: held.disposition.reason.detail,
    answeredUnder: answered.disposition.policyId,
    ending: answered.kind,
    nowReason: answered.disposition.reason.code,
    nowDetail: answered.disposition.reason.detail,
    head: (await bench.head()).revision,
    waitingAfter: (await bench.waiting()).length,
  }
}
