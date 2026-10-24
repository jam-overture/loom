import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import type { ProjectId } from "@jam-overture/loom/store"

import { hasAccounts, portalAccounts, portalMemberships } from "./account-store"
import { actorSchema, digestOf, type Actor } from "./accounts"
import { portalAttemptLog } from "./attempt-log"
import { attemptSignIn, type VerifyKey } from "./attempt-sign-in"
import { describeAuthProblem, portalAuth } from "./config"
import { readAllowedEmails, type Credentials } from "./credentials"
import {
  readPasswordAuthConfig,
  supabasePasswordAuth,
  SUPABASE_ANON_KEY_KEY,
  SUPABASE_URL_KEY,
  type PasswordAuthError,
  type SignUpOutcome,
} from "./password-auth"
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
  /** The password was right and the address has not been confirmed from its inbox yet (0310). */
  | { readonly code: "unconfirmed" }
  /** The password provider asked us to slow down. Not counted: it is not the caller's guess. */
  | { readonly code: "busy" }

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
      return "That was not recognised. Check it and try again."
    case "unconfirmed":
      return "Confirm your address first: follow the link in the email we sent when you signed up."
    case "busy":
      return "Too many attempts just now. Wait a minute and try again."
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

/** Who holds passwords, or `undefined` until the deployment names a provider (0310). */
const passwordAuth = (() => {
  const config = readPasswordAuthConfig({
    [SUPABASE_URL_KEY]: process.env.LOOM_SUPABASE_URL,
    [SUPABASE_ANON_KEY_KEY]: process.env.LOOM_SUPABASE_ANON_KEY,
  })

  return config === undefined ? undefined : supabasePasswordAuth(config)
})()

/** Whether a deployment can take passwords at all, for the screens that offer them. */
export const passwordsOffered = passwordAuth !== undefined

/** Who may have an account here. Unset is nobody — see `readAllowedEmails`. */
const allowedEmails = readAllowedEmails(process.env.LOOM_PORTAL_EMAILS)

const describePasswordAuthMissing = (): string =>
  `Passwords are not set up on this deployment: ${SUPABASE_URL_KEY} and ` +
  `${SUPABASE_ANON_KEY_KEY} name the Supabase project that holds them.`

/** The session cookie for an actor the portal has just established. */
const startSession = async (actor: string, issuedAt: number, secret: string): Promise<void> => {
  ;(await cookies()).set({
    name: SESSION_COOKIE,
    value: await mintSession(actor, issuedAt, secret),
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
}

/**
 * A sign-in attempt, throttled, whatever the credential is.
 *
 * This function's job is to turn a web request into the four things
 * `attemptSignIn` needs — a subject, a clock, a log and a way to check the
 * credential — and to mint a cookie if it says yes. The decision itself is not
 * made here, which is what keeps the order of operations under test. A key and
 * a password differ only in `verify`, and in how a failure to check one is
 * said (`unverified`).
 */
const throttledSignIn = async <TFailure>(
  verify: VerifyKey<TFailure>,
  unverified: (failure: TFailure) => SignInProblem
): Promise<SignInResult> => {
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
    verify
  )

  switch (outcome.code) {
    case "locked":
      return { ok: false, error: { code: "locked", retryAfterMs: outcome.retryAfterMs } }
    case "unavailable":
      return { ok: false, error: { code: "unavailable" } }
    case "unverified":
      return { ok: false, error: unverified(outcome.failure) }
    case "rejected":
      return { ok: false, error: { code: "rejected" } }
    case "accepted":
      await startSession(outcome.actor, issuedAt, auth.value.secret)

      return { ok: true, actor: outcome.actor }
  }
}

/**
 * Signing in with a minted key (0285), which stays as the way in for an
 * account the command line made.
 */
export const signIn = (key: string): Promise<SignInResult> =>
  throttledSignIn<string>(
    /**
     * The key never leaves this closure and the store never sees it: what is
     * looked up is its digest, which is also what the row holds. So the one
     * place a key becomes a digest is here, above every implementation, and a
     * store cannot be the reason two of them disagree about what a key is.
     */
    async () => {
      const found = await portalAccounts.actorWithDigest(await digestOf(key))

      return found.ok
        ? { ok: true, actor: found.value }
        : { ok: false, failure: found.error.detail }
    },
    () => ({ code: "unavailable" })
  )

/**
 * Signing in with an email address and a password (0310).
 *
 * The provider checks the password; this checks the address is one the
 * deployment lets in. **An address that is not allowed is a wrong password**,
 * counted by the throttle and answered with the same sentence, because an
 * account can exist at the provider that this deployment never offered — made
 * against its public key from outside the form — and telling its owner
 * *allowed or not* would be telling them which addresses are.
 */
export const signInWithPassword = (credentials: Credentials): Promise<SignInResult> => {
  const auth = passwordAuth

  if (auth === undefined) {
    return Promise.resolve({
      ok: false,
      error: { code: "not-configured", detail: describePasswordAuthMissing() },
    })
  }

  return throttledSignIn<PasswordAuthError>(
    async () => {
      const checked = await auth.signIn(credentials)

      if (checked.ok) {
        return { ok: true, actor: allowedEmails.has(checked.value) ? checked.value : null }
      }

      return checked.error.code === "rejected"
        ? { ok: true, actor: null }
        : { ok: false, failure: checked.error }
    },
    (failure) => passwordProblem(failure)
  )
}

/** A provider's failure as the problem a sign-in form says. */
const passwordProblem = (failure: PasswordAuthError): SignInProblem => {
  switch (failure.code) {
    case "unconfirmed":
      return { code: "unconfirmed" }
    case "busy":
      return { code: "busy" }
    default:
      return { code: "unavailable" }
  }
}

/**
 * Opening an account, for an address the deployment lets in.
 *
 * An address it does not let in is told so plainly. Unlike signing in, this
 * says nothing about who has an account — only who may make one, which is the
 * deployment's policy rather than anybody's secret.
 */
export type SignUpResult =
  | { readonly ok: true; readonly outcome: SignUpOutcome }
  | { readonly ok: false; readonly detail: string }

export const signUp = async (
  credentials: Credentials,
  confirmTo: string
): Promise<SignUpResult> => {
  const auth = passwordAuth

  if (auth === undefined) return { ok: false, detail: describePasswordAuthMissing() }
  if (!allowedEmails.has(credentials.email)) {
    return { ok: false, detail: "This deployment is not taking new accounts for that address." }
  }

  const made = await auth.signUp(credentials, confirmTo)

  if (made.ok) return { ok: true, outcome: made.value }

  switch (made.error.code) {
    case "taken":
      return {
        ok: false,
        detail: "That address already has an account. Sign in, or reset its password.",
      }
    case "weak":
      return { ok: false, detail: made.error.detail }
    case "busy":
      return { ok: false, detail: "Too many attempts just now. Wait a minute and try again." }
    default:
      return { ok: false, detail: "Accounts cannot be made right now. Try again in a moment." }
  }
}

/**
 * Asking for a recovery link.
 *
 * **Always the same answer**, sent or not, so the form cannot be asked which
 * addresses have accounts. An address the deployment does not let in is never
 * passed to the provider at all, so the form cannot be used to send mail to
 * strangers either.
 */
export const requestRecovery = async (email: Actor, resetTo: string): Promise<void> => {
  if (passwordAuth === undefined || !allowedEmails.has(email)) return

  await passwordAuth.recover(email, resetTo)
}

/**
 * Setting a new password from a recovery link, which also signs its owner in.
 *
 * The token is the provider's proof that whoever holds it opened the email,
 * so a new password set with it is as good as a sign-in. The address it names
 * is still held to the allowed list, for `signInWithPassword`'s reason.
 */
export const resetPassword = async (
  recoveryToken: string,
  password: string
): Promise<{ readonly ok: true } | { readonly ok: false; readonly detail: string }> => {
  const auth = passwordAuth

  if (auth === undefined || !portalAuth.ok) {
    return { ok: false, detail: describePasswordAuthMissing() }
  }

  const set = await auth.setPassword(recoveryToken, password)

  if (!set.ok) {
    switch (set.error.code) {
      case "expired":
        return {
          ok: false,
          detail: "That link has expired or was already used. Ask for a new one.",
        }
      case "weak":
        return { ok: false, detail: set.error.detail }
      default:
        return { ok: false, detail: "The password could not be changed. Try again in a moment." }
    }
  }

  if (!allowedEmails.has(set.value)) {
    return { ok: false, detail: "That link has expired or was already used. Ask for a new one." }
  }

  await startSession(set.value, Date.now(), portalAuth.value.secret)

  return { ok: true }
}

export const signOut = async (): Promise<void> => {
  ;(await cookies()).delete(SESSION_COOKIE)
}
