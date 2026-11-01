import { ADDRESS_PARAMS, readThemeName, type SiteThemeName } from "./site"

/**
 * Reading the address, which is now one parameter and was five.
 *
 * ## What it was for
 *
 * Everything a visitor could do to this site used to be in the address: which
 * of the five pre-written requests to run against the demonstration, whether
 * to approve the hold their rules raised, whether to put the change back.
 * [0081](../../../../../decisions/0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md)
 * made that a rule — the demonstrated page was a pure function of its address
 * — and this module was the one reader of it, written after the other four
 * parameters went stale in place for eight days when the band moved pages.
 *
 * [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
 * removed the demonstration, so four of the five parameters name nothing. What
 * is left is the palette.
 *
 * ## The reason this file still exists
 *
 * It would now fit in the three routes that call it, and putting it there is
 * the mistake 0081's own history records: *which parameters a page reads* was
 * copied by hand into each route, one copy went stale, and nothing was red for
 * eight days because every test built its own context. One reader is the
 * answer to that whatever the address has shrunk to, and a sixth parameter
 * arriving later finds a place that is already the only place.
 */

/** A page's whole address, as a page builder's context takes it. */
export type AddressedState = {
  readonly theme: SiteThemeName
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
 * An unrecognised value is the default rather than an error, which is the rule
 * every route stated separately before this existed: a page reached with a
 * mangled address should be a page and not a 400.
 */
export const askedFor = (params: AddressParams): AddressedState => ({
  theme: readThemeName(params[ADDRESS_PARAMS.theme]),
})
