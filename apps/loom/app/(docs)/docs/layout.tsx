import { MobileNav } from "@/app/(docs)/_components/mobile-nav"
import { OnThisPage } from "@/app/(docs)/_components/on-this-page"
import { Pager } from "@/app/(docs)/_components/pager"
import { Sidebar } from "@/app/(docs)/_components/sidebar"
import { ARTICLE_ID, railScrollerAttr } from "@/app/(docs)/_lib/chrome"

/**
 * The chrome every documentation page shares: a rail that does not move, an
 * article that does, the pager at the foot of it, and a second rail saying what
 * is in the page.
 *
 * The pager lives here rather than at the bottom of each page for the same
 * reason the rail does — a page that forgot to include it would be a dead end,
 * and forgetting is what a layout is for. The contents rail is here for that
 * reason and one more: it is the same component on all thirty-one written
 * pages, because it reads the page it is beside rather than being told about
 * it.
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

    {/*
     * The contents rail, and the column is reserved whether or not there is one
     * to put in it.
     *
     * `OnThisPage` renders nothing on a page with no sections to list, which is
     * every page of the API reference. Letting the column collapse there would
     * mean the prose sat in a different place on a reference page than on a
     * written one, and would move it sideways on a written page the moment the
     * rail arrived. An empty column of furniture costs a reader nothing; prose
     * that shifts under them costs them their place.
     *
     * It is narrower than the rail on the left because its rows are a few words
     * each rather than page titles, and because what it takes it takes off the
     * measure of the prose.
     */}
    <aside className="hidden w-56 shrink-0 xl:sticky xl:top-14 xl:block xl:h-[calc(100vh-3.5rem)] xl:overflow-y-auto">
      <OnThisPage />
    </aside>
  </div>
)

export default DocsLayout
