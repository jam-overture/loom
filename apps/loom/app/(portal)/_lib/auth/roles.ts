import { z } from "zod"

import { isAbove, type StakeLevel } from "@jam-overture/loom"
import type { ProjectId } from "@jam-overture/loom/store"

import type { Actor, AccountResult } from "./accounts"

/**
 * What an actor may release, in one project.
 *
 * A role is **an acceptance ceiling on the Gate's own stake scale**, and that
 * is the whole of what it is
 * ([0285](../../../../../../decisions/0285-an-account-is-a-row-with-a-minted-key-and-a-role-is-a-ceiling-on-the-gates-own-scale.md)).
 * There is no second permission system here: the Gate already weighs a change
 * on four levels and already carries a per-origin ceiling over them, so a role
 * is the same shape with an actor where the origin is. One vocabulary of
 * authority rather than two that can disagree.
 *
 * The comparison below is `isAbove` from the runtime, not a copy of it. A
 * portal that ranked the four levels itself would be a second piece of
 * arithmetic to keep in step with the one that decides whether a change is held
 * at all.
 */

export const roleSchema = z.enum(["viewer", "approver", "owner"])
export type Role = z.infer<typeof roleSchema>

/**
 * The highest stake an actor holding this role may accept, or `null` for a role
 * that may accept nothing.
 *
 * `null` rather than a level below `low`, because *may accept nothing* is a
 * different statement from *may accept the least consequential things*, and the
 * scale has no member for the first. A viewer is not a weak approver.
 */
export const ceilingOf = (role: Role): StakeLevel | null => {
  switch (role) {
    case "viewer":
      return null
    case "approver":
      return "medium"
    case "owner":
      return "critical"
  }
}

/**
 * Whether this role may release a change the Gate weighed at this level.
 *
 * The one question a role answers. Everything a screen says about authority —
 * *waiting on you*, *waiting on an owner* — is this function and the role that
 * would answer `true`.
 */
export const mayAccept = (role: Role, stake: StakeLevel): boolean => {
  const ceiling = ceilingOf(role)

  return ceiling !== null && !isAbove(stake, ceiling)
}

/**
 * The least role that could release this change, which is what a screen tells
 * somebody who cannot.
 *
 * Returns `owner` for a level nothing can accept rather than `null`, because
 * there is no such level today and a function that answered *nobody* would be
 * read as *this is stuck* by a surface that cannot check.
 */
export const roleThatCanAccept = (stake: StakeLevel): Role =>
  mayAccept("approver", stake) ? "approver" : "owner"

/**
 * Deleting the project, its credentials and its policy.
 *
 * Not on the stake scale, because none of them is a change to a tree — so they
 * cannot be a ceiling and are an `owner` test instead. This is the one place
 * the role means something other than a ceiling, and keeping it to one named
 * function is what stops it becoming the second permission system 0285 refuses.
 */
export const mayAdminister = (role: Role): boolean => role === "owner"

export type Membership = {
  readonly actor: Actor
  readonly projectId: ProjectId
  readonly role: Role
}

/**
 * Where a role is read from.
 *
 * Per request, against the row, rather than out of the session token — a role
 * in a bearer token is a role that goes on working for twelve hours after it is
 * taken away (`session.ts`, and 0285 clause 6).
 */
export interface MembershipStore {
  /** The actor's role in this project, or `null` where they have none. */
  readonly roleIn: (actor: Actor, projectId: ProjectId) => Promise<AccountResult<Role | null>>
  /** Every project this actor holds a role in, which is what the workspace lists. */
  readonly projectsOf: (actor: Actor) => Promise<AccountResult<readonly Membership[]>>
  readonly put: (membership: Membership) => Promise<AccountResult<void>>
  readonly remove: (actor: Actor, projectId: ProjectId) => Promise<AccountResult<void>>
}
