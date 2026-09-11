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
 * The demo is the second public path, and it is public by design rather than by
 * omission: it exists to be looked at by somebody who has not been given an
 * account, and §4d's marketing site cannot embed a surface behind a sign-in.
 *
 * What makes it safe to open is that it shares nothing with the portal but the
 * deployment. It has its own registry, its own in-memory store, its own policy
 * and no identity at all, so an anonymous visitor reaches a tree that expires
 * with the instance and never the one the portal is reviewing.
 *
 * **This is now the demo's old address, not the demo.** The demo moved to a
 * public `/demo` on 21 August, which is outside the proxy's matcher altogether
 * and needs nothing from this list. What remains here is a 308, and the
 * exemption is what keeps it working: without it a signed-out visitor following
 * an old link would be sent to sign in rather than forwarded on, which is a
 * redirect that only serves the people who do not need it.
 */
export const DEMO_PATH = "/portal/demo"

const PUBLIC_PATHS: readonly string[] = [SIGN_IN_PATH, DEMO_PATH]

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
