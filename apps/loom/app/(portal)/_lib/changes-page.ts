import type { ProposalId } from "@jam-overture/loom"

/** How many changes a page of a list shows, as every list in the portal does. */
export const CHANGES_PAGE_SIZE = 50

/**
 * Where the page before this one starts: after the change `before` names, or
 * from the newest when `before` is `undefined`.
 */
export type NewerChanges = { readonly before: ProposalId | undefined }

/** One page of a list of changes, where it sits in the list, and the pages either side. */
export type ChangesPage<TChange> = {
  readonly rows: readonly TChange[]
  /** 1-based, and 0 for an empty list. */
  readonly first: number
  readonly last: number
  /** `undefined` on the first page. */
  readonly newer: NewerChanges | undefined
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
  const newerStart = start - CHANGES_PAGE_SIZE

  return {
    rows,
    first: rows.length === 0 ? 0 : start + 1,
    last: start + rows.length,
    newer:
      start === 0
        ? undefined
        : { before: newerStart <= 0 ? undefined : changes[newerStart - 1]?.proposalId },
    older: changes.length > start + CHANGES_PAGE_SIZE ? rows.at(-1)?.proposalId : undefined,
  }
}

/** The address of the page before this one, `undefined` on the first. */
export const newerHref = (here: string, newer: NewerChanges | undefined): string | undefined =>
  newer === undefined
    ? undefined
    : newer.before === undefined
      ? here
      : `${here}?before=${newer.before}`

/** The address of the page after this one, `undefined` on the last. */
export const olderHref = (here: string, older: ProposalId | undefined): string | undefined =>
  older === undefined ? undefined : `${here}?before=${older}`
