import { everyMemberOf } from "../closed-set.js"

import type { CollectionHealth } from "./health.js"

/**
 * Whether nothing is arriving because nothing is posting, or because this
 * deployment's door is turning it away.
 *
 * Every reading in this subsystem is a reading of rows that arrived. A part
 * that nobody reached, a window with no page views, a funnel nobody entered, a
 * census of the reasons a reading went dark — all of them are computed from
 * counters, and a counter that was never written looks exactly like a counter
 * that was written with a nought. So the most ordinary failure a new
 * deployment has — a snippet posting from an origin its project does not name
 * — makes **forty-odd readings and nine comparisons all say the same wrong
 * thing**: *nobody read this page.*
 *
 * The evidence that it is wrong has existed since
 * [0311](../../decisions/0311-a-refusal-whose-key-was-right-is-counted-against-its-project-and-one-without-one-is-not.md):
 * the door counts what it refused, per reason, with the newest one's origin
 * beside it. **Nothing joined the two.** A person could read a refusal count
 * in one box on a screen and a page of nought-view pages in another and draw
 * the conclusion themselves; no reading drew it, so no verdict, no fault and no
 * sentence anywhere in this subsystem could.
 *
 * ## Why it is not a collection fault
 *
 * {@link collectionHealthOf} publishes seven faults and every one of them is
 * **about one revision of one page**, because every one is derived from that
 * revision's own rows. A refusal names no page: a delivery turned away for
 * naming the wrong site was turned away before anything read which tree it was
 * about, and reading the body to find out would spend the deployment's database
 * on exactly the sender the gate exists to stop (0311). So this is deployment-
 * wide by construction, which is a different subject (0240) and therefore a
 * reading beside health rather than an eighth member of a closed set inside it.
 *
 * ## The reasons stay the deployment's
 *
 * Why a host turned a sender away is the host's business — which is why the
 * counter is the deployment's table and not the runtime's — so this reading is
 * generic in the reason and never names one. A host hands in its own closed
 * set and gets it back on {@link ArrivalStanding.newest}, where its own
 * sentence and its own remedy can be chosen from it. The framework's part is
 * the join and the standing, both of which hold whatever the reasons are.
 *
 * Pure, linear in the tallies handed in, and reaches no store, clock or DOM.
 */

/**
 * One reason a door turned deliveries away, as a deployment's own counter holds
 * it.
 *
 * Structural rather than imported, for the reason above: the three members this
 * deployment happens to count are not the framework's to know. `TReason` is
 * whatever a host's closed set is, and it travels through to `newest` so that
 * the one place a reason is acted on is the host's own switch over its own set.
 */
export type TurnedAwayTally<TReason extends string = string> = {
  readonly reason: TReason
  /** Deliveries turned away for this reason, cumulative since the counter existed. */
  readonly refused: number
  /** When the newest of them was turned away, in epoch milliseconds. */
  readonly lastAt: number
  /**
   * The site the newest of them came from, as an origin, or `null` where it
   * named none.
   *
   * Carried because for the commonest reason it is the whole remedy: *from
   * `https://loomjs.org`* beside a project that names `www.loomjs.org` needs no
   * other explanation.
   */
  readonly lastOrigin: string | null
}

/** The newest delivery this door turned away, which is the one an operator acts on. */
export type NewestTurnedAway<TReason extends string = string> = {
  readonly reason: TReason
  readonly origin: string | null
  /** When it was turned away, in epoch milliseconds, as the counter holds it. */
  readonly atMs: number
  /**
   * How long before the instant handed in it was turned away, or `null` where
   * no instant was.
   *
   * The one number that tells a live fault from a fixed one: a cumulative
   * counter cannot say whether its own figure is current, and a deployment that
   * was misconfigured a month ago and fixed it still holds every refusal it
   * ever counted. Negative where the counter is ahead of the instant, by the
   * same subtraction rather than by a special case (0274).
   */
  readonly sinceMs: number | null
}

/** Whether anything is arriving at this deployment, and why not. */
export type ArrivalStandingName =
  /**
   * Nothing offered a count of what the door turned away, so the question
   * cannot be answered either way.
   *
   * The refusal rather than the gap, and it wins over every other state for the
   * reason an absent region store is not an empty map (0240): a window with
   * nothing in it and no refusal counter beside it is *two* states, and calling
   * it `silent` would publish the more comforting one. A deployment that keeps
   * no such counter — or whose store was not reachable on this read — gets the
   * figures it does have and no verdict.
   */
  | "unasked"
  /**
   * Nothing has been collected and nothing has been turned away.
   *
   * No page is posting to this deployment at all: the snippet is absent, or the
   * broadcaster was never called, or the signals never left the browser. The
   * strongest of the quiet answers, because the door is the one place a
   * delivery cannot arrive without being seen, and it saw none.
   */
  | "silent"
  /**
   * Nothing has been collected and deliveries have been turned away.
   *
   * **The state this reading exists for.** A page is posting and this door is
   * refusing it, and every other reading in the subsystem is reporting that
   * nobody read anything. It is the one standing here that no amount of age on
   * the counter can weaken: whenever those refusals happened, nothing has ever
   * been collected, so there is no window in which this deployment was working.
   */
  | "turned-away"
  /** Something has been collected and nothing has been turned away. */
  | "collecting"
  /**
   * Something has been collected and deliveries have been turned away.
   *
   * Both are true and neither is the whole picture: a second sender with a
   * stale key, one page of several carrying the wrong snippet, or a
   * misconfiguration since fixed. `newest.sinceMs` is what tells those apart
   * and this standing deliberately does not try to.
   */
  | "mixed"

/** The closed set, in the order a surface reads them: the refusal, then the two quiet states, then the two live ones. */
export const ARRIVAL_STANDINGS: readonly ArrivalStandingName[] =
  everyMemberOf<ArrivalStandingName>()([
    "unasked",
    "silent",
    "turned-away",
    "collecting",
    "mixed",
  ])

/** What is arriving at a deployment, what is being turned away, and what that means together. */
export type ArrivalStanding<TReason extends string = string> = {
  readonly standing: ArrivalStandingName
  /**
   * Revisions anything at all was collected about, which is **not** a count of
   * readers.
   *
   * A revision stands here if the window held one counter, one funnel answer,
   * one door row or one region bucket for it, so a deployment whose senders
   * never mark an opening still reads as collecting — which it is. Reading this
   * off `arrivals` instead would call that deployment `turned-away` and send an
   * operator after a gate that is letting everything through.
   */
  readonly collected: number
  /**
   * Page views counted at the door across every revision read, added.
   *
   * The headcount behind `collected`, carried through unchanged. Nought with a
   * positive `collected` is an ordinary state and its own fault already
   * (`door-unscaled`), not a sign that nothing arrived.
   */
  readonly arrivals: number
  /**
   * Deliveries turned away, added across the reasons, or `null` where nothing
   * offered a count.
   *
   * The two kinds of nothing kept apart (0240): `null` is *nobody counted*, and
   * `0` is *the counter was read and holds none*.
   */
  readonly refused: number | null
  /** The newest delivery turned away, or `null` where none was. */
  readonly newest: NewestTurnedAway<TReason> | null
  /**
   * Tallies beyond the first for one reason, dropped.
   *
   * A store keys its rows by the reason, so this is nought from every store in
   * this repository. It is counted because the one lie a sum can be told is a
   * row handed in twice, and a count that has been added cannot be unadded
   * (0158) — a caller that concatenated two reads would otherwise publish twice
   * the refusals with nothing saying so.
   */
  readonly duplicated: number
}

type Kept<TReason extends string> = {
  readonly kept: readonly TurnedAwayTally<TReason>[]
  readonly duplicated: number
}

/** The first tally per reason, and how many were dropped. */
const firstPerReason = <TReason extends string>(
  tallies: readonly TurnedAwayTally<TReason>[]
): Kept<TReason> => {
  const seen = new Set<TReason>()
  const kept: TurnedAwayTally<TReason>[] = []
  let duplicated = 0

  for (const tally of tallies) {
    if (seen.has(tally.reason)) {
      duplicated += 1
      continue
    }

    seen.add(tally.reason)
    kept.push(tally)
  }

  return { kept, duplicated }
}

/**
 * The newest tally reporting a positive count, or `null` where none does.
 *
 * A reason with a nought is a row that says nothing was turned away for it, so
 * it cannot be the newest thing that was. Ties keep the earlier of the two, so
 * two reasons counted at one instant do not reorder on a refresh.
 */
const newestOf = <TReason extends string>(
  kept: readonly TurnedAwayTally<TReason>[],
  at: number | undefined
): NewestTurnedAway<TReason> | null => {
  let newest: TurnedAwayTally<TReason> | null = null

  for (const tally of kept) {
    if (tally.refused <= 0) continue
    if (newest === null || tally.lastAt > newest.lastAt) newest = tally
  }

  if (newest === null) return null

  return {
    reason: newest.reason,
    origin: newest.lastOrigin,
    atMs: newest.lastAt,
    sinceMs: at === undefined ? null : at - newest.lastAt,
  }
}

/**
 * Read a window's health and a door's refusals together, into the one question
 * neither can answer alone.
 *
 * The health is taken as the `Pick` a reading of the window already produced
 * rather than as two loose numbers, so what is judged here is what that reading
 * published, by construction rather than by a reviewer — the shape
 * {@link retentionPromiseOf} takes the retention in (0321). The two fields are
 * the two it needs and the two a caller could most plausibly get wrong by hand:
 * a view floor is not an arrival count (0212), and a count of readers is not a
 * count of pages.
 *
 * **A delivery was turned away if any reason reports a positive count**, which
 * is the one rule the standing turns on, and it is the same rule `newest` is
 * found by — so a standing that names a refusal always carries the refusal it
 * named.
 *
 * **The instant is optional and nothing here reads a clock.** A caller that
 * states one gets `sinceMs` and can tell a live fault from a fixed one; a
 * caller that does not gets every other figure and no age, which is the shape a
 * collection schedule already takes (0274). A reading that read the wall clock
 * would answer differently on two calls over one set of rows.
 */
export const arrivalStandingOf = <TReason extends string>(
  health: Pick<CollectionHealth, "pages" | "arrivals">,
  turnedAway: readonly TurnedAwayTally<TReason>[] | undefined,
  at?: number
): ArrivalStanding<TReason> => {
  const collected = health.pages.length

  if (turnedAway === undefined) {
    return {
      standing: "unasked",
      collected,
      arrivals: health.arrivals,
      refused: null,
      newest: null,
      duplicated: 0,
    }
  }

  const { kept, duplicated } = firstPerReason(turnedAway)
  const newest = newestOf(kept, at)
  const refused = kept.reduce((sum, tally) => sum + tally.refused, 0)

  const standing: ArrivalStandingName =
    collected > 0
      ? newest === null
        ? "collecting"
        : "mixed"
      : newest === null
        ? "silent"
        : "turned-away"

  return { standing, collected, arrivals: health.arrivals, refused, newest, duplicated }
}

const versions = (collected: number): string =>
  collected === 1 ? "1 version of 1 page" : `${collected} versions`

/** The count and its verb together, because one page view *was* and two *were*. */
const readers = (arrivals: number): string =>
  arrivals === 1 ? "1 page view was" : `${arrivals} page views were`

const deliveries = (refused: number): string =>
  refused === 1 ? "1 delivery was" : `${refused} deliveries were`

/** Where the newest refusal came from, named so that `null` is a sentence rather than a blank. */
const from = (newest: NewestTurnedAway): string =>
  newest.origin === null
    ? `the latest of them ${newest.reason} and naming no site`
    : `the latest of them ${newest.reason}, from ${newest.origin}`

/**
 * One line for the operator setting a deployment up, because they are the only
 * person who can close the gap.
 *
 * It names the reason as the deployment spelled it and never translates one: a
 * host's own set is the host's to put a sentence and a remedy to, and a
 * framework that worded them would be wording a vocabulary it does not define.
 */
export const describeArrivalStanding = (standing: ArrivalStanding): string => {
  switch (standing.standing) {
    case "unasked":
      return (
        "nothing counted what this door turned away, so a deployment nobody is posting to " +
        "cannot be told from one whose deliveries are being refused"
      )
    case "silent":
      return (
        "nothing has been collected and nothing has been turned away, " +
        "so no page is posting to this deployment at all"
      )
    case "turned-away":
      return (
        `nothing has been collected and ${deliveries(standing.refused ?? 0)} turned away, ` +
        `${standing.newest === null ? "with no reason given" : from(standing.newest)}: ` +
        "a page is posting and this door is refusing it"
      )
    case "collecting":
      return (
        `${readers(standing.arrivals)} counted at the door across ${versions(standing.collected)}, ` +
        "and nothing has been turned away"
      )
    case "mixed":
      return (
        `${readers(standing.arrivals)} counted at the door across ${versions(standing.collected)}, ` +
        `and ${deliveries(standing.refused ?? 0)} turned away, ` +
        `${standing.newest === null ? "with no reason given" : from(standing.newest)}`
      )
  }
}
