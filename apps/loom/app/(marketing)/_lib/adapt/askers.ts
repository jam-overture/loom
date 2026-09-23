import {
  ceilingFor,
  composeChange,
  fixedPolicy,
  intentOriginSchema,
  noopEventSink,
  sequentialIdFactory,
  STAKE_ORDER,
  systemClock,
  type CompositionRuntime,
  type DispositionReasonCode,
  type EditIntent,
  type IntentOrigin,
  type LoomTree,
  type StakeLevel,
} from "@loom/runtime"

import { askById, askInterpreter, type Ask, type AskId } from "./asks"
import { NOT_A_RULE, WEIGHT } from "./record"
import { FRONT_DOOR_POLICY, SITE_PROPS_VOCABULARY } from "./run"

/**
 * Who is asking, and the one thing on this site that turns on the answer.
 *
 * Every other page here is about *what* a change is — how big it is, whether it
 * can be taken back, whether a rule protects what it touches. This module is the
 * other half.
 * [0002](../../../../../../decisions/0002-the-gate-is-a-pure-function-of-two-independent-axes.md)
 * records that the auto-apply ceilings are per origin and calls it **the one
 * place origin is load-bearing rather than merely recorded** — and until now the
 * site stated that in a two-column table on `/the-rules` and never once showed it
 * happening, on a site whose whole method is to show rather than state.
 *
 * So this runs it: the same request, put to the front door by each of the four
 * kinds of asker in turn, with nobody standing by to answer a hold. That is
 * precisely the question a ceiling answers — *may this one go ahead unwatched?*
 *
 * **Nothing here approves anything, and that is the design rather than an
 * omission.** `runAsk` has a second pass for a visitor who answers a hold; this
 * has none, because a hold a person then allows is still a hold. What differs
 * between the four askers is whether a person was needed at all.
 */

/**
 * One of the four kinds of asker, in words a reader can place themselves in.
 *
 * Three of the fields are the same asker in three shapes, because one string
 * would be wrong in two of them: a column heading has room for two words, a
 * table row for a phrase, and a card for a sentence.
 */
export type Asker = {
  readonly origin: IntentOrigin
  /** Two or three words. What a column of the comparison is headed. */
  readonly name: string
  /** The phrase `/the-rules` prints in its table. Never the runtime's name. */
  readonly who: string
  /** One sentence: what this asker is, for a reader who has met none of them. */
  readonly what: string
  /**
   * Whether there is a person behind it.
   *
   * Declared rather than inferred, and load-bearing: the page's opening claim
   * about this list is that most of what asks for a change is **not** a person,
   * and `peopleAmong` counts it off this field. A fifth kind of asker arriving
   * cannot leave that sentence saying the old number, because a member with no
   * words here throws before the page renders and a member with words has had
   * to answer this.
   */
  readonly isPerson: boolean
}

/**
 * The four, keyed by the runtime's name for each.
 *
 * **The keys are `IntentOrigin` and the words are this site's.** A fifth kind of
 * asker is a fifth column of the comparison and a fifth card above it, and
 * `ASKERS` throws while the page is being built rather than letting the site go
 * on saying *four*. That is the arrangement `/when-it-goes-wrong` has with the
 * five endings, for the same reason and against the same failure: a fact the
 * code held and the page could not reach is a fact the page eventually
 * contradicted.
 */
const ASKER_WORDS: Readonly<Record<IntentOrigin, Omit<Asker, "origin">>> = {
  "user-instruction": {
    name: "A person",
    who: "A person, typing what they want",
    what: "Somebody looking at the page says what they want changed, in their own words, and waits to see it.",
    isPerson: true,
  },
  "system-signal": {
    name: "The page itself",
    who: "Something the page noticed on its own",
    what: "The page reacts to something it saw — a link nobody clicks, a form people give up on — with nobody having asked.",
    isPerson: false,
  },
  "scheduled-adaptation": {
    name: "A timer",
    who: "A job that runs on a timer",
    what: "A job that wakes on its own schedule and rearranges the page while everybody is asleep.",
    isPerson: false,
  },
  developer: {
    name: "Your developers",
    who: "The people who build the page",
    what: "The people who built the page in the first place, working on it the way they work on anything else.",
    isPerson: true,
  },
}

/** The four, in the order the runtime publishes them. */
export const ASKERS: readonly Asker[] = intentOriginSchema.options.map((origin) => {
  const words = ASKER_WORDS[origin]

  if (words === undefined) {
    throw new Error(`loom: nothing on this site says who "${origin}" is`)
  }

  return { origin, ...words }
})

/** The ones with a person behind them, which is not most of them. */
export const peopleAmong = (askers: readonly Asker[] = ASKERS): readonly Asker[] =>
  askers.filter((asker) => asker.isPerson)

/** How far this site's own rules let one of them go before a person is needed. */
export const ceilingOf = (asker: Asker): StakeLevel => ceilingFor(FRONT_DOOR_POLICY, asker.origin)

/**
 * What one asker was told when it put one request, with nobody watching.
 *
 * Three answers rather than the runtime's five endings, because the two endings
 * that never reach the rules — nothing to interpret, and a change that no longer
 * fits — are not answers to *this* question, and neither can happen here: every
 * request is one of the front door's own buttons, put to the page this site
 * publishes. Anything else is the band being broken rather than an asker being
 * told no.
 */
export type Answer = "went-ahead" | "stopped-and-asked" | "was-refused"

export type AskerAnswer = {
  readonly origin: IntentOrigin
  readonly answer: Answer
  /** Which of the eight rules decided it, or the one code that is not a rule. */
  readonly decidedBy: DispositionReasonCode
}

/**
 * One request, weighed, and what each of the four was told about it.
 *
 * `weight` is measured rather than declared, and measured from all four runs
 * rather than from one of them: the weight of a change is a fact about the
 * change, so the four askers must have been given the same one. If they were
 * not, the two axes 0002 keeps apart have run together and the band means
 * nothing — so that is checked here rather than assumed.
 */
export type WeighedRequest = {
  readonly ask: AskId
  /** What a person would have said, verbatim — the front door's own button. */
  readonly asked: string
  readonly weight: StakeLevel
  /** The weight as a reader meets it, in the record's own words. */
  readonly weighedAs: string
  /** One per asker, in `ASKERS` order. */
  readonly answers: readonly AskerAnswer[]
}

const answerOf = (kind: string): Answer => {
  if (kind === "applied") return "went-ahead"
  if (kind === "awaiting-confirmation") return "stopped-and-asked"
  if (kind === "rejected") return "was-refused"

  throw new Error(`loom: a front-door request ended as "${kind}", which this band cannot report`)
}

type Run = AskerAnswer & { readonly weight: StakeLevel }

/**
 * One ask, put by one asker, against the page as it stands.
 *
 * The page is never mutated — `composeChange` returns a new one — so all sixteen
 * runs judge the same published front door rather than a page that has drifted
 * under them.
 */
const put = async (page: LoomTree, ask: Ask, asker: Asker): Promise<Run> => {
  const idFactory = sequentialIdFactory("asker")
  const runtime: CompositionRuntime = {
    interpreter: askInterpreter(ask, idFactory, systemClock),
    policySource: fixedPolicy(FRONT_DOOR_POLICY),
    /**
     * The floors are not per asker, and that is the point worth keeping here. A
     * ceiling reads who wanted a change; a piece nobody described draws nothing
     * whoever asked for it, so all sixteen runs meet the same two.
     */
    propsVocabulary: SITE_PROPS_VOCABULARY,
    events: noopEventSink,
    clock: systemClock,
    idFactory,
  }

  const intent: EditIntent = {
    intentId: idFactory.intentId(),
    treeId: page.treeId,
    baseRevision: page.revision,
    origin: asker.origin,
    /**
     * Named as what it is. Three of the four askers here are not people, and a
     * run that labelled them one would be this site lying in the one field the
     * whole page is about.
     */
    actor: asker.name,
    utterance: ask.utterance,
    observedAt: systemClock.now(),
  }

  const composed = await composeChange(runtime, page, intent)

  if (!("assessment" in composed) || !("disposition" in composed)) {
    throw new Error(`loom: "${ask.id}" never reached the rules, so no asker can be compared on it`)
  }

  return {
    origin: asker.origin,
    answer: answerOf(composed.kind),
    decidedBy: composed.disposition.reason.code,
    weight: composed.assessment.stakes.level,
  }
}

/**
 * The requests the comparison is built from: one of the front door's own buttons
 * for each weight the rules can give a change.
 *
 * Named rather than picked. *The first four asks in the list* is a subject that
 * moves whenever the list is reordered, and a band whose subject moves is a band
 * nobody can write copy for — the reason `/what-you-run` names its measured
 * request and `/your-components` names its specimen.
 *
 * The **pairing is a claim**, and `weighEachAsker` holds it: the four weights
 * that come back must be `STAKE_ORDER`, in order. A change to how one of these
 * requests is weighed does not quietly leave two rows of the band saying the
 * same thing — it throws, and the page does not publish.
 */
export const DEMONSTRATED: readonly AskId[] = ["calmer", "shorter", "problem", "drop-pitch"]

/**
 * Every request, put by every asker, against the front door as published.
 *
 * Sixteen runs, and they are the whole of the band. Nothing below its heading is
 * typed: the marks, the weights and the sentence naming who could go ahead are
 * read off what the sequence returned.
 */
export const weighEachAsker = async (page: LoomTree): Promise<readonly WeighedRequest[]> => {
  const weighed: WeighedRequest[] = []

  for (const id of DEMONSTRATED) {
    const ask = askById(id)

    if (ask === undefined) {
      throw new Error(`loom: "${id}" is demonstrated here and is not one of the front door's`)
    }

    const runs: Run[] = []

    for (const asker of ASKERS) {
      runs.push(await put(page, ask, asker))
    }

    const weights = [...new Set(runs.map((run) => run.weight))]

    if (weights.length !== 1 || weights[0] === undefined) {
      throw new Error(
        `loom: "${ask.id}" was weighed ${weights.join(" and ")} depending on who asked, and how much a change costs is not a fact about who wanted it`
      )
    }

    const weight = weights[0]

    weighed.push({
      ask: ask.id,
      asked: ask.utterance,
      weight,
      weighedAs: WEIGHT[weight],
      answers: runs.map(({ origin, answer, decidedBy }) => ({ origin, answer, decidedBy })),
    })
  }

  const measured = weighed.map((request) => request.weight)

  if (measured.join() !== STAKE_ORDER.join()) {
    throw new Error(`loom: this band is one request per weight and these are ${measured.join(", ")}`)
  }

  return weighed
}

/** The askers who could put this one through with nobody watching, in order. */
export const wentAhead = (request: WeighedRequest): readonly Asker[] =>
  ASKERS.filter((asker) =>
    request.answers.some(
      (answer) => answer.origin === asker.origin && answer.answer === "went-ahead"
    )
  )

/**
 * The rules whose answer changed when nothing changed but who was asking.
 *
 * The page's sharpest claim is made from this and nowhere else: of the seven
 * rules that decide whether a change may land, **one** read who wanted it across
 * all sixteen runs. A reader who suspects *who asked* is a dial somebody can
 * turn to get a different answer to anything is owed the measurement rather than
 * the reassurance.
 *
 * `NOT_A_RULE` is excluded because it is not one: `within-policy` is what the
 * record carries when none of the seven fired, so counting it would report the
 * *absence* of a rule as a rule that reads who asked.
 */
export const rulesThatReadWhoAsked = (
  requests: readonly WeighedRequest[]
): readonly DispositionReasonCode[] => [
  ...new Set(
    requests.flatMap((request) => {
      const codes = new Set(request.answers.map((answer) => answer.decidedBy))

      return codes.size > 1 ? [...codes].filter((code) => code !== NOT_A_RULE) : []
    })
  ),
]
