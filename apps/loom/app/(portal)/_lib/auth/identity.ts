import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { portalAttemptLog } from "./attempt-log"
import { attemptSignIn } from "./attempt-sign-in"
import { describeAuthProblem, portalAuth } from "./config"
import { SIGN_IN_PATH } from "./paths"
import { authenticate } from "./roster"
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
 * The seam is the two readers below. Replacing the roster with an OIDC provider
 * is a change to what mints the cookie; `currentActor` and `requireActor` keep
 * their signatures, and no page or action moves.
 */

export type SignInProblem =
  | { readonly code: "not-configured"; readonly detail: string }
  | { readonly code: "rejected" }
  | { readonly code: "locked"; readonly retryAfterMs: number }
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
    case "rejected":
      /**
       * One message for a wrong key, whoever it did or did not belong to.
       * "No such reviewer" would turn the form into a way to enumerate the
       * roster.
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

  const forwardedFor = (await headers()).get("x-forwarded-for")
  const subject = await subjectFor(clientAddress(forwardedFor, trustedHops), auth.value.secret)
  const issuedAt = Date.now()

  const outcome = await attemptSignIn(
    portalAttemptLog,
    DEFAULT_THROTTLE_POLICY,
    { subject, now: issuedAt },
    () => authenticate(auth.value.reviewers, key)
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
