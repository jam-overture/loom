import { MobileNav } from "@/app/(docs)/_components/mobile-nav"
import { Pager } from "@/app/(docs)/_components/pager"
import { Sidebar } from "@/app/(docs)/_components/sidebar"
import { ARTICLE_ID, railScrollerAttr } from "@/app/(docs)/_lib/chrome"

/**
 * The chrome every documentation page shares: a rail that does not move, an
 * article that does, and the pager at the foot of it.
 *
 * The pager lives here rather than at the bottom of each page for the same
 * reason the rail does — a page that forgot to include it would be a dead end,
 * and forgetting is what a layout is for.
 */
const DocsLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <div className="mx-auto flex max-w-[100rem] flex-col lg:flex-row">
    <MobileNav />

    {/*
     * The rail's scroller, and it says so: 45 pages of links do not fit in
     * `100vh - 3.5rem`, so the rail scrolls itself to the page a reader is on
     * and needs to be told which element to move. `_lib/chrome.ts` is why that
     * is an attribute rather than something script works out.
     */}
    <aside
      {...railScrollerAttr}
      className="border-edge hidden w-64 shrink-0 lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:border-r"
    >
      <Sidebar />
    </aside>

    <main id={ARTICLE_ID} tabIndex={-1} className="min-w-0 flex-1 px-5 py-10 focus-visible:outline-none sm:px-8 lg:px-12">
      <article className="prose mx-auto w-full max-w-3xl">{children}</article>
      <div className="mx-auto w-full max-w-3xl">
        <Pager />
      </div>
    </main>
  </div>
)

export default DocsLayout
