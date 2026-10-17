import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import type { ChangeSilence, ComparedStop, ReadingChange } from "./change.js"
import { formKeyOf, readingKeyOf } from "./audiences.js"
import { pageViewsFor, type RevisionPageViews, type StoredPageViews } from "./page-views.js"

/**
 * Which of a deployment's pages a change helped, and which it hurt.
 *
 * A deployment ships a change and then has forty pages and one question:
 * *where did it land?* Every comparison in this subsystem answers that about
 * **one** page — where its reading stops now, how much of it gets read now,
 * whether its readers had time for it now — and a deployment-wide order existed
 * only for one window at a time, so *which page is worst* could be asked and
 * *which page got worse* could not.
 *
 * This is that order, taken off the comparisons a deployment already holds and
 * nothing else: no payload, no browser change, no counter that does not exist,
 * no column and no byte on any wire. Two windows of readings go in, already
 * compared page by page, and the pages come back in the order somebody should
 * look at them.
 *
 * ## A movement is comparable across two pages only once the door has scaled it
 *
 * A before-and-after reading compares *shares* and never counts, because the
 * counts on either side of a change are two windows of two trees with two sets
 * of readers and nothing divides out
 * ([0224](../../decisions/0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)).
 * The share movement it publishes is sound, and so is the figure it ranks one
 * page's own stops by: the movement times the readers that reached the stop in
 * the later window.
 *
 * **That figure is not comparable with another page's**, and the reason is the
 * one an order over a single window already had to answer
 * ([0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)):
 * a distinct view count is generous by every page view that straddled a rollup
 * window, and the straddle rate is each page's own. A page readers linger on
 * for twenty minutes against a rollup window of five has every count against it
 * inflated roughly fourfold; a page read in ninety seconds does not. The share
 * movement has no straddle in it — both of its sides are ratios off their own
 * rows — and then it is multiplied by a count that does, so the straddle walks
 * straight back into the ranking key at the last step.
 *
 * So the key here is that figure put **on the scale the door counts in**:
 * `readers ÷ (1 + inflation)`, where the inflation is the later window's own
 * `drift ÷ opened` off that revision's own door row, picked out with the rule
 * published beside the counter rather than written again
 * ([0219](../../decisions/0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).
 * What comes out is not a count of people and is deliberately not rounded into
 * one.
 *
 * **Only the later window's door is asked for, and that is not an omission.**
 * The figure being scaled is the later window's own — a share movement at the
 * volume the page has *now* — so the earlier window's row would be scaling a
 * number it is not the denominator of. A caller holding both windows hands over
 * the later one.
 *
 * ## A page has no net movement, so there are two orders and not one
 *
 * The obvious shape is one signed order: most readers lost at the top, most
 * kept at the bottom. It would imply a thing that does not exist. **There is no
 * page-level total of readers a change moved** — a reader who got past the
 * second band and then the third is in both stops' figures, so adding them
 * counts one reader twice, which is the trap written down for views
 * ([0147](../../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md))
 * and for presses
 * ([0167](../../decisions/0167-a-delegated-signal-names-the-regions-it-happened-inside.md))
 * and refused again where it would look most like a headline. A page's harm and
 * a page's help are two different stops, and a real change usually does both:
 * the band it rewrote reads better and the one it pushed below the fold reads
 * worse.
 *
 * So a page is ordered twice, by its own worst stop and by its own best one,
 * and it stands in both orders when it earned both places. Nothing is added
 * anywhere, and the two orders are the only artefact.
 *
 * ## A page the door cannot scale, and a page nothing moved
 *
 * The same refusal an order over one window makes, for the same reason: a page
 * whose comparison is sound and whose door row is missing has no place in an
 * order against pages that have one, and there is no safe direction to guess in.
 * It is reported out of the orders with the standing saying why.
 *
 * **A page nothing moved is an answer and not a silence.** A comparison gates
 * its own stops on whether the movement is worth at least one reader on the
 * coarser side, which is what keeps a page three people read off the top of a
 * screen; a page with no stop past that gate is `unmoved`, and the two windows'
 * view floors travel with the row so a quiet window can be told from a steady
 * page.
 *
 * Pure, linear in the comparisons times the rows, and reaches no store, clock
 * or DOM.
 */

/** A reason a page is in neither order. */
export type DeploymentChangeSilence =
  /**
   * One of the two windows reported no view of its revision, so there was
   * nothing to compare.
   *
   * The comparison's own reason, carried through on the row rather than
   * restated: a surface that wants to say which window was quiet reads the
   * floors beside it.
   */
  | "unread"
  /**
   * The two readings are of two different pages, so the comparison is not a
   * movement of anything.
   *
   * A caller's pairing fault and never a state of a deployment's readers. It is
   * in the standings rather than dropped, because an order that silently shed a
   * mispaired comparison would answer *your deployment has thirty-nine pages*.
   */
  | "mispaired"
  /**
   * There is no page-view row at the door for the later revision, so this
   * page's movement cannot be put on the same scale as another's.
   *
   * Not a page that was not measured. Its comparison is as good as any other's
   * and every share in it stands; what is missing is the one number that makes
   * two pages' movements the same kind of figure.
   */
  | "unscaled"
  /**
   * The later window's door row is there and nothing in it says a page view
   * ever began.
   *
   * Either nobody read the new revision, or the senders are not marking their
   * openings — and the page-view reading publishes both numbers, so the
   * diagnosis is a subtraction a surface can make.
   */
  | "unopened"
  /**
   * A stop reports more readers in the later window than the door has ever seen
   * appear, which no rollup produces.
   *
   * A reading assembled by hand or by a sender that is not one. The share
   * movements are published and the scaled figures are withheld, because they
   * are the ones the disagreement makes absurd.
   */
  | "inconsistent"

export const DEPLOYMENT_CHANGE_SILENCES: readonly DeploymentChangeSilence[] =
  everyMemberOf<DeploymentChangeSilence>()([
    "unread",
    "mispaired",
    "unscaled",
    "unopened",
    "inconsistent",
  ])

/** Where one page stands in the two orders, or why it is in neither. */
export type MovementStanding =
  /** In at least one of the orders, with a movement and a scale for it. */
  | "ranked"
  /**
   * Compared, scalable, and no stop moved by as much as one reader.
   *
   * The answer a change that landed on nothing gives, and the answer a window
   * too thin to show a movement gives as well. The two view floors on the row
   * are what tell them apart.
   */
  | "unmoved"
  | DeploymentChangeSilence

export const MOVEMENT_STANDINGS: readonly MovementStanding[] =
  everyMemberOf<MovementStanding>()([
    "ranked",
    "unmoved",
    "unread",
    "mispaired",
    "unscaled",
    "unopened",
    "inconsistent",
  ])

/** One line per standing, for a surface naming why a page is where it is. */
export const describeMovementStanding = (standing: MovementStanding): string => {
  switch (standing) {
    case "ranked":
      return "in an order, by the readers its sharpest movement moves at the door's scale"
    case "unmoved":
      return "compared, and nothing on it moved by as much as one reader"
    case "unread":
      return "one of the two windows reported no view of its revision"
    case "mispaired":
      return "the two readings are of different pages, so there is no movement here"
    case "unscaled":
      return "no page views counted at the later door, so its movement is not comparable with another page's"
    case "unopened":
      return "the later page-view row is there and nothing has said a page view began"
    case "inconsistent":
      return "it reports more readers at a stop than have ever appeared"
  }
}

/** One page's sharpest movement in one direction. */
export type PageMovement = {
  /**
   * The pair of siblings it happened at, carried through from the comparison
   * unchanged.
   *
   * Both of its sides are there, so a surface naming the band can also print
   * what each window measured without a second lookup.
   */
  readonly at: ComparedStop
  /**
   * How much of the page's readers moved, as a share, with the direction in the
   * name rather than in the sign.
   *
   * The magnitude of the comparison's own share movement (0224), which is sound
   * on its own: each side is a fall off its own rows, so each window's straddle
   * divided out before the two met. Published even where the scaled figure is
   * withheld.
   */
  readonly share: number
  /**
   * The same movement as readers, at the later window's door scale, or `null`
   * where this page has no scale.
   *
   * The key the orders are on. A magnitude and not a count of people: it is a
   * share times a count of views, restated at the scale the door counts in, and
   * it is deliberately not rounded. **Never added across pages or across the
   * two orders** — one reader is in every stop they walked past.
   */
  readonly readers: number | null
}

/** One page of a deployment, as a change left it. */
export type MovedPage = {
  /** The page, which is the earlier reading's tree. */
  readonly treeId: TreeId
  /** The two revisions compared, which may be the same one read in two windows. */
  readonly revisions: { readonly was: number; readonly now: number }
  /**
   * The audience the later window was collected under, or `null` where the
   * reading named none.
   *
   * Taken from the later side for the reason only the later window's rows are
   * asked for: the figure being scaled is that window's own. Two forms of one
   * page are two rows here, as they are in every other order this subsystem
   * publishes (0290), and nothing is summed across them — a reader of one form
   * is not a reader of the other.
   */
  readonly audienceId: AudienceId | null
  readonly standing: MovementStanding
  /**
   * Each window's view floor, carried through from its own reading unchanged.
   *
   * Floors and not counts, which is why neither is the denominator of anything
   * here. They are what tells a steady page from a window too quiet to have
   * shown a movement.
   */
  readonly views: { readonly was: number; readonly now: number }
  /**
   * Page views counted at the later door, exact, or `null` where that revision
   * has no row.
   *
   * The weight behind the row: *of the eleven hundred readers this revision
   * had*, where the figures beside it are stated at this number's scale.
   */
  readonly opened: number | null
  /** The later window's own straddle rate, which is what scales the movements. */
  readonly inflation: number | null
  /**
   * The comparison's own reason for saying nothing, where it gave one.
   *
   * Carried rather than translated, because a standing says what this order
   * does with the page and the comparison's silence says what the comparison
   * found. A surface printing one sentence prints this one.
   */
  readonly silence: ChangeSilence | null
  /** The stop the change costs most readers at, where it worsened one. */
  readonly worsened: PageMovement | null
  /** The stop it keeps most readers at, where it improved one. */
  readonly improved: PageMovement | null
}

/** A deployment's pages, as a change left them. */
export type DeploymentChange = {
  /**
   * Every page the change cost readers, worst first.
   *
   * Most readers lost at the door's scale, then the larger share, then by tree
   * id and newest later revision first — so two pages the change cost the same
   * do not reorder on a refresh.
   */
  readonly harmed: readonly MovedPage[]
  /** Every page it kept readers on, best first, by the same rule. */
  readonly helped: readonly MovedPage[]
  /**
   * Every page in neither order, by tree id and newest later revision first.
   *
   * A page in neither is not a page nothing is known about: `unmoved` is an
   * answer, and the four silences each name something a surface can act on.
   */
  readonly unranked: readonly MovedPage[]
  /** The head of the harm order, which is the page to look at first. `null` where nothing worsened. */
  readonly worst: MovedPage | null
  /** The head of the help order. `null` where nothing improved. */
  readonly best: MovedPage | null
  /**
   * How many pages stand in each state, counting a page once however many
   * orders it is in.
   *
   * A page the change both helped and hurt is one `ranked` page and not two,
   * which is the one place these two orders could have been made to look like
   * more pages than a deployment has.
   */
  readonly standings: Readonly<Record<MovementStanding, number>>
  /**
   * Comparisons read, which is pages: one comparison stands per page.
   *
   * Not the comparisons handed in. The duplicated and the ambiguous are not in
   * it, and the two numbers beside it say how many of each there were.
   */
  readonly compared: number
  /**
   * Page views counted at the later door across the pages read, added once per
   * revision.
   *
   * Exact and addable, for the reason no other figure here is: a page view
   * began on one revision of one tree and was counted once. It is a weight
   * rather than a deployment total — this sees the pages its caller compared,
   * not the deployment's.
   *
   * Once per revision and not once per row, because two comparisons can name
   * one later revision while being two rows: a mispaired comparison is filed
   * under the earlier reading's page and scaled at the later one's door, so a
   * caller that handed in both would otherwise have that revision's openings
   * counted twice.
   */
  readonly arrivals: number
  /**
   * Comparisons of a page beyond the first that compared the same two
   * revisions, which were dropped.
   *
   * A caller that concatenated two reads holds one page's movement twice, and a
   * page twice in an order is the one way an order can lie about how much there
   * is to fix. The first stands and the rest are counted here.
   */
  readonly duplicated: number
  /**
   * Door rows for the later revision beyond the first, which were ignored.
   *
   * A store keeps one row per revision, so this is a caller's two reads again —
   * and adding them would double a page's arrivals and halve every movement
   * scaled by them.
   */
  readonly duplicatedRows: number
  /**
   * Pages one of whose **forms** was handed in with two different comparisons,
   * of which neither was read.
   *
   * A tree live at two revisions is two live versions of one page, and both
   * belong in an order over one window; a comparison pairs by form, so such a
   * form has two movements and no single one that is its own. Picking either
   * would publish a number nobody could account for, so the page is named here
   * and that form is in no order, in no standing and in no total.
   *
   * **Two forms of one page are not this** (0290). A deployment serving two
   * audiences hands in one comparison per form, which is two movements that
   * are each somebody's; both are read and both stand. Before the audience was
   * part of the pairing, that deployment's page landed here and lost both.
   */
  readonly ambiguous: readonly TreeId[]
}

const EMPTY_STANDINGS: Readonly<Record<MovementStanding, number>> = Object.freeze(
  Object.fromEntries(MOVEMENT_STANDINGS.map((standing) => [standing, 0])) as Record<
    MovementStanding,
    number
  >
)

/**
 * The form this comparison is of, under the published rule.
 *
 * `formKeyOf` was written in this module and now lives beside `readingKeyOf`,
 * for the reason that one is published: four library comparisons had the defect
 * it fixes and no key to import, so each spelled the pairing by tree alone
 * (0292). The difference between the two rules is written where they are
 * published.
 *
 * The audience is the later window's, for the reason only the later window's
 * rows are asked for.
 */
const formKeyOfChange = (change: ReadingChange): string =>
  formKeyOf({ treeId: change.treeId, audienceId: change.progress.now.audienceId })

/**
 * What makes two reads of a comparison the same read: the form, and the two
 * revisions it compared.
 *
 * The form carries the audience, for the reason `readingKeyOf` does (0290): a
 * page is one base tree and the deltas an audience earns, so two forms of it
 * are compared over the same two revisions, and a key without the audience
 * makes the second form's comparison the first one handed in twice.
 */
const pairKeyOf = (change: ReadingChange): string =>
  `${formKeyOfChange(change)}\u0000${change.revisions.was}\u0000${change.revisions.now}`

/**
 * One direction's movement, scaled where the page has a scale.
 *
 * The magnitude is taken of the comparison's own ranking figure rather than
 * multiplied up again here, because deriving it twice is how two screens come to
 * disagree about which band a change hurt.
 */
const movementOf = (at: ComparedStop | null, inflation: number | null): PageMovement | null =>
  at === null
    ? null
    : {
        at,
        share: Math.abs(at.improvement),
        readers: inflation === null ? null : Math.abs(at.readersKept) / (1 + inflation),
      }

/**
 * One page's row, with the reasons tried in the order they have to be tried in.
 *
 * The comparison's own silence first, because *there was nothing to compare* is
 * a better answer than *its movement could not be scaled*. The door next,
 * because a page with no scale has nothing to put a movement on. Then the gate
 * the comparison itself applies, so a page nothing moved is not reported as a
 * page whose counters disagree with its row. And the disagreement last, because
 * it is a statement about a stop and a row together.
 */
const rowOf = (change: ReadingChange, door: RevisionPageViews | null): MovedPage => {
  const where = {
    treeId: change.treeId,
    revisions: change.revisions,
    audienceId: change.progress.now.audienceId,
    views: { was: change.progress.was.views, now: change.progress.now.views },
    opened: door?.opened ?? null,
    inflation: door?.inflation ?? null,
    silence: change.silence,
  }
  const nothing = { worsened: null, improved: null }

  if (change.silence !== null) {
    return {
      ...where,
      ...nothing,
      standing: change.silence === "different-trees" ? "mispaired" : "unread",
    }
  }

  if (door === null) return { ...where, ...nothing, standing: "unscaled" }

  /**
   * A null inflation is exactly an opened of nought — the page-view reading
   * withholds the fraction rather than dividing by nothing — so the check is
   * written on the figure the scale needs and not on the count behind it.
   */
  if (door.inflation === null) return { ...where, ...nothing, standing: "unopened" }

  if (change.mostLost === null && change.mostKept === null) {
    return { ...where, ...nothing, standing: "unmoved" }
  }

  const beyond = (at: ComparedStop | null): boolean =>
    at !== null && at.now.reached > door.appearances

  if (beyond(change.mostLost) || beyond(change.mostKept)) {
    return {
      ...where,
      standing: "inconsistent",
      worsened: movementOf(change.mostLost, null),
      improved: movementOf(change.mostKept, null),
    }
  }

  return {
    ...where,
    standing: "ranked",
    worsened: movementOf(change.mostLost, door.inflation),
    improved: movementOf(change.mostKept, door.inflation),
  }
}

/** Tree id, then newest later revision first, which is the order a page's rows are read in. */
const byPage = (one: MovedPage, other: MovedPage): number =>
  one.treeId.localeCompare(other.treeId) ||
  other.revisions.now - one.revisions.now ||
  (one.audienceId ?? "").localeCompare(other.audienceId ?? "")

/**
 * The sharper of two movements in one direction, which is the ranking rule
 * spelled once.
 *
 * By readers before share, for the reason a page ranks its own stops that way
 * (0221, 0224): a stop two readers out of three left is a worse rate and a
 * smaller problem than one four hundred out of a thousand left.
 */
const sharperOn =
  (direction: "worsened" | "improved") =>
  (one: MovedPage, other: MovedPage): number =>
    (other[direction]?.readers ?? 0) - (one[direction]?.readers ?? 0) ||
    (other[direction]?.share ?? 0) - (one[direction]?.share ?? 0) ||
    byPage(one, other)

/**
 * What a change did across a deployment's pages, as two orders.
 *
 * Takes the comparisons rather than the counters, for the reason every derived
 * reading in this subsystem does: the movements and the gates are what this is
 * made of, and deriving them twice is how two screens come to disagree. A caller
 * with two windows of counters reads each page's parts, then its progress, then
 * its comparison, then this.
 *
 * The rows are the **later** window's page-view rows — the whole window a
 * deployment holds, not one page's — because the figure being scaled is the
 * later window's own. Each page's row is picked out by the published rule, so no
 * caller writes the matching itself.
 */
export const deploymentChangeOf = (
  changes: readonly ReadingChange[],
  rows: readonly StoredPageViews[]
): DeploymentChange => {
  /**
   * Grouped by **form** rather than by page. Two forms of one page are two live
   * things with two movements of their own (0290), so a tree handed in with one
   * comparison per form is not the ambiguity this gate exists for — it is a
   * deployment serving two audiences. What is still ambiguous is one *form*
   * handed in with two different revision pairs, which is the state the
   * one-window order deliberately keeps as two rows and which a comparison
   * cannot reduce to one.
   */
  const pairsByForm = new Map<string, Set<string>>()

  for (const change of changes) {
    const pairs = pairsByForm.get(formKeyOfChange(change)) ?? new Set<string>()

    pairs.add(pairKeyOf(change))
    pairsByForm.set(formKeyOfChange(change), pairs)
  }

  const unsettled = (change: ReadingChange): boolean =>
    (pairsByForm.get(formKeyOfChange(change))?.size ?? 0) > 1

  /**
   * Named by tree, because a page is what a surface draws and the tree id is
   * what it has. A deployment whose two forms are *each* ambiguous names the
   * tree once, and a tree one of whose forms is sound still names it — that
   * form is read, and the name says a reading of this page is incomplete.
   */
  const ambiguous = [...new Set(changes.filter(unsettled).map((change) => change.treeId))].sort(
    (one, other) => one.localeCompare(other)
  )

  const unreadable = new Set<string>(changes.filter(unsettled).map(formKeyOfChange))
  const seen = new Set<string>()
  const counted = new Set<string>()
  const read: MovedPage[] = []
  let duplicated = 0
  let duplicatedRows = 0
  let arrivals = 0

  for (const change of changes) {
    if (unreadable.has(formKeyOfChange(change))) continue

    const key = pairKeyOf(change)

    if (seen.has(key)) {
      duplicated += 1
      continue
    }

    seen.add(key)

    /**
     * The audience travels with the asking, so the door row picked is this
     * form's own (0290). Dropping it here would divide one form's movement by
     * a row that may be the other form's, chosen by the caller's array order.
     */
    const later = {
      treeId: change.progress.now.treeId,
      revision: change.revisions.now,
      audienceId: change.progress.now.audienceId,
    }
    const door = pageViewsFor(later, rows)
    const doorKey = readingKeyOf(later)

    duplicatedRows += door.duplicated

    if (!counted.has(doorKey)) {
      counted.add(doorKey)
      arrivals += door.measured?.opened ?? 0
    }

    read.push(rowOf(change, door.measured))
  }

  const harmed = read.filter((row) => row.worsened?.readers != null).sort(sharperOn("worsened"))
  const helped = read.filter((row) => row.improved?.readers != null).sort(sharperOn("improved"))
  const ranked = new Set<MovedPage>([...harmed, ...helped])
  const standings = { ...EMPTY_STANDINGS }

  for (const row of read) standings[row.standing] += 1

  return {
    harmed,
    helped,
    unranked: read.filter((row) => !ranked.has(row)).sort(byPage),
    worst: harmed[0] ?? null,
    best: helped[0] ?? null,
    standings,
    compared: read.length,
    arrivals,
    duplicated,
    duplicatedRows,
    ambiguous,
  }
}
