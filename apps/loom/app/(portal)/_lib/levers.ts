import { ceilingFor, type GatePolicy, type IntentOrigin, type StakeLevel } from "@jam-overture/loom"

import { ASKER, asPercent, ORIGINS } from "./rules-view"
import { STAKES } from "./vocabulary"

/**
 * The dials a person may turn on this screen, and what turning one produces.
 *
 * ## Only the settings a replay can honour
 *
 * Seven of them, and the shape of the list is the argument. A policy has
 * seventeen fields; these are the seven that the ladder reads **directly** —
 * two confidence thresholds, the line nothing may cross, and one ceiling for
 * each of the four kinds of asker. Every other field feeds the *measurement* of
 * how risky a change is, and the measurement is a function of the page as it
 * stood when the change was proposed. `_lib/what-if.ts` says why that cannot be
 * replayed; the consequence here is that those fields are not offered, and the
 * screen says out loud that they are missing rather than letting a reader
 * discover it by noticing an absence.
 *
 * Offering them and holding the recorded level fixed would be the worse option
 * by a long way. Every one of them would answer "nothing would change", which
 * is a result-shaped way of saying "this screen did not look".
 *
 * ## The state is the address
 *
 * A lever's position lives in the query string, not in a component. Three
 * things follow and all three are wanted: the screen is a server render like
 * every other screen in this route group, it works with no JavaScript at all,
 * and **a gameplan is a link somebody can paste to another person**. The last
 * one is the one that matters for a governance surface — "here is the setting I
 * want to change and here is what it would have done to our last thirty
 * changes" is an argument, and an argument has to be sendable.
 *
 * A value the screen does not offer is ignored rather than rejected, and the
 * lever falls back to what the deployment really has. A hand-edited address is
 * not worth an error screen, and a silent fallback cannot mislead: every lever
 * renders its own position, so a reader always sees what was actually used.
 */

/** A lever's name in the address. Short, lower case, and not a field name. */
export type LeverId =
  | "sure-to-act"
  | "sure-to-ask"
  | "never"
  | "allow-visitor"
  | "allow-you"
  | "allow-site"
  | "allow-schedule"

export type Choice = {
  readonly value: string
  readonly label: string
}

export type Lever = {
  readonly id: LeverId
  /** What the dial decides, as the question a person has. */
  readonly question: string
  /** One line on what moving it does, in the same voice as the rules screen. */
  readonly reading: string
  /** The policy field, for the technical record and for the block of code. */
  readonly field: string
  readonly choices: readonly Choice[]
  /** What this deployment really has. */
  readonly now: string
  /** What the address asks for, which is `now` until somebody moves it. */
  readonly chosen: string
}

export const isMoved = (lever: Lever): boolean => lever.chosen !== lever.now

/**
 * The confidences a dial offers.
 *
 * Five positions rather than a slider, and the reason is not the absence of
 * JavaScript. A slider invites a reader to tune a threshold to three decimal
 * places against thirty changes, which is a precision the evidence does not
 * have — the honest unit here is "a bit stricter" and "a lot looser". A
 * deployment whose own value is not one of the five gets it added, so the dial
 * can always show where it actually stands.
 */
const CONFIDENCES: readonly number[] = [0.5, 0.6, 0.7, 0.8, 0.9]

const confidenceChoices = (now: number): readonly Choice[] =>
  [...new Set([...CONFIDENCES, now])]
    .sort((left, right) => left - right)
    .map((value) => ({ value: String(value), label: asPercent(value) }))

/**
 * A stakes dial, labelled by what the level *is* rather than by its name.
 *
 * `STAKES` is the portal's one reading of the four levels and it is read here
 * rather than restated — `rules-view.ts` makes the same move for the same
 * reason, and the argument it writes down holds: a level said two ways on two
 * screens is how a reader stops trusting either.
 */
const stakeChoices = (): readonly Choice[] =>
  (["low", "medium", "high", "critical"] as const).map((level) => ({
    value: level,
    label: STAKES[level].label,
  }))

const ORIGIN_LEVERS: Readonly<Record<IntentOrigin, LeverId>> = {
  "user-instruction": "allow-visitor",
  developer: "allow-you",
  "system-signal": "allow-site",
  "scheduled-adaptation": "allow-schedule",
}

/** What the address says, with a repeated parameter read as absent. */
export type Addressed = Readonly<Record<string, string | readonly string[] | undefined>>

const asked = (params: Addressed, id: LeverId): string | undefined => {
  const value = params[id]

  return typeof value === "string" ? value : undefined
}

const chosenFrom = (params: Addressed, id: LeverId, choices: readonly Choice[], now: string): string => {
  const wanted = asked(params, id)

  return wanted !== undefined && choices.some((choice) => choice.value === wanted) ? wanted : now
}

const lever = (
  params: Addressed,
  id: LeverId,
  question: string,
  reading: string,
  field: string,
  choices: readonly Choice[],
  now: string
): Lever => ({
  id,
  question,
  reading,
  field,
  choices,
  now,
  chosen: chosenFrom(params, id, choices, now),
})

export const leversFor = (policy: GatePolicy, params: Addressed): readonly Lever[] => [
  lever(
    params,
    "sure-to-act",
    "How sure must Loom be before it changes anything on its own?",
    "Raise it and more changes stop to ask you. Lower it and more go ahead unasked.",
    "minimumConfidence",
    confidenceChoices(policy.minimumConfidence),
    String(policy.minimumConfidence)
  ),
  lever(
    params,
    "sure-to-ask",
    "How sure must it be to bother you at all?",
    "Anything the AI believes in less than this is dropped instead of reaching your queue.",
    "confidenceFloor",
    confidenceChoices(policy.confidenceFloor),
    String(policy.confidenceFloor)
  ),
  lever(
    params,
    "never",
    "What is never done here, however it was asked for?",
    "A change Loom weighs at this much risk is turned down outright and you are not asked.",
    "refusalFloor",
    stakeChoices(),
    policy.refusalFloor
  ),
  ...ORIGINS.map((origin) =>
    lever(
      params,
      ORIGIN_LEVERS[origin],
      `${ASKER[origin]}: how far may a change go without asking you?`,
      "Anything riskier than this waits for your answer instead of being applied.",
      `autoApplyCeiling.${origin}`,
      stakeChoices(),
      ceilingFor(policy, origin)
    )
  ),
]

const positionOf = (levers: readonly Lever[], id: LeverId): string =>
  levers.find((entry) => entry.id === id)?.chosen ?? ""

/**
 * The policy the dials describe.
 *
 * Built from the deployment's own policy rather than from `defaultGatePolicy`,
 * so every field nobody moved keeps the value this deployment really has. A
 * simulation that quietly reverted the fourteen fields it does not offer would
 * compare the record against a policy nobody has ever run.
 */
export const policyFrom = (policy: GatePolicy, levers: readonly Lever[]): GatePolicy => ({
  ...policy,
  minimumConfidence: Number(positionOf(levers, "sure-to-act")),
  confidenceFloor: Number(positionOf(levers, "sure-to-ask")),
  refusalFloor: positionOf(levers, "never") as StakeLevel,
  autoApplyCeiling: Object.fromEntries(
    ORIGINS.map((origin) => [origin, positionOf(levers, ORIGIN_LEVERS[origin]) as StakeLevel])
  ) as GatePolicy["autoApplyCeiling"],
})

/**
 * Where this screen lives, and what it is called, each written once.
 *
 * Not in `_lib/screen-names.ts`, and the reason is that module's own stated
 * discipline rather than an oversight. It holds the three screens that were
 * being called several things by several parts of the portal, its `PortalRoute`
 * is deliberately those three, and every screen it names also declares the
 * neighbour a reader confuses it with. This screen has no such neighbour — it
 * is reached from one place and answers a question nothing else does — so
 * declaring it there would mean widening a type and inventing an `elsewhere`
 * that does not exist. What that module is actually for is that a name is
 * written in one place, and it is: the heading and the one link that leads here
 * both read these.
 */
export const WHAT_IF_PATH = "/portal/rules/what-if"

export const WHAT_IF_NAME = "What if you changed these rules?"

/**
 * The address with one dial moved and every other dial where it is.
 *
 * Positions equal to the deployment's own are left out, which is what keeps a
 * shared link short and, more usefully, honest about itself: an address naming
 * three parameters is a proposal to change three things. A fourth parameter
 * that happens to restate a current value would read as a fourth change on a
 * screen whose whole subject is what differs.
 */
export const hrefWith = (levers: readonly Lever[], id: LeverId, value: string): string => {
  const query = new URLSearchParams()

  for (const entry of levers) {
    const position = entry.id === id ? value : entry.chosen
    if (position !== entry.now) query.set(entry.id, position)
  }

  const search = query.toString()

  return search === "" ? WHAT_IF_PATH : `${WHAT_IF_PATH}?${search}`
}

export const movedLevers = (levers: readonly Lever[]): readonly Lever[] => levers.filter(isMoved)

/**
 * What a person would put in their own repository to make this real.
 *
 * The end of the screen, and the only thing on it that is an instruction. It is
 * a block of code rather than a button because that is where a policy lives
 * today — `/portal/rules` says so in those words, and a screen that offered to
 * write one would be making a change to the thing that judges changes without
 * any of the machinery every other change here is held to.
 *
 * Only the moved fields are printed. A whole policy printed out would be a
 * second copy of the host's configuration, going stale from the moment it was
 * rendered, in the one place a reader is most likely to paste without reading.
 */
export const patchLines = (levers: readonly Lever[]): readonly string[] =>
  movedLevers(levers).map((entry) => {
    /*
     * Quoted by what the value *is* rather than by which field carries it.
     *
     * The first version keyed on the field name — `autoApplyCeiling.*` quoted,
     * everything else bare — and printed `refusalFloor: high`, which is a
     * reference to an undeclared name in the one block of code on this screen
     * a person is invited to paste. A field list has to be kept in step with
     * the levers above it and this does not, so the rule is the value's own
     * shape: a level is a word and a threshold is a number.
     */
    const value = Number.isNaN(Number(entry.chosen)) ? `"${entry.chosen}"` : entry.chosen

    return `${entry.field}: ${value}`
  })
