import type { IntentId } from "@jam-overture/loom"
import type { HeldProposal } from "@jam-overture/loom/write"

import { mayAccept, roleThatCanAccept, type Role } from "./auth/roles"
import type { ProposalGoal } from "./goals/serving"
import { pageOfCopy, type PageCopy } from "./proposing/copies"
import { holdStandingOf, type HoldStanding } from "./proposing/following"
import { ruleSentence, STAKES, type PlainState } from "./vocabulary"
import { plainMoment } from "./when"

/**
 * One change on a project's *For review* tab (0329): what was proposed, of which
 * page, why the Gate stopped, and whether the person looking may answer it.
 *
 * Its own reading rather than `waiting.ts`'s, which links each change to
 * screens unit 0 removed. The sentences it shares come from the same
 * vocabulary, so a rule or a stake is said the same way everywhere.
 *
 * A change proposed for an older version of its page says so, and whether it
 * still fits the version the site serves now (0340). It leads with the goal it
 * serves (0352), or says it names none, as a change raised before goals did.
 */
export type QueueRow = {
  readonly proposalId: string
  /** The goal's name as it was when the change was raised, `null` where none was recorded. */
  readonly goal: string | null
  /** The page it is for, whichever copy of the page it waits on. */
  readonly pageId: string
  /** The page by the name it published under, or its id where it named itself nothing. */
  readonly page: string
  readonly asked: string
  readonly askedBy: string | null
  readonly since: string
  readonly why: string
  readonly stakes: PlainState
  /** `null` where the person looking may answer it; otherwise who can. */
  readonly waitsOn: Role | null
  readonly standing: HoldStanding
  /** What the standing means, or `null` for a change made for the version the site serves. */
  readonly standingSentence: string | null
}

/** What a change's standing means for whoever answers it. Pure. */
export const standingSentenceOf = (standing: HoldStanding): string | null => {
  switch (standing) {
    case "current":
      return null
    case "stale":
      return "Proposed for an older version of this page. Your site has published a newer one since, and the change still fits it, so accepting it applies it to the newer version."
    case "conflicts":
      return "Proposed for an older version of this page. Your site has published a newer one since, and this change no longer fits it, so it can only be turned down. Loom then looks at the newer version."
  }
}

/** What a row is read against: the project's pages, copies and goals, and who is looking. */
export type QueueContext = {
  readonly names: ReadonlyMap<string, string>
  readonly role: Role
  readonly copies: readonly PageCopy[]
  readonly goals: ReadonlyMap<IntentId, ProposalGoal>
}

export const queueRowOf = (
  held: HeldProposal,
  { names, role, copies, goals }: QueueContext
): QueueRow => {
  const stake = held.disposition.stakes
  const pageId = pageOfCopy(copies, held.treeId)
  const standing = holdStandingOf(held, copies)

  return {
    proposalId: held.proposalId,
    goal: goals.get(held.intent.intentId)?.name ?? null,
    pageId,
    page: names.get(pageId) ?? pageId,
    asked: held.intent.utterance,
    askedBy: held.intent.actor ?? null,
    since: plainMoment(held.heldAt),
    why: ruleSentence(held.disposition.reason.code),
    stakes: STAKES[stake],
    waitsOn: mayAccept(role, stake) ? null : roleThatCanAccept(stake),
    standing,
    standingSentence: standingSentenceOf(standing),
  }
}
