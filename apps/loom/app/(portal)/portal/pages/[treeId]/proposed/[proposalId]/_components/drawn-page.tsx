import type { ReactNode } from "react"

import type { Mark } from "@/app/(portal)/_lib/proposed-view"

import { MarkedPage } from "./marked-page"

/**
 * One of the two pictures: a page, drawn, under a line saying which page it is.
 *
 * ## Why they are stacked and not side by side
 *
 * A before and an after want to be a pair of columns, and on this screen they
 * must not be. `page-thumbnail.tsx` settled why one floor down: the primitives
 * are responsive (0106 — a band asks its own container how wide it is), so a page
 * drawn into half a pane draws the **narrow** layout. Two columns would put a
 * reviewer's tablet layout beside their tablet layout and label the pair *your
 * page*, on the one screen in the portal where somebody is about to approve a
 * change to it by eye.
 *
 * The thumbnail's way out is to draw at 1280 and scale down, which is right for a
 * card in a grid and wrong here: this picture is the evidence, and shrinking the
 * evidence to 45% is how a changed heading becomes four grey pixels. So both
 * pictures get the whole pane, at the width the page screen's own preview already
 * uses, and the comparison is made by scrolling rather than by looking sideways.
 *
 * What makes that affordable is the marks. The reason a before and an after want
 * to be adjacent is that the reader has to find the difference themselves; when
 * the difference is outlined on both, the eye goes to it directly and the two
 * pictures no longer need to be in one glance.
 *
 * ## The heading is what the picture is, not what it is of
 *
 * *Your page now* and *If you say yes* rather than the page's name, which is over
 * the whole screen already. Two pictures headed with the same name are two
 * pictures a reader has to work out the difference between from their contents,
 * which is the errand this screen exists to abolish.
 */
export const DrawnPage = ({
  title,
  note,
  marks,
  children,
}: {
  readonly title: string
  /** One line saying what this picture is, under the heading. */
  readonly note: string
  readonly marks: readonly Mark[]
  readonly children: ReactNode
}) => (
  <section className="flex min-w-0 flex-col gap-2">
    <header className="flex flex-col gap-0.5">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="text-ink-muted text-xs">{note}</p>
    </header>

    {/*
      * The same frame the page screen's preview uses, so a reviewer arriving from
      * it is looking at their page in the same box. `overflow-x-auto` rather than
      * hidden: a page wider than the pane is a fact about the page, and clipping
      * it would hide exactly the part a change may have made too wide.
      */}
    <div className="bg-surface-preview border-edge-subtle overflow-x-auto rounded-md border p-6">
      <MarkedPage marks={marks}>{children}</MarkedPage>
    </div>
  </section>
)
