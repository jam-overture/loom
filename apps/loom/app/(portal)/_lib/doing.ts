import type { NodeId, PrimitiveType, TreeId } from "@jam-overture/loom"
import type { ActionStanding, PageAction, PartAction } from "@jam-overture/loom/signals"

import {
  readersAt,
  readersBehind,
  readersCount,
  readersOutOf,
  type PageArrivals,
} from "./arrivals"
import { nounOf, type PartName } from "./part-name"
import { outOfReaders, outOfVisits } from "./reading-view"
import type { PlainLine } from "./vocabulary"

/**
 * What readers *did* on a page, rather than what they saw.
 *
 * ## The two numbers this card had for one fact, and why one of them is gone
 *
 * This screen has been able to say *twelve of the forty visits did something on
 * this page* since the region counter was read, and it said it off a reading
 * this lane computed for itself: the largest `engaged` any part of the revision
 * reported, divided by the largest view count any single row of the window
 * reported. Both halves of that were approximations of something the framework
 * now answers exactly, and the second half was the floor every figure on this
 * card was divided by until `arrivals.ts` replaced it.
 *
 * `pageActionOf`
 * ([0242](../../../../../../decisions/0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md))
 * is the exact version: the **root's** own row rather than a maximum over
 * rows, and the root's own reach rather than a page-wide floor. So this module
 * replaces the local reading instead of sitting beside it, and that is the
 * whole reason it is a replacement — *a lane adding a better figure beside a
 * worse one ships both unless something makes it choose*, filed by this lane on
 * 7 October after a photograph caught one card printing *96 of the 384 visits*
 * and *about 80 of the 320 readers* about the same part, three lines apart.
 *
 * ## What is new, and it is the sentence worth opening the portal for
 *
 * **The part readers reach and never touch.** Nothing on this screen could say
 * it: every usage figure here was a presence — what *was* clicked, what *was*
 * opened, which region saw the most of it — and a band readers scroll past
 * without pressing anything appeared on the card as a part with time on screen
 * and three zeroes beside it, indistinguishable from the heading above it,
 * which nobody could have pressed either.
 *
 * `ActionStanding` is what tells those apart, and it needed a structural fact
 * the counters do not carry: a press is filed against the control and credited
 * to the regions it happened *inside* (0167), so a part with no element parts
 * under it reports `engaged: 0` for ever whether or not anybody used it. A
 * share built from that nought is a filing rule misread as a finding about
 * readers. So the claim is made of **regions** and withheld of leaves, and
 * `untouched` is said of nothing else.
 *
 * That makes *readers get to this band and do nothing in it* the second thing
 * on this surface a proposal could be written from — where reading stops (0221)
 * was the first.
 *
 * ## What is measured in people and what is measured in occurrences
 *
 * Two kinds of number, and conflating them is the one way this section can be
 * wrong and look right:
 *
 * - **Readers.** {@link DoingPart.share} is `within ÷ reached` — two distinct
 *   view counts off one row, so the straddle over-count (0147) is on both sides
 *   of the division and very nearly cancels. Applied back to the exact arrivals
 *   it is *about 95 of the 320 readers*, which is the figure a sentence says.
 * - **Occurrences.** Presses, openings, closings and submissions. A reader who
 *   presses twice is two of them and one person, so {@link DoingPart.uses} is
 *   never a headcount and {@link DoingPart.usesPerReader} is labelled *per
 *   reader* and never `%`. Above 1 it says each reader used the part more than
 *   once, which is a real reading and not an error.
 *
 * ## The one state to refuse to draw
 *
 * {@link PageDoing.unwalked} — the page holds occurrences and credits a reader
 * inside nothing. Every share is then a nought, every region reads untouched,
 * and the counters look perfectly healthy: it is `unopened`'s equivalent one
 * counter across, and the fault is in the sending rather than on the page. The
 * surface says *this deployment's pages are not reporting where actions
 * happened* and draws no share at all, which is what the local reading it
 * replaces did under the name `unplacedUse` — kept, widened to submissions,
 * and now decided by the framework rather than by a predicate here.
 *
 * It takes nothing and proposes nothing (0031).
 */

/** One part of the page, and what readers did with it. */
export type DoingPart = {
  readonly nodeId: NodeId
  readonly name: PartName
  /** The registered type, for the technical record. Never on the surface. */
  readonly type: PrimitiveType
  /** 0 at the top of the page. */
  readonly depth: number
  readonly standing: ActionStanding
  /** Whether it has element parts under it, which is what makes a share a measurement. */
  readonly bearsParts: boolean
  /** Distinct visits that reported it on screen, or `undefined` where no row named it. */
  readonly reached: number | undefined
  /** Distinct visits in which a reader did something strictly inside it. */
  readonly within: number | undefined
  /** `within ÷ reached`, withheld on a leaf and wherever no row names it. */
  readonly share: number | undefined
  /** Presses, openings, closings and submissions filed against this part, added. */
  readonly uses: number
  readonly counts: PartAction["counts"]
  /** `uses ÷ reached`. An intensity, may exceed 1, withheld at no uses. */
  readonly usesPerReader: number | undefined
  /** `closes ÷ opens`. Uncapped: above 1 is a disclosure rendered already open. */
  readonly shutAgain: number | undefined
}

export type PageDoing = {
  readonly treeId: TreeId
  readonly revision: number
  /** The page's view floor, for the fallback sentences. */
  readonly views: number
  /**
   * The root, which is the one page-wide headcount this data supports.
   *
   * Every action anywhere is strictly inside the root and the root is on screen
   * in every visit that drew the page, so its `within` is the distinct visits
   * in which a reader did anything at all — counted once, off one row. There is
   * no addition available: summing `within` across parts charges one reader
   * once per level of the tree they acted inside.
   *
   * `undefined` where the revision's root is not an element.
   */
  readonly anyone: DoingPart | undefined
  /**
   * How many **people** did something anywhere on the page, or `undefined`
   * where the card has no exact denominator to say it against.
   *
   * The root's share applied back to the arrivals, which is sound here and
   * nowhere else on this reading: every action is inside the root and the root
   * is on screen in every visit that drew the page, so its share is a share of
   * the page's whole readership. A part's share is a share of the readers who
   * got to *that part*, and the same multiplication over one of those produces
   * a count of people larger than this one — which is a card contradicting
   * itself four lines apart, and is what the first photograph of this section
   * showed. `arrivals.ts` holds the rule and the gate.
   */
  readonly readers: number | undefined
  /**
   * The region most readers acted inside, below the page as a whole.
   *
   * The root always wins outright, so it is excluded by depth and not by
   * identity. Ranked on the headcount rather than on the share, which is 0221's
   * rule spelled once more: a band two readers in three used is a better ratio
   * and smaller news than one four hundred of them used.
   */
  readonly mostUsed: DoingPart | undefined
  /**
   * The region most readers reached and did nothing in. **The new sentence.**
   *
   * From the framework's own ranking, which excludes the page as a whole for
   * the reason every ranking on this card does: the page contains every part it
   * would outrank.
   */
  readonly mostIgnored: DoingPart | undefined
  /** The part pressed most often. Occurrences, never readers. */
  readonly mostPressed: DoingPart | undefined
  /** The part opened out most often. Occurrences likewise. */
  readonly mostOpened: DoingPart | undefined
  readonly standings: Readonly<Record<ActionStanding, number>>
  /**
   * Parts with nothing under them, whose share is withheld structurally.
   *
   * On the surface as a count, because what is withheld is still reported as a
   * total (0214) — a reader who sees shares on four parts of a forty-part page
   * is owed the sentence that says where the other thirty-six went.
   */
  readonly leaves: number
  /** The page holds occurrences and credits a reader inside nothing. */
  readonly unwalked: boolean
  /** Every part, in reading order, for the record one click down. */
  readonly parts: readonly DoingPart[]
}

/**
 * The reading, from the framework's own and the names the page gives its parts.
 *
 * Handed a `PageAction` rather than a page and a window, for the reason
 * `arrivals.ts`, `stopping.ts` and `pacing.ts` are handed theirs: the join
 * happens once on the screen and every reading comes off the one result. Two
 * joins of the same counters to the same page is how two sections of one card
 * come to disagree about how many visits there were.
 *
 * The arrivals are handed in so that a figure here is in **people** wherever
 * the card's own denominator can carry one, and in visits wherever it cannot —
 * which is the arrangement every other section of this card now has. They are
 * optional because the arrival count is absent on a version gap and this
 * reading is not: what readers did is answerable off the counters alone, and a
 * section that went blank with the denominator would be withholding a true
 * sentence to avoid saying a weaker one.
 */
export const doingOf = (
  action: PageAction,
  names: ReadonlyMap<string, PartName>,
  arrivals?: PageArrivals
): PageDoing => {
  /*
   * Named from the page the reading was joined to, so a part is called what it
   * says rather than what it is. The fallback cannot fire — every part here is
   * an element of that same page — and is written anyway, to the noun in the
   * registered type, which is what every other reading on this card does.
   */
  const named = (part: PartAction): DoingPart => ({
    nodeId: part.nodeId,
    name: names.get(part.nodeId) ?? { name: `the ${nounOf(part.type)}`, nodeId: part.nodeId },
    type: part.type,
    depth: part.depth,
    standing: part.standing,
    bearsParts: part.bearsParts,
    reached: part.reached,
    within: part.within,
    share: part.share,
    uses: part.uses,
    counts: part.counts,
    usesPerReader: part.usesPerReader,
    shutAgain: part.shutAgain,
  })

  const parts = action.parts.map(named)
  const byNodeId = new Map(parts.map((part) => [part.nodeId as string, part]))

  return {
    treeId: action.treeId,
    revision: action.revision,
    views: action.views,
    anyone: action.whole === null ? undefined : byNodeId.get(action.whole.nodeId),
    readers: readersBehind(action.whole?.share, arrivals),
    mostUsed: mostUsed(parts),
    mostIgnored:
      action.mostIgnored === null ? undefined : byNodeId.get(action.mostIgnored.nodeId),
    mostPressed: mostOf(parts, (part) => part.counts.activations),
    mostOpened: mostOf(parts, (part) => part.counts.opens),
    standings: action.standings,
    leaves: action.leaves,
    unwalked: action.unwalked,
    parts,
  }
}

/**
 * The region most readers acted inside, which is never the page itself.
 *
 * Excluded by depth rather than by identity, and the reason is arithmetic
 * rather than taste: every action on the page is inside the root, so the root's
 * headcount is the maximum on every page and naming it would be a sentence that
 * is always true. It is the same exclusion `fewestGotTo` makes at the other end
 * of the same tree.
 *
 * Ties go to the first in reading order, which is the order the parts arrive in.
 */
const mostUsed = (parts: readonly DoingPart[]): DoingPart | undefined => {
  let most: DoingPart | undefined
  let highest = 0

  for (const part of parts) {
    if (part.depth === 0) continue

    const within = part.within ?? 0

    if (within <= highest) continue

    most = part
    highest = within
  }

  return most
}

/**
 * The part with the most of one occurrence counter against it.
 *
 * Occurrences rather than readers, so this ranks events: *this button was
 * pressed nine times* may be one enthusiastic reader, which is why the headcount
 * sentences above it are the ones the section leads with. These two used to be
 * `highlightsOf`'s `mostClicked` and `mostOpened`, computed off the raw rows in
 * `reading-view.ts` and drawn in the card's attention list — moved here so that
 * everything this card says about *doing* is one reading and one section, and a
 * refactor cannot leave half of it behind.
 *
 * Nothing at all is `undefined` rather than a part with nought against it, and
 * the section says *nobody pressed or opened anything* in words.
 */
const mostOf = (
  parts: readonly DoingPart[],
  score: (part: DoingPart) => number
): DoingPart | undefined => {
  let most: DoingPart | undefined
  let highest = 0

  for (const part of parts) {
    if (score(part) <= highest) continue

    most = part
    highest = score(part)
  }

  return most
}

/**
 * How many people did anything at all, in one sentence.
 *
 * ## Three answers, and only one of them is a number
 *
 * - **A headcount**, in people where the card's denominator can carry one and in
 *   visits where it cannot. It is the root's own row either way; what the
 *   arrivals change is the units, never the arithmetic.
 * - **Nobody did anything**, which is a real answer and is said out loud. A
 *   section that vanished on it would leave a reader unable to tell *Loom looked
 *   and nothing happened* from *Loom did not look*, which is the distinction
 *   `StateNotice` exists for.
 * - **Nothing can say**, where the root has no row at all — the first minutes of
 *   a window, or a page whose root reported something other than coming into
 *   view.
 *
 * The word for what a reader did is deliberately a list of ordinary verbs
 * rather than one abstraction. *Engaged* is the counter's name and *interacted*
 * is a word nobody uses about their own afternoon; *pressed something, followed
 * a link, or opened something out* is the three things that are actually being
 * counted, said as a person would say them.
 */
export const didAnything = (doing: PageDoing, arrivals?: PageArrivals): string => {
  const whole = doing.anyone

  if (whole === undefined || whole.within === undefined) {
    return "Nothing has counted whether anybody did anything on this page — no row of this window reports the page itself coming onto a screen, so there is nothing to measure actions against."
  }

  if (whole.within === 0) {
    return `Nobody did anything on this page. ${peopleHere(doing, arrivals)} read it and pressed, followed or opened nothing on it, which is a real answer about a page meant to be read rather than used.`
  }

  const { readers } = doing

  if (readers !== undefined && arrivals !== undefined) {
    return `${capitalised(readersOutOf(readers, arrivals))} who arrived did something on this page — pressed something, followed a link, or opened something out.`
  }

  /*
   * Against the page's own reach rather than against its view floor, because
   * that is what the share this sentence is a reading of divides by. The two
   * are the same number on most pages and the floor is the larger of them
   * wherever they differ, so dividing by the floor would under-report — and a
   * sentence whose denominator is not the one its figure was computed against is
   * the mistake `arrivals.ts` exists to have ended on this card.
   */
  return `${outOfVisits(whole.within, whole.reached ?? doing.views)} that got here did something on this page — pressed something, followed a link, or opened something out.`
}

/**
 * The region that saw the most of it.
 *
 * The half no analytics product can produce, because no analytics product knows
 * a page is made of parts — and the sentence this card has carried since the
 * region counter was first read. What changes is which region it names: the
 * most-used part **below the root**, where it used to be the most-used part
 * distinguishable from a maximum. The denominator is unchanged and is the
 * region's own reach in visits; {@link usedIt} says why it is not in people.
 *
 * `undefined` where nothing below the page as a whole was acted inside, which
 * the sentence above has already accounted for.
 */
export const whereTheyActed = (doing: PageDoing): PlainLine | undefined => {
  const part = doing.mostUsed

  if (part === undefined || part.within === undefined || part.within === 0) return undefined

  return {
    before: "The part of the page that saw the most of that was ",
    subject: part.name,
    after: ` — ${usedIt(part)}.`,
  }
}

/**
 * **The sentence nothing on this screen could say.**
 *
 * A region readers reached in numbers and did nothing inside. Not a part nobody
 * saw, which `_lib/skipped.ts` already has a section for; not a leaf with a
 * structural nought against it, which is every heading on the page. A band
 * people read and never use.
 *
 * It is the one line in this section a person can act on this afternoon, and it
 * is the second thing on this surface a proposal could be written from.
 *
 * `undefined` where nothing is untouched, which is the healthy page and gets its
 * own sentence rather than a blank.
 */
export const whatTheyIgnored = (
  doing: PageDoing,
  arrivals?: PageArrivals
): PlainLine | undefined => {
  const part = doing.mostIgnored

  if (part === undefined) return undefined

  return {
    before: "Readers get to ",
    subject: part.name,
    after: ` and do nothing in it — ${gotToIt(part, arrivals)} got that far, and not one of them pressed, followed or opened anything inside it. It is the part of this page with the most readers and the least to show for them.`,
  }
}

/**
 * Good news, said rather than shown as an absence.
 *
 * Every region of the page that readers reached was acted inside by somebody.
 * It is the answer somebody who came here worried about a dead section wants,
 * and it must not arrive as a missing line.
 *
 * `undefined` where there is something to report instead, and where nothing on
 * the page was acted on at all — a page nobody used has no good news in it and
 * the lead sentence has already said so.
 */
export const nothingWasIgnored = (doing: PageDoing): string | undefined => {
  if (doing.unwalked) return undefined
  if (doing.standings.untouched > 0) return undefined
  if (doing.standings.acted === 0) return undefined

  return "Every part of this page that holds other parts, and that anybody got to, was used by somebody. There is no section here that readers reach and never touch."
}

/**
 * What was pressed and what was opened, in occurrences.
 *
 * Kept as two sentences rather than folded into one, because a press and an
 * opening are two different things a reader wanted: one took them somewhere and
 * the other told them something that was tucked away. Both are counts of events
 * and neither is a count of people, which is why they come after the headcounts
 * rather than before them.
 */
export const mostPressedLine = (doing: PageDoing): PlainLine | undefined => {
  const part = doing.mostPressed

  if (part === undefined) return undefined

  const times = part.counts.activations

  return {
    before: "",
    subject: part.name,
    after: ` was pressed ${times} ${times === 1 ? "time" : "times"} — more than anything else here.`,
  }
}

export const mostOpenedLine = (doing: PageDoing): PlainLine | undefined => {
  const part = doing.mostOpened

  if (part === undefined) return undefined

  const times = part.counts.opens

  return {
    before: "",
    subject: part.name,
    after: ` was opened out ${times} ${times === 1 ? "time" : "times"}. Something people want is tucked away in there.`,
  }
}

/**
 * Nobody pressed or opened anything, which is not the same as nobody doing
 * anything.
 *
 * A reader who followed a link did something and pressed nothing, so this is
 * said about the two occurrence counters and not about the page.
 *
 * `undefined` where either happened, and where the page is `unwalked` — a
 * deployment that is not reporting where actions happened has occurrences it
 * cannot place, and *nobody pressed anything* would be a claim about readers
 * drawn from a fault in the sending.
 */
export const nothingPressed = (doing: PageDoing): string | undefined => {
  if (doing.unwalked) return undefined
  if (doing.mostPressed !== undefined || doing.mostOpened !== undefined) return undefined

  return "Nobody pressed or opened anything out. Readers are looking at this page rather than using it."
}

/**
 * The one state to refuse to draw, in the words of the person who can fix it.
 *
 * The page holds presses, openings and submissions and credits a reader inside
 * nothing. Every share here would be a nought, every region would read as
 * untouched, and the counters look perfectly healthy — so the symptom is *my
 * readers use nothing* and the cause is *nothing told us where any of it
 * happened*. A reader left to guess between those goes looking for a fault in
 * their page that is not there.
 *
 * `undefined` on every healthy page, which is the state this says nothing about.
 */
export const actionsHaveNowhereToGo = (doing: PageDoing): string | undefined => {
  if (!doing.unwalked) return undefined

  const uses = doing.parts.reduce((total, part) => total + part.uses, 0)

  return `${uses} ${uses === 1 ? "press, opening or submission was" : "presses, openings and submissions were"} reported on this page, and not one of them said which part of the page it happened in — so nothing here can tell you where people are using it. That is the pages reporting back, not your readers.`
}

/**
 * Where the withheld shares went, which is most of the page.
 *
 * A reader who meets a share on four parts of a forty-part page is owed the
 * sentence that accounts for the other thirty-six, and the reason is a filing
 * rule rather than anything about their readers: an action is filed against the
 * control and credited to the regions it happened inside, so a part with
 * nothing inside it has a nought that is not a measurement. Reported as a total
 * because what is withheld is still reported (0214).
 *
 * `undefined` where every part of the page holds other parts, which is a page of
 * one part and not much else.
 */
export const whereTheSharesWent = (doing: PageDoing): string | undefined => {
  if (doing.leaves === 0) return undefined

  const { leaves } = doing
  const total = doing.parts.length

  return `${leaves} of this page's ${total} ${total === 1 ? "part" : "parts"} ${leaves === 1 ? "has" : "have"} nothing inside ${leaves === 1 ? "it" : "them"} — a heading, a line of prose, a button — so no share of readers is given for ${leaves === 1 ? "it" : "them"}. An action is counted against the parts it happened inside, and there is no inside to a word.`
}

/**
 * `1 visit` and never `1 visits`, which is the first thing a reader distrusts.
 *
 * The bare count, where `outOfVisits` and `outOfReaders` are the two forms that
 * carry a denominator with them. Three forms rather than one because the
 * population differs and a reader has to be told which: the page's visits, the
 * visits that got to one part, and a count standing on its own.
 */
const visitsCount = (count: number): string => (count === 1 ? "1 visit" : `${count} visits`)

/**
 * How many people were here, in whichever units the card can stand behind.
 *
 * Used only by the sentences that need a denominator in passing. The section
 * that is *about* the denominator is `HowManyWereThere`, one section up, and
 * this never restates its arithmetic.
 */
const peopleHere = (doing: PageDoing, arrivals?: PageArrivals): string =>
  arrivals === undefined || arrivals.silence !== undefined
    ? `The ${visitsCount(doing.anyone?.reached ?? doing.views)} that got here`
    : `The ${readersCount(arrivals.arrived)} who arrived`

/**
 * One region's headcount, and it is **always in visits**.
 *
 * The page-wide figure above it is in people because its share is a share of
 * everybody. This one is not: a region's share is of the readers who got to
 * that region, so applying it to the page's arrivals gives a count of people
 * that can exceed the page's own — which is exactly what the first photograph
 * of this section printed, four lines apart, both numbers out of correct code.
 *
 * The honest people-figure for a region would be its share applied to its own
 * reach in people, which is an estimate standing on an estimate: *about 112 of
 * the about 125 readers who got that far*. Two counts off one row, said as
 * counts, carry the straddle on both sides of the division and say plainly
 * which population they are about — so that is what this says, and the section
 * above it has already told a reader how generous the raw counts are.
 */
const usedIt = (part: DoingPart): string => {
  const { within, reached } = part

  if (within === undefined) return "something in it was used"

  /*
   * `outOfReaders` rather than a sentence written here, and the distinction it
   * draws is the reason: *5 of the 40 visits* and *5 of the 12 visits that got
   * that far* are the same numerator and opposite news. A region's engagement is
   * only ever against the visits that got to **it**, which is what that helper
   * says and the one above it does not.
   *
   * A region credited by what happened under it with no measured reach of its
   * own is a real state rather than a fault, and it is said in words instead of
   * divided by.
   */
  return reached === undefined || reached === 0 || within > reached
    ? `${within} ${within === 1 ? "visit" : "visits"} used something in it, and nothing reported whether it was ever on screen`
    : `${outOfReaders(within, reached)} used something in it`
}

/**
 * The same for a part nobody acted inside, where what is said is its **reach**.
 *
 * Taken from the arrivals reading's own row for this part rather than computed
 * here. Reach in people is a figure this card already draws, in a section whose
 * whole subject is which denominator these figures are against, and working it
 * out a second way here is how two sections of one card come to disagree about
 * the same part. There is one arithmetic for it and it is `pageReachOf`'s.
 */
const gotToIt = (part: DoingPart, arrivals?: PageArrivals): string => {
  const arriving = arrivals?.parts.find((row) => row.nodeId === part.nodeId)
  const inPeople = arriving === undefined ? undefined : readersAt(arriving, arrivals!)

  return inPeople ?? visitsCount(part.reached ?? 0)
}

/** A sentence opens with a capital and `about 95` is how this one begins. */
const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)
