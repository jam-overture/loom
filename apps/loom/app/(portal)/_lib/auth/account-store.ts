import { portalDatabase } from "../database"

import type { AccountStore } from "./accounts"
import { memoryAccountStore, memoryMembershipStore } from "./accounts-memory"
import { postgresAccountStore, postgresMembershipStore } from "./accounts-postgres"
import type { MembershipStore } from "./roles"

/**
 * The accounts and memberships this deployment uses: Postgres when one is
 * configured, memory when not — the same choice `store.ts` and `attempt-log.ts`
 * make, from the same handle.
 *
 * Unlike those two, **the memory side is not a supported way to run**. An
 * account is a row and the command that mints one writes to Postgres, so a
 * deployment without a database has an accounts table nobody can put anything
 * in. `hasAccounts` is how `identity.ts` tells that state apart from a wrong
 * key, and it is the whole reason this module exports a flag beside the stores.
 *
 * Memoised on a global carrier for the reason the attempt log is: a module
 * re-evaluated between requests would hand out a fresh, empty map, and on the
 * memory side that is the difference between a store and a leak.
 */
const ACCOUNTS_KEY = Symbol.for("loom.portal.accounts")
const MEMBERSHIPS_KEY = Symbol.for("loom.portal.memberships")

type Carrier = {
  [ACCOUNTS_KEY]?: AccountStore
  [MEMBERSHIPS_KEY]?: MembershipStore
}

const carrier = globalThis as unknown as Carrier

export const portalAccounts: AccountStore = (carrier[ACCOUNTS_KEY] ??=
  portalDatabase === undefined ? memoryAccountStore() : postgresAccountStore(portalDatabase))

export const portalMemberships: MembershipStore = (carrier[MEMBERSHIPS_KEY] ??=
  portalDatabase === undefined ? memoryMembershipStore() : postgresMembershipStore(portalDatabase))

/**
 * Whether this deployment has anywhere an account could have been created.
 *
 * Not *whether any account exists* — that is a question for the table, it
 * changes between requests, and asking it on every sign-in would put a count in
 * front of a form anyone on the internet can reach. This is the configuration
 * fact, and it is the one that produces an actionable message.
 */
export const hasAccounts = portalDatabase !== undefined
