import type { HeldProposal } from "@jam-overture/loom/write"

import { mayAccept, roleThatCanAccept, type Role } from "./auth/roles"
import { ruleSentence, STAKES, type PlainState } from "./vocabulary"
import { plainMoment } from "./when"

/**
 * One change on a project's *Waiting* tab (0329): what was asked, of which
 * page, why the Gate stopped, and whether the person looking may answer it.
 *
 * Its own reading rather than `waiting.ts`'s, which links each change to
 * screens unit 0 removed. The sentences it shares come from the same
 * vocabulary, so a rule or a stake is said the same way everywhere.
 */
export type QueueRow = {
  readonly proposalId: string
  readonly treeId: string
  /** The page by the name it published under, or its id where it named itself nothing. */
  readonly page: string
  readonly asked: string
  readonly askedBy: string | null
  readonly since: string
  readonly why: string
  readonly stakes: PlainState
  /** `null` where the person looking may answer it; otherwise who can. */
  readonly waitsOn: Role | null
}

export const queueRowOf = (
  held: HeldProposal,
  names: ReadonlyMap<string, string>,
  role: Role
): QueueRow => {
  const stake = held.disposition.stakes

  return {
    proposalId: held.proposalId,
    treeId: held.treeId,
    page: names.get(held.treeId) ?? held.treeId,
    asked: held.intent.utterance,
    askedBy: held.intent.actor ?? null,
    since: plainMoment(held.heldAt),
    why: ruleSentence(held.disposition.reason.code),
    stakes: STAKES[stake],
    waitsOn: mayAccept(role, stake) ? null : roleThatCanAccept(stake),
  }
}
