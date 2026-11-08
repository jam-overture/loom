import type { ProposalId } from "@jam-overture/loom"

/** How many changes a page of a list shows, as every list in the portal does. */
export const CHANGES_PAGE_SIZE = 50

/** One page of a list of changes, and the change to carry on from when there are older ones. */
export type ChangesPage<TChange> = {
  readonly rows: readonly TChange[]
  readonly older: ProposalId | undefined
}

/**
 * One page of a list of changes, newest first: the changes after `before`
 * (the last one the previous page showed), and the change to carry on from
 * when there are older ones. A `before` the list does not hold starts from the
 * newest. Shared by *Accepted* and *Turned down*. Pure.
 */
export const changesPage = <TChange extends { readonly proposalId: ProposalId }>(
  changes: readonly TChange[],
  before: string | undefined
): ChangesPage<TChange> => {
  const start = changes.findIndex((change) => change.proposalId === before) + 1
  const rows = changes.slice(start, start + CHANGES_PAGE_SIZE)

  return {
    rows,
    older: changes.length > start + CHANGES_PAGE_SIZE ? rows.at(-1)?.proposalId : undefined,
  }
}
