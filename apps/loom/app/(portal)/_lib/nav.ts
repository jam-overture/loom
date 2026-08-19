export type NavItem = {
  readonly label: string
  readonly href: string
}

/**
 * Whether a nav item is the one the current path belongs to.
 *
 * Prefix matching has to respect segment boundaries. A bare `startsWith` makes
 * `/portal/trees` claim `/treesitter`, which is invisible until a route happens to share
 * a prefix with another — so the match is either the path itself or the path plus
 * a separator, never a raw string prefix.
 *
 * `/` is exact, because every path starts with it.
 */
export const isNavItemActive = (pathname: string, href: string): boolean =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
