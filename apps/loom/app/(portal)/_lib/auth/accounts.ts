import { z } from "zod"

/**
 * Who may sign in, as rows rather than as configuration.
 *
 * This is the half of [0285](../../../../../../decisions/0285-an-account-is-a-row-with-a-minted-key-and-a-role-is-a-ceiling-on-the-gates-own-scale.md)
 * that has no database in it: what an account is, what a key looks like, how
 * one is minted and how a presented key is turned into a digest to look up.
 * The table is `accounts-postgres.ts`, and the split is the one `attempts.ts`
 * and `attempts-postgres.ts` already make — the decisions are testable without
 * a database, and the driver holds no decisions.
 *
 * ## The key is minted here and never chosen
 *
 * A chosen key is a password, and a password needs a password's storage —
 * something deliberately slow, which means a native dependency in a module that
 * also runs on the edge. A minted key is 128 bits of generated entropy, which
 * has no dictionary to run against it and no rainbow table that reaches it, so
 * a plain digest is enough and stays enough.
 *
 * It is shown once. There is nowhere to read it back from, because the row
 * holds the digest and the digest is one way.
 */

/**
 * An actor id is stored in provenance and rendered in the portal, so it is kept
 * to characters that survive both without escaping. An email address fits,
 * which is what a person will reach for first.
 *
 * The same pattern the roster enforced, carried over deliberately: the ids that
 * exist were written under it, and a row whose actor no longer parses would be
 * provenance nobody can attribute.
 */
export const actorSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._@+-]{1,63}$/, "is not a usable actor id")
  .brand<"Actor">()

export type Actor = z.infer<typeof actorSchema>

/**
 * Sixteen bytes, hex — the same shape `openssl rand -hex 16` produces, which is
 * what the roster's minimum length was chosen to admit.
 */
export const KEY_LENGTH = 32

export const keySchema = z.string().regex(new RegExp(`^[0-9a-f]{${KEY_LENGTH}}$`))

/**
 * A new key, from the platform's randomness and nowhere else.
 *
 * `crypto.getRandomValues` rather than `Math.random`, for the reason that needs
 * no explaining and every reason to be stated where somebody might economise:
 * this value is the whole credential.
 */
export const mintKey = (): string => {
  const bytes = new Uint8Array(KEY_LENGTH / 2)
  crypto.getRandomValues(bytes)

  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

const textEncoder = new TextEncoder()

/**
 * What is stored, and what a presented key is compared as.
 *
 * SHA-256, unsalted and unkeyed. Unsalted because the input is already unique
 * and unguessable, so a salt would defend against a precomputation that cannot
 * be performed. Unkeyed because keying it with the session secret would mean
 * that rotating that secret locks every account out for ever, rather than
 * merely ending every session — a difference between an inconvenience and an
 * unrecoverable deployment.
 */
export const digestOf = async (key: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(key))

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export type Account = {
  readonly actor: Actor
  readonly createdAt: number
}

export type AccountStoreError = {
  readonly code: "unavailable"
  readonly detail: string
}

export type AccountResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: AccountStoreError }

/**
 * What sign-in needs, and nothing else.
 *
 * Deliberately not a users store. There is no listing, no deactivation and no
 * rename, because 0285 built no lifecycle and the roster's warning about
 * implying one it cannot keep outlived the roster.
 */
export interface AccountStore {
  /**
   * The actor whose key this is, or `null`.
   *
   * Takes a **digest** rather than a key, so that the one place a key is turned
   * into a digest is above every implementation of this rather than inside each
   * one. A store that hashed differently from the one that wrote the row would
   * reject every correct key, and the failure would read as *that key was not
   * recognised*.
   */
  readonly actorWithDigest: (digest: string) => Promise<AccountResult<Actor | null>>
  /**
   * Create the account, or replace the key of one that exists.
   *
   * Replacing rather than refusing is the whole of what key rotation is here:
   * minting a second key for an actor ends the first. There is no screen for
   * it and no record of the one it replaced.
   */
  readonly put: (actor: Actor, digest: string, at: number) => Promise<AccountResult<void>>
}
