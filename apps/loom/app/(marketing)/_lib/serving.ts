import { headers } from "next/headers"

import { originFromHost, siteOrigin } from "./site"

/**
 * Next's own words for *there is no request here at all*.
 *
 * `headers()` throws rather than returning nothing when it is called from
 * somewhere outside a request, and that is the one failure this module answers
 * instead of passing on. The phrase is matched rather than the error's class,
 * because the class is not exported: what comes back is a plain `Error` with
 * no `digest` and this sentence in it, checked in `serving.test.ts` against the
 * installed Next rather than taken on trust.
 *
 * **A reworded message makes that test red and this fallback stop happening**,
 * which is the direction brittleness should fail in. The alternative — treat
 * every throw as *no request* — would swallow the one thing that must never be
 * swallowed, below.
 */
export const NO_REQUEST_SCOPE = "called outside a request scope"

/**
 * Whether a throw means *no request*, as against anything else.
 *
 * **The `digest` test is the load-bearing half.** Next signals its own control
 * flow by throwing: a redirect, a not-found, and the bail-out that moves a
 * segment from prerendered to served-on-demand. Each of those carries a
 * `digest` and each is *meant* to reach the framework. Catching one here would
 * turn a redirect into a rendered page, or freeze a page the portal governs —
 * which is the failure [0331](../../../../../decisions/0331-a-marketing-page-is-served-per-request-because-the-store-governs-it.md)
 * exists to prevent, arriving from a direction that record did not have to
 * consider.
 *
 * It cannot happen on this surface today, because every route of this site
 * declares `force-dynamic` and `governed.test.ts` fails if one stops. The
 * check is here anyway: a guarantee held in another file is a reason to be
 * right rather than a reason not to look.
 *
 * **Exported for `serving.test.ts` and read by nothing else.** A copy of these
 * three lines written out in the test would be an assertion that this lane's
 * arithmetic equals itself, which is this lane's own finding of 21 October
 * about two sweep floors that were hand-written copies of another module's
 * sums. The predicate is the unit; the test imports it.
 */
export const isNoRequestScope = (thrown: unknown): boolean =>
  thrown instanceof Error &&
  (thrown as { readonly digest?: unknown }).digest === undefined &&
  thrown.message.includes(NO_REQUEST_SCOPE)

/**
 * The request's headers, or none, which is what *no request* comes to.
 *
 * Empty `Headers` rather than a flag or an `undefined`, so there is one path
 * through `servedOrigin` and not two. What it produces is exactly what a
 * request carrying no usable host produces, which the function has answered
 * since it was written.
 *
 * **This is the stub a test file used to install**, moved into the function it
 * was standing in for. `addressed.test.ts` carried
 * `vi.mock("next/headers", …)` returning this same empty `Headers`, and under
 * `forks: { isolate: false }` that mock only worked when no earlier file in the
 * worker had already loaded a page module — `announced.test.ts` loads three of
 * them. It went red on `main` on 5 November with twelve failures and green on
 * an immediate re-run of the same tree. A behaviour a test has to fake is a
 * behaviour the function should have.
 */
const headersOrNone = async (): Promise<Headers> => {
  try {
    return await headers()
  } catch (thrown) {
    if (!isNoRequestScope(thrown)) throw thrown

    return new Headers()
  }
}

/**
 * Where this request arrived, for the one thing that has to agree with the
 * browser's address bar.
 *
 * It is a module of its own for one reason: `site.ts` is pure — a function of
 * an environment object — and is read by tests, by the sitemap, by `llms.txt`
 * and by a tool or two. Importing `next/headers` into it would make every one
 * of those a request-scoped call. The header read belongs on this side of that
 * line, and the parsing belongs on the other, which is why `originFromHost`
 * lives in `site.ts` and takes strings.
 *
 * **What this is for, stated once**: the tree the visitor is handed carries
 * absolute addresses, and one of them is the `src` of the framed demonstration
 * on the front door. If it names a different host from the one they are on, a
 * preview deployment's protection answers that frame with a sign-in page that
 * refuses to be framed, and the band renders as the browser's broken-document
 * glyph. See `originFromHost`'s own comment for why the two hosts differ on
 * every preview.
 *
 * **What this is not for**: the canonical link, the sitemap, the share image
 * and the structured-data graph all declare where a page *lives*, and they
 * stay on `siteOrigin()`. A page that announced itself under whichever host a
 * reader reached it by would be a page telling a crawler there are three of it.
 *
 * ## Called where there is no request
 *
 * It answers `siteOrigin()`, by the same path a request with no usable host
 * takes. The docblock here used to say that a test stubbing `next/headers`
 * empty was *"a case the function already answers"*, which was true of
 * everything except the throw itself. It answers the throw now.
 */
export const servedOrigin = async (): Promise<string> => {
  const received = await headersOrNone()

  return (
    originFromHost(
      /**
       * `x-forwarded-host` first, because behind a proxy `host` is the proxy's
       * own name. Vercel sets both and does not forward a client's.
       */
      received.get("x-forwarded-host") ?? received.get("host"),
      received.get("x-forwarded-proto")
    ) ?? siteOrigin()
  )
}
