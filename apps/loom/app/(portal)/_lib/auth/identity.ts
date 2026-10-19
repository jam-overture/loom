import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import type { ProjectId } from "@jam-overture/loom/store"

import { hasAccounts, portalAccounts, portalMemberships } from "./account-store"
import { actorSchema, digestOf, type Actor } from "./accounts"
import { portalAttemptLog } from "./attempt-log"
import { attemptSignIn } from "./attempt-sign-in"
import { describeAuthProblem, portalAuth } from "./config"
import { SIGN_IN_PATH, WORKSPACE_PATH } from "./paths"
import { mayAdminister, type Role } from "./roles"
import { mintSession, readSession, SESSION_COOKIE, SESSION_TTL_MS } from "./session"
import { clientAddress, resolveTrustedHops, subjectFor } from "./subject"
import { DEFAULT_THROTTLE_POLICY, describeWait } from "./throttle"

/**
 * Who is asking, as the rest of the portal sees it.
 *
 * Every caller gets an actor from here and from nowhere else. Nothing accepts an
 * actor as an argument from a form, a header, or a query string — that is the
 * whole rule (0027), and it is why this module has no function that takes a
 * claimed identity and believes it.
 *
 * The seam is the two readers below. Replacing what authenticates a person is a
 * change to what mints the cookie; `currentActor` and `requireActor` keep their
 * signatures, and no page or action moves. 0285 is the first time that promise
 * was tested — the roster became a table and neither signature moved.
 *
 * **Authorisation is separate from identity, and is beneath this comment
 * rather than inside it.** `roleOf` and `requireRole` are new readers beside
 * the two, not a change to them: who you are does not depend on a project, and
 * what you may do does.
 */

export type SignInProblem =
  | { readonly code: "not-configured"; readonly detail: string }
  | { readonly code: "rejected" }
  | { readonly code: "locked"; readonly retryAfterMs: number }
  /**
   * There is nowhere for an account to exist, so there is nothing to check a
   * key against. Distinct from `rejected` deliberately: a deployment with no
   * database is a thing an operator fixes, and reporting it as a wrong key
   * would send them looking for a key that was never the problem.
   */
  | { readonly code: "no-accounts" }
  /**
   * Carries no detail, deliberately. `attemptSignIn` knows why the log could not
   * answer and this is the boundary where that stops travelling: the caller is
   * unauthenticated, and a database error message is a description of somebody
   * else's infrastructure.
   */
  | { readonly code: "unavailable" }

export type SignInResult =
  | { readonly ok: true; readonly actor: string }
  | { readonly ok: false; readonly error: SignInProblem }

/**
 * What a visitor is told. One message per problem, and none of them says
 * anything a caller could not already establish by trying again.
 */
export const describeSignInProblem = (problem: SignInProblem): string => {
  switch (problem.code) {
    case "not-configured":
      return problem.detail
    case "no-accounts":
      return (
        "This deployment has no database, so it has no accounts to sign in to. " +
        "Set DATABASE_URL, run db:push, and mint an account with: pnpm portal:account <actor>"
      )
    case "rejected":
      /**
       * One message for a wrong key, whoever it did or did not belong to.
       * "No such account" would turn the form into a way to enumerate the
       * accounts table.
       */
      return "That key was not recognised."
    case "locked":
      return `Too many failed attempts. Try again in ${describeWait(problem.retryAfterMs)}.`
    case "unavailable":
      /**
       * Fixed text, and none of it from the database. An operator gets the
       * likely cause and the fix — the same trade the missing-variable message
       * above makes — while the caller learns nothing about what is behind
       * this portal.
       */
      return (
        "Sign-in is unavailable: this attempt could not be recorded, and it will not " +
        "be allowed uncounted. If this deployment was just updated, run db:push."
      )
  }
}

/**
 * The signed-in actor, or `null`. Never redirects, so a page that renders
 * differently for a visitor can ask without being sent away.
 */
export const currentActor = async (): Promise<string | null> => {
  if (!portalAuth.ok) return null

  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await readSession(token, portalAuth.value.secret, Date.now())

  return session.ok ? session.value.actor : null
}

/**
 * The signed-in actor, or a redirect to sign in.
 *
 * Used by every page and every server action. The middleware guard already
 * turns an unauthenticated request away, but a server action is a POST to a
 * route the matcher can be edited out from under, and a session can expire
 * between rendering a form and submitting it. The check that produces the value
 * is the one that cannot drift from the check that permits the request.
 */
export const requireActor = async (returnTo?: string): Promise<string> => {
  const actor = await currentActor()
  if (actor !== null) return actor

  redirect(returnTo ? `${SIGN_IN_PATH}?from=${encodeURIComponent(returnTo)}` : SIGN_IN_PATH)
}

/**
 * What this actor may do in this project, or `null` where they hold no role in
 * it.
 *
 * Read per request, against the row — never out of the session token, which
 * carries the actor and nothing else on purpose (`session.ts`, 0285 clause 6).
 * A role in a bearer token keeps working for twelve hours after it is taken
 * away.
 *
 * `undefined` is the third answer and is not the same as `null`: the store
 * could not say. A caller that treated it as *no role* would fail open the
 * moment the database hiccuped, which is the one direction 0027 does not let
 * this portal fail.
 */
export const roleOf = async (
  actor: Actor,
  projectId: ProjectId
): Promise<Role | null | undefined> => {
  const held = await portalMemberships.roleIn(actor, projectId)

  return held.ok ? held.value : undefined
}

/**
 * The actor's role in this project, or a redirect — the authorisation twin of
 * `requireActor`, and the one a page under `/portal/[project]` opens with.
 *
 * Sends an actor with no role to the workspace rather than to sign-in: they are
 * signed in, and a sign-in page would invite them to present the same key
 * again and arrive in the same place. A store that cannot answer is the same
 * redirect, because a page that cannot establish what somebody may do must not
 * render as though they may do nothing — the difference is invisible on screen
 * and the second is a lie.
 */
export const requireRole = async (projectId: ProjectId): Promise<Role> => {
  const actor = await requireActor()
  const role = await roleOf(parseActor(actor), projectId)

  if (role === null || role === undefined) redirect(WORKSPACE_PATH)

  return role
}

/**
 * The administering roles, as one call a screen can make without learning what
 * the scale is.
 */
export const requireOwner = async (projectId: ProjectId): Promise<Role> => {
  const role = await requireRole(projectId)

  if (!mayAdminister(role)) redirect(WORKSPACE_PATH)

  return role
}

/**
 * An actor id out of a session, as the branded type the stores take.
 *
 * The cast is safe for the reason nothing else in this file is allowed to
 * assume: the value came out of a token this deployment signed, and it was
 * parsed by this schema before it was ever put in one. A session whose actor no
 * longer parses is a token signed by a build that admitted something this one
 * does not, and it fails closed rather than reaching a query.
 */
const parseActor = (actor: string): Actor => {
  const parsed = actorSchema.safeParse(actor)

  if (!parsed.success) redirect(SIGN_IN_PATH)

  return parsed.data
}

/**
 * Read once, by name, for the reason `config.ts` gives: this module is bundled,
 * and a bundler inlines `process.env.NAME` but cannot see an index expression.
 */
const trustedHops = resolveTrustedHops(process.env.LOOM_PORTAL_TRUSTED_PROXY_HOPS)

/**
 * A sign-in attempt, throttled.
 *
 * This function's job is to turn a web request into the four things
 * `attemptSignIn` needs — a subject, a clock, a log and a way to check a key —
 * and to mint a cookie if it says yes. The decision itself is not made here,
 * which is what keeps the order of operations under test.
 */
export const signIn = async (key: string): Promise<SignInResult> => {
  const auth = portalAuth

  if (!auth.ok) {
    return { ok: false, error: { code: "not-configured", detail: describeAuthProblem(auth.error) } }
  }

  /**
   * Before the throttle rather than after it. A caller cannot be locked out of
   * a deployment that could never have admitted them, and an operator reading
   * this message should not have to wait out a lockout to see it.
   */
  if (!hasAccounts) return { ok: false, error: { code: "no-accounts" } }

  const forwardedFor = (await headers()).get("x-forwarded-for")
  const subject = await subjectFor(clientAddress(forwardedFor, trustedHops), auth.value.secret)
  const issuedAt = Date.now()

  const outcome = await attemptSignIn(
    portalAttemptLog,
    DEFAULT_THROTTLE_POLICY,
    { subject, now: issuedAt },
    /**
     * The key never leaves this closure and the store never sees it: what is
     * looked up is its digest, which is also what the row holds. So the one
     * place a key becomes a digest is here, above every implementation, and a
     * store cannot be the reason two of them disagree about what a key is.
     */
    async () => {
      const found = await portalAccounts.actorWithDigest(await digestOf(key))

      return found.ok ? { ok: true, actor: found.value } : { ok: false, detail: found.error.detail }
    }
  )

  if (outcome.code === "locked") {
    return { ok: false, error: { code: "locked", retryAfterMs: outcome.retryAfterMs } }
  }

  if (outcome.code === "unavailable") return { ok: false, error: { code: "unavailable" } }
  if (outcome.code === "rejected") return { ok: false, error: { code: "rejected" } }

  const actor = outcome.actor

  ;(await cookies()).set({
    name: SESSION_COOKIE,
    value: await mintSession(actor, issuedAt, auth.value.secret),
    httpOnly: true,
    sameSite: "lax",
    /**
     * `secure` off in development only, because localhost is served over http
     * and a Secure cookie there is silently never sent — which reads as a
     * sign-in that succeeds and does nothing.
     */
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })

  return { ok: true, actor }
}

export const signOut = async (): Promise<void> => {
  ;(await cookies()).delete(SESSION_COOKIE)
}
