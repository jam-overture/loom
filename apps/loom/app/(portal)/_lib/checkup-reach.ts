import type { LoomTree, TreeId } from "@loom/runtime"

/**
 * How much of this deployment a checkup could speak for, from a listing already
 * in hand.
 *
 * ## The screen this exists for
 *
 * `/portal/checkup/everything` answers *does everything add up* over every
 * page, in one press, and it is the most Loom-specific screen in the portal:
 * nothing else in the ecosystem can tell you whether the pages being served are
 * the pages your own recorded history produces. It shipped on 22 September and
 * the report that shipped it said what was missing in as many words —
 *
 * > *"I did not add the sweep to the front door. A line on `/portal` reading
 * > 'Does everything still add up?' is the obvious next move and is how this
 * > screen gets opened daily rather than found."*
 *
 * A screen nobody is invited to is a screen nobody opens. The front door is
 * where a person arrives, so the invitation belongs there.
 *
 * ## Why the front door cannot simply run it
 *
 * A checkup replays a page's whole accepted history. That is exactly the cost
 * 0016 introduced the snapshot to keep off a request path, and it grows with
 * every change the deployment ever accepts — so a front door that ran it would
 * get slower for the rest of its life, on the one screen a person opens every
 * morning. The press stays a press.
 *
 * What the front door *can* do for nothing is say what the press would be worth.
 * It already lists the pages and already reads each one's head, for the queue
 * and for the names. Two facts fall out of what it is holding:
 *
 * - **Which pages a checkup can speak for at all.** A page can only be checked
 *   against the shape it was first created with, and a host that cannot
 *   reproduce that shape has to refuse rather than fold from the answer being
 *   checked (0028). Whether this deployment holds that shape is a lookup, not a
 *   read.
 * - **How much replaying the press would do.** A head carries the number of
 *   changes accepted against it (0016), so the cost of the sweep is a sum over
 *   pages this screen has already read.
 *
 * The first of those is the one worth the module. **A page with no starting
 * shape on record is silently absent from every verdict the portal can give**:
 * it fails nothing, passes nothing, and raises nothing anywhere. Until now the
 * only way to find out was to press the sweep and read its tally. It is a
 * configuration fact about the deployment, it is invisible in the repository —
 * which holds the builders but not which stored pages came from them — and it
 * belongs on the screen where a person would think to look for it.
 *
 * ## The rule
 *
 * > **A page a checkup cannot speak for is never counted among the pages it
 * > can.**
 *
 * The same rule `checkup-sweep.ts` is mostly made of, one step earlier: there it
 * keeps a check that did not happen out of the green count, here it keeps a page
 * that cannot be checked out of the promise. Both directions of the same
 * mistake end with somebody being told everything is fine on the strength of
 * pages nothing looked at.
 *
 * Pure, and no React: what an invitation *says* is the part worth testing, and a
 * component that both joined the listing and chose the words could only be
 * checked by standing a store up.
 */

/**
 * Why one listed page is, or is not, something a checkup could answer about.
 *
 * Three states rather than two, because the reasons have different remedies and
 * only one of them is about the page. `nothing-to-check-against` is this
 * deployment's configuration and will be true again tomorrow;
 * `could-not-be-read` is a store that did not answer this second and may well
 * answer the next. Folding them together would give a permanent condition and a
 * transient one the same sentence.
 */
export type PageReach =
  /** The starting shape is on record and the page answered. `changes` is what a sweep would replay. */
  | { readonly state: "can-be-checked"; readonly changes: number }
  /** This deployment cannot reproduce the shape the page was created with (0028). */
  | { readonly state: "nothing-to-check-against" }
  /** The page itself would not answer, so nothing here knows what it would cost. */
  | { readonly state: "could-not-be-read" }

export type ReachState = PageReach["state"]

/**
 * What a checkup could reach, over the pages this screen listed.
 *
 * The three counts partition `listed` — asserted, because the whole value of
 * this reading is that the pages it cannot speak for are counted apart from the
 * ones it can, and a fourth state added without a home here would quietly land
 * in the wrong one.
 */
export type CheckupReach = {
  readonly listed: number
  readonly checkable: number
  readonly unvouchable: number
  readonly unreadable: number
  /** Accepted changes across the checkable pages: what one press would replay. */
  readonly changes: number
  /** Whether the listing this was read from reached the end of the deployment. */
  readonly complete: boolean
}

/**
 * The join, over what the front door already holds.
 *
 * `hasStartingShape` is handed in rather than imported so this stays a pure
 * function of its inputs — the seed registry is a memoised module-level map, and
 * a reading that consulted it directly could only be tested by arranging for the
 * portal's own page to exist.
 *
 * `heads` is keyed by string because that is what `headsOf` returns, and a page
 * missing from it is a read that failed rather than a page with nothing in it.
 */
export const checkupReach = ({
  treeIds,
  heads,
  hasStartingShape,
  complete,
}: {
  readonly treeIds: readonly TreeId[]
  readonly heads: ReadonlyMap<string, LoomTree>
  readonly hasStartingShape: (treeId: TreeId) => boolean
  readonly complete: boolean
}): CheckupReach => {
  const reaches = treeIds.map((treeId): PageReach => {
    if (!hasStartingShape(treeId)) return { state: "nothing-to-check-against" }

    const head = heads.get(treeId)

    return head === undefined
      ? { state: "could-not-be-read" }
      : { state: "can-be-checked", changes: head.revision }
  })

  const counted = (state: ReachState): number =>
    reaches.filter((reach) => reach.state === state).length

  return {
    listed: treeIds.length,
    checkable: counted("can-be-checked"),
    unvouchable: counted("nothing-to-check-against"),
    unreadable: counted("could-not-be-read"),
    changes: reaches.reduce(
      (total, reach) => (reach.state === "can-be-checked" ? total + reach.changes : total),
      0
    ),
    complete,
  }
}

/**
 * A gap between what the front door listed and what a checkup could answer for.
 *
 * Named apart and said separately, for the reason the queue's own partial notice
 * gives: two gaps merged into one sentence can only be written about the vaguer
 * of the two, and the specific one loses its name in the process.
 */
export type ReachGap = {
  readonly key: "no-starting-shape" | "would-not-answer" | "beyond-the-listing"
  /** Shown unasked, so no runtime word appears in it. */
  readonly plain: string
}

export type ReachReading = {
  /** The plain answer to "can Loom check this?", with the real numbers in it. */
  readonly headline: string
  /** What that means, and what pressing would actually get you. */
  readonly meaning: string
  /** The cost of the press, under the press. */
  readonly cost: string
  /** Only the gaps that are real, in the order a reader can act on them. */
  readonly gaps: readonly ReachGap[]
}

/**
 * The answer to the heading, and the reason there is not a better one.
 *
 * The first screenshot of this section put *"Is everything still accounted
 * for?"* over *"Loom can check 1 of your 4 pages."* — a question, and under it a
 * sentence that is not its answer. Every assertion passed, because the reach is
 * correct and the heading is the right question; what was wrong was the pair,
 * and a reader can just as easily take the second line as reassurance that
 * something has looked.
 *
 * Nothing has looked. A checkup reads and writes nothing, deliberately, so this
 * deployment holds no record of one ever having run and this screen has no
 * freshness to print — which is the one claim the interface this section is
 * modelled on *does* make, and the one it must not borrow. Said out loud rather
 * than left as an absence: an absence is exactly what a reader fills in with
 * good news.
 */
export const NOTHING_HAS_CHECKED =
  "Nothing here has checked. A checkup runs when you ask for one and Loom keeps no answer between times, so this is always a fresh look rather than a result on file."

const pages = (count: number): string => `${count} ${count === 1 ? "page" : "pages"}`

const changesWord = (count: number): string => `${count} ${count === 1 ? "change" : "changes"}`

/**
 * The headline, in three arms, and every one of them a whole sentence.
 *
 * Whole sentences rather than a phrase and a count stitched together, because
 * the two defects the sweep's own tests caught before it shipped were both a
 * count and a verb disagreeing — *"All 1 page that could be checked add up"* —
 * and both were found by asserting the sentence rather than a fragment of it.
 */
const headlineOf = (reach: CheckupReach): string => {
  if (reach.checkable === 0) {
    return reach.listed === 1
      ? "Loom can’t check your page yet."
      : `Loom can’t check any of your ${pages(reach.listed)} yet.`
  }

  if (reach.checkable === reach.listed) {
    return reach.listed === 1
      ? "Loom can check your page."
      : `Loom can check all ${reach.listed} of your pages.`
  }

  return `Loom can check ${reach.checkable} of your ${pages(reach.listed)}.`
}

/**
 * What the check is, and what the press gets you — in that order, because a
 * reader who has never pressed it does not yet know what is being offered.
 *
 * The `checkable === 0` arm is the one that earns its own sentence. The press is
 * still offered there, and the reason is not politeness: the sweep is the only
 * screen that names *which* pages have nothing to check against, so on a
 * deployment where nothing can be checked it is the one thing worth pressing.
 */
const meaningOf = (reach: CheckupReach): string =>
  reach.checkable === 0
    ? "A checkup replays everything Loom has recorded about a page and compares the result with what people are being served. It has to start from the shape the page was first created with, and this deployment doesn’t have that on record for any of them — so a checkup would have nothing to compare. Pressing it names the pages it can’t speak for."
    : "A checkup replays everything Loom has recorded about a page and compares the result with what people are being served. If the two have drifted apart, nothing anywhere fails and nothing is written down — this is what finds it."

/**
 * The cost, said before it is paid and in the real number.
 *
 * "It takes a moment" was the whole of what the checkup screen could say about
 * its own cost, and a moment is not a unit. The count of accepted changes is
 * free here and is the thing the wait is actually made of.
 */
const costOf = (reach: CheckupReach): string => {
  if (reach.checkable === 0) return "It reads your pages and reports what it found for each one."

  if (reach.changes === 0) {
    return reach.checkable === 1
      ? "Nothing has been accepted on it yet, so the checkup compares it with the shape it started as."
      : `Nothing has been accepted on them yet, so the checkup compares each of the ${pages(reach.checkable)} with the shape it started as.`
  }

  return `It replays ${changesWord(reach.changes)} across ${pages(reach.checkable)}, so it takes a moment.`
}

/**
 * Each gap, and only when it is real.
 *
 * `no-starting-shape` leads, because it is the one that will still be true
 * tomorrow and the one a person can do something about. A page that would not
 * answer is a moment's trouble, and a page beyond the listing is a page nobody
 * on this screen can name — which is why it says the least and asks for nothing.
 *
 * **A gap is a caveat on an offer, so it is withheld where there is no offer.**
 * With nothing checkable the headline and the sentence under it are already
 * about exactly this — *"this deployment doesn't have that on record for any of
 * them"* — and printing the gap as well said the same fact twice, four lines
 * apart, which the first screenshot of this section shows plainly. It is the
 * defect this screen has recorded against itself once before: `Nothing is
 * waiting for you.` three lines above `You're all caught up.` Nothing is lost,
 * because the arm that suppresses it is the arm whose own sentence carries it.
 */
const gapsOf = (reach: CheckupReach): readonly ReachGap[] => [
  ...(reach.unvouchable > 0 && reach.checkable > 0
    ? [
        {
          key: "no-starting-shape" as const,
          plain:
            reach.unvouchable === 1
              ? "One page has no starting shape on record, so a checkup can’t speak for it either way. It is neither passing nor failing — it is simply left out."
              : `${reach.unvouchable} of your pages have no starting shape on record, so a checkup can’t speak for them either way. They are neither passing nor failing — they are simply left out.`,
        },
      ]
    : []),
  ...(reach.unreadable > 0
    ? [
        {
          key: "would-not-answer" as const,
          plain:
            reach.unreadable === 1
              ? "One page wouldn’t answer this screen just now, so a checkup may not reach it either. That is this moment rather than a fault in the page."
              : `${reach.unreadable} of your pages wouldn’t answer this screen just now, so a checkup may not reach them either. That is this moment rather than a fault in the pages.`,
        },
      ]
    : []),
  ...(reach.complete
    ? []
    : [
        {
          key: "beyond-the-listing" as const,
          plain:
            "This deployment has more pages than this screen listed, so the counts above are about the ones it reached.",
        },
      ]),
]

/**
 * Everything the invitation says, from one reading.
 *
 * One function rather than four called from a component, for the reason
 * `describeAudit` is read once above the JSX on the checkup screen: a headline
 * and a cost computed in two places can end up describing two different
 * deployments.
 */
export const reachReading = (reach: CheckupReach): ReachReading => ({
  headline: headlineOf(reach),
  meaning: meaningOf(reach),
  cost: costOf(reach),
  gaps: gapsOf(reach),
})

/**
 * The runtime's own account of the same join, for the disclosure beside it.
 *
 * Nothing above says *seed*, *log*, *snapshot* or *revision*, and all four are
 * what this actually is. They are not removed; they are one click down, which is
 * the whole of the rule this surface is built on.
 */
export const reachDetail = (reach: CheckupReach): readonly string[] => [
  `${reach.listed === 1 ? "One tree came" : `${reach.listed} trees came`} back from one page of the store's listing${reach.complete ? ", which reached the end of it" : ", and it returned a cursor, so there are more"}.`,
  `${reach.checkable === 1 ? "One of them has" : `${reach.checkable} of them have`} a seed registered in this deployment's source, which is what auditSnapshot folds from — a tree without one is refused rather than folded from its own snapshot, because comparing a snapshot with itself agrees every time (0028).`,
  `Their head revisions sum to ${reach.changes}, which is the number of accepted deltas a sweep would replay. The snapshot is a materialised view of the log (0016), so the fold is the cost the log has and not the cost the page has.`,
  ...(reach.unreadable > 0
    ? [
        `${reach.unreadable === 1 ? "One head read" : `${reach.unreadable} head reads`} did not come back, so ${reach.unreadable === 1 ? "its revision is" : "their revisions are"} not in that sum.`,
      ]
    : []),
]
