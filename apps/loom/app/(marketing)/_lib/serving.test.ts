import { headers } from "next/headers"
import { describe, expect, it } from "vitest"

import { isNoRequestScope, NO_REQUEST_SCOPE, servedOrigin } from "./serving"
import { siteOrigin } from "./site"

/**
 * What this module does when there is no request, held without mocking
 * anything.
 *
 * `served-origin.test.ts` is the other half and covers the parsing, which is
 * `site.ts`' and takes strings. This covers the one thing on this side of that
 * line: the header read, and the throw it meets when nobody is asking for a
 * page.
 *
 * ## Why this file exists rather than a `vi.mock`
 *
 * `addressed.test.ts` renders every route of this site, which calls
 * `servedOrigin`, and it used to reach the state by stubbing `next/headers`
 * empty. Under `forks: { isolate: false }` — the application suite's setting,
 * for the reason its config gives — a worker keeps what the previous file in it
 * loaded, so that stub only landed when no earlier file had already loaded a
 * page module. `announced.test.ts` loads three of them and installs no stub.
 *
 * On 5 November that ordering came up on `main` and the merge gate went red
 * with **twelve failures**, every case that renders a page, and green on an
 * immediate re-run of the same tree. The hazard had been there since the file
 * was added in #725; what moved was the number of files the suite spreads over
 * workers, and that moves whenever any of four surfaces adds a test.
 *
 * **Two remedies were measured before this one and neither holds.** Reproduced
 * by forcing a file that imports `../page` to run first in the worker:
 *
 * | | |
 * | --- | --- |
 * | `vi.mock("next/headers", …)`, as it was | 12 of 12 render cases fail |
 * | `vi.mock("./serving", …)` | **4 still fail** — the pages the earlier file had already loaded |
 * | the function answering for itself | nothing to fail |
 *
 * The second is the shape that looks right and is not: a mock replaces what a
 * module resolves *as it is evaluated*, and a page module evaluated by an
 * earlier file is already holding the real one. Any remedy spelled as a mock
 * has that property, so the remedy cannot be a mock.
 */

describe("the origin a page is served under, where there is no request", () => {
  /**
   * The assertion the suite actually rests on, and it runs the real
   * `next/headers`.
   *
   * It is the same answer a request carrying no usable host gets, which is the
   * path `served-origin.test.ts` covers from the other end.
   */
  it("is where the site says it lives", async () => {
    expect(await servedOrigin()).toBe(siteOrigin())
  })

  /**
   * The same call twice, because a fallback that worked once by consuming
   * something would pass the assertion above and fail a page with two bands
   * that both ask.
   */
  it("answers the same thing every time it is asked", async () => {
    expect(await servedOrigin()).toBe(await servedOrigin())
  })
})

/**
 * The two properties the fallback is keyed on, asserted against the installed
 * Next rather than remembered from the day it was written.
 *
 * This is the file that goes red on a Next upgrade that rewords the message or
 * starts attaching a `digest` to it, and that is deliberate: the alternative to
 * matching the message is catching every throw, and the next section says what
 * that would cost. A red here is one sentence to re-read; the failure it stands
 * in for is silent.
 */
describe("the throw this module answers", () => {
  /**
   * `headers()` returns a promise and throws **synchronously**, which is why
   * this reads it with a `try` rather than with `rejects`. Measured by writing
   * it the other way first: the error arrives before there is a promise to
   * reject, so the assertion never runs and the case fails carrying the very
   * error it was looking for. `servedOrigin` is unaffected either way, because
   * `await` inside a `try` catches both, and that is worth knowing rather than
   * relying on.
   */
  const thrownByHeaders = (): unknown => {
    try {
      void headers()

      return undefined
    } catch (thrown) {
      return thrown
    }
  }

  it("is what the installed Next actually throws outside a request", () => {
    expect(thrownByHeaders()).toBeInstanceOf(Error)
    expect((thrownByHeaders() as Error).message).toContain(NO_REQUEST_SCOPE)
  })

  it("carries no digest, which is what tells it from Next's own control flow", () => {
    expect((thrownByHeaders() as { readonly digest?: unknown }).digest).toBeUndefined()
  })

  /** The two properties above, as the one question the module asks. */
  it("is answered by this module's own predicate", () => {
    expect(isNoRequestScope(thrownByHeaders())).toBe(true)
  })
})

/**
 * What must still reach the framework, which is everything else.
 *
 * Next signals a redirect, a not-found and the bail-out from prerendering to
 * serving-on-demand by throwing an error with a `digest` on it. Swallowing one
 * of those here would render a page where a redirect was meant, or leave a page
 * the portal governs frozen at the revision the build read — which is the
 * failure
 * [0331](../../../../../decisions/0331-a-marketing-page-is-served-per-request-because-the-store-governs-it.md)
 * is about, reached from a direction that record did not have to consider.
 *
 * `governed.test.ts` makes that unreachable on this surface today, because
 * every route here declares `force-dynamic` and is never prerendered. These
 * cases hold the narrowness anyway, so that the guarantee does not rest on two
 * files agreeing by accident.
 *
 * They are stated over the predicate the module exports its phrase for, rather
 * than by driving `servedOrigin` into each case: throwing from inside
 * `next/headers` is not something a test can arrange without the mock this
 * whole file exists to avoid.
 */
describe("a throw this module must not answer", () => {
  const withDigest = (message: string, digest: string): Error =>
    Object.assign(new Error(message), { digest })

  it.each([
    [
      "the bail-out from prerendering",
      withDigest("Route / needs to bail out of prerendering", "DYNAMIC_SERVER_USAGE"),
    ],
    ["a redirect", withDigest("NEXT_REDIRECT", "NEXT_REDIRECT;replace;/portal;307;")],
    ["a not-found", withDigest("NEXT_HTTP_ERROR_FALLBACK;404", "NEXT_HTTP_ERROR_FALLBACK;404")],
    /**
     * The case that says the phrase is not the whole of the test. An error
     * carrying Next's own control-flow marker is Next's whatever its message
     * says, and a bail-out whose message happened to quote this phrase would
     * otherwise be eaten.
     */
    [
      "a control-flow error whose message quotes the phrase",
      withDigest(`headers was ${NO_REQUEST_SCOPE}`, "DYNAMIC_SERVER_USAGE"),
    ],
  ])("passes on %s", (_what, thrown) => {
    expect(isNoRequestScope(thrown)).toBe(false)
  })

  it.each([
    ["a thrown string", "called outside a request scope"],
    ["a thrown nothing", undefined],
    ["an unrelated failure", new Error("ECONNREFUSED")],
  ])("passes on %s", (_what, thrown) => {
    expect(isNoRequestScope(thrown)).toBe(false)
  })

  it("answers the one it is for", () => {
    expect(
      isNoRequestScope(new Error(`\`headers\` was ${NO_REQUEST_SCOPE}. Read more: …`))
    ).toBe(true)
  })
})
