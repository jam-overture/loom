import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"

/**
 * A page, named — with its id kept beside the name rather than replaced by it.
 *
 * The pairing is the whole component, and it is why this is one file rather than
 * two spreads on five screens. Every place the portal names a page owes a reader
 * both halves:
 *
 * - **the name**, so they know which of their pages this is, and
 * - **the id**, so they can say which page this is to a log, a support thread,
 *   or the `tree=` in a URL.
 *
 * Dropping the second is the failure this component exists to make impossible.
 * The portal spent a fortnight printing only the id, and the fix for that is not
 * printing only the name — 22 August settled that identity is not technical
 * detail and does not go behind a disclosure. Both, always, in a fixed order:
 * the words first, the identifier under or after them, quieter and in monospace.
 *
 * ## Two layouts, because a row and a sentence are different shapes
 *
 * `stacked` is for a list of pages, where the name is the row's subject and the
 * id belongs on the line under it. `inline` is for a line of metadata that
 * already runs on one line — the front door's waiting cards, where the page is
 * one fact among the asker and the time.
 *
 * The `title` attribute carries the full name on both, because a long headline
 * is truncated to fit a row and the untruncated text should still be reachable
 * without opening the page.
 */
export const PageName = ({
  page,
  layout = "stacked",
}: {
  readonly page: PageNameValue
  readonly layout?: "stacked" | "inline"
}) =>
  layout === "inline" ? (
    <>
      <span title={page.name}>{page.name}</span> <span className="font-mono">{page.treeId}</span>
    </>
  ) : (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm" title={page.name}>
        {page.name}
      </span>
      <span className="text-ink-muted truncate font-mono text-2xs">{page.treeId}</span>
    </span>
  )
