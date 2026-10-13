export type NavItem = {
  readonly label: string
  readonly href: string
  /**
   * Match this path and nothing under it.
   *
   * A section's href is a prefix of every route inside it, which is what makes
   * `/portal/pages` light up while a reader is on `/portal/pages/t_abc`. That
   * is right for a section and wrong for a *screen* whose href happens to sit
   * above other screens: `/portal` is the front door and also the prefix of
   * every other route in the portal, so without this it is the active item on
   * every page in the rail and the rail stops meaning anything.
   */
  readonly exact?: boolean
}

/**
 * Whether a nav item is the one the current location belongs to.
 *
 * Prefix matching has to respect segment boundaries. A bare `startsWith` makes
 * `/portal/pages` claim `/portal/pagesetter`, which is invisible until a route happens to share
 * a prefix with another — so the match is either the path itself or the path plus
 * a separator, never a raw string prefix.
 *
 * `/` is exact whether or not it is declared so, because every path starts with
 * it and there is no useful reading of a root that claims everything.
 *
 * ## An href may carry a query, and then the query is part of the match
 *
 * `Waiting on you` and `All pages` are the same screen in two states, so a rail
 * that compared paths alone would light both of them on either one — which is a
 * rail saying *you are in two places*, and worse than no highlight at all.
 *
 * The reading is strict in both directions. An href with a query matches only
 * when the location carries the same value for that key; an href **without**
 * one matches only when the location carries no value for a key some sibling
 * uses. That second half is what keeps `All pages` dark while a filter is on,
 * and it is why the sibling keys are passed in rather than guessed: this module
 * cannot know which of a location's parameters are a rail's business and which
 * are a cursor the screen passed itself.
 */
export const isNavItemActive = (
  pathname: string,
  href: string,
  exact: boolean = false,
  location: { readonly search?: string; readonly keys?: readonly string[] } = {}
): boolean => {
  const [path, query] = href.split("?")
  const target = path ?? href

  const samePath =
    exact || target === "/"
      ? pathname === target
      : pathname === target || pathname.startsWith(`${target}/`)

  if (!samePath) return false

  const keys = location.keys ?? []
  if (keys.length === 0) return true

  const here = new URLSearchParams(location.search ?? "")
  const wanted = new URLSearchParams(query ?? "")

  return keys.every((key) => (here.get(key) ?? "") === (wanted.get(key) ?? ""))
}
