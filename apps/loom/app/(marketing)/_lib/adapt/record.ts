import type {
  ChangeAnalysis,
  ChangeAssessment,
  Disposition,
  DispositionReasonCode,
  StakeFactorCode,
  StakeLevel,
} from "@jam-overture/loom"

import type { Ask, AskId } from "./asks"

/**
 * What happened, in words a visitor has never had to learn.
 *
 * This is the half of the front door that nothing else on the market can show.
 * Plenty of things change a page with AI; what Loom can say afterwards is who
 * asked, what moved, which rule allowed it and how to put it back — and saying
 * it to a stranger means saying it without a single one of our words.
 *
 * So nothing the machine produces is printed raw. `reason.detail` reads
 * *"removes 11 nodes"* and *"interpreter confidence 1 is below 0.7"*; both are
 * exactly right and both are unreadable to the person this page is for. What is
 * printed instead is a translation, keyed by the code the machine actually
 * returned, so the sentence on the page is pinned to the judgment rather than
 * written beside it. The maps below are total by construction — `satisfies`
 * fails the build if the runtime gains a code nobody translated, which is the
 * failure that would otherwise render as a blank line on the landing page.
 */

export type Verdict = "landed" | "held" | "approved" | "refused" | "nothing-to-do"

/**
 * The three things a record quotes rather than works out.
 *
 * Everything else below is computed from what the sequence returned. These are
 * the words that came in with the request, and they are separated out because
 * **not every request on this page is one of the five buttons.** Putting a
 * change back is a change of its own
 * ([0032](../../../../../../decisions/0032-an-undo-is-a-change-of-its-own-rather-than-a-rewind.md)),
 * so it arrives here with its own sentence to quote and its own explanation of
 * what it is about to do, and is otherwise reported exactly as anything else is.
 *
 * `ask` stays on it because an undo is always the undo *of* something: it is the
 * request the panel's own links have to be able to name, and a record that
 * forgot which of the five it belonged to could not offer the way back to it.
 */
export type Request = {
  readonly ask: AskId
  /** What a person would have said, verbatim. */
  readonly asked: string
  /** Why this change answers it, in the words the record will show a visitor. */
  readonly proposed: string
  /**
   * Whether this request is the undo of the change above it rather than one of
   * the five the band offers.
   *
   * A fact about the request rather than something a band works out, because
   * three places need it and they are in three files: the notice at the top of
   * the page, the panel, and the address each of their buttons points at. An
   * undo that was recognised by comparing its sentence to a string would be this
   * site pattern-matching its own words.
   */
  readonly putBack: boolean
}

/** One of the five buttons, as a request. */
export const requestOf = (ask: Ask): Request => ({
  ask: ask.id,
  asked: ask.utterance,
  proposed: ask.rationale,
  putBack: false,
})

export type ChangeRecord = Request & {
  /** How much moved, counted rather than characterised. */
  readonly measured: string
  /** What it was weighed as, and what raised it. */
  readonly weighed: string
  readonly verdict: Verdict
  /** The verdict as a badge: two or three words. */
  readonly verdictLabel: string
  /** The verdict as a sentence, with the rule that decided it. */
  readonly verdictLine: string
  /** How to undo it, and what undoing restores. */
  readonly undo: string
  /** Whether the page below this panel is the changed one. */
  readonly landed: boolean
  /** Whether the visitor is being asked to decide, because the rules held it. */
  readonly awaitingYou: boolean
}

/**
 * Why the rules decided what they decided, one sentence per code.
 *
 * Not a gloss on the verdict — the *reason*, translated. A page that said
 * "your rules allowed it" and stopped would be asserting the thing this site
 * exists to prove.
 *
 * **Exported since 28 August, and the reason is the best property the rules
 * page has.** That page explains the eight questions the rules ask; this map
 * holds what the site *says* when one of them answers. If the explanation were
 * written out again over there, the two would drift — and the drift would be
 * invisible, because a reader never sees them on the same screen. They are one
 * set of sentences, used twice: once to teach and once to report.
 */
export const BECAUSE = {
  "within-policy":
    "It can be taken back, it moves little enough, and it was worked out rather than guessed.",
  "confidence-below-floor":
    "Whatever asked for this was too unsure of itself for your rules to act on at all.",
  "confidence-below-minimum":
    "Whatever asked for this was not sure enough for your rules to let it through on its own.",
  "stakes-at-refusal-floor":
    "This is the kind of change your rules never allow, no matter who asks for it.",
  irreversible: "This one could not be cleanly undone, so it waits for a person.",
  "discards-later-work":
    "This would write over work that was done after it was planned, so it waits for a person.",
  "redirected-submission":
    "This would send what people type on the page somewhere else, so it waits for a person.",
  "repointed-binding":
    "This would put different data of yours on the page, so it waits for a person.",
  "stakes-above-ceiling":
    "This weighs more than your rules let a request through on its own, so it waits for a person to say yes.",
} satisfies Record<DispositionReasonCode, string>

/**
 * The one code above that is not a rule.
 *
 * It is what the record carries when none of the seven fired, so it belongs
 * with the band about the three answers rather than in any list of questions —
 * and naming it here rather than inline is what lets two pages say *every code
 * is either a question we print or this one* without a literal in two files.
 *
 * It moved here from `pages/the-rules.ts` on 13 September, when a second reader
 * needed it: `adapt/askers.ts` counts the rules whose answer changed with who
 * was asking, and counting this one would report the **absence** of a rule as a
 * rule. A page module importing another page module's constant is the wrong
 * direction — pages read this layer, not each other — so it sits beside
 * `BECAUSE`, whose keys it is one of.
 */
export const NOT_A_RULE: DispositionReasonCode = "within-policy"

/**
 * What raised the weight, one clause per code. Joined into the sentence below.
 *
 * **Exported since 23 September**, for the reason `BECAUSE` was: `floors.ts`
 * prints why two refused requests weighed what they did, and a second wording
 * kept beside that band would be one fact said two ways on one site. Two of the
 * clauses here — the piece nothing could draw and the setting nothing would
 * accept — described failures no request on this deployment could produce until
 * the floors were wired, and that band is what makes them reachable.
 */
export const RAISED_BY = {
  "protected-type-removed": "it destroys something you marked as protected",
  "protected-type-touched": "it rewrites something you marked as protected",
  "protected-type-relocated": "it moves something you marked as protected",
  "protected-prop-configured": "it changes a setting you marked as protected",
  "large-removal": "it takes a lot off the page at once",
  "broad-change": "it reaches across a lot of the page",
  "shallow-structural-change": "it changes the shape of the page rather than the wording inside it",
  "discards-later-work": "it writes over work done since it was planned",
  "nested-target": "it would leave a button inside a link, where nobody can click it",
  "unknown-primitive": "it adds a piece your site has nothing to draw it with",
  "invalid-props": "it sets a piece up in a way that piece does not accept, so it would not draw",
  "redirected-submission": "it changes where the page sends what people type",
  "repointed-binding": "it changes which of your data the page shows",
} satisfies Record<StakeFactorCode, string>

/** What each weight is called, in the one word the site uses for it everywhere. */
export const WEIGHT = {
  low: "light",
  medium: "middling",
  high: "heavy",
  critical: "the most serious kind",
} satisfies Record<StakeLevel, string>

/** Every sentence this module can print, for the test that holds them to the register. */
export const RECORD_VOCABULARY: readonly string[] = [
  ...Object.values(BECAUSE),
  ...Object.values(RAISED_BY),
  ...Object.values(WEIGHT),
]

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`

/**
 * The counts, as a sentence.
 *
 * "Piece" is the word this site already uses for the things a page is built
 * from, in the band that says there are 45 of them. Using a second word here
 * for the same thing would teach a stranger two names for one idea on one page.
 */
const measurementOf = (analysis: ChangeAnalysis): string => {
  const parts = [
    analysis.insertedNodeCount > 0
      ? `${plural(analysis.insertedNodeCount, "piece", "pieces")} added`
      : undefined,
    analysis.removedNodeCount > 0
      ? `${plural(analysis.removedNodeCount, "piece", "pieces")} taken away`
      : undefined,
    analysis.relocatedNodeCount > 0
      ? `${plural(analysis.relocatedNodeCount, "piece", "pieces")} moved`
      : undefined,
    analysis.configuredNodeCount > 0
      ? `${plural(analysis.configuredPropKeys.length, "setting", "settings")} changed on ${plural(
          analysis.configuredNodeCount,
          "piece",
          "pieces"
        )}`
      : undefined,
  ].filter((part): part is string => part !== undefined)

  const counted = parts.length === 0 ? "nothing changed" : parts.join(", ")

  return `${counted}, in ${plural(analysis.operationCount, "step", "steps")}.`
}

const weighingOf = (assessment: ChangeAssessment): string => {
  const raised = assessment.stakes.factors.map((factor) => RAISED_BY[factor.code])
  const weight = WEIGHT[assessment.stakes.level]

  return raised.length === 0
    ? `Weighed as ${weight}: nothing about it gave your rules pause.`
    : `Weighed as ${weight}: ${raised.join("; ")}.`
}

const VERDICT_LABEL = {
  landed: "Allowed",
  held: "Waiting for you",
  approved: "You said yes",
  refused: "Refused",
  "nothing-to-do": "Nothing to do",
} satisfies Record<Verdict, string>

/**
 * The verdict is the rules' answer; whether it landed is a separate fact.
 *
 * They come apart in exactly one case and it is the interesting one. When a
 * person answers a change the rules held back, the rules are asked again and
 * they hold it again — the human yes is what lets it through, not a softer
 * judgment. So a confirmed change carries a record that says both things: your
 * rules stopped this, and you overrode them. A page that showed only "allowed"
 * would be quietly erasing the more useful half.
 */
const verdictOf = (kind: Disposition["kind"], applied: boolean): Verdict =>
  kind === "accepted"
    ? "landed"
    : kind === "rejected"
      ? "refused"
      : applied
        ? "approved"
        : "held"

const VERDICT_LINE = {
  landed: "",
  held: "",
  refused: "",
  approved:
    " You said yes, so it went through — and your rules having stopped it first is part of the record too.",
  "nothing-to-do": "",
} satisfies Record<Verdict, string>

/**
 * How to put it back, and what putting it back actually restores.
 *
 * The count is the reason this sentence is worth printing rather than the
 * promise on its own: undoing a removal is not the page being rebuilt from the
 * source, it is the exact contents coming back, and the number says how much
 * was carried along to make that true.
 */
const undoingOf = (assessment: ChangeAssessment, landed: boolean): string => {
  if (!landed) return "Nothing has changed, so there is nothing to put back."

  const { retainedNodeCount, inverse } = assessment.reversibility
  const steps = plural(inverse.operations.length, "step", "steps")

  return retainedNodeCount > 0
    ? `The change that reverses this was written at the same time. It is ${steps}, and it carries ${plural(
        retainedNodeCount,
        "piece",
        "pieces"
      )} — so putting it back restores every word rather than writing them out again.`
    : `The change that reverses this was written at the same time. It is ${steps}, and it is recorded like anything else.`
}

/**
 * The record, assembled.
 *
 * `policyId` is printed as the name of the set of rules that decided, because
 * that is the one fact a reader cannot get from the verdict itself: a decision
 * is only meaningful if you know which rules made it
 * ([0033](../../../../../../decisions/0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md)).
 */
export const recordOf = (
  request: Request,
  assessment: ChangeAssessment,
  disposition: Disposition,
  applied: boolean
): ChangeRecord => {
  const verdict = verdictOf(disposition.kind, applied)
  const landed = applied

  return {
    ...request,
    measured: measurementOf(assessment.analysis),
    weighed: weighingOf(assessment),
    verdict,
    verdictLabel: VERDICT_LABEL[verdict],
    verdictLine: `${BECAUSE[disposition.reason.code]}${
      VERDICT_LINE[verdict]
    } Decided by the set of rules this site calls “${disposition.policyId}”.`,
    undo: undoingOf(assessment, landed),
    landed,
    awaitingYou: verdict === "held",
  }
}

/**
 * What the panel says when nothing was proposed at all.
 *
 * A separate constructor rather than a fourth branch of `recordOf`, because
 * there is no judgment to translate: the rules were never asked. Saying
 * "allowed" or "refused" here would be inventing a verdict, which is the one
 * thing a record may never do.
 */
export const nothingHappened = (request: Request, proposed: string): ChangeRecord => ({
  ...request,
  proposed,
  measured: "Nothing changed, in no steps.",
  weighed: "Nothing was weighed, because nothing was proposed.",
  verdict: "nothing-to-do",
  verdictLabel: VERDICT_LABEL["nothing-to-do"],
  verdictLine:
    "Your rules were never consulted. A request that works out to no change never reaches them.",
  undo: "Nothing has changed, so there is nothing to put back.",
  landed: false,
  awaitingYou: false,
})
