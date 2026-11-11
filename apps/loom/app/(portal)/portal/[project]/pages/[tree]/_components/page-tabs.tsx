import Link from "next/link"

/** Which of a page's tabs is drawn. */
export type PageTab = "page" | "history" | "review"

/**
 * The third tab's label: *For review (N)*, or no count where the changes
 * waiting could not be read, so it never says nought for a list it could not
 * read.
 */
export const forReviewLabel = (waiting: number | undefined): string =>
  waiting === undefined ? "For review" : `For review (${waiting})`

const tabsOf = (
  waiting: number | undefined
): readonly { readonly tab: PageTab; readonly label: string; readonly path: string }[] => [
  { tab: "page", label: "The page", path: "" },
  { tab: "history", label: "Page history", path: "/history" },
  { tab: "review", label: forReviewLabel(waiting), path: "/review" },
]

/**
 * A page's tabs (`docs/portal-wireframes.md`, *5 · Pages · History*): the page
 * as it stands, its versions with what each did to its goal, and the changes
 * waiting for review on it, counted.
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
  waiting,
}: {
  readonly projectId: string
  readonly treeId: string
  readonly current: PageTab
  /** Changes waiting for review on the page, `undefined` where they could not be read. */
  readonly waiting: number | undefined
}) => (
  <nav aria-label="This page" className="border-edge-subtle flex gap-4 border-b text-sm">
    {tabsOf(waiting).map(({ tab, label, path }) => (
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
