import { Wordmark } from "./wordmark"

/**
 * The one line above everything, and it exists because of what used to be
 * there.
 *
 * The demo lived at `/portal/demo` and wore the review tool's chrome, so the
 * first words a stranger read were "loom portal · alpha" — the name of a
 * signed-in tool they have no account for, on a page whose whole purpose is to
 * be seen by somebody who does not. Below it, the biggest type on the screen
 * belonged to the *specimen page*, whose hero said "Your AI can change this
 * page" and whose primary button went to GitHub. A visitor could not tell which
 * of the two voices was Loom's.
 *
 * So this bar says three things and stops: whose page this is, that it is live
 * rather than a recording, and where to go next. Everything else on screen is
 * either the page being changed or the record of changing it.
 *
 * **All three are now actually said**, and two of them were not.
 *
 * *Whose page* used to be answered by implication — the bar said "a live page"
 * and left a visitor to work out from the hero that it was Loom's own. It is no
 * longer Loom's: the specimen is a clinic that does not exist (`page-tree.ts`),
 * and a page invented for a demonstration must say so where it cannot be
 * missed. Not a disclaimer in a footer — one clause, first, in the bar directly
 * above it.
 *
 * *Where to go next* was the third thing the comment above promised and the bar
 * did not do. `Loom marketing` filed it on 22 August after grepping this route
 * group for anchors before linking to it: the whole surface contained one `<a>`
 * and it was the skip link, while the front door now offers `/demo` from six
 * places. The wordmark is the convention every visitor already has, so that is
 * what it becomes.
 *
 * **And it is a `Wordmark` rather than a link written here**, because the
 * third of those three things is the one that stops being true in a box. The
 * front door now frames this demonstration, and a link home from inside that
 * frame goes home *into the frame*. The mark keeps saying whose page this is
 * and stops being a door; the argument is in `wordmark.tsx` and the browser
 * behavior behind it is in `_lib/framed.ts`.
 */
export const DemoBar = ({ revision, policyId }: { readonly revision: number; readonly policyId: string }) => (
  <header className="border-edge-subtle bg-surface-topbar flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-b px-4 py-2.5 lg:gap-y-2 lg:px-5">
    <Wordmark />

    {/*
      * Three things on one line on a wide screen, and on a narrow one three
      * things on **two** lines rather than three.
      *
      * Measured at 348px — this demonstration inside the front door's embed on
      * a phone — the bar wrapped once per child and stood 108px tall, against
      * 44px wide: the mark on its own line, this sentence on the next, and a
      * two-word instrument reading `revision 0` alone on a third. That is 23%
      * of a 465px box spent on chrome before the demonstration has said
      * anything, on the one screen where the first control was already below
      * the fold.
      *
      * So the sentence is the child that takes its own row (`basis-full`) and
      * it takes the second one (`order-last`), which puts the mark and the
      * instrument on the first — they are short, they are the two ends of the
      * bar at every other width, and neither wraps. **Order and not markup:**
      * the document still reads mark, sentence, instrument, so what a screen
      * reader meets is unchanged and the disclosure still comes before the
      * numbers rather than after them.
      */}
    <p className="text-ink-secondary order-last min-w-0 basis-full text-xs lg:order-none lg:basis-auto">
      Someone else’s page.{" "}
      <span className="text-ink-muted">
        A physiotherapy clinic that doesn’t exist — but the page is real and really changes.
      </span>
    </p>

    {/*
      * The two numbers that were the *first* thing on the old rail, in a
      * monospace dl under the heading, before a visitor had been told what
      * either word meant. They are worth keeping — a revision counter that
      * moves is the cheapest possible proof the page is real — so they stay,
      * demoted to the far end of a bar where they read as an instrument panel
      * rather than as an explanation.
      */}
    <dl className="text-ink-muted ml-auto flex shrink-0 gap-x-4 font-mono text-2xs">
      <div className="flex gap-1.5">
        <dt>revision</dt>
        <dd className="text-ink">{revision}</dd>
      </div>
      <div className="hidden gap-1.5 sm:flex">
        <dt>policy</dt>
        <dd className="text-ink">{policyId}</dd>
      </div>
    </dl>
  </header>
)
