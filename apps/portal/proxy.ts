import { NextResponse, type NextRequest } from "next/server"

import { portalAuth } from "@/lib/auth/config"
import { isPublicPath, SIGN_IN_PATH } from "@/lib/auth/paths"
import { readSession, SESSION_COOKIE } from "@/lib/auth/session"

/**
 * Nothing but the sign-in page is reachable without a session.
 *
 * This is the blanket property, and it is here rather than in each page because
 * a per-page check is a rule every future page has to remember. `requireActor`
 * still runs inside pages and actions — it produces the actor they need, and two
 * checks that could disagree is exactly the failure this file exists to prevent,
 * so neither is optional.
 *
 * The signature is verified here rather than the cookie merely being present.
 * A guard that trusts the existence of a cookie is a guard anyone can pass by
 * setting one.
 *
 * Named `proxy` rather than `middleware`: Next 16 renamed the convention and
 * warns on the old filename. It is the same hook, and it now always runs on the
 * Node runtime.
 */
export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  const { pathname, search } = request.nextUrl

  if (isPublicPath(pathname)) return NextResponse.next()

  if (portalAuth.ok) {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    const session = token ? await readSession(token, portalAuth.value.secret, Date.now()) : undefined

    if (session?.ok) return NextResponse.next()
  }

  const signIn = new URL(SIGN_IN_PATH, request.url)
  signIn.searchParams.set("from", `${pathname}${search}`)

  return NextResponse.redirect(signIn)
}

/**
 * Everything except Next's own asset routes. Written as an exclusion because the
 * set of application routes grows and the set of framework routes does not — an
 * inclusion list would silently stop covering the page added next week.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico|webmanifest)$).*)"],
}
