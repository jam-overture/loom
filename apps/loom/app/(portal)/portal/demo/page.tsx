import { permanentRedirect } from "next/navigation"

/**
 * The demo moved to `/demo`.
 *
 * It was built here, inside the signed-in review tool, which meant a public
 * page sat at the one path in this application that reads as private — and wore
 * the portal's chrome while doing it. It now has a route group and a document of
 * its own (`app/(demo)`), and this is what is left behind.
 *
 * Kept as a 308 rather than deleted, for the reason `/portal/trees` is: four
 * places in the portal link here — the rail, the sign-in hero, the empty state
 * on `/portal/pages`, and `DEMO_PATH` in `_lib/auth/paths.ts`, which is what
 * tells the proxy this path is public. Those are the portal routine's files and
 * not the demo routine's, so repointing them is filed as a finding rather than
 * done here, and until it is, every one of those links has somewhere to land.
 *
 * It renders nothing and reads nothing, so `guarded-pages.test.ts` exempting it
 * from `requireActor` costs the portal nothing: there is no content behind this
 * to protect. When the four links point at `/demo`, this file goes.
 */
const MovedDemoPage = () => {
  permanentRedirect("/demo")
}

export default MovedDemoPage
