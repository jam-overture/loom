import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { describeAuthProblem, portalAuth } from "./config"
import { SIGN_IN_PATH } from "./paths"
import { authenticate } from "./roster"
import { mintSession, readSession, SESSION_COOKIE, SESSION_TTL_MS } from "./session"

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

export type SignInResult =
  | { readonly ok: true; readonly actor: string }
  | { readonly ok: false; readonly error: SignInProblem }

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

export const signIn = async (key: string): Promise<SignInResult> => {
  if (!portalAuth.ok) {
    return {
      ok: false,
      error: { code: "not-configured", detail: describeAuthProblem(portalAuth.error) },
    }
  }

  const actor = authenticate(portalAuth.value.reviewers, key)
  if (actor === null) return { ok: false, error: { code: "rejected" } }

  const issuedAt = Date.now()

  ;(await cookies()).set({
    name: SESSION_COOKIE,
    value: await mintSession(actor, issuedAt, portalAuth.value.secret),
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
