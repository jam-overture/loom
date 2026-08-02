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

export const SIGN_IN_PATH = "/sign-in"

const PUBLIC_PATHS: readonly string[] = [SIGN_IN_PATH]

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
export const DEFAULT_LANDING = "/trees"

export const safeReturnPath = (value: string | undefined | null): string => {
  if (!value) return DEFAULT_LANDING
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_LANDING
  }
  if (isPublicPath(value.split("?")[0] ?? "")) return DEFAULT_LANDING

  return value
}
