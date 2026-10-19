import type { ProjectId } from "@jam-overture/loom/store"

import type { AccountStore, Actor } from "./accounts"
import type { Membership, MembershipStore, Role } from "./roles"

/**
 * Accounts and memberships in the process, which is the reference
 * implementation and **not** a way to sign in without a database.
 *
 * It starts empty and nothing outside this process can put a row in it: a key
 * is minted by a command (`pnpm portal:account`) that writes to Postgres, and a
 * second process's memory is not somewhere it can write to. So a deployment
 * with no `DATABASE_URL` admits nobody, and `identity.ts` says that in those
 * words rather than letting it arrive as *that key was not recognised*.
 *
 * That is a change from the roster, which worked without a database because it
 * was configuration. It is the cost of an account being a row (0285), it is
 * stated rather than worked around, and the alternative — seeding accounts from
 * an environment variable — is the roster with extra steps.
 *
 * What this is for is the contract suite: the two implementations are held to
 * the same behaviour, and the fast one is the one every test but the Postgres
 * suite runs against.
 */
export const memoryAccountStore = (): AccountStore => {
  const digests = new Map<string, Actor>()

  return {
    actorWithDigest: (digest) => Promise.resolve({ ok: true, value: digests.get(digest) ?? null }),

    put: (actor, digest, _at) => {
      /**
       * The previous key stops working, which is what replacing one means
       * (0285). Postgres gets this from the unique index on the digest; here it
       * has to be done by hand, and a map that only ever added would leave an
       * actor's old key signing them in for ever.
       */
      for (const [existing, held] of digests) {
        if (held === actor) digests.delete(existing)
      }

      digests.set(digest, actor)

      return Promise.resolve({ ok: true, value: undefined })
    },
  }
}

const keyOf = (actor: Actor, projectId: ProjectId): string => `${actor} ${projectId}`

export const memoryMembershipStore = (): MembershipStore => {
  const roles = new Map<string, Membership>()

  return {
    roleIn: (actor, projectId) =>
      Promise.resolve({ ok: true, value: roles.get(keyOf(actor, projectId))?.role ?? null }),

    projectsOf: (actor) =>
      Promise.resolve({
        ok: true,
        value: [...roles.values()].filter((membership) => membership.actor === actor),
      }),

    put: (membership) => {
      roles.set(keyOf(membership.actor, membership.projectId), membership)

      return Promise.resolve({ ok: true, value: undefined })
    },

    remove: (actor, projectId) => {
      roles.delete(keyOf(actor, projectId))

      return Promise.resolve({ ok: true, value: undefined })
    },
  }
}

export type { Role }
