import type { Gameplan, JudgedChange, Movement, Moved, Replay, SetAside } from "./what-if"
import type { PlainState } from "./vocabulary"

/**
 * The words this screen says, in one place, and the sentences it builds from
 * them.
 *
 * Same split as every other screen in this lane: `what-if.ts` works out what
 * would happen, this says what that means, and the components arrange it. The
 * reason the split is worth the file is that **every interesting sentence here
 * has four or five cases and most of them need a real record to reach** — the
 * one about changes you turned down only exists on a deployment somebody has
 * said no on. Those are the sentences that ship wrong, and a pure function is
 * the only way to see all of them without first producing the situation.
 */

/**
 * Where a change would end up, as the news it is to the person waiting.
 *
 * Not "accepted / requires-confirmation / rejected" renamed. A reader of this
 * screen is comparing two worlds, so the subject of each of these is the
 * *difference* — what stops happening, what starts. `GATE_VERDICTS` says the
 * same three outcomes in the past tense about one change that really happened,
 * and these are deliberately not it: a row here is about a change that did not
 * go that way.
 */
export const WOULD_HAPPEN: Readonly<Record<Movement, PlainState>> = {
  "goes-ahead": {
    label: "Would go ahead without asking",
    meaning: "Nobody would have been asked about this one. It would simply have happened.",
    technical: "accepted",
    tone: "applied",
  },
  "asks-you": {
    label: "Would stop and ask you",
    meaning: "This one would be written down in full and wait for somebody to say yes.",
    technical: "requires-confirmation",
    tone: "awaiting",
  },
  "turned-down": {
    label: "Would be turned down",
    meaning: "This one would be refused outright, and nobody would be asked about it.",
    technical: "rejected",
    tone: "rejected",
  },
  unchanged: {
    label: "Would go the same way",
    meaning: "These settings make no difference to this one.",
    technical: "unchanged",
    tone: "inapplicable",
  },
}

/** The three movements a screen draws a group for, in the order it draws them. */
export const MOVEMENTS: readonly Exclude<Movement, "unchanged">[] = [
  "goes-ahead",
  "asks-you",
  "turned-down",
]

const changes = (count: number): string => `${count} change${count === 1 ? "" : "s"}`

/**
 * What a reader is being shown, before they have moved anything.
 *
 * The screen has to be worth opening on a deployment where nobody has turned a
 * dial, which is every deployment the first time. So the resting state is not
 * blank: it says how much evidence there is to play against, which is itself
 * the thing that decides whether the rest of the screen means anything.
 */
export const basisOf = (replay: Replay): string => {
  if (replay.judged === 0)
    return "Nothing has been judged under these rules yet, so there is nothing to play them against. Ask for a change and this screen fills up."

  if (replay.changes.length === 0)
    return `${changes(replay.judged)} have been judged here, and none of them can be weighed against a different set of rules. What was left out, and why, is below.`

  return `Your last ${changes(replay.changes.length)} are weighed against whatever you set above.`
}

/**
 * The answer, in one sentence, and it is the sentence the screen exists for.
 *
 * Four cases and the first two are the ones a reader meets most. "Nothing would
 * change" is said out loud rather than shown as an empty list, for the reason
 * this lane keeps relearning: an empty screen reads as a screen that failed to
 * load, and a reader who has just moved a dial is owed a yes or a no.
 */
export const verdictOf = (plan: Gameplan, moved: boolean): string => {
  if (!moved) return "Move one of the settings above and this says what would have been different."
  if (plan.weighed === 0) return "There is nothing on the record to try these against yet."
  if (plan.moved.length === 0)
    return `None of your last ${changes(plan.weighed)} would have gone any differently.`

  return `${plan.moved.length} of your last ${changes(plan.weighed)} would have gone a different way.`
}

/**
 * The half of the answer a loosening hides, and the reason this screen is not
 * a toy.
 *
 * Any loosening reads as time saved. What it costs is only visible in what the
 * released changes *were*, and the expensive case is the one where somebody
 * looked at a change, decided against it, and the new settings would have
 * applied it with nobody asked. That is not a trade-off a count of saved
 * interruptions can express, so it gets its own sentence rather than a column.
 *
 * Empty when there is nothing to warn about, so a component can render it
 * without asking.
 */
export const costOf = (plan: Gameplan): string => {
  const parts: readonly string[] = [
    ...(plan.againstYourNo > 0
      ? [
          `${plan.againstYourNo} ${
            plan.againstYourNo === 1 ? "is a change you said no to" : "are changes you said no to"
          }`,
        ]
      : []),
    ...(plan.offYourQueue > 0
      ? [`${plan.offYourQueue} ${plan.offYourQueue === 1 ? "is" : "are"} still waiting for your answer`]
      : []),
  ]

  if (parts.length === 0) return ""

  return `Of the ones that would go ahead without asking, ${parts.join(" and ")}.`
}

/**
 * The changes that would not move, as a line under the answer.
 *
 * Empty when there are none, which is the whole reason it is a function.
 * **"The other 0 would have gone exactly as they did"** was on the screen
 * until a screenshot of a refusal floor at `low` — where every change moves —
 * was looked at. A count of nothing, printed as a reassurance, is the shape of
 * sentence this lane keeps producing from a template and keeps finding by eye.
 */
export const restOf = (plan: Gameplan): string => {
  if (plan.unchanged === 0) return ""

  return plan.unchanged === 1
    ? "The other one would have gone exactly as it did."
    : `The other ${plan.unchanged} would have gone exactly as they did.`
}

/** What one change was, and what happened to it, as the line above its row. */
export const askedFor = (change: JudgedChange): string =>
  change.asked.trim() === "" ? "Somebody asked for a change here." : change.asked

/**
 * What really became of a change, said as the person's own act where there was
 * one.
 *
 * A row on this screen is a comparison, so it has to carry both halves. The
 * recorded half is the one a reader can check against the rest of the portal,
 * and the version worth printing is what *they* did rather than what the
 * runtime called it — "you said no" is the same fact as `discarded` and is the
 * one that makes the comparison land.
 */
export const whatHappened = (change: JudgedChange): string => {
  if (change.answer === "confirmed") return "You said yes to this one."
  if (change.answer === "discarded") return "You said no to this one."
  if (change.recorded.kind === "requires-confirmation")
    return change.held ? "This one is still waiting for your answer." : "This one never reached anybody."
  if (change.recorded.kind === "rejected") return "This one was turned down."

  return "This one went ahead without anybody being asked."
}

const SET_ASIDE_READINGS: Readonly<Record<SetAside, (count: number) => string>> = {
  "judged-under-other-rules": (count) =>
    `${changes(count)} were judged under rules that are not the ones you have now, so what happened to them says nothing about these settings.`,
  "not-enough-recorded": (count) =>
    `${changes(count)} were judged before this portal started writing down everything a replay needs, so they cannot be weighed.`,
  "did-not-reproduce": (count) =>
    `${changes(count)} came out differently when this screen re-ran your own settings over them. That is this screen being wrong about a rule rather than anything being wrong with the change, and it is why they are left out.`,
}

/** Every reason a change was left out, with its count, and nothing for the zeroes. */
export const leftOut = (replay: Replay): readonly string[] =>
  (Object.keys(SET_ASIDE_READINGS) as readonly SetAside[])
    .filter((reason) => replay.setAside[reason] > 0)
    .map((reason) => SET_ASIDE_READINGS[reason](replay.setAside[reason]))

/**
 * Whether the screen should be trusted at all.
 *
 * A single change that did not reproduce means this module and the runtime
 * disagree about what a rule says, and no amount of the rest being right makes
 * that safe to bury under a smaller denominator. The screen says it at the top,
 * in the failure tone, and goes on showing the gameplan over what did
 * reproduce — removing it would lose the evidence that something is wrong.
 */
export const readsTheRulesWrong = (replay: Replay): boolean =>
  replay.setAside["did-not-reproduce"] > 0

export const movedIn = (plan: Gameplan, movement: Movement): readonly Moved[] =>
  plan.moved.filter((entry) => entry.movement === movement)
