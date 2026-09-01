import Link from "next/link"

import type { TreeId } from "@loom/runtime"

import { everyPageHref, pageViewsFor, type PageViewKey } from "@/app/(portal)/_lib/page-views"

/**
 * The five views of one page, as a strip under the heading.
 *
 * Placed below the heading and its sentence rather than above them, which is the
 * opposite of where a set of tabs usually goes and is deliberate. Reading order
 * on every screen that carries this is *what am I looking at* → *what else can I
 * look at* → the thing itself. A strip above the heading would put five
 * destinations in front of a reader before they had been told where they already
 * were.
 *
 * The current view stays a link. A tab that becomes dead text on arrival cannot
 * be re-followed, which is the ordinary way somebody reloads a screen after
 * answering a change on it — and `aria-current` already says which one it is,
 * for the reader who cannot see the styling.
 *
 * "Every page →" sits at the end rather than in the corner of the header, where
 * four screens each kept their own wording for it. It is the way out of the
 * scope, so it belongs at the end of the list of things the scope contains.
 */
export const PageViews = ({
  treeId,
  current,
}: {
  readonly treeId: TreeId
  readonly current: PageViewKey
}) => (
  <nav
    aria-label="Views of this page"
    className="border-edge-subtle flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-3"
  >
    <ul className="flex flex-wrap items-center gap-1">
      {pageViewsFor(treeId, current).map((view) => (
        <li key={view.key}>
          <Link
            href={view.href}
            aria-current={view.current ? "page" : undefined}
            className={
              "rounded-md px-2.5 py-1 text-xs no-underline transition-colors duration-150 " +
              (view.current
                ? "bg-nav-active text-ink"
                : "text-nav-idle hover:bg-surface-hover hover:text-ink")
            }
          >
            {view.label}
          </Link>
        </li>
      ))}
    </ul>

    {/*
     * `sm:ml-auto` rather than `ml-auto`. Pushed right at every width, the way
     * out wrapped onto a line of its own on a phone and sat alone at the far
     * right of it, reading as something that had come loose from the strip
     * rather than as its last item. Below `sm` it simply follows the tabs.
     */}
    <Link href={everyPageHref(current)} className="text-ink-muted text-xs sm:ml-auto">
      Every page →
    </Link>
  </nav>
)
