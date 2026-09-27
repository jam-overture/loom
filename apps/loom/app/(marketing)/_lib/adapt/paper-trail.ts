import type { LoomTree, RuntimeEvent, RuntimeEventEnvelope } from "@jam-overture/loom"

import { askById, type Ask, type AskId } from "./asks"
import { runAsk } from "./run"

/**
 * What the runtime said while it was working, kept.
 *
 * Every other page of this site *describes* the record. The mechanism page has
 * an argument to make that description cannot make for it — that the record is
 * a real thing a deployment receives rather than a picture drawn of one — so
 * this module attaches an ordinary listener to a real request against the
 * published front door and hands back exactly what came out of it.
 *
 * Nothing here composes, edits, prettifies or reorders. The lines the page
 * prints are `JSON.stringify` of the envelopes a host's own listener would have
 * been handed, in the order they were handed over, and `paper-trail.test.ts`
 * holds them against the same run rather than against a fixture. That is the
 * whole reason the band is worth having: a screenshot of a log is easy, and a
 * log that is checkably the one this page's own request produced is not.
 */

/**
 * A listener, which is all a host has to write.
 *
 * Eight lines, no interface to implement beyond `emit`, and deliberately not
 * imported from the framework's test doubles: what this band is claiming is
 * that a deployment can have the record for the cost of writing this, so the
 * page had better be running the thing it is claiming.
 *
 * Emission is fire-and-forget by the runtime's own guarantee, so pushing into
 * an array cannot fail a change — and this array lives exactly as long as the
 * request that made it.
 */
const listener = (): {
  readonly sink: { readonly emit: (envelope: RuntimeEventEnvelope) => void }
  readonly heard: () => readonly RuntimeEventEnvelope[]
} => {
  const heard: RuntimeEventEnvelope[] = []

  return { sink: { emit: (envelope) => void heard.push(envelope) }, heard: () => heard }
}

/**
 * What each stage is, said before its name is used and without one of our words.
 *
 * Keyed by the type the runtime actually emitted, so a stage that starts
 * narrating itself differently arrives here as a missing key and fails the
 * build. The alternative — a page that quietly skips an event it does not
 * recognize — is a paper trail with a hole in it presented as a complete one,
 * which is the exact failure this band exists to argue cannot happen.
 */
const STAGE: Readonly<
  Record<string, { readonly title: string; readonly plainly: string; readonly caption?: string }>
> = {
  "intent-received": {
    title: "Somebody asked for something",
    plainly:
      "The request, as it arrived: who asked, what they said, which page they meant, and the version of that page they were looking at.",
  },
  "policy-resolved": {
    title: "The rules in force were settled",
    plainly:
      "Written down before anything is worked out, so what judged this change cannot be argued about afterwards. These are the whole rules, not a summary of them.",
  },
  "change-proposed": {
    title: "The change was written down",
    plainly:
      "The exact list of what to do, with why it answers the request and where it came from. Nothing has moved yet — this is a piece of paper.",
  },
  "change-assessed": {
    title: "The change was measured",
    plainly:
      "How many pieces it touches, which kinds of piece, whether it can be cleanly undone, and what all of that weighs. Counted from the page, not guessed at.",
    caption:
      "The list from the line before appears here again. Every line stands on its own, so a system that missed one has still lost nothing.",
  },
  "disposition-decided": {
    title: "Your rules answered",
    plainly:
      "Allow it, hold it for a person, or refuse it — with the reason, the weight, and the name of the rules that decided.",
  },
  "change-applied": {
    title: "The page changed, and the way back was kept",
    plainly:
      "The new version number, and the change that reverses this one — written at the moment it landed rather than worked out later, which is what makes putting it back exact.",
    caption:
      "This is the change the front page's own “put it back” applies. A test takes it off this line and checks the page it produces is the page the run started from.",
  },
}

export type TrailLine = {
  /** The event's own name, which is what a reader will see in their own logs. */
  readonly type: RuntimeEvent["type"]
  readonly title: string
  readonly plainly: string
  /** A note under the panel, where one line has something the others do not. */
  readonly caption?: string
  /** The envelope, as a listener was handed it. Not edited, not reordered. */
  readonly json: string
}

export type PaperTrail = {
  /** Which choice this is the record of, which is not always the default one. */
  readonly ask: AskId
  /** The request, in the words the visitor's button stands for. */
  readonly asked: string
  /** Every line of the run, in the order the runtime said them. */
  readonly lines: readonly TrailLine[]
  /**
   * Whether the run above reached the page, or stopped at the answer.
   *
   * Three of the five choices land on their own, one is held for the visitor to
   * decide, and one is refused outright — so a page that assumed the run
   * reached the page was a page that could only ever print the record of the
   * one choice it was written around. It is counted off the lines rather than
   * asserted, because the whole claim of the band is that the lines are the run.
   */
  readonly landed: boolean
  /**
   * Whether the run above is itself the request this site refuses.
   *
   * The contrast band below prints a refusal beside an answer that was not one.
   * A visitor who asked for the refused change themselves has the refusal in
   * front of them already, so that band would print the same answer twice under
   * a heading calling it a different one.
   */
  readonly isRefusal: boolean
  /**
   * The one line of a second run that a refusal changes, and the only one worth
   * printing twice.
   *
   * A refused change reaches the same kinds of line as an allowed one — the
   * request, the rules, the list, the measurement — and that is the point rather
   * than an economy: what separates them is one answer, and the absence of
   * everything that would have followed.
   */
  readonly refused: TrailLine
  /**
   * How many lines that refused run produced, which is **not** a fact about the
   * run printed above it.
   *
   * The band that shows the refusal counts three positions while it speaks —
   * how many kinds of line match, which one differs, and which one is missing —
   * and every one of them is a position in the *refused* run. They were read off
   * `lines` while `lines` could only ever be the six-line default, which gave
   * the right three numbers for the wrong reason. The moment the page could
   * print a five-line run above the band, the same arithmetic would have made
   * every one of them one too small.
   */
  readonly refusedLines: number
}

const lineOf = (envelope: RuntimeEventEnvelope): TrailLine => {
  const stage = STAGE[envelope.event.type]

  if (stage === undefined) {
    throw new Error(`loom: the mechanism page has nothing to say about ${envelope.event.type}`)
  }

  return {
    type: envelope.event.type,
    title: stage.title,
    plainly: stage.plainly,
    ...(stage.caption === undefined ? {} : { caption: stage.caption }),
    json: JSON.stringify(envelope, null, 2),
  }
}

/**
 * The request the page shows the whole record of **when nobody has asked for
 * another one**.
 *
 * The quietest of the five on purpose. It changes two settings on one band and
 * not a word of the page, so every line below is legible on a screen — and the
 * shape of change it stands for is far commoner in practice than the dramatic
 * ones. A run whose record nobody can read proves nothing.
 *
 * It is the default rather than the subject as of this run. A visitor who has
 * just watched a change happen on the front door is the one person on this site
 * who wants the raw record — and until now they were shown the record of a
 * different request from the one they made, on the page whose entire argument is
 * that it can tell them exactly what happened.
 */
export const DEFAULT_SHOWN: AskId = "calmer"

/** The one the rules will not allow, whoever asks. */
export const REFUSED: AskId = "drop-pitch"

const askOrThrow = (id: AskId): Ask => {
  const ask = askById(id)

  if (ask === undefined) {
    throw new Error(`loom: the mechanism page prints the record of ${id} and there is no such ask`)
  }

  return ask
}

const heardFrom = async (page: LoomTree, ask: Ask, namespace: string, approved: boolean) => {
  const { sink, heard } = listener()

  await runAsk(page, ask, approved, namespace, sink)

  return heard()
}

/** One request's record, before it is known whether it is the one being printed. */
type Run = {
  readonly ask: AskId
  readonly asked: string
  readonly lines: readonly TrailLine[]
  /** The answer, which is the line every printable run has to have reached. */
  readonly verdict: TrailLine
  readonly landed: boolean
}

/**
 * One request against the published front door, listened to — or nothing.
 *
 * **Nothing, rather than a throw, and the split is deliberate.** Two of the runs
 * this page makes are the site's own and are checked by tests; the third is
 * whichever request arrived in the address, and a visitor's address must not be
 * able to take a page down. So a run that produced nothing printable comes back
 * as `undefined` here and the caller decides: for the visitor's request that
 * means falling back to the default, and for the site's own two it means the
 * error that has always been right.
 *
 * Two things make a run unprintable, and both are checked before a line is
 * built. It may narrate a stage this page has nothing to say about, which is
 * `lineOf`'s error and is checked ahead of it so the choice is the caller's
 * rather than an exception's. And it may reach no answer at all — which is not
 * a state of the rules but a request the page had nothing to do about, and
 * there is no record of a change that was never proposed.
 *
 * The guard is on the answer rather than on the change landing. Every request
 * the rules see reaches a verdict, and that is the invariant worth holding: a
 * run that stops *at* the verdict is one of the three answers the rules can
 * give rather than a fault, and it is the answer a visitor most needs to read.
 */
const runFor = async (
  frontDoor: LoomTree,
  id: AskId,
  approved: boolean,
  namespace: string
): Promise<Run | undefined> => {
  const ask = askOrThrow(id)
  const heard = await heardFrom(frontDoor, ask, namespace, approved)

  if (heard.some((envelope) => STAGE[envelope.event.type] === undefined)) return undefined

  const lines = heard.map(lineOf)
  const verdict = lines.find((line) => line.type === "disposition-decided")

  if (verdict === undefined) return undefined

  return {
    ask: id,
    asked: ask.utterance,
    lines,
    verdict,
    landed: lines.some((line) => line.type === "change-applied"),
  }
}

/**
 * The record this page prints, and the refusal it prints beside it.
 *
 * The page it runs against is the one this site serves at `/`, built fresh
 * here, so the record on the mechanism page is a record of the site rather than
 * of a fixture kept beside it. More than one run, because a refusal is the half
 * a visitor most needs to see and no single request can be both allowed and
 * refused; separate namespaces, because two runs of one namespace hand out the
 * same ids and nothing is gained by making two records share them.
 *
 * **`asked` and `approved` are the visitor's, off the address.** They are the
 * same two values the front door read to produce the change that visitor
 * watched happen, run again here against the same published page — so the lines
 * printed are the lines *their* request produced, rather than the lines of a
 * request chosen when this page was written. Absent, the default stands and this
 * page is what it has always been, which matters more than it sounds: that is
 * the page every crawler and every share preview is served.
 *
 * `ask` on the way out names whichever request was actually printed. A page that
 * addressed the reader as the person who made this request would be wrong the
 * moment a fallback happened, so what the page says about the reader is decided
 * by comparing that against the address rather than by the address alone.
 */
export const paperTrailFor = async (
  frontDoor: LoomTree,
  asked?: AskId,
  approved = false
): Promise<PaperTrail> => {
  const theirs =
    asked === undefined ? undefined : await runFor(frontDoor, asked, approved, "asked")
  const shown = theirs ?? (await runFor(frontDoor, DEFAULT_SHOWN, false, "shown"))

  if (shown === undefined) {
    throw new Error(
      `loom: the record this page falls back to ("${DEFAULT_SHOWN}") reached no answer against the front door, so there is nothing to print`
    )
  }

  const refusal = await runFor(frontDoor, REFUSED, false, "refused")

  if (refusal === undefined) {
    throw new Error("loom: the request this site refuses reached no answer, so there is none to show")
  }

  return {
    ask: shown.ask,
    asked: shown.asked,
    lines: shown.lines,
    landed: shown.landed,
    isRefusal: shown.ask === REFUSED,
    refused: refusal.verdict,
    refusedLines: refusal.lines.length,
  }
}
