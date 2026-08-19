import { MobileNav } from "@/components/mobile-nav"
import { Pager } from "@/components/pager"
import { Sidebar } from "@/components/sidebar"

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

    <aside className="border-edge hidden w-64 shrink-0 lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:border-r">
      <Sidebar />
    </aside>

    <main id="article" tabIndex={-1} className="min-w-0 flex-1 px-5 py-10 focus-visible:outline-none sm:px-8 lg:px-12">
      <article className="prose mx-auto w-full max-w-3xl">{children}</article>
      <div className="mx-auto w-full max-w-3xl">
        <Pager />
      </div>
    </main>
  </div>
)

export default DocsLayout
