/**
 * Which paths are reachable without a session, and where a sign-in may send you
 * afterwards.
 *
 * Both are allow-lists rather than deny-lists, and both are pure functions with
 * their own tests, because they are the two places where getting it slightly
 * wrong is invisible: a deny-list forgets the route added next week, and an
 * unchecked return path turns the portal's own sign-in form into a redirector
 * to anywhere.
 */

export const SIGN_IN_PATH = "/portal/sign-in"

/**
 * Where a signed-in person goes when a page will not have them.
 *
 * `/portal` is the workspace — the list of the projects they hold a role in —
 * so it is the one screen that is right for somebody who is authenticated and
 * is not entitled to what they asked for. Sending them to sign in instead would
 * invite them to present the same key and arrive in the same place.
 */
export const WORKSPACE_PATH = "/portal"

/** Opening an account, asking for a recovery link, and the page that link opens (0304). */
export const SIGN_UP_PATH = "/portal/sign-up"
export const FORGOT_PASSWORD_PATH = "/portal/forgot-password"
export const RESET_PASSWORD_PATH = "/portal/reset-password"

/**
 * The pages a signed-out person must reach: the ways in, and the way back in
 * when a password is lost. Each is the whole segment, because a page's server
 * actions post to its own path and a guarded action would send the form to
 * sign in.
 */
const PUBLIC_PATHS: readonly string[] = [
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  FORGOT_PASSWORD_PATH,
  RESET_PASSWORD_PATH,
]

export const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

/**
 * The path to return to after signing in, or the default.
 *
 * Anything that is not a single-slash-rooted path is refused. `//evil.example`
 * is the case worth naming: browsers read it as a protocol-relative URL, so a
 * check for a leading `/` alone lets an attacker send a reviewer somewhere else
 * entirely with a link that looks like this portal's own.
 */
/**
 * Where somebody lands when they sign in without having asked for a particular
 * screen.
 *
 * It was the page list, back when `/portal` was a redirect to it. The front
 * door is a screen now, and the first thing a reviewer should be shown is
 * whether anything is waiting for them — not a list of the places it could be.
 */
export const DEFAULT_LANDING = "/portal"

export const safeReturnPath = (value: string | undefined | null): string => {
  if (!value) return DEFAULT_LANDING
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_LANDING
  }
  if (isPublicPath(value.split("?")[0] ?? "")) return DEFAULT_LANDING

  return value
}
