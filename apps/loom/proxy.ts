import { NextResponse, type NextRequest } from "next/server"

import { portalAuth } from "@/app/(portal)/_lib/auth/config"
import { isPublicPath, SIGN_IN_PATH } from "@/app/(portal)/_lib/auth/paths"
import { readSession, SESSION_COOKIE } from "@/app/(portal)/_lib/auth/session"

/**
 * Nothing under `/portal` is reachable without a session, and everything else
 * on this deployment is public.
 *
 * That sentence is the whole of 0067's access model. Marketing, the docs and
 * the lessons are one application with the portal (0067), share its session and
 * its domain, and are read by people who have never signed in — so the guard is
 * scoped to the one route group that needs it rather than applied to the site
 * and then punched through per public page.
 *
 * It is here rather than in each page because a per-page check is a rule every
 * future page has to remember. `requireActor` still runs inside pages and
 * actions — it produces the actor they need, and two checks that could disagree
 * is exactly the failure this file exists to prevent, so neither is optional
 * (0027).
 *
 * The signature is verified here rather than the cookie merely being present.
 * A guard that trusts the existence of a cookie is a guard anyone can pass by
 * setting one.
 *
 * Named `proxy` rather than `middleware`: Next 16 renamed the convention and
 * warns on the old filename. It is the same hook, and it now always runs on the
 * Node runtime.
 */
/**
 * The path, forwarded to the server components beneath.
 *
 * A layout cannot read the URL it is rendering — Next gives it `children` and
 * nothing else — and `(portal)/layout.tsx` has to know one thing about it:
 * whether the screen below brings its own chrome. The shell prototype under
 * `/portal/preview` does, and the layout's topbar and rail are what it is
 * proposing to replace, so the two cannot both be mounted.
 *
 * Set here because the guard already runs on every one of these paths, so this
 * costs a header rather than a hook. It goes when the prototype becomes the
 * portal and there is one chrome again.
 */
export const PATH_HEADER = "x-loom-path"

const forwarding = (request: NextRequest): NextResponse => {
  const headers = new Headers(request.headers)

  headers.set(PATH_HEADER, request.nextUrl.pathname)

  return NextResponse.next({ request: { headers } })
}

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  const { pathname, search } = request.nextUrl

  if (isPublicPath(pathname)) return forwarding(request)

  if (portalAuth.ok) {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    const session = token ? await readSession(token, portalAuth.value.secret, Date.now()) : undefined

    if (session?.ok) return forwarding(request)
  }

  const signIn = new URL(SIGN_IN_PATH, request.url)
  signIn.searchParams.set("from", `${pathname}${search}`)

  return NextResponse.redirect(signIn)
}

/**
 * The `(portal)` route group's URL prefix, and nothing else.
 *
 * The previous matcher was an exclusion — everything but Next's own asset
 * routes — because the set of application routes grew and the set of framework
 * routes did not. That reasoning inverts once three public surfaces share the
 * deployment: an exclusion list would now have to name every marketing page, doc
 * and lesson written from here on, and the one it forgot would be a public page
 * behind a sign-in. The set that grows is the public one, so the guard names the
 * closed set instead.
 */
export const config = {
  matcher: ["/portal", "/portal/:path*"],
}
