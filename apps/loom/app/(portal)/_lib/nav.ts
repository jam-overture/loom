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
 * Whether a nav item is the one the current path belongs to.
 *
 * Prefix matching has to respect segment boundaries. A bare `startsWith` makes
 * `/portal/pages` claim `/portal/pagesetter`, which is invisible until a route happens to share
 * a prefix with another — so the match is either the path itself or the path plus
 * a separator, never a raw string prefix.
 *
 * `/` is exact whether or not it is declared so, because every path starts with
 * it and there is no useful reading of a root that claims everything.
 */
export const isNavItemActive = (
  pathname: string,
  href: string,
  exact: boolean = false
): boolean =>
  exact || href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`)
