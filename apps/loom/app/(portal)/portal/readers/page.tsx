import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema, type TreeId } from "@loom/runtime"
import { describeReaderSignalStoreError } from "@loom/runtime/signals"

import { PageViews } from "@/app/(portal)/_components/page-views"
import { ScopedLead } from "@/app/(portal)/_components/scoped-lead"
import { ListOrder } from "@/app/(portal)/_components/list-order"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { pageNameOf, unnamed, type PageName } from "@/app/(portal)/_lib/page-name"
import { namesInTree, type PartName } from "@/app/(portal)/_lib/part-name"
import { portalReaderSignals, portalReaderTallies, signalsAreDurable } from "@/app/(portal)/_lib/reader-signals"
import { pageReadings, revisionReadings } from "@/app/(portal)/_lib/reading-view"
import { inPageOrder } from "@/app/(portal)/_lib/page-order"
import { portalStore } from "@/app/(portal)/_lib/store"

import { PageReadingCard } from "./_components/page-reading"

/**
 * What people did on your pages — step 4 of `docs/signals.md`.
 *
 * ## What this tells somebody that nothing else can
 *
 * Every other thing in this portal is about what *Loom* did: what was asked, what
 * was refused, what changed, whether the model's confidence held up. This is the
 * other half of the premise — what the people the pages were built for actually
 * did once they arrived — and it is the half that makes adaptation worth having,
 * because a model that cannot hear readers can only restate the tree back at
 * itself.
 *
 * It is also the one screen here whose numbers no other tool can produce. An
 * analytics product measures a URL; it has no idea a page is a tree, and no way
 * to say *this part*. `git log` holds the primitives and not the page. The store
 * holds the page as it is now and no record of what it did to anybody. Reach per
 * part, per revision, with the proposal that moved the page from one revision to
 * the next sitting in the same portal, is a sentence only this system can say.
 *
 * ## Why it is called this
 *
 * `signals` is the runtime's word and an `activated` is the runtime's idea of a
 * click. Neither belongs in a rail. A person wants to know what people did on
 * their page, so that is the route, the rail label and the heading, and the
 * vocabulary underneath is one disclosure down and complete.
 *
 * ## What it refuses to do
 *
 * There is no visitor here and there never will be. A signal is anonymous and
 * node-shaped, and a page view is correlated only by an opaque key that never
 * persists ([0146](../../../../../../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
 * So this screen counts visits and never people, and the sentence it can never
 * print — *this reader did that* — is refused in the runtime rather than
 * declined here.
 *
 * It also takes nothing. 0031 made calibration a reader rather than a
 * controller, and the same shape holds for this: a number here is an argument
 * for a person to make a change with, never a change. Nothing on this screen
 * proposes anything.
 *
 * ## Two reads, and what each failure costs
 *
 * The counters are the screen. A read of them that fails is the screen failing
 * and says so, in the failure tone that cannot be skimmed as emptiness.
 *
 * The journal is read for one sentence — whether batches have arrived that have
 * not been counted yet — and its failure costs that sentence and nothing else.
 * Without it an uncounted window and a deployment nobody has ever visited arrive
 * as the same blank screen, and a reader who cannot tell them apart goes looking
 * for a fault in their page that is not there.
 */
const ReadersPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ tree?: string }>
}) => {
  const { tree } = await searchParams
  await requireActor("/portal/readers")

  const scope = tree === undefined ? undefined : treeIdSchema.safeParse(tree)
  if (scope && !scope.success) notFound()

  const scoped = scope?.success ? scope.data : undefined

  const counted = await portalReaderTallies.tallies(scoped === undefined ? undefined : { treeId: scoped })

  if (!counted.ok) {
    return (
      <div className="flex max-w-3xl flex-col gap-4 p-8">
        <h1 className="text-2xl tracking-tight">What did people do on your pages?</h1>
        <StateNotice tone="failure" title="We couldn’t read what your readers did.">
          <p>
            Nothing is wrong with your pages — this reads the counters kept for them, and that
            read didn&rsquo;t come back. Try again in a moment.
          </p>
          <p>
            Nothing is shown rather than an empty page. A page of zeroes looks like a page
            nobody visited; this is a page that could not find out.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeReaderSignalStoreError(counted.error)}</p>
          </TechnicalDetail>
        </StateNotice>
      </div>
    )
  }

  /*
   * One bounded read, for one sentence. Batches sitting in the buffer are the
   * difference between "nothing is reporting" and "nothing has been counted
   * yet", and those two send a reader to completely different places.
   */
  const buffered = await portalReaderSignals.read({ direction: "older", limit: 1 })
  const arriving = buffered.ok ? buffered.value.batches.length > 0 : false

  /*
   * One read of each page the counters mention, serving three questions at
   * once: what the page is called, what its parts are called, and — the one
   * this screen used to throw away — which revision of it is being served.
   *
   * It used to be two fan-outs over the same list, `partNamesFor` and
   * `pageNamesFor`, so every page in the deployment was fetched twice per
   * render to answer two halves of the same read. One is both cheaper and the
   * only way the third question is answerable for free.
   */
  const served = await pagesServed(counted.value.map((tally) => tally.treeId))

  const readings = pageReadings(
    /*
     * Names come from the pages being served, so a part still on the page is
     * named by what it says rather than by what it is.
     */
    revisionReadings(counted.value, served.partNames)
  )

  const names = served.names

  /*
   * By name, and it used to be by identifier.
   *
   * `revisionReadings` sorts on `treeId.localeCompare(treeId)` so a page's own
   * versions stay together and newest-first, which is right and is untouched.
   * What reached the screen was that arrangement — a list of pages ordered by the
   * runtime's names for them, with a collation deciding ties on a value no reader
   * can see. This screen has no rung to lead with: one page's readers are not
   * more urgent than another's. So the tiebreak every other list here ends with
   * is the whole order, and the sentence above the list says so. No read is added
   * — `names` is three lines up. See `_lib/page-order.ts`.
   */
  const inOrder = inPageOrder(readings, (reading) => ({
    rank: 0,
    page: names.get(reading.treeId) ?? unnamed(reading.treeId),
  }))

  /**
   * The scoped screen names its page whether or not it has a reading, because a
   * page with nothing to show is exactly the page somebody arrived here asking
   * about.
   */
  const scopedName = scoped === undefined ? undefined : (names.get(scoped) ?? (await nameOnly(scoped)))

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">What did people do on your pages?</h1>

        <p className="text-ink-muted text-sm">
          {scopedName === undefined ? (
            <>
              A Loom page can report how it was read — how far down people got, what they
              opened, what they clicked. Nobody is identified and nothing is stored about them;
              this counts visits, part by part, so you can see which parts of a page are doing
              their job.
            </>
          ) : (
            <ScopedLead view="readers" page={scopedName} />
          )}
        </p>
      </header>

      {scoped !== undefined && <PageViews treeId={scoped} current="readers" />}

      {readings.length === 0 ? (
        <StateNotice
          tone="empty"
          title={
            arriving
              ? "Something has reported in, and it hasn’t been counted yet."
              : "No page has reported anything yet."
          }
          action={
            <Link href="/docs/the-runtime/what-your-readers-do">
              How to let a page report back →
            </Link>
          }
        >
          {arriving ? (
            <p>
              Readings have arrived from at least one page and are still in the short-lived
              buffer they land in. They become the counters this screen is built on when they
              are rolled up, and nothing is lost in the meantime.
            </p>
          ) : (
            <p>
              Measuring is off until you ask for it. A published page reports nothing at all
              unless the code rendering it is told to broadcast — that is deliberate, and it is
              why a Loom page you have not configured is byte-for-byte the page it would be
              without any of this.
            </p>
          )}

          <TechnicalDetail summary="What has to be true before anything appears here">
            <p>
              Three things, in order: the page is rendered with reader signals switched on by
              its host; the batches it broadcasts reach this deployment; and they are rolled up
              into per-part, per-revision counters, which is the durable artefact this screen
              reads. The buffer in between is short-lived on purpose.
            </p>
            <p>
              A reader is never identified at any of the three. A batch carries node ids,
              registered types and an instant — no text, no URLs, no typed values, and no
              visitor.
            </p>
          </TechnicalDetail>
        </StateNotice>
      ) : (
        <>
          <ListOrder order="by-name" />

          {inOrder.map((reading) => (
            <PageReadingCard
              key={reading.treeId}
              reading={reading}
              page={names.get(reading.treeId) ?? unnamed(reading.treeId)}
              /*
               * Absent when the page itself could not be read, which the card
               * says out loud rather than reporting as current. A screen that
               * treated a failed read as "these numbers are live" would be making
               * the one claim this surface refuses to make without evidence.
               */
              live={served.revisions.get(reading.treeId)}
            />
          ))}
        </>
      )}

      {signalsAreDurable ? null : (
        <StateNotice tone="notice">
          <p>
            <strong className="font-medium">These counts won&rsquo;t be kept.</strong> No
            database is set up, so what readers did lives in the server process and holds only
            what this instance has been told.
          </p>
          <TechnicalDetail summary="What to set">
            <p>
              Set <span className="font-mono">DATABASE_URL</span> to make the counters durable.
              Until then a restart is a fresh start, and an empty screen here is as likely to
              mean the process was replaced as it is to mean nobody visited.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </div>
  )
}

const nameOnly = async (treeId: TreeId): Promise<PageName> => {
  const head = await portalStore.head(treeId)

  return head.ok ? pageNameOf(head.value) : unnamed(treeId)
}

/**
 * Everything this screen needs from the pages themselves, one bounded read each.
 *
 * One read per **distinct** page rather than one per tally — a page with forty
 * counted parts is one tree, and reading it forty times would be a fan-out over
 * a list the counters did not bound.
 *
 * ## The third answer, which used to be discarded
 *
 * A tree carries its revision. The counters also carry a revision, and the two
 * are not the same number for as long as an hour after any change, because a
 * reading is counted only once its collection window has passed. That gap is
 * the difference between *what your last change did* and *what the change
 * before it did*, and this screen was reading the tree, taking the names off
 * it and dropping the one field that says which of those it was showing.
 */
type PagesServed = {
  readonly names: ReadonlyMap<string, PageName>
  readonly partNames: ReadonlyMap<string, PartName>
  /**
   * The revision each page is being served at. **A page missing from this map
   * is one whose read did not come back**, which is a different fact from a
   * page whose revision happens to match, and the card keeps them apart.
   */
  readonly revisions: ReadonlyMap<string, number>
}

const pagesServed = async (treeIds: readonly TreeId[]): Promise<PagesServed> => {
  const distinct = [...new Set(treeIds)]
  const heads = await Promise.all(
    distinct.map(async (treeId) => [treeId, await portalStore.head(treeId)] as const)
  )

  const names = new Map<string, PageName>()
  const partNames = new Map<string, PartName>()
  const revisions = new Map<string, number>()

  for (const [treeId, head] of heads) {
    /*
     * A failed read costs the name and nothing else — the card still lists,
     * still links, and still shows its id, which is the rule `page-name.ts`
     * states for every listing in this portal. It costs the revision too, and
     * that one is said out loud rather than absorbed.
     */
    if (!head.ok) {
      names.set(treeId, unnamed(treeId))
      continue
    }

    names.set(treeId, pageNameOf(head.value))
    revisions.set(treeId, head.value.revision)

    /*
     * A part whose node has since been removed is not in the map and is named
     * from its registered type instead, which `reading-view.ts` does.
     */
    for (const [nodeId, name] of namesInTree(head.value)) partNames.set(nodeId, name)
  }

  return { names, partNames, revisions }
}

export default ReadersPage
