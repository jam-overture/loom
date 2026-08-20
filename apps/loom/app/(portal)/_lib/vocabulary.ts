import type { RevertOutcome, WriteOutcome } from "@loom/runtime/write"
import type { DispositionReasonCode, StakeLevel } from "@loom/runtime"

import type { RecordOutcome } from "./demo/record"

/**
 * The one place the portal decides what to call things.
 *
 * The runtime's vocabulary is precise and the portal is right to keep it — a
 * `not-interpreted` outcome and a `refused` one are different answers and 0019
 * turns on the difference. What the portal had wrong is that it *led* with
 * those words. `did-not-apply`, `uninterpreted`, `Allowed by nobody` and
 * `Nothing is held.` are the runtime talking to itself, printed at a person.
 *
 * So the rule this file exists to enforce is:
 *
 * > **Plain language is the default. The technical record is one click away.
 * > Nothing is ever removed.**
 *
 * Every state gets three strings rather than one. `label` is what a person
 * reads first and is the only one a screen shows unasked. `meaning` is the
 * sentence under it, still in a person's words. `technical` is the runtime's
 * own name, kept verbatim so a disclosure can show it and so nobody has to
 * grep the source to work out which portal word maps to which runtime kind.
 *
 * The pattern was already in the demo's `record-card`, which said "waiting on
 * you" where the rest of the portal said `held`. It was a private map in one
 * component, so it stayed in one component. It lives here now, and the demo
 * reads it from here rather than keeping its own copy — one place, so a state
 * cannot be called two things on two screens.
 */

export type OutcomeTone = "applied" | "awaiting" | "rejected" | "uninterpreted" | "inapplicable"

const TONE_CLASSES: Readonly<Record<OutcomeTone, string>> = {
  applied: "bg-applied text-applied-ink",
  awaiting: "bg-awaiting text-awaiting-ink",
  rejected: "bg-rejected text-rejected-ink",
  uninterpreted: "bg-uninterpreted text-uninterpreted-ink",
  inapplicable: "bg-inapplicable text-inapplicable-ink",
}

export const toneClasses = (tone: OutcomeTone): string => TONE_CLASSES[tone]

export type PlainState = {
  /** What a person reads first. Shown unasked; never a runtime identifier. */
  readonly label: string
  /** One sentence explaining it to somebody who has read no decision record. */
  readonly meaning: string
  /** The runtime's own name for it, kept for the technical record. */
  readonly technical: string
  readonly tone: OutcomeTone
}

/**
 * What became of a change, in the portal's words.
 *
 * A union of the portal's own making, because the runtime has two overlapping
 * ones — `WriteOutcome["kind"]` for a write in progress and the demo's
 * `RecordOutcome` for a change read back out of the log — and a reader does
 * not care which pipeline a state arrived from. Both map onto this, so
 * "waiting on you" means the same thing on the review queue and in the demo.
 */
export type ChangeState =
  | "applied"
  | "waiting"
  | "refused"
  | "declined"
  | "misunderstood"
  | "no-change"
  | "not-saved"
  | "already-answered"
  | "unfinished"

/**
 * The table. Every string a person reads about a change's state comes from
 * here.
 *
 * The labels are deliberately short enough to sit in a badge and deliberately
 * verbs or plain adjectives rather than nouns from the runtime's type system.
 * The meanings are written for somebody who has never heard of the Gate: they
 * say what happened to the page in front of them, and — where there is one —
 * what they can do about it.
 */
export const CHANGE_STATES: Readonly<Record<ChangeState, PlainState>> = {
  applied: {
    label: "Applied",
    meaning: "This change is live on the page. You can undo it from History.",
    technical: "committed",
    tone: "applied",
  },
  waiting: {
    label: "Waiting on you",
    meaning: "Loom will not make this change until you say yes.",
    technical: "held",
    tone: "awaiting",
  },
  refused: {
    label: "Not allowed",
    meaning: "A rule in this project's settings blocked it, so nothing changed.",
    technical: "refused",
    tone: "rejected",
  },
  declined: {
    label: "You said no",
    meaning: "You turned this change down. The page was left as it was.",
    technical: "discarded",
    tone: "rejected",
  },
  misunderstood: {
    label: "Not understood",
    meaning: "The AI could not turn this request into a change it knew how to make.",
    technical: "not-interpreted",
    tone: "uninterpreted",
  },
  "no-change": {
    label: "Nothing changed",
    meaning: "The change no longer fits this page — something it referred to has moved or gone.",
    technical: "not-applicable",
    tone: "inapplicable",
  },
  "not-saved": {
    label: "Not saved",
    meaning: "The change was fine, but it could not be written down. Nothing was lost.",
    technical: "not-written",
    tone: "inapplicable",
  },
  "already-answered": {
    label: "Already answered",
    meaning: "Somebody has answered this one. There is nothing left to decide.",
    technical: "not-answerable",
    tone: "inapplicable",
  },
  unfinished: {
    label: "Still going",
    meaning: "This one has not finished yet.",
    technical: "in-flight",
    tone: "inapplicable",
  },
}

export const plainState = (state: ChangeState): PlainState => CHANGE_STATES[state]

/**
 * A write's kind, as a state. The two `not-` kinds that are really the same
 * answer to a reader stay distinct here, because they are distinct in the
 * record and 0019's whole argument is that "you may not" and "I did not
 * understand" must not collapse into one another.
 */
export const stateOfWrite = (kind: WriteOutcome["kind"]): ChangeState => {
  switch (kind) {
    case "committed":
      return "applied"
    case "held":
      return "waiting"
    case "refused":
      return "refused"
    case "not-interpreted":
      return "misunderstood"
    case "not-applicable":
      return "no-change"
    case "not-written":
      return "not-saved"
    case "not-answerable":
      return "already-answered"
  }
}

/**
 * A change read back out of the log, as a state.
 *
 * The demo's `RecordOutcome` is the same story told from the other end — a
 * change that has already happened rather than one happening now — so it lands
 * on the same table. The type import is erased at build time; nothing in this
 * module depends on the demo at runtime, and the demo is what depends on this.
 */
export const stateOfRecord = (outcome: RecordOutcome): ChangeState => {
  switch (outcome) {
    case "applied":
      return "applied"
    case "awaiting-you":
      return "waiting"
    case "refused":
      return "refused"
    case "discarded":
      return "declined"
    case "not-interpreted":
      return "misunderstood"
    case "did-not-apply":
      return "no-change"
    case "in-flight":
      return "unfinished"
  }
}

/**
 * An undo that could not be computed at all. Not a write outcome — the runtime
 * did not decline this, it could not work out what putting the change back
 * would even mean — so it gets its own plain state rather than borrowing one.
 */
export const CANNOT_UNDO: PlainState = {
  label: "Can't be undone",
  meaning: "Loom could not work out how to put this change back.",
  technical: "not-revertable",
  tone: "inapplicable",
}

export const stateOfRevert = (kind: RevertOutcome["kind"]): ChangeState | "cannot-undo" =>
  kind === "not-revertable" ? "cannot-undo" : stateOfWrite(kind)

/**
 * How much is at stake, said as a consequence rather than as a level.
 *
 * `critical` tells a reader where on a four-point scale they are and nothing
 * about what happens to them. These say what the level is *for*, which is the
 * thing that decides whether they read further.
 */
export const STAKES: Readonly<Record<StakeLevel, PlainState>> = {
  low: {
    label: "Low risk",
    meaning: "A small, easily undone change.",
    technical: "low",
    tone: "applied",
  },
  medium: {
    label: "Some risk",
    meaning: "Worth a look before you say yes, but nothing drastic.",
    technical: "medium",
    tone: "awaiting",
  },
  high: {
    label: "High risk",
    meaning: "This changes something substantial. Read what it would replace.",
    technical: "high",
    tone: "awaiting",
  },
  critical: {
    label: "Very high risk",
    meaning: "The kind of change that is painful to get wrong.",
    technical: "critical",
    tone: "rejected",
  },
}

/**
 * Why the runtime decided what it decided, in one sentence.
 *
 * These were `RULE_SENTENCES` in the demo's record module, where only the demo
 * could reach them — so the review queue, which is the screen where somebody
 * is actually being asked to overrule a rule, showed the policy's raw `detail`
 * and never named the rule at all. Moved here unchanged in substance, reworded
 * where they leaned on the runtime's nouns.
 */
const RULE_SENTENCES: Readonly<Record<DispositionReasonCode, string>> = {
  "within-policy": "Nothing this project watches for was involved, so it went ahead on its own.",
  "confidence-below-floor": "The AI was too unsure of itself to be worth bothering you about.",
  "stakes-at-refusal-floor": "This project does not allow changes this risky at all.",
  irreversible: "It could not be cleanly undone, so a person decides — however small it is.",
  "discards-later-work": "It would write over work already done, so nobody may do it alone.",
  "redirected-submission":
    "It would send what people type into a form to a different place than before, so nobody may do it alone.",
  "stakes-above-ceiling": "Riskier than a request from here is allowed to be without asking.",
  "confidence-below-minimum": "Sure enough to suggest, not sure enough to do without asking.",
}

export const ruleSentence = (code: DispositionReasonCode): string => RULE_SENTENCES[code]

/**
 * A self-graded confidence, as a word.
 *
 * `0.72` is exact and means nothing to a reader who does not know what the
 * scale is or how well it has held up. The number is never dropped — it goes
 * in the technical record beside this — but the word is what leads, and it is
 * hedged on purpose: 0007 makes confidence a self-grade, and 0031 makes
 * calibration the only thing that says whether the self-grade is worth
 * anything. "The AI says" is therefore not a stylistic flourish, it is the
 * accurate attribution.
 */
export const confidenceWord = (confidence: number): string => {
  if (confidence >= 0.9) return "The AI says it is very sure"
  if (confidence >= 0.7) return "The AI says it is fairly sure"
  if (confidence >= 0.5) return "The AI says it is not certain"

  return "The AI says it is unsure"
}
