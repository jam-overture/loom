import Link from "next/link"

/** Which of a page's tabs is drawn. */
export type PageTab = "page" | "history"

const TABS: readonly { readonly tab: PageTab; readonly label: string; readonly path: string }[] = [
  { tab: "page", label: "The page", path: "" },
  { tab: "history", label: "Page history", path: "/history" },
]

/**
 * A page's tabs (`docs/portal-wireframes.md`, *5 · Pages · History*): the page
 * as it stands, and its versions with what each did to its goal.
 *
 * The wireframe's tab says *History*. That word alone is the former name of
 * `/portal/history` in `_lib/screen-names.ts`, which every screen is held
 * against, so the tab says *Page history*: the same subject, and no second
 * meaning for a word the portal once used for something else.
 */
export const PageTabs = ({
  projectId,
  treeId,
  current,
}: {
  readonly projectId: string
  readonly treeId: string
  readonly current: PageTab
}) => (
  <nav aria-label="This page" className="border-edge-subtle flex gap-4 border-b text-sm">
    {TABS.map(({ tab, label, path }) => (
      <Link
        key={tab}
        href={`/portal/${projectId}/pages/${treeId}${path}`}
        aria-current={tab === current ? "page" : undefined}
        className={`-mb-px border-b-2 pb-2 no-underline ${
          tab === current
            ? "border-ink text-ink"
            : "text-ink-muted hover:text-ink border-transparent"
        }`}
      >
        {label}
      </Link>
    ))}
  </nav>
)
