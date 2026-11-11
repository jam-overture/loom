import Link from "next/link"

import { UNTITLED } from "@/app/(portal)/_lib/page-name"

/**
 * What every tab of a page leads with: the way back to *Pages*, the page's
 * name and its id beneath. A page that named itself nothing is *Untitled
 * page*, in italics, as the portal speaking rather than the page
 * (`_lib/page-name.ts`); the id beneath is shown either way.
 */
export const PageHeading = ({
  projectId,
  pageId,
  name,
}: {
  readonly projectId: string
  readonly pageId: string
  /** The name the page published under, `undefined` where it gave none. */
  readonly name: string | undefined
}) => (
  <div className="flex flex-col gap-2">
    <Link
      href={`/portal/${projectId}/pages`}
      className="text-ink-muted self-start text-xs no-underline hover:underline"
    >
      ← Pages
    </Link>
    <h1
      className={name === undefined ? "text-ink-muted text-2xl italic" : "text-2xl tracking-tight"}
    >
      {name ?? UNTITLED}
    </h1>
    <p className="text-ink-muted font-mono text-xs">{pageId}</p>
  </div>
)
