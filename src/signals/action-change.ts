import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveRole } from "../role.js"
import type { PrimitiveType } from "../primitive-type.js"

import { pageActionOf, type ActionStanding, type PageAction, type PartAction } from "./action.js"
import type { PageReading } from "./parts.js"

/**
 * What a change made readers *do*, rather than what it made them see.
 *
 * Four comparisons of two windows exist in this subsystem and every one of them
 * is about attention: [`change.ts`](change.ts) asks what a change did to where
 * reading stops, [`copy-change.ts`](copy-change.ts) to how many of the page's
 * words get reached, [`pace-change.ts`](pace-change.ts) to whether readers had
 * time for them, [`readership.ts`](readership.ts) to who the readers were.
 * [`action.ts`](action.ts) answers *four in ten readers who got to the pricing
 * band did something in it* — of **one window of one revision**, and nothing
 * held two of those against each other.
 *
 * So the sentence a change to a band nobody uses is made for — *the band readers
 * reached and touched nothing is used now* — had no answer, and it is the
 * sentence closest to the commercial half of the premise: a deployment that can
 * see which of its asks a change got answered has a reason to open the portal
 * the morning after it ships one.
 *
 * It is taken out of what this subsystem already knows rather than collected:
 * **nothing is added to a payload, a browser, a column, a store or the
 * vocabulary**, and the broadcaster is not touched, so its weight is unchanged.
 *
 * ## The attribution `pace-change.ts` publishes is not available here
 *
 * A pace is `spentMs ÷ needMs`, and 0244 separates the readers from the change
 * with a counterfactual: the later window's time against the **earlier**
 * revision's words isolates the readers, and the other diagonal isolates the
 * change. That works because one side of the division is **exact and
 * reader-free** — the words a revision says are a property of the tree, costed
 * identically in any window — so one term can be held still while the other
 * moves.
 *
 * **A share of readers who acted has readers on both sides of the division.**
 * `within ÷ reached` is two distinct page view counts off one row, so there is
 * no reader-free term to hold still and no counterfactual to run. A share can
 * rise because more readers acted or because fewer readers reached it, and those
 * are opposite findings — the second is a page that got worse at carrying
 * readers to a band, with the keener ones left behind — and nothing available
 * here tells them apart.
 *
 * The figure anybody would reach for instead is the obvious one and it is worse
 * than nothing: `now.within ÷ was.within` beside `now.reached ÷ was.reached`.
 * Both counts are generous by their own window's straddle (0147), and the
 * inflation does not divide out of a ratio whose two terms are in **different**
 * windows — a rollup window a deployment shortened moves both of those ratios
 * and moves no reader. That is the fact a deployment-wide order had to be
 * scaled at the door for (0250), one level across, and it is why the only ratio
 * published here is one whose two terms each have their window's straddle
 * already divided out of them.
 *
 * So `shareRatio` is published and **no ratio of two windows' counts is**. The
 * counts travel as the weight behind the share and never as a movement, which is
 * how a readership comparison carries its two arrival totals and refuses the
 * growth between them (0247).
 *
 * ## A share that appears where there was none can be a filing rule
 *
 * `engaged` counts the views whose reader did something *strictly inside* a node
 * (0167), so it is structurally nought on a part with no element children and
 * 0242 withholds the share rather than printing a nought. That is a fact about
 * the **tree**, and a change is free to move it: wrap a button in a band and the
 * band has an inside, so a share exists where one was withheld; unwrap it and
 * the share disappears.
 *
 * Neither is readers doing anything differently, and the first reads exactly
 * like the thing this module is for. {@link ComparedAction.inside} says so on
 * every compared part, and `gained` is the member to look at hardest.
 *
 * **The movement vocabulary turns out to be immune to it and the share is not**,
 * which is worth knowing because it says where to put the warning. `taken-up`
 * requires the earlier side to be `untouched`, which requires it to have borne
 * parts then — so a part that gained an inside **cannot** be reported as taken
 * up, by construction rather than by a guard. What it can do is carry a share
 * where the earlier side withheld one, and that is why `shareRatio` is `null`
 * across every `gained` and every `lost`: the ratio exists only where both sides
 * measured the same thing, which is `kept`. Both are properties of the code
 * rather than claims about it, and both are pinned by tests.
 *
 * ## What survives a sender that does not walk, and what does not
 *
 * {@link ActionChangeSilence} `unwalked` is the one state to refuse to draw, and
 * the division it makes is worth having rather than treating as a blanket:
 *
 * - **The shares are poisoned.** A window whose delegated signals carry no
 *   `within` credits nobody with acting inside anything, so every band in it
 *   reads `untouched` with the counters looking healthy — and a comparison
 *   between a walked window and an unwalked one reports the whole page as
 *   abandoned, which is the most alarming sentence this module can print and is
 *   about a configuration change.
 * - **The occurrences are not.** `activations`, `opens`, `closes` and
 *   `completions` are filed against the part they happened to and need no walk
 *   at all, so {@link ComparedAction.usesRatio} and the four counts on either
 *   side stand in full.
 *
 * It is reported as one silence over the reading rather than part by part,
 * because the fault is a property of the window and not of any part: deciding
 * part by part would mean a second rule for a standing `pageActionOf` has
 * already published, and two spellings of one rule is the fault this subsystem
 * has been bitten by twice (0218, 0235).
 *
 * Pure, linear in the parts of the two readings, and reaches no store, clock or
 * DOM, so it adds nothing to the broadcaster's import graph.
 */

/** Why a comparison of what readers did answered nothing. */
export type ActionChangeSilence =
  /**
   * The two readings are of different trees.
   *
   * Spelled as `ChangeSilence`, `CopyChangeSilence` and `PaceChangeSilence`
   * spell it, because a surface drawing four comparisons of one change should
   * not meet four names for one state (0240).
   */
  | "different-trees"
  /**
   * One of the two windows holds uses and credits no reader with acting inside
   * anything.
   *
   * `PageAction.unwalked` on either side: a sender whose delegated signals carry
   * no `within` (0167), a server synthesising batches, a fixture replayed. Every
   * share on that side is a nought that is a filing artefact, so every movement
   * across it is spurious and the page reads as abandoned.
   *
   * **The occurrence figures still stand**, because a press is filed against the
   * part it happened to and needs no ancestry. Which side it is, is on that
   * side's own reading, as `nothing-measured` leaves which window was empty to
   * the pair of readings rather than naming it here.
   *
   * Checked before `nothing-measured`, which it cannot ordinarily coincide with:
   * a window with no page views holds no uses either. A row carrying occurrences
   * with no views is a sender that is not one, and this is the sharper of the two
   * things to say about it.
   */
  | "unwalked"
  /**
   * One of the two windows held no page views.
   *
   * Every standing on that side is `unknown` (0242), so there is no share to
   * compare. **The tree half still answers**: which parts the change added and
   * removed, and which of them gained or lost an inside, are facts about the two
   * revisions — and *the change added a band and nothing has been measured
   * since* is true and worth saying.
   */
  | "nothing-measured"
  /**
   * No part the two revisions share says anything on either side.
   *
   * The state `CopyChangeSilence.dissolved` reports of words and
   * `PaceChangeSilence.dissolved` of parts: a page that carries no part carries
   * no action either (0240). The census of what was added and removed answers in
   * full and is the whole of what can be said.
   */
  | "dissolved"

/** The closed set, for a surface that has to account for every absent figure. */
export const ACTION_CHANGE_SILENCES: readonly ActionChangeSilence[] =
  everyMemberOf<ActionChangeSilence>()([
    "different-trees",
    "unwalked",
    "nothing-measured",
    "dissolved",
  ])

/** One line per silence, for a surface saying why a figure is not there. */
export const describeActionChangeSilence = (silence: ActionChangeSilence): string => {
  switch (silence) {
    case "different-trees":
      return "the two readings are of different pages"
    case "unwalked":
      return "one of the two windows does not report where actions happened, so its shares are noughts"
    case "nothing-measured":
      return "one of the two windows held no page views"
    case "dissolved":
      return "no part the two revisions share has anything to say on either side"
  }
}

/**
 * What happened to the verdict on one part between two windows.
 *
 * Five states out of three standings either side, and not nine, because
 * `unknown` is *nothing can be said* rather than a third verdict (0242): a part
 * it is true of on either side has not moved, it has gone unmeasured, and
 * collapsing the five combinations it appears in into one member is what keeps
 * the other four claims.
 *
 * Named for a movement rather than for an improvement. A standing is about the
 * readers of its own window, so a part can be taken up because a change made
 * its ask worth answering, because it acquired an inside for actions to be
 * filed against ({@link ComparedAction.inside}), or because a quieter window
 * held a different set of readers — and nothing here separates the third.
 */
export type ActionMovement =
  /**
   * Readers reached it and did nothing in it, and now they do something — the
   * sentence a change to a band nobody uses is made for.
   *
   * **It cannot be the shape change in disguise.** `untouched` on the earlier
   * side requires that side to have borne element parts, so a part the change
   * gave an inside to is never reported here — the one combination to read
   * {@link ComparedAction.inside} for is `lost`, which is a band whose children
   * the change removed and which now reports presses of its own.
   */
  | "taken-up"
  /** Readers did something in it and now they reach it and do nothing. */
  | "abandoned"
  /**
   * Reached and untouched before, reached and untouched now — the asks a change
   * did not fix.
   *
   * Kept apart from `held` because both are *the standing did not move* and they
   * are opposite findings about a page, which is how a pace comparison keeps
   * `still-skimmed` from `held` (0244).
   */
  | "still-untouched"
  /** Readers did something in it before and after. */
  | "held"
  /**
   * One of the two windows cannot say whether readers acted on it.
   *
   * No row named it, its `reached` is nought while the window held views — the
   * unanchorable case (0221) — or it is a leaf on that side, whose nought is a
   * filing rule and not a measurement (0242). Which it is, is on that side's own
   * standing, and {@link ComparedAction.inside} answers the last of the three
   * outright.
   *
   * **A control whose presses began is in here**, and that is the §6 thinness in
   * a third place rather than a choice made here: a leaf with no uses is
   * `unknown` because nothing in the tree says whether it could be pressed —
   * `role` declares one member and it is not *a control* (0238) — so the earlier
   * side has no verdict to move from. The two sides' `uses` travel on the rows,
   * and the day a primitive can declare what it can report, every counter
   * already stored reinterprets (0212).
   */
  | "unknown"

/** The closed set, for a surface accounting for every part it was handed. */
export const ACTION_MOVEMENTS: readonly ActionMovement[] = everyMemberOf<ActionMovement>()([
  "taken-up",
  "abandoned",
  "still-untouched",
  "held",
  "unknown",
])

/** One line per movement, for a surface putting a part in front of a person. */
export const describeActionMovement = (movement: ActionMovement): string => {
  switch (movement) {
    case "taken-up":
      return "readers reached this part and did nothing in it, and now they do something"
    case "abandoned":
      return "readers did something in this part, and now they reach it and do nothing"
    case "still-untouched":
      return "readers reached this part and did nothing in it, before and after"
    case "held":
      return "readers did something in this part, before and after"
    case "unknown":
      return "one of the two windows cannot say whether readers acted on this part"
  }
}

/**
 * What the change did to whether a part has an inside for actions to be filed
 * against.
 *
 * A fact about the two **trees** and not about any window, and the one movement
 * here that can be stated on a page nobody has read. It exists because
 * `PartAction.share` is withheld on a part with no element children — `engaged`
 * counts readers who acted *strictly inside* a node, so a leaf's nought is a
 * filing rule (0167, 0242) — and whether a part is a leaf is something a change
 * may alter.
 */
export type InsideMovement =
  /** It bore element parts in both revisions, so its share means the same thing on both sides. */
  | "kept"
  /**
   * It was a leaf and now bears element parts, so it has a share where its share
   * was withheld.
   *
   * **The one that reads like success and is not.** A button a change wrapped in
   * a band reports a share from the moment it has an inside, and the share it
   * had before was not a nought — it was not a measurement at all.
   *
   * The movement cannot be fooled by it: `taken-up` needs the earlier side to
   * have borne parts, so it is unreachable here. The **share** can be, which is
   * why {@link ComparedAction.shareRatio} is `null` on every part whose inside
   * moved, and why a surface drawing a bare `now.share` beside an absent
   * `was.share` needs this member to say what the absence was.
   */
  | "gained"
  /** It bore element parts and is now a leaf, so a share that was a measurement is withheld. */
  | "lost"
  /** A leaf in both revisions: its share is withheld on both sides and its standing is `unknown` on both. */
  | "none"

/** The closed set, for a surface accounting for every compared part. */
export const INSIDE_MOVEMENTS: readonly InsideMovement[] = everyMemberOf<InsideMovement>()([
  "kept",
  "gained",
  "lost",
  "none",
])

/** One line per movement, for a surface saying what the change did to a part's shape. */
export const describeInsideMovement = (movement: InsideMovement): string => {
  switch (movement) {
    case "kept":
      return "it held parts under it before and after, so its share means the same on both sides"
    case "gained":
      return "the change gave it parts under it, so it has a share where none could be measured"
    case "lost":
      return "the change left it with no parts under it, so its share is no longer measurable"
    case "none":
      return "it held no parts under it before or after, so neither window could measure a share"
  }
}

/**
 * One part both revisions have, as two windows read what readers did with it.
 *
 * Matched by node, which is what makes the comparison about the part rather than
 * about its position: a part a change moved is compared like any other, as
 * 0239 compares a passage the change moved and unlike the pair a change
 * dissolves (0224), because a pair is a position by construction and a part is
 * not.
 */
export type ComparedAction = {
  readonly nodeId: NodeId
  /** The later revision's type, which is the page somebody is looking at. */
  readonly type: PrimitiveType
  /** The later revision's role (0114), or `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  /** The whole of what the earlier window said about it. */
  readonly was: PartAction
  /** The whole of what the later window said about it. */
  readonly now: PartAction
  readonly movement: ActionMovement
  /** What the change did to whether a share of this part is measurable at all. */
  readonly inside: InsideMovement
  /**
   * `now.share ÷ was.share`, and `null` where either side withheld a share or
   * the earlier one is nought.
   *
   * **The one ratio here that is sound across two windows.** Each side's share
   * is two distinct view counts off one row, so each window's straddle (0147)
   * has very nearly divided out before the two sides meet — the cancellation a
   * fall between two siblings rests on (0221), and the reason a ratio of the
   * counts themselves is refused by this module and not published anywhere on
   * this type.
   *
   * Nought on the earlier side is `null` rather than infinity: *nobody acted
   * here and now somebody does* is {@link movement}'s answer, and a ratio is a
   * figure a surface divides and ranks by.
   *
   * It is **non-null only where {@link inside} is `kept`**, which falls out of
   * the two sides' shares being withheld on a leaf and is not a separate rule: a
   * ratio across a part whose shape changed would be a ratio of two different
   * measurements.
   */
  readonly shareRatio: number | null
  /**
   * `now.usesPerReader ÷ was.usesPerReader`, and `null` where either side used
   * nothing or reached nobody.
   *
   * Occurrences per reader on each side, so each term has its own window's
   * straddle divided out of it and the ratio stands. **An intensity and not a
   * rate** on both sides (0242), so this is how much more each reader used a
   * part and never how many more readers did.
   *
   * The one figure here that survives `unwalked`, because the four occurrence
   * counters are filed against the part a reader used and need no ancestry.
   */
  readonly usesRatio: number | null
}

/**
 * What a change did to what readers do on a page.
 *
 * The two {@link PageAction}s it is made of are returned, so nothing downstream
 * derives them twice and every whole-page figure either side — the root's
 * headcount, `leaves`, `unwalked` — is one field away without a second join.
 */
export type ActionChange = {
  /** The earlier reading's tree. The two agree unless `silence` is `different-trees`. */
  readonly treeId: TreeId
  readonly revisions: { readonly was: number; readonly now: number }
  /** The two readings of what readers did that this comparison is made of. */
  readonly readings: { readonly was: PageAction; readonly now: PageAction }
  /**
   * Every part both revisions have that a row named on either side, in the
   * **later** reading order.
   *
   * The later order because that is the page somebody is looking at. A part no
   * row named on either side is left out: nothing in either window reported it,
   * so a row for it could only ever read `unknown` and would make
   * {@link movements} a count of parts nobody measured. {@link insides} is
   * therefore a census of the compared parts and not of the tree.
   */
  readonly compared: readonly ComparedAction[]
  /**
   * Parts only the later revision has, as the later window read them, in its
   * reading order.
   *
   * A census with readers in it rather than an exact one, unlike the census of
   * the words a change wrote (0239): a part that did not exist before has to be
   * reached now for anything to be said about it. *The change added an ask and
   * nobody has opened it* is the row worth looking at.
   */
  readonly added: readonly PartAction[]
  /** Parts only the earlier revision had, as the earlier window read them, in its reading order. */
  readonly removed: readonly PartAction[]
  /** Compared parts by what happened to the standing. The five add to {@link compared}'s length. */
  readonly movements: Readonly<Record<ActionMovement, number>>
  /** Compared parts by what the change did to their shape. The four add to {@link compared}'s length. */
  readonly insides: Readonly<Record<InsideMovement, number>>
  /**
   * The root, compared against itself across the two revisions.
   *
   * *Three in ten readers did something on this page and now four in ten do* —
   * the page's one headcount figure, and a row rather than an addition: every
   * action is strictly inside the root, so summing `within` across parts would
   * charge one reader once per level they acted inside (0147, 0167). That is why
   * there is **no page-level total of readers who acted** here or anywhere, and
   * this stands in for one.
   *
   * Kept out of the rankings below, because its subtree is every part it would
   * outrank — the rule a pace comparison and a fall between two siblings both
   * follow (0221, 0230).
   *
   * `null` where either revision's root is not an element, or where no row named
   * it on either side.
   */
  readonly whole: ComparedAction | null
  /**
   * The ask the change got answered: `taken-up`, most readers reached it in the
   * later window, then first in the later reading order.
   *
   * **By headcount at the volume the page has now**, rather than by the share or
   * by its movement, which is the ranking rule this subsystem spells once (0221,
   * 0224): a caption two readers out of three now use is a better ratio and a
   * smaller gain than a band four hundred of them do. The headcount is the later
   * window's own `reached`, which is a count inside one window and so is not the
   * cross-window ratio this module refuses.
   *
   * `null` where nothing was taken up.
   */
  readonly mostTakenUp: ComparedAction | null
  /** The ask the change lost, on the same terms. */
  readonly mostAbandoned: ComparedAction | null
  /**
   * The parts readers reached and did nothing in, before and after — most
   * reached now first, then in the later reading order.
   *
   * The list a person can act on without reading anything else, and the one
   * ranking here about where a change did **not** land. The root is left out as
   * it is left out of every ranking here; {@link whole} carries it.
   * `still-untouched` only: a part whose standing is `unknown` on either side is
   * in {@link movements} where it can be seen and not acted on, because putting
   * it here would turn *nothing can be said* into *readers are ignoring this*.
   */
  readonly stillUntouched: readonly ComparedAction[]
  /** Why there is no comparison of the reading, or `null` where there is one. */
  readonly silence: ActionChangeSilence | null
}

const ZERO_BY_MOVEMENT: Readonly<Record<ActionMovement, number>> = Object.freeze({
  "taken-up": 0,
  abandoned: 0,
  "still-untouched": 0,
  held: 0,
  unknown: 0,
})

const ZERO_BY_INSIDE: Readonly<Record<InsideMovement, number>> = Object.freeze({
  kept: 0,
  gained: 0,
  lost: 0,
  none: 0,
})

/**
 * Whether a window reported anything at all about a part.
 *
 * `reached` is `undefined` exactly where no row named it (0242), which is the
 * one thing that separates *nothing happened here* from *nothing was reported
 * here* and is what keeps a page of spacers out of the movement counts.
 */
const saysAnything = (part: PartAction): boolean => part.reached !== undefined

/**
 * What happened to a standing, where `unknown` on either side collapses the
 * five combinations it appears in into one member.
 */
const movementOf = (was: ActionStanding, now: ActionStanding): ActionMovement => {
  if (was === "unknown" || now === "unknown") return "unknown"
  if (was === "acted") return now === "acted" ? "held" : "abandoned"

  return now === "acted" ? "taken-up" : "still-untouched"
}

/** What the change did to whether a share of a part is measurable. */
const insideOf = (was: boolean, now: boolean): InsideMovement => {
  if (was && now) return "kept"
  if (now) return "gained"

  return was ? "lost" : "none"
}

/**
 * A ratio of two figures from the two sides, or `null` where there is none.
 *
 * `pace-change.ts`'s rule, applied to the two figures here whose terms each have
 * their own window's straddle divided out of them. Nought on the earlier side is
 * `null` rather than infinity, for the reason the field documentation gives.
 */
const ratioOf = (was: number | undefined, now: number | undefined): number | null =>
  was === undefined || now === undefined || was === 0 ? null : now / was

/** Every part of a reading of what readers did, keyed by node. */
const partsOf = (page: PageAction): ReadonlyMap<NodeId, PartAction> => {
  const byNode = new Map<NodeId, PartAction>()

  for (const part of page.parts) byNode.set(part.nodeId, part)

  return byNode
}

/** The readers the later window credits a part with, which is the ranking key. */
const reachedNow = (part: ComparedAction): number => part.now.reached ?? 0

/**
 * The one more readers reached now, `>` keeping the first in the later reading
 * order on a tie.
 */
const moreOf = (standing: ComparedAction | null, next: ComparedAction): ComparedAction =>
  standing === null || reachedNow(next) > reachedNow(standing) ? next : standing

/** Descending by the readers the later window reached, strictly, so equals keep their order. */
const byReachedNow = (one: ComparedAction, other: ComparedAction): number =>
  reachedNow(other) - reachedNow(one)

/**
 * Why a comparison answers nothing, in the order that reaches the sharpest
 * diagnosis first.
 *
 * `unwalked` before `nothing-measured`: the two cannot ordinarily coincide, and
 * where a malformed row makes them, *this window does not report where actions
 * happened* is the thing worth printing.
 */
const silenceOf = (
  readings: { readonly was: PageAction; readonly now: PageAction },
  compared: readonly ComparedAction[]
): ActionChangeSilence | null => {
  if (readings.was.unwalked || readings.now.unwalked) return "unwalked"
  if (readings.was.views === 0 || readings.now.views === 0) return "nothing-measured"

  return compared.length === 0 ? "dissolved" : null
}

/**
 * What a change did to what readers do on a page, off two `PageReading`s and
 * nothing else.
 *
 * Handed two readings rather than two finished `PageAction`s, for the reason
 * `copyChangeOf` and `paceChangeOf` are: one input per side cannot be a
 * mismatched pair, and the two readings it derives are returned so nothing
 * downstream pays for them twice.
 *
 * The labels `was` and `now` are the caller's. Nothing here checks which reading
 * is older, so a caller holding them backwards gets a comparison with every
 * movement reversed rather than a refusal — the bargain 0224 struck, for its
 * reason: *this week against last week* is the same question with the tree held
 * still, and refusing one order would refuse that too.
 */
export const actionChangeOf = (was: PageReading, now: PageReading): ActionChange => {
  const readings = { was: pageActionOf(was), now: pageActionOf(now) }

  const head = {
    treeId: was.treeId,
    revisions: { was: was.revision, now: now.revision },
    readings,
  }

  if (was.treeId !== now.treeId) {
    return {
      ...head,
      compared: [],
      added: [],
      removed: [],
      movements: ZERO_BY_MOVEMENT,
      insides: ZERO_BY_INSIDE,
      whole: null,
      mostTakenUp: null,
      mostAbandoned: null,
      stillUntouched: [],
      silence: "different-trees",
    }
  }

  const earlier = partsOf(readings.was)
  const later = partsOf(readings.now)

  const compared: ComparedAction[] = []
  const added: PartAction[] = []
  const removed: PartAction[] = []

  for (const [nodeId, part] of later) {
    const before = earlier.get(nodeId)

    if (before === undefined) {
      if (saysAnything(part)) added.push(part)
      continue
    }

    if (!saysAnything(before) && !saysAnything(part)) continue

    compared.push({
      nodeId,
      type: part.type,
      role: part.role,
      was: before,
      now: part,
      movement: movementOf(before.standing, part.standing),
      inside: insideOf(before.bearsParts, part.bearsParts),
      shareRatio: ratioOf(before.share, part.share),
      usesRatio: ratioOf(before.usesPerReader, part.usesPerReader),
    })
  }

  for (const [nodeId, part] of earlier) {
    if (later.has(nodeId)) continue
    if (saysAnything(part)) removed.push(part)
  }

  const movements = compared.reduce<Record<ActionMovement, number>>(
    (counted, part) => ({ ...counted, [part.movement]: counted[part.movement] + 1 }),
    { ...ZERO_BY_MOVEMENT }
  )

  const insides = compared.reduce<Record<InsideMovement, number>>(
    (counted, part) => ({ ...counted, [part.inside]: counted[part.inside] + 1 }),
    { ...ZERO_BY_INSIDE }
  )

  const whole = compared.find((part) => part.was.depth === 0 && part.now.depth === 0) ?? null

  const ranked = (movement: ActionMovement): ComparedAction | null =>
    compared.reduce<ComparedAction | null>(
      (standing, next) =>
        next.movement === movement && next !== whole ? moreOf(standing, next) : standing,
      null
    )

  return {
    ...head,
    compared,
    added,
    removed,
    movements,
    insides,
    whole,
    mostTakenUp: ranked("taken-up"),
    mostAbandoned: ranked("abandoned"),
    stillUntouched: compared
      .filter((part) => part.movement === "still-untouched" && part !== whole)
      .sort(byReachedNow),
    silence: silenceOf(readings, compared),
  }
}
