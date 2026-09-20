import type { HoldError, RevertOutcome, WriteOutcome } from "@loom/runtime/write"
import type {
  DispositionKind,
  DispositionReasonCode,
  IntentOrigin,
  LoomNode,
  NodeKind,
  StakeLevel,
} from "@loom/runtime"
import type {
  EpisodeAnswer,
  EpisodeResolutionKind,
  FailureStage,
} from "@loom/runtime/telemetry"
import {
  describeAddressing,
  type Addressing,
  type UnaddressableReason,
} from "@loom/runtime/react"

import { capitalised, partReading, type PartName } from "./part-name"

import { screenName } from "./screen-names"

/*
 * The demo moved out of this route group to `app/(demo)` on 21 August, and this
 * is the one line of the portal a demo run had to touch to move it: a
 * type-only import that used to read `./demo/record`. The direction of the
 * dependency is unchanged and is the one the note above `stateOfRecord`
 * describes — this module does not depend on the demo at runtime, the demo
 * depends on this. Filed as a finding: `stateOfRecord` is the demo's half of a
 * table the portal owns, and shared ground would be a better home for both.
 */
import type { RecordOutcome } from "@/app/(demo)/_lib/record"

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

/**
 * Three strings for one idea: the two a person reads, and the runtime's own.
 *
 * Split out of `PlainState` when the page screen needed the same treatment for
 * things that are not a change's outcome and so have no tone — what a part of a
 * page *is*, and whether it can be clicked. The shape is the contract the rule
 * at the top of this file describes, and a tone is an extra a state carries
 * rather than part of it.
 */
export type PlainWord = {
  /** What a person reads first. Shown unasked; never a runtime identifier. */
  readonly label: string
  /** One sentence explaining it to somebody who has read no decision record. */
  readonly meaning: string
  /** The runtime's own name for it, kept for the technical record. */
  readonly technical: string
}

export type PlainState = PlainWord & {
  readonly tone: OutcomeTone
}

/**
 * A sentence with a name in the middle of it.
 *
 * Every plain reading of a change runs into the same problem: the sentence is
 * the portal's and the node in it is not. `n_head` has to stay a name — it is
 * what tells one row from another, and 22 August settled that names stay on the
 * surface — but it also has to be set in monospace, which means the sentence
 * arrives at a component in pieces.
 *
 * That is exactly the shape that produced three defects on 24 August, all of
 * them a missing space or full stop where two independently-held strings met,
 * and all of them invisible to a test that checked either half. So the pieces
 * are named rather than implied, and `readingOf` is the joined sentence a test
 * asserts whole.
 */
export type PlainLine = {
  /** Everything before the name, ending in whatever space the sentence needs. */
  readonly before: string
  /**
   * The name itself. Never reworded.
   *
   * A bare `string` is an identifier and is rendered monospace. A `PartName` is
   * a part of a page that has been named — the words and the id, in that order,
   * with only the id in monospace — and it is what a sentence about something
   * that happened to a page should carry wherever the caller could find one out.
   *
   * The union is deliberate and it is doing work beyond politeness: it made
   * every place that renders a subject fail to compile until it went through
   * `PlainSentence`, and there were three of them still spreading the line by
   * hand a fortnight after that component was written to stop exactly that.
   */
  readonly subject: string | PartName
  /** Everything after it, including the full stop. */
  readonly after: string
}

/** The whole sentence, as a reader meets it. Assert this, not the parts. */
export const readingOf = (line: PlainLine): string =>
  `${line.before}${subjectReading(line.subject)}${line.after}`

/** A subject as text, whichever of the two it is. */
export const subjectReading = (subject: string | PartName): string =>
  typeof subject === "string" ? subject : partReading(subject)

/**
 * "title", "title and width", "title, width and gap".
 *
 * A comma-separated list is what a schema prints and an "and" before the last
 * item is what a person reads. Here rather than in either caller because a
 * delta's settings and an inverse's restorations are the same list read twice,
 * and the two disagreeing by a conjunction is the small kind of wrong that makes
 * a screen feel machine-written.
 */
export const namedList = (names: readonly string[]): string =>
  names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`

/**
 * One part of a page, named as a thing rather than as a kind.
 *
 * `PART_KINDS` below answers "what is this?" for a reader inspecting one node.
 * This answers the different question a sentence asks — what to call it in the
 * middle of a line about something that happened to it — and it is a noun phrase
 * with its article attached, because the alternative is every caller guessing
 * between "a" and "the" and two of them guessing differently.
 *
 * A registered primitive's own name survives (0013): `a loom.heading` says what
 * appeared, and no rewording of it would say more. A slot's name survives for
 * the same reason. Only `text` has no name of its own, and "the words" is what
 * anybody would call it.
 */
export const partPhrase = (node: LoomNode): string => {
  switch (node.kind) {
    case "element":
      return `a ${node.type}`
    case "slot":
      return `the ${node.name} space`
    case "text":
      return "the words"
  }
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
    /*
     * The screen is named rather than spelled. This read "you can undo it from
     * History" — a screen whose rail entry, heading and strip label had all
     * moved to `What's changed` — and it is the sentence under every applied
     * change in the portal, so it was the widest-read copy of the wrong name.
     */
    meaning: `This change is live on the page. You can undo it from ${screenName("/portal/history")}.`,
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
  "repointed-binding":
    "It would put different data of yours on the page than before, so nobody may do it alone.",
  /*
   * Was "Riskier than a request from here is allowed to be without asking."
   *
   * Found by looking at the new queue on `/portal`, and it is a good example of
   * why a screenshot keeps catching what a test cannot. "From here" is a
   * reference to the *origin* of the ask, and on the page screen there is an
   * origin a line or two above it, so the sentence resolves. The queue draws
   * changes from every page and leads with what somebody typed — so "here" has
   * no referent on screen, and the one sentence explaining why a person is being
   * asked to decide something reads like a fragment of a longer sentence that
   * was cut.
   *
   * The origin is not lost: it is in the technical record on the same card,
   * spelled `user-instruction`. What is gone is a word that only worked in one
   * of the two places this sentence is now read.
   */
  "stakes-above-ceiling": "A change this big is not something Loom may make on its own.",
  "confidence-below-minimum": "Sure enough to suggest, not sure enough to do without asking.",
}

export const ruleSentence = (code: DispositionReasonCode): string => RULE_SENTENCES[code]

/**
 * What to say instead, when the thing that wrote the change was not a model.
 *
 * A delta the runtime computed — an inverse, a repair it derived from the log —
 * carries a confidence the way every delta does, and it is meaningless: only a
 * model grades itself (0007), and 0031 makes calibration the reader of that
 * self-grade. Printing "The AI says it is very sure" over an inverse the
 * runtime worked out would attribute a claim to a model that never made one.
 *
 * Here rather than in one screen because two now say it — `/portal/history` on
 * a revision, and the front door on a change nobody was asked about — and two
 * screens holding their own copy of one sentence is the drift `vocabulary.ts`
 * exists to prevent.
 */
export const NO_CONFIDENCE_TO_JUDGE =
  "Loom worked this change out from the record rather than asking a model, so there is no confidence to judge."

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

/**
 * Whether a change could be taken back, as a clause rather than a boolean.
 *
 * `reversible: no` is a field name and a value. What a reader wants to know is
 * whether they are about to do something they can walk away from, and the two
 * clauses here read straight after a stakes label without a colon in sight.
 */
export const reversibilityWord = (reversible: boolean): string =>
  reversible ? "you could undo it" : "this one can't be undone"

/**
 * A clause, shaped to stand on its own.
 *
 * The clauses above are written to follow something — a stakes label, another
 * sentence — and read as a dropped fragment anywhere else. The front door's
 * first screenshot had `you could undo it` sitting in grey beside a button,
 * which reads as a caption somebody forgot to finish.
 *
 * This shapes rather than rewords, deliberately. A second string saying the
 * same thing in the standalone case is exactly the drift this module exists to
 * prevent: one wording, capitalised and stopped where a sentence is wanted.
 */
export const asSentence = (clause: string): string => `${capitalised(clause)}.`

/**
 * What became of one ask, in the portal's words.
 *
 * The Activity screen's own table. `CHANGE_STATES` answers the same question
 * about a *change*, and most of these land on the same sentence — deliberately,
 * because "not allowed" must mean the same thing on both screens. They are not
 * one table because the runtime keys them differently and an ask is not a
 * change: an ask can end `failed`, which no change can, and an ask can end
 * `open`, which means this page's window closed rather than anything happening.
 *
 * `discarded` reads "You said no" here and in `CHANGE_STATES`, and now carries
 * the same tone in both. It was `inapplicable` on this screen and `rejected` on
 * the review queue, so one change turned down showed grey in one place and red
 * in the other — a difference a reader would reasonably read as meaning
 * something.
 */
export const ASK_OUTCOMES: Readonly<Record<EpisodeResolutionKind, PlainState>> = {
  committed: {
    label: "Done",
    meaning: "Loom made this change, and it is live on the page.",
    technical: "committed",
    tone: "applied",
  },
  refused: {
    label: "Not allowed",
    meaning:
      "A rule in this project's settings blocked it, so the page was left as it was. Nothing was lost — what the AI wanted to do is still written down below.",
    technical: "refused",
    tone: "rejected",
  },
  "awaiting-answer": {
    label: "Waiting on you",
    meaning: "Loom wrote the change but will not apply it until somebody says yes.",
    technical: "awaiting-answer",
    tone: "awaiting",
  },
  discarded: {
    label: "You said no",
    meaning: "Somebody was asked about this change and turned it down.",
    technical: "discarded",
    tone: "rejected",
  },
  "not-interpreted": {
    label: "Not understood",
    meaning: "The AI could not turn this request into a change it knew how to make.",
    technical: "not-interpreted",
    tone: "uninterpreted",
  },
  "not-writable": {
    label: "Not saved",
    meaning: "The change was fine, but it could not be written down. Nothing was lost.",
    technical: "not-writable",
    tone: "inapplicable",
  },
  failed: {
    label: "Something broke",
    meaning: "Loom hit an error part-way through, so the page was left as it was.",
    technical: "failed",
    tone: "rejected",
  },
  open: {
    label: "No ending recorded",
    meaning:
      "Nothing on this page says how this one finished. It may still be running, or it may have started further back than this page reaches.",
    technical: "open",
    tone: "uninterpreted",
  },
}

/**
 * Who or what asked, said as a person rather than as a category.
 *
 * The runtime keeps the origin separate from the actor on purpose (0017):
 * `developer` and `user-instruction` are different acts and can be the same
 * human. So these say what the *act* was, and the actor's name — when the host
 * recorded one — is printed beside them rather than instead of them.
 */
export const ASK_ORIGINS: Readonly<Record<IntentOrigin, PlainWord>> = {
  "user-instruction": {
    label: "Somebody using the site asked for this",
    meaning: "A visitor or a member of your team typed a request and Loom answered it.",
    technical: "user-instruction",
  },
  developer: {
    label: "Somebody working on the site asked for this",
    meaning: "The request came from the portal or from your own code, not from a visitor.",
    technical: "developer",
  },
  "system-signal": {
    label: "Your site asked for this by itself",
    meaning: "Something the site noticed — not a person typing — set this off.",
    technical: "system-signal",
  },
  "scheduled-adaptation": {
    label: "A schedule asked for this",
    meaning: "Loom was set up to look at this page on a timetable, and its turn came round.",
    technical: "scheduled-adaptation",
  },
}

/**
 * Where it broke, when something broke.
 *
 * `custody: the store rejected the write` is two technical words and a true
 * sentence. What a reader needs from a failure is whether their page is now in
 * a strange state, and the answer is always no — so every one of these says
 * what stage got as far as, and none of them implies a half-applied page.
 */
export const FAILURE_STAGES: Readonly<Record<FailureStage, PlainWord>> = {
  interpretation: {
    label: "while the AI was working out what to change",
    meaning: "It never got as far as proposing anything, so the page was never touched.",
    technical: "interpretation",
  },
  assessment: {
    label: "while Loom was weighing up the change",
    meaning: "A change had been written but was never judged, so it was never applied.",
    technical: "assessment",
  },
  repair: {
    label: "while the AI was trying again after a refusal",
    meaning: "The second attempt broke. The first one was already refused, so nothing changed.",
    technical: "repair",
  },
  application: {
    label: "while the change was being made to the page",
    meaning: "Loom applies a change all at once or not at all, so the page was left as it was.",
    technical: "application",
  },
  custody: {
    label: "while the change was being put aside for you",
    meaning: "It could not be saved for you to answer later, so there is nothing waiting.",
    technical: "custody",
  },
  commit: {
    label: "while the change was being written down",
    meaning: "The change was good and the record of it did not save. Nothing was lost.",
    technical: "commit",
  },
}

/**
 * What the Gate decided, before the reason for it.
 *
 * `requires-confirmation` is the one that most needs saying differently: it is
 * the Gate's most common non-trivial answer, it is the whole of 0002, and as a
 * hyphenated compound it reads like an error.
 */
export const GATE_VERDICTS: Readonly<Record<DispositionKind, PlainState>> = {
  accepted: {
    label: "Loom made this change on its own",
    meaning: "Nothing in your rules said a person had to look at it first.",
    technical: "accepted",
    tone: "applied",
  },
  "requires-confirmation": {
    label: "Loom stopped and asked first",
    meaning: "Your rules say a change like this one needs a person to say yes.",
    technical: "requires-confirmation",
    tone: "awaiting",
  },
  rejected: {
    label: "Loom would not make this change",
    meaning: "Your rules do not allow it at all, so nobody was asked.",
    technical: "rejected",
    tone: "rejected",
  },
}

/**
 * What somebody said when they were asked.
 *
 * `confirmed` and `discarded` are the record's words for a person pressing one
 * of two buttons, and the buttons say "Apply this change" and "No thanks".
 */
export const ANSWERS: Readonly<Record<EpisodeAnswer, PlainWord>> = {
  confirmed: {
    label: "said yes",
    meaning: "Somebody looked at this and let it through.",
    technical: "confirmed",
  },
  discarded: {
    label: "said no",
    meaning: "Somebody looked at this and turned it down.",
    technical: "discarded",
  },
}

/**
 * What one part of a page is.
 *
 * `element`, `slot` and `text` are the three kinds a tree is made of, and they
 * are exactly the words the page screen printed at a reviewer under a heading
 * reading `kind`. They are good names for a tree and useless names for a
 * person: nothing about "slot" tells you it is the space a card's body goes in.
 *
 * The runtime's word is kept, because somebody reading the schema alongside the
 * screen needs to know which is which — it is one click down, like everything
 * else the runtime says.
 */
export const PART_KINDS: Readonly<Record<NodeKind, PlainWord>> = {
  element: {
    label: "A piece of the page",
    meaning: "Something Loom knows how to draw — a heading, a card, a block of writing.",
    technical: "element",
  },
  slot: {
    label: "A space inside a piece",
    meaning: "A named space that holds whatever has been put in it, like the body of a card.",
    technical: "slot",
  },
  text: {
    label: "Words",
    meaning: "The words themselves, inside whatever piece they sit in.",
    technical: "text",
  },
}

/**
 * Why a part of the page cannot be clicked, in a person's words.
 *
 * The runtime's own reasons are accurate and each one names a mechanism the
 * reader has no reason to know: `this primitive does not spread loom.editable`
 * is a sentence about a props helper. What a person needs is why the thing in
 * front of them does not respond and whether that means anything is broken —
 * and in every case here, nothing is.
 */
const POINTING_REASONS: Readonly<Record<UnaddressableReason, string>> = {
  "not-an-element":
    "Words and named spaces have no box of their own on the page, so there is nothing there to click.",
  "undecorated-primitive":
    "Whatever draws this doesn't mark itself as clickable, so Loom can't find it on the page.",
  absent: "This part isn't on the page any more.",
}

/**
 * What clicking the page would actually reach, when the reader has picked
 * something.
 *
 * 0019 is explicit that a selection falling back to an ancestor must be stated
 * rather than performed silently, and this is where that promise is kept in a
 * person's words. The important half is the reassurance the runtime's sentence
 * never gave: **a part you cannot click is still a part you can change.**
 * Pointing is about the DOM; scoping a request is about the tree, and a reader
 * told only "this node renders without an element of its own" has no way to
 * know that asking for a change here still works.
 */
export const pointingWords = (addressing: Addressing): PlainWord => {
  const technical = describeAddressing(addressing)

  switch (addressing.outcome) {
    case "addressable":
      return {
        label: "You can click this on the page",
        meaning: "Clicking it in the page above picks exactly this part.",
        technical,
      }
    case "delegated":
      return {
        label: "Clicking the page picks the part around it",
        meaning: `${POINTING_REASONS[addressing.reason]} A click lands on the part it sits inside instead. Picking it from the list works, and a change you ask for still applies to this part.`,
        technical,
      }
    case "unaddressable":
      return {
        label: "This one can't be clicked on the page",
        meaning: `${POINTING_REASONS[addressing.reason]} Nothing around it can be clicked either, so the list is the only way to pick it — and a change you ask for still applies to it.`,
        technical,
      }
  }
}

/**
 * A page whose waiting changes could not be read, in a person's words.
 *
 * The front door asks every page it lists what is waiting on it, and a page
 * that answers an error is the one case where this screen's whole claim — *this
 * is where you find out whether anything needs you* — stops being true without
 * looking any different. It was counted (`Sweep.unreadable`) and never said,
 * and the sentence a reader got was *"One page couldn't be checked."*
 *
 * Total over the store's own error codes, so a code added to the runtime fails
 * the build here rather than reaching a reader as a silence. Two of the three
 * cannot arise from asking a page what is waiting on it — they are answers to
 * *this one proposal*, not to a listing — and they are written out anyway
 * rather than defaulted, because the cost of writing a sentence that never
 * renders is one sentence, and the cost of a fallback is that the day one of
 * them does arrive nobody finds out which.
 *
 * `unavailable` said both of the two things a reader has to act on
 * differently — *the database did not answer* and *this deployment cannot read
 * something the change record holds* — so the sentence it carries is the one
 * that does not guess. 0175 split the second out as `unreadable`, and that one
 * can say what it means: waiting will not fix it, and somebody has to look.
 * The store's own account of either still goes in the technical record beside
 * it.
 */
const UNREADABLE_QUEUES: Readonly<Record<HoldError["code"], string>> = {
  unavailable:
    "Loom couldn't read what's waiting on this page. Nothing has been lost and nothing has been decided — asking a page what is waiting on it only reads it.",
  "not-held":
    "The change this page was asked about is no longer waiting. Somebody may have answered it already.",
  "already-held": "Loom was asked to hold a change on this page that it is already holding.",
  unreadable:
    "Loom read this page's waiting changes and couldn't make sense of one of them. Nothing has been lost, and waiting will not clear it — this needs somebody to look.",
}

export const unreadableQueue = (code: HoldError["code"]): string => UNREADABLE_QUEUES[code]
