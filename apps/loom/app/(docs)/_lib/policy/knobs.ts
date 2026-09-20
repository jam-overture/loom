import { defaultGatePolicy, type GatePolicy } from "@loom/runtime"

/**
 * Every knob a Gate policy has, with the sentence a reader needs about it.
 *
 * The page this feeds is the one where a deployment decides what AI may do to
 * its pages, and the tempting way to write it is a table of fourteen rows. It
 * would be right today and would quietly stop being right the first time the
 * runtime grew a fifteenth knob — a page describing fourteen of fifteen, with
 * nothing anywhere to say which one is missing.
 *
 * So the rows are a **`Record<keyof GatePolicy, Knob>`**. A field added to the
 * policy stops this file compiling until somebody writes the sentence that goes
 * with it. That is the same guarantee `scaffold.ts` buys from
 * `Record<CliError["code"], …>` and `endings.ts` from
 * `Record<WriteOutcome["kind"], …>`; this is the third place it has earned its
 * keep, which is roughly when a pattern stops being a trick.
 *
 * **The defaults are read, never typed.** Every `shipped` value below comes out
 * of `defaultGatePolicy` — the object the runtime itself produces by parsing an
 * empty policy — so the number on the page is the number in the build. A
 * hand-copied `12` would have been wrong the day somebody tuned it, and the page
 * would have gone on saying it.
 *
 * What the runtime cannot supply is the half this file exists for: what a
 * deployment should actually *do* about each knob. That is the site's voice, and
 * it is the only thing here a person wrote.
 */

/**
 * The four groups, which are four different questions rather than a tidy
 * arrangement of one.
 *
 * `vocabulary` is the part only you can write — the runtime has no opinion about
 * whether `commerce.checkout` matters, because it has never heard of it.
 * `latitude` is how much rope each kind of asker gets. `shape` is the set that
 * ships with answers, because "how much removal is a lot" means the same thing
 * on every deployment. `name` is one field and is its own group because it is
 * the one with a rule attached rather than a value to choose.
 */
export type KnobGroup = "vocabulary" | "latitude" | "shape" | "name"

export type KnobGroupNote = {
  readonly id: KnobGroup
  readonly title: string
  /** One sentence: what the whole group is for, before any field is named. */
  readonly summary: string
  /** Whether a deployment that writes nothing here still gets a working Gate. */
  readonly yours: boolean
}

export const KNOB_GROUPS: readonly KnobGroupNote[] = [
  {
    id: "name",
    title: "What it is called",
    summary:
      "Every decision the Gate records names the policy that made it, so the name has to mean one thing forever.",
    yours: true,
  },
  {
    id: "vocabulary",
    title: "What your deployment calls consequential",
    summary:
      "The runtime has never heard of your primitives, so it cannot know which of them matter. This is the part only you can write, and it is the part that changes answers.",
    yours: true,
  },
  {
    id: "latitude",
    title: "How much rope each asker gets",
    summary:
      "The same change is not equally safe depending on who wanted it and how sure the guess was. These four say where the lines are.",
    yours: false,
  },
  {
    id: "shape",
    title: "How big is big",
    summary:
      "Questions about shape mean the same thing on every deployment — how much removal is a lot, how close to the top counts as restructuring — so these ship with answers and most sites never touch them.",
    yours: false,
  },
]

export type Knob = {
  readonly group: KnobGroup
  /** What it is, in a sentence somebody could repeat to a colleague. */
  readonly plain: string
  /** What a deployment actually does about it. The site's half, not the runtime's. */
  readonly yourMove: string
}

/**
 * Keyed by field, which is the whole point: a fifteenth knob is a type error
 * here rather than a row nobody notices is missing.
 */
const KNOBS: Record<keyof GatePolicy, Knob> = {
  policyId: {
    group: "name",
    plain: "The name this policy answers to when a recorded decision is asked what judged it.",
    yourMove:
      "Pick a name you will still recognise in a year. Then treat it as naming the contents rather than the file: if you change what is protected, give the policy a new name, because every decision already written under the old one claims to have been judged by what that name meant then.",
  },

  protectedPrimitiveTypes: {
    group: "vocabulary",
    plain: "The primitives you would rather nobody changed without asking you first.",
    yourMove:
      "Name the handful whose being wrong would cost you something real — a checkout, a price, a consent notice. Reconfiguring one of these is treated as high stakes and destroying one as critical, so a short list changes a lot of answers and a long one holds up everything.",
  },
  protectedPropKeys: {
    group: "vocabulary",
    plain: "Prop names that carry meaning rather than appearance, wherever they appear.",
    yourMove:
      "Use this for the value rather than the component: a price matters on every primitive that has one, and listing the primitives instead would miss the next one somebody writes.",
  },
  outOfTreeEffectTypes: {
    group: "vocabulary",
    plain:
      "Primitives whose configuration reaches out of the page and does something in the world — takes a payment, sends a message.",
    yourMove:
      "Name them, because undo cannot help here. The runtime undoes a change by editing the tree back, and nothing about editing the tree back un-sends an email — so a change touching one of these is never counted as reversible.",
  },
  interactiveTypes: {
    group: "vocabulary",
    plain: "Which of your primitives render a thing the reader aims at — a link, a button.",
    yourMove:
      "Do not write this one. interactiveTypesFor(registry) reads what each primitive already declared about itself, so the day somebody gives another component a link the policy knows. A hand-typed copy is wrong the first time the library moves, and nothing says so.",
  },
  registeredPrimitiveTypes: {
    group: "vocabulary",
    plain: "Every primitive your deployment can actually draw.",
    yourMove:
      "Do not write this one either. registeredTypesFor(registry) reads the same list the renderer resolves against, so the two cannot disagree. Declaring it turns a proposal naming a primitive you do not have into a refusal the model can act on, instead of a revision that renders a hole; leave it out and you keep the older behaviour, where the change lands and the page reports it at render.",
  },

  autoApplyCeiling: {
    group: "latitude",
    plain:
      "The highest stakes each kind of asker may reach without a person being asked.",
    yourMove:
      "The default already draws the line most deployments want: somebody who typed a request gets more latitude than an adaptation nobody asked for. Lower an entry to make a source of changes quieter; there is no entry that lets anything through unconditionally.",
  },
  refusalFloor: {
    group: "latitude",
    plain: "The level at which a change stops being offered to a person at all.",
    yourMove:
      "Leave it at critical unless you have a reason. Lowering it turns changes a reviewer could have approved into changes nobody can, and a refusal has no button that turns it into a yes.",
  },
  minimumConfidence: {
    group: "latitude",
    plain: "How sure the interpretation has to be before a change can apply on its own.",
    yourMove:
      "Only the model-backed interpreter grades itself below 1, so this does nothing until you connect one. Raise it if you would rather see more asks than have more of them land unwatched.",
  },
  confidenceFloor: {
    group: "latitude",
    plain: "Below this, the change is refused rather than offered to a person.",
    yourMove:
      "This is the line between “ask somebody” and “do not waste their time”. A guess this unsure is usually a question the model did not understand, and handing it to a reviewer moves the confusion rather than resolving it.",
  },

  removalThresholds: {
    group: "shape",
    plain: "How many nodes a change has to remove before it counts as a medium or a large removal.",
    yourMove:
      "Nothing, on most sites. Both numbers are about the tree rather than about your business, and the vocabulary lists above are the lever you actually want.",
  },
  breadthThreshold: {
    group: "shape",
    plain: "How many distinct nodes one change may touch before it counts as a broad one.",
    yourMove:
      "Nothing, usually. Lower it if your pages are small enough that eight nodes is most of one.",
  },
  shallowDepthThreshold: {
    group: "shape",
    plain:
      "How near the top of the page a structural change has to be before it counts as restructuring.",
    yourMove:
      "Nothing. Depth 1 is the page's own children — the blocks a reader sees as the page — and moving one of those around is the change worth noticing.",
  },
  inverseRetentionBudget: {
    group: "shape",
    plain: "How much of the old page an undo may have to carry before undo stops being practical.",
    yourMove:
      "Nothing. It exists so that a change whose undo would be enormous is not quietly called reversible, and 200 nodes is well past anything a page ought to be.",
  },
}

/**
 * Reading order, which is not the type's order and could not be.
 *
 * A reader meets the name first, then the five fields they have to write
 * themselves, then the two groups that ship with answers — so the page opens
 * with the work and ends with the reassurance, rather than the other way round.
 * `knobs.test.ts` holds this list against the record, so a knob added to one and
 * forgotten in the other is a red test.
 */
export const KNOB_ORDER: readonly (keyof GatePolicy)[] = [
  "policyId",
  "protectedPrimitiveTypes",
  "protectedPropKeys",
  "outOfTreeEffectTypes",
  "interactiveTypes",
  "registeredPrimitiveTypes",
  "autoApplyCeiling",
  "refusalFloor",
  "minimumConfidence",
  "confidenceFloor",
  "removalThresholds",
  "breadthThreshold",
  "shallowDepthThreshold",
  "inverseRetentionBudget",
]

export type PolicyKnob = {
  readonly field: keyof GatePolicy
  readonly group: KnobGroup
  readonly plain: string
  readonly yourMove: string
  /** What you get when you say nothing, as JSON, read out of `defaultGatePolicy`. */
  readonly shipped: string
}

/**
 * The default rendered the way a reader would write it, which is JSON and not
 * `String(value)`.
 *
 * `String([])` is the empty string and `String({})` is `[object Object]`; both
 * would appear in the table as though the runtime had no answer, when the answer
 * is *nothing yet, and here is the shape of the nothing*.
 */
const shippedValue = (field: keyof GatePolicy): string => JSON.stringify(defaultGatePolicy[field])

export const policyKnobs = (): readonly PolicyKnob[] =>
  KNOB_ORDER.map((field) => ({ field, ...KNOBS[field], shipped: shippedValue(field) }))

/** The knobs of one group, in reading order. */
export const knobsInGroup = (group: KnobGroup): readonly PolicyKnob[] =>
  policyKnobs().filter((knob) => knob.group === group)
