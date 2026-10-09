import { readAskId, type AskId } from "./adapt/asks"
import { ADDRESS_PARAMS, readThemeName, readYes, type SiteThemeName } from "./site"

/**
 * Reading the address, which is the half of this convention that was written
 * three times.
 *
 * ## What happened
 *
 * Everything a visitor can do to this site is in the address. `askedHref` is
 * the one function that writes one, and it says in its own header why it is one
 * function:
 *
 * > *"Two pages read those parameters and they have to read the same ones the
 * > same way, because one links to the other carrying them. Written twice they
 * > would be two spellings of one convention."*
 *
 * The writing was unified. **The reading was not**, and it was copied into each
 * route by hand. On 1 October the demonstration moved from the front door to
 * `/how-it-works`, and the copy that moved with it carried two of the four
 * parameters. For the eight days after that, on the deployment:
 *
 * | | the page that reads `back` | the page that needs it |
 * | --- | --- | --- |
 * | before 1 October | `/` | `/` |
 * | after | `/` | **`/how-it-works`** |
 *
 * So *Put it back* — the control the second half of the band exists for, and
 * the one thing on this site a competitor cannot copy — did nothing at all. The
 * link carried `back=1`, the route never looked, and the page came back
 * byte-identical to the page without it. Two sentences of copy written for the
 * states behind it (`RESTORED` and `STILL_THERE` in `pages/see-it-happen.ts`)
 * could not be reached by any address.
 *
 * Nothing was red, and this is the part worth keeping. Every test of the undo
 * builds a `SitePageContext` itself and asserts against the tree that comes
 * back, which is the right test of the machinery and cannot see a route that
 * never fills the context in. It is the same shape as the five pages that
 * stopped unfurling a card in September: *what was tested was the machinery
 * rather than the pages*, and the answer then was `routeMetadata` plus a test
 * that imports the route modules and calls them. This is that answer applied to
 * the other export.
 *
 * ## So there is one reader
 *
 * Every page of this site reads its whole address through this function. Not
 * the parameters the page happens to use today — the whole address — because
 * which ones a page uses is exactly the judgement that went stale when the band
 * moved, and a route that reads a parameter it has no use for costs nothing.
 * `pageTreeFor` runs a request against the page that carries the band and
 * against no other, so the fields the other two routes pass in are inert.
 */

/** A page's whole address, as a page builder's context takes it. */
export type AddressedState = {
  readonly theme: SiteThemeName
  readonly ask?: AskId
  readonly approve?: boolean
  readonly back?: boolean
  readonly backApprove?: boolean
}

/**
 * The awaited form of `PageSearchParams`, which is what a route holds.
 *
 * The framework's own shape rather than a readonly version of it: a route is
 * handed this object and this is the type it is handed, so narrowing it here
 * would make every page's signature disagree with the one thing that calls it.
 */
export type AddressParams = Record<string, string | string[] | undefined>

/**
 * What the visitor asked for, off the address.
 *
 * An unrecognised value in any of the five is the default rather than an error,
 * which is the rule every route stated separately before this existed: a page
 * reached with a mangled address should be a page and not a 400.
 *
 * **The three answers are dropped without a choice**, and that is a rule rather
 * than a tidy-up. There is nothing to approve, reverse or approve the reversal
 * of until a visitor has asked for something, so `?back=1` on its own is an
 * address that says nothing and reads as one.
 */
export const askedFor = (params: AddressParams): AddressedState => {
  const theme = readThemeName(params[ADDRESS_PARAMS.theme])
  const ask = readAskId(params[ADDRESS_PARAMS.ask])

  return ask === undefined
    ? { theme }
    : {
        theme,
        ask,
        approve: readYes(params[ADDRESS_PARAMS.approve]),
        back: readYes(params[ADDRESS_PARAMS.back]),
        backApprove: readYes(params[ADDRESS_PARAMS.backApprove]),
      }
}
