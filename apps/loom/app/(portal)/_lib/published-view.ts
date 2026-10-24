import type { PublishedPage } from "@/app/_lib/pages/published"

import { pageNameOf } from "./page-name"
import { plainMoment } from "./when"

/**
 * What a project's *Pages* screen says about one page its site published
 * (0312 clause 6), as a function of what the store kept.
 *
 * The name is the page's own leading heading (`page-name.ts`), and the id
 * stays beside it for that module's reason: the name says which page this is
 * to a person, the id says it to anything else.
 */
export type PublishedRow = {
  readonly name: string
  /** Whether the page named itself, so the screen can set *Untitled page* apart. */
  readonly derived: boolean
  readonly treeId: string
  readonly revision: number
  readonly received: string
}

export const publishedRowOf = ({ tree, receivedAt }: PublishedPage): PublishedRow => {
  const { name, derived, treeId } = pageNameOf(tree)

  return {
    name,
    derived,
    treeId,
    revision: tree.revision,
    received: plainMoment(new Date(receivedAt).toISOString()),
  }
}
