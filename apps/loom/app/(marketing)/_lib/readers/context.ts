import type { JsonObject } from "@jam-overture/loom"

import type { SiteThemeName } from "../site"

/**
 * The render context this server can honestly set, and nothing else.
 *
 * A segment is a predicate over the host's own render context
 * ([0263](../../../../../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)
 * clause 1), evaluated in this process, per request, with nothing about the
 * reader leaving it (clause 4). The portal says *what `aud_phones` is*; this
 * module says *what this server knows about the reader in front of it*, and the
 * two meet at the key names.
 *
 * `Loom daily build` filed the ask on 13 November and left exactly this to this
 * lane: *"What this lane decides is which keys loomjs.org's server can honestly
 * put in a context, which is a question about that server and not about Loom."*
 * So the whole of the judgement is here, and it is a short list on purpose.
 *
 * ## The rule this file is written to
 *
 * **A key is set when this server was told the answer, and is absent when it
 * would have to guess.** An absent key does not match — `clauseMatches` in
 * `src/audience/rule.ts` says so, and calls it *this reader is not in this
 * audience* rather than an error — so leaving a key out is a supported state
 * and the reader gets the base page. Guessing is not: a key set from an
 * inference puts readers into a segment the portal's figures then compare
 * against another, and a comparison between two segments is only worth
 * anything if the readers in each were really there.
 *
 * It is `routes.ts`' rule about routing conventions, one layer out: *refuse
 * rather than guess, because the refusal is a failing build and the guess is a
 * link this file reports as fine.* Here the refusal is a rule that never
 * matches, which somebody notices, and the guess is a segment that quietly
 * holds the wrong readers, which nobody does.
 *
 * ## Nothing here is about who the reader is
 *
 * The site's own line is *it counts which parts you reach and never who you
 * are*, and this file is held to it: no cookie is read, no address is recorded,
 * no header is kept, and what each key holds is a word out of a fixed set
 * rather than anything a reader typed or carries. The context is built, read by
 * `pageForReader` inside this process, and dropped — `src/live/pages.ts` states
 * the same guarantee from the other side: *"none of it leaves this
 * function"*.
 */

/**
 * The keys this server sets, as data, so that a reader of the site and a test
 * read the same list.
 *
 * The portal prints *the keys a site's server must set for its segments*
 * (`(portal)/_lib/segments/segment.ts`' `contextKeysOf`) off the rules somebody
 * wrote. That list and this one are the two halves of one agreement and nothing
 * checks them against each other, because the portal's half is whatever a
 * person typed into it. A rule written against a key that is not in here never
 * matches, on purpose, and the portal is where that is visible.
 */
export const READER_CONTEXT_KEYS = ["device", "palette"] as const

/**
 * Whether the browser said it is a phone, or said it is not, or did not say.
 *
 * `Sec-CH-UA-Mobile` is the only server-side answer to *is this a phone* that
 * the browser volunteers: it is a low-entropy client hint, so it arrives
 * without `Accept-CH` being negotiated first, and it is a boolean the browser
 * states about itself rather than a string this server interprets.
 *
 * **Two major browsers do not send it, and that is why `device` is often
 * absent.** Client hints are a Chromium feature; Safari and Firefox send
 * neither this nor any other `Sec-CH-UA-*`. So a reader on an iPhone in Safari
 * has no `device` and is served the base, while a reader on an Android phone in
 * Chrome has `device: "phone"` and is served the phone form.
 *
 * **That asymmetry is known, is the reason this is not read off the user
 * agent, and is filed.** The alternative is to parse `User-Agent`, which would
 * answer for every browser and would be this server inferring a device from a
 * string the browser did not send for that purpose — the guess this module's
 * rule exists to refuse. Half a population segmented honestly is worth more
 * than a whole one segmented by inference, because the half is visible in the
 * portal's own figures and the inference is not. `FINDINGS.md` carries the
 * entry and the PR asks the maintainer whether he wants the other trade.
 */
const deviceFrom = (hint: string | null): "phone" | "desktop" | undefined => {
  if (hint === "?1") return "phone"
  if (hint === "?0") return "desktop"

  return undefined
}

/**
 * The context for one request: what the browser said, and what the reader asked
 * for.
 *
 * Pure, and takes a `Headers` rather than reading one, for the reason
 * `serving.ts` gives about itself: the header read is request-scoped and the
 * parsing is not, so the parsing lives where tests and tools can reach it
 * without a request. `serving.ts` owns the read.
 *
 * **`palette` is always set, so this server always passes a context.** It is
 * the one thing a request to this site cannot fail to say: the palette is read
 * off the address by `askedFor`, which answers the default for an address that
 * named none, so there is no request whose palette is unknown. That matters
 * beyond the key itself — `segmentOf` answers nothing at all for a context of
 * `undefined`, so a server that sometimes passed one and sometimes did not
 * would have two behaviours where this has one.
 *
 * **It is this site's own key and a customer's site would not have it.** The
 * palette switcher is a thing this marketing site has because the site is also
 * the demonstration; `device` is the key shape a customer's server would set.
 * Both are legitimate — the site is a project like any customer's (0298
 * clause 4) — but a run reading this file should not take `palette` for part of
 * Loom's vocabulary.
 */
export const readerContextFrom = (
  received: Headers,
  palette: SiteThemeName
): JsonObject => {
  const device = deviceFrom(received.get("sec-ch-ua-mobile"))

  return {
    palette,
    /**
     * Omitted rather than set to `undefined`, so the object this server passes
     * holds only keys it has answers for. A key present and holding
     * `undefined` is not JSON and `clauseMatches` reads it as structure rather
     * than as absence, which would be the same non-match by a longer route.
     */
    ...(device === undefined ? {} : { device }),
  }
}
