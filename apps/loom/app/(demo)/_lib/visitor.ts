import { cookies } from "next/headers"

/**
 * Which copy of the demo this browser is looking at.
 *
 * An opaque id in a cookie, and nothing else — no sign-in, no identity, no
 * profile. It names a tree in memory on this instance and grants nothing: the
 * worst an attacker can do with someone else's id is edit a demo page.
 *
 * The name a change is attributed to is a constant rather than this id, because
 * provenance is meant to be a person a reviewer could go and ask (0027), and
 * "whoever held cookie 3f9c" is not one. The honest label is that a visitor did
 * it.
 */

/**
 * Where the demo lives, in one place.
 *
 * Three things have to agree on it — the cookie's scope, the path a server
 * action revalidates, and the link every other surface points at — and when
 * they disagreed the symptom was not an error but a demo that silently forgot
 * what a visitor had just done.
 */
export const DEMO_PATH = "/demo"

export const DEMO_COOKIE = "loom-demo"

export const DEMO_ACTOR = "a demo visitor"

export const readVisitorId = async (): Promise<string | undefined> =>
  (await cookies()).get(DEMO_COOKIE)?.value

/**
 * Server actions may write cookies; a Server Component rendering a page may not.
 * So the page reads, the action mints, and a visitor who only ever looks at the
 * demo is never given one.
 */
export const rememberVisitorId = async (id: string): Promise<void> => {
  const jar = await cookies()

  jar.set(DEMO_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    /**
     * Scoped to the demo and nowhere else. It moved here from `/portal/demo`
     * with the rest of the surface, and the path is the half of that move a
     * type checker cannot see: a cookie still scoped to the old path is sent
     * on no request the demo makes, so every visitor would be minted a fresh
     * session on every action and no change would ever appear to stick.
     */
    path: DEMO_PATH,
    maxAge: 60 * 60 * 24,
  })
}
