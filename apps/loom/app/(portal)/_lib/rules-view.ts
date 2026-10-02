import {
  ceilingFor,
  type DispositionKind,
  type DispositionReasonCode,
  type GatePolicy,
  type IntentOrigin,
  type StakeLevel,
} from "@jam-overture/loom"

import { STAKES, type PlainWord } from "./vocabulary"

/**
 * The rules a deployment judges changes by, said the way a person would ask
 * about them.
 *
 * Everything here is already on the screen somewhere, one instance at a time: a
 * review card says *"Riskier than a request from here is allowed to be without
 * asking"* about the one change in front of you. What nothing said was the
 * standing arrangement — **what is allowed on your pages, before anybody asks
 * for anything.** That is the question somebody has on the first day and again
 * every time a refusal surprises them, and until now the only answer was reading
 * the host's own configuration and knowing what each field did.
 *
 * Three properties are deliberate.
 *
 * **It is derived from the policy object, never from a copy of it.** Every
 * number a reader meets here — 70%, 30%, `critical` — is read out of the
 * `GatePolicy` the write path is constructed with (`_lib/policy.ts`). A page
 * that hard-coded the defaults would keep telling a host what the framework
 * ships with long after they had changed it, and would be most confidently wrong
 * exactly when it mattered.
 *
 * **Each rule has one outcome, and it is a property of the rule.** The Gate's
 * rules are declared with a fixed `kind`: `confidence-below-floor` always
 * rejects, `irreversible` always asks. So a rule can say what happens *when it
 * fires* without having seen it fire, which is what makes this screen worth
 * reading on a deployment nothing has happened on yet.
 *
 * **The order is a reader's, and it is not the Gate's.** One reason is recorded
 * per decision, so a change that runs into two rules is counted under whichever
 * the Gate reached first — and that order is not something a consumer can read
 * (filed 28 August, and 0018 makes reaching into `src/` to find out the wrong
 * fix). So these are ordered by how much a reader cares, the screen says the
 * counts are attributed to one rule each, and neither claims to mirror the
 * runtime.
 */

/** A rule's stable name, used as a key and never shown to a reader. */
export type RuleId =
  | "never"
  | "ceiling"
  | "sure-enough-to-act"
  | "sure-enough-to-ask"
  | "cannot-undo"
  | "writes-over-work"
  | "form-destination"
  | "which-data-a-page-shows"
  | "how-risk-is-measured"

/** One line of the technical record: the field's own name, and what it is set to. */
export type PolicySetting = {
  readonly name: string
  readonly value: string
}

/**
 * A pair a reader meets on the surface rather than in the disclosure.
 *
 * Some of a policy is genuinely a table — four origins with four ceilings — and
 * flattening that into a sentence either loses three of them or produces a
 * sentence nobody finishes. The distinction from `PolicySetting` is who it is
 * for: a row is the arrangement in a person's words, a setting is the field name
 * somebody comparing this screen against their configuration needs.
 */
export type PlainRow = {
  readonly of: string
  readonly is: string
}

export type PlainRule = {
  readonly id: RuleId
  /** What a reader reads first. Never a field name. */
  readonly title: string
  /** What the rule does, with this deployment's own numbers in it. */
  readonly reading: string
  /**
   * What happens when it fires. Absent for the one entry that decides nothing on
   * its own — a measurement the other rules are read against.
   */
  readonly outcome?: DispositionKind
  readonly rows: readonly PlainRow[]
  readonly settings: readonly PolicySetting[]
  /**
   * The reason code the Gate records when this rule decides. Absent for the
   * measurement, which never decides anything and so is never recorded as a
   * reason.
   */
  readonly code?: DispositionReasonCode
}

/**
 * A stakes level as the thing a rule lets through, rather than as a label.
 *
 * `STAKES` says what a level *is* — "Some risk · Worth a look before you say
 * yes" — which is the right sentence beside one change and the wrong one in the
 * middle of "may go ahead up to ___". A ceiling is read as a boundary, so these
 * name what falls under it. Separate from `STAKES` on purpose and not a
 * divergence from it: both are readings of the same four levels, in two sentence
 * positions, and the level's own name is in the technical record either way.
 */
const UNDER_CEILING: Readonly<Record<StakeLevel, string>> = {
  low: "small, easily undone changes",
  medium: "changes with some risk in them",
  high: "substantial changes",
  critical: "anything this project does not refuse outright",
}

/** Short enough to be the subject of a table row; `ASK_ORIGINS` labels are whole sentences. */
export const ASKER: Readonly<Record<IntentOrigin, string>> = {
  "user-instruction": "Somebody using your site",
  developer: "You, or your own code",
  "system-signal": "Your site, on its own",
  "scheduled-adaptation": "A schedule",
}

/**
 * The four origins in the order a reader meets them, rather than in whatever
 * order the policy's record happens to have been written in. Object key order is
 * not a thing to show anybody a table sorted by.
 */
export const ORIGINS: readonly IntentOrigin[] = [
  "user-instruction",
  "developer",
  "system-signal",
  "scheduled-adaptation",
]

/**
 * What happens when a rule fires, as a standing arrangement rather than as a
 * verdict on one change.
 *
 * `GATE_VERDICTS` says the same three things in the past tense about a change in
 * front of you — "Loom made this change on its own". A rule has not fired yet
 * and may never; what a reader wants from it is what it *would* do. The tone is
 * taken from `GATE_VERDICTS` rather than restated, so a refusal is the same
 * colour here as everywhere else in the portal.
 */
export const WHEN_IT_FIRES: Readonly<Record<DispositionKind, PlainWord>> = {
  rejected: {
    label: "Turns the change down",
    meaning: "The change is refused outright and nobody is asked about it.",
    technical: "rejected",
  },
  "requires-confirmation": {
    label: "Asks you first",
    meaning: "The change is written down in full and waits for somebody to say yes.",
    technical: "requires-confirmation",
  },
  accepted: {
    label: "Lets it through",
    meaning: "Nothing objected, so the change was applied without anybody being asked.",
    technical: "accepted",
  },
}

/** `0.7` is a fraction of one, and nobody says "nought point seven sure". */
export const asPercent = (fraction: number): string => `${Math.round(fraction * 100)}%`

const listOrNone = (names: readonly string[]): string => (names.length === 0 ? "none" : names.join(", "))

/**
 * The one thing about this deployment's rules that is not on its policy.
 *
 * A record rather than a bare boolean, so a second non-policy rule — and 0179 is
 * unlikely to be the last function-shaped floor — arrives as a field instead of
 * as a second positional argument nobody can read at a call site.
 *
 * Passed in rather than imported, although `policy.ts` exports exactly this
 * value. `rulesOf` is handed the policy it is describing, and a module-level
 * import would mean a test describing a stricter policy silently got this
 * deployment's answer for one row of it — a view that is pure in five arguments
 * and not in the sixth is worse than one that is impure throughout, because only
 * the sixth surprises anybody.
 */
export type NonPolicyRules = {
  readonly settingsAreChecked: boolean
}

export const rulesOf = (
  policy: GatePolicy,
  { settingsAreChecked }: NonPolicyRules
): readonly PlainRule[] => [
  {
    id: "never",
    title: "Some changes are never made at all",
    reading: `A change Loom weighs at ${STAKES[policy.refusalFloor].label.toLowerCase()} is turned down outright — however it was asked for, and however sure the AI says it is. You are not asked, because this is the line you drew rather than a judgement call.`,
    outcome: "rejected",
    rows: [],
    settings: [{ name: "refusalFloor", value: policy.refusalFloor }],
    code: "stakes-at-refusal-floor",
  },
  {
    id: "ceiling",
    title: "How much Loom may do without asking you",
    reading:
      "Under that line, how far Loom may go on its own depends on who asked. Anything above the limit for that asker is written down and waits for your answer rather than being applied.",
    outcome: "requires-confirmation",
    /**
     * `ceilingFor` rather than a lookup with a fallback of this file's own. An
     * origin a host has not given a ceiling to still gets judged by one, and the
     * runtime's answer for what it is has to be the screen's answer too — a
     * default guessed here would be a claim about what is allowed on your pages
     * that nothing in the runtime made.
     */
    rows: ORIGINS.map((origin) => ({
      of: ASKER[origin],
      is: `up to ${UNDER_CEILING[ceilingFor(policy, origin)]}`,
    })),
    settings: ORIGINS.map((origin) => ({
      name: `autoApplyCeiling.${origin}`,
      value: policy.autoApplyCeiling[origin] ?? `unset, so ${ceilingFor(policy, origin)}`,
    })),
    code: "stakes-above-ceiling",
  },
  {
    id: "sure-enough-to-act",
    title: "How sure the AI has to be before it acts alone",
    reading: `The AI grades its own confidence in every change it writes. Below ${asPercent(policy.minimumConfidence)} it will not apply one by itself, however small — it writes the change down and asks you instead.`,
    outcome: "requires-confirmation",
    rows: [],
    settings: [{ name: "minimumConfidence", value: String(policy.minimumConfidence) }],
    code: "confidence-below-minimum",
  },
  {
    id: "sure-enough-to-ask",
    title: "How sure it has to be to bother you at all",
    reading: `Below ${asPercent(policy.confidenceFloor)} the change is dropped rather than sent to you. A guess the AI does not believe in is not worth your attention, and a queue full of them is how a review screen stops being read.`,
    outcome: "rejected",
    rows: [],
    settings: [{ name: "confidenceFloor", value: String(policy.confidenceFloor) }],
    code: "confidence-below-floor",
  },
  {
    id: "cannot-undo",
    title: "Anything that could not be cleanly undone",
    reading:
      policy.outOfTreeEffectTypes.length === 0
        ? "If Loom cannot work out how to put a change back, a person decides — however small it looks. No kind of piece here is marked as reaching outside your page, so this comes down to the shape of each change."
        : `If Loom cannot work out how to put a change back, a person decides — however small it looks. ${policy.outOfTreeEffectTypes.length} kind${policy.outOfTreeEffectTypes.length === 1 ? "" : "s"} of piece here can never be undone by changing the page back, because changing them reaches outside it.`,
    outcome: "requires-confirmation",
    rows: policy.outOfTreeEffectTypes.map((type) => ({
      of: type,
      is: "reaches outside the page, so undo cannot take it back",
    })),
    settings: [
      { name: "outOfTreeEffectTypes", value: listOrNone(policy.outOfTreeEffectTypes) },
      { name: "inverseRetentionBudget", value: String(policy.inverseRetentionBudget) },
    ],
    code: "irreversible",
  },
  {
    id: "writes-over-work",
    title: "Changes that would write over work already done",
    reading:
      "A change that would discard work somebody has already accepted is never applied on its own, whoever asked for it. This one has no setting: it is on, always, and there is no way to turn it off.",
    outcome: "requires-confirmation",
    rows: [],
    settings: [],
    code: "discards-later-work",
  },
  {
    id: "form-destination",
    title: "Changes to where a form sends what people type",
    reading:
      "If a change would send what visitors type into one of your forms somewhere other than where it went before, a person is asked first. Like the rule above it, this one has no setting either — it is on, always.",
    outcome: "requires-confirmation",
    rows: [],
    settings: [],
    code: "redirected-submission",
  },
  {
    id: "which-data-a-page-shows",
    title: "Changes to which of your data a page shows",
    reading:
      "If a change would point a part of a page at different data of yours than it showed before, a person is asked first. The other end of the rule above it, and on always for the same reason: which of your data comes out should not depend on who asked for it to change. Changing what a part asks for counts as well as where it asks — showing a different field is a different page, however small the edit looks.",
    outcome: "requires-confirmation",
    rows: [],
    settings: [],
    code: "repointed-binding",
  },
  {
    id: "how-risk-is-measured",
    title: "How Loom decides a change is risky in the first place",
    reading:
      "This one refuses nothing by itself. It is the measurement the two rules about risk are read against — how much a change takes away, how widely it reaches, how close to the top of the page it cuts, which pieces and settings you have marked as ones to be careful with, and two things that go straight to the top of the scale because the result would not draw at all.",
    rows: [
      {
        of: "Taking parts away",
        is: `${policy.removalThresholds.medium} parts starts to count as risky, ${policy.removalThresholds.high} counts as high risk`,
      },
      {
        of: "Reaching widely",
        is: `touching ${policy.breadthThreshold} or more separate parts counts as a broad change`,
      },
      {
        of: "Cutting near the top",
        is: `a structural change at depth ${policy.shallowDepthThreshold} or above counts as rearranging the page`,
      },
      {
        of: "Pieces you have marked",
        is: listOrNone(policy.protectedPrimitiveTypes),
      },
      {
        of: "Settings you have marked",
        is: listOrNone(policy.protectedPropKeys),
      },
      /*
       * The two floors, as measurements rather than as rules of their own.
       *
       * They belong under this heading and not as two more entries above it, and
       * the reason is arithmetic rather than taste: `recordFor` attributes a
       * count to a rule by the reason code the Gate recorded, these two are
       * recorded under `stakes-at-refusal-floor` like any other change that
       * reaches the top of the scale, and a second entry carrying that code would
       * print the same count twice on one screen as though two rules had each
       * fired that often.
       *
       * So they are measurements, which is what they are. What turns them into a
       * refusal is the first rule on this screen, and the wording says so.
       */
      {
        of: "Pieces this site can draw",
        is:
          policy.registeredPrimitiveTypes.length === 0
            ? "not declared, so a change may add a kind of piece nothing here can draw — it will be written, and the page will have a hole in it"
            : `${listOrNone(policy.registeredPrimitiveTypes)} — a change that adds anything else goes straight to the top of the scale, so the first rule on this page turns it down`,
      },
      {
        of: "Settings a piece refuses",
        is: settingsAreChecked
          ? "checked against each piece's own description before the change is written, and a change carrying one it refuses goes straight to the top of the scale"
          : "not checked, so a change may set a piece up in a way that piece refuses — it will be written, and that piece will not draw",
      },
    ],
    settings: [
      { name: "removalThresholds.medium", value: String(policy.removalThresholds.medium) },
      { name: "removalThresholds.high", value: String(policy.removalThresholds.high) },
      { name: "breadthThreshold", value: String(policy.breadthThreshold) },
      { name: "shallowDepthThreshold", value: String(policy.shallowDepthThreshold) },
      { name: "protectedPrimitiveTypes", value: listOrNone(policy.protectedPrimitiveTypes) },
      { name: "protectedPropKeys", value: listOrNone(policy.protectedPropKeys) },
      { name: "registeredPrimitiveTypes", value: listOrNone(policy.registeredPrimitiveTypes) },
      /*
       * Not a field on the policy, and the only line on this screen that is not.
       *
       * Named with the shape it has on the runtime rather than invented, so a
       * reader comparing this screen against their own wiring is looking for the
       * right thing. The consequence is worth knowing and is filed as a finding:
       * this one is **not in the policy fingerprint** two rows up, so two
       * deployments whose fingerprints match can disagree about whether it is on.
       */
      { name: "propsVocabulary", value: settingsAreChecked ? "wired" : "unset" },
      { name: "policyId", value: policy.policyId },
    ],
  },
]
