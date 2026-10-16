/**
 * What this deployment needs before anyone can sign in — and what it does when
 * that is missing, which is the decision worth reading.
 *
 * Everywhere else in this portal, absent configuration degrades: no
 * `DATABASE_URL` means memory, no API key means the prompt box says so. Auth is
 * the deliberate exception (0027). A store that quietly falls back to memory
 * announces itself the moment a write vanishes; a portal that quietly falls back
 * to open access looks exactly like a portal that is working, and the only
 * signal is somebody else spending your model budget.
 *
 * So absence here fails closed: nobody signs in, and the sign-in page says which
 * variable is missing rather than making an operator guess.
 *
 * **One variable, since 0285.** `LOOM_PORTAL_REVIEWERS` is gone — who may sign
 * in is a table now, and the only thing left that an environment can get wrong
 * is the secret every session is signed with. An accounts table with no rows in
 * it fails closed the same way an empty roster did, but it is not a
 * configuration problem and is not reported as one: it is answered by a command.
 */

export type AuthConfig = {
  readonly secret: string
}

export type AuthProblem = { readonly code: "no-secret" }

export type AuthResult =
  | { readonly ok: true; readonly value: AuthConfig }
  | { readonly ok: false; readonly error: AuthProblem }

/**
 * The signing secret has to be long enough that guessing it is not cheaper than
 * stealing a session, since forging one is equivalent to holding every key the
 * accounts table stores at once.
 */
export const MINIMUM_SECRET_LENGTH = 32

export const resolveAuthConfig = (env: Record<string, string | undefined>): AuthResult => {
  const secret = env["LOOM_PORTAL_SESSION_SECRET"]?.trim() ?? ""
  if (secret.length < MINIMUM_SECRET_LENGTH) return { ok: false, error: { code: "no-secret" } }

  return { ok: true, value: { secret } }
}

export const describeAuthProblem = (_problem: AuthProblem): string =>
  `LOOM_PORTAL_SESSION_SECRET is unset or shorter than ${MINIMUM_SECRET_LENGTH} characters, ` +
  `so no session can be signed. Generate one with: openssl rand -hex 32`

/**
 * Read through static property access rather than by indexing `process.env`.
 *
 * `resolveAuthConfig` takes a plain record so it can be tested without touching
 * the environment; this is the one call that supplies the real one. Bundlers
 * inline `process.env.NAME` by name, and this module is bundled into both the
 * proxy guard and the app, so naming the variables statically keeps it reading
 * the same values in both. An index expression is not a name a bundler can see,
 * and the failure it would cause is a portal nobody can sign in to for a reason
 * that appears nowhere.
 */
export const portalAuth: AuthResult = resolveAuthConfig({
  LOOM_PORTAL_SESSION_SECRET: process.env.LOOM_PORTAL_SESSION_SECRET,
})
