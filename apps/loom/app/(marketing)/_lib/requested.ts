import { walkTree, type ElementNode, type LoomNode, type LoomTree } from "@jam-overture/loom"
import { THEME_PROP_KEY } from "@jam-overture/loom/react"

import { ADDRESS_PARAMS, SITE_THEMES, type SiteThemeName } from "./site"

/**
 * What a request puts back on a stored page.
 *
 * ## The line this module is
 *
 * [0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
 * asked somebody to draw a line between what a site page *is* and what a
 * **request** is, and said that only this lane could draw it. This is where it
 * is drawn, and it is drawn in one place so that nothing else has to know it
 * exists.
 *
 * Stored, a page holds its words, its arrangement and its destinations. It does
 * **not** hold a host, because one stored tree is served from every host this
 * deployment answers on and a preview build has its own. It does not hold a
 * palette, because the palette is what a reader asked for on the way in.
 *
 * Both of those used to be baked into every link by the builders, which is what
 * made these pages unstorable — and the only reason they were is that
 * `internalHref` was to hand.
 *
 * ## What it does, which is two things and no more
 *
 * **The root wears the palette.** A re-theme touches only the root (0049), so
 * this is one prop on one node.
 *
 * **Same-site links carry it too**, so that walking the site keeps the look the
 * reader chose. That is the behaviour the baked-in hrefs were there for, and it
 * survives the move intact — *everything a visitor can do to this site is in
 * the address* is still true, and a rearranged, re-themed page is still a URL
 * somebody can send to somebody else.
 *
 * **A link that already names a palette is left alone**, because such a link's
 * palette is its own meaning rather than the reader's: the footer's switcher is
 * a row of *this one means bold*, and a pass that overwrote them with the
 * current palette would turn the switcher into three links to the page you are
 * already on. The one the reader is wearing is marked instead, which is the
 * only thing on that row the request decides.
 *
 * It is deliberately **not** a general href rewriter. It adds one query
 * parameter and marks one link. Anything more — an origin, a locale, a tenant —
 * would be this module growing into the thing 0259 called a request-aware
 * transform, and that is a bigger decision than a palette.
 */

/** Whether an href points at a page of this site rather than away from it. */
const isSameSite = (href: string): boolean => href.startsWith("/")

/**
 * The palette named in an href, where it names one.
 *
 * Parsed against a throwaway base because a path is not a URL — the base is
 * never read and never reaches the output.
 */
const paletteIn = (href: string): string | null =>
  new URL(href, "https://site.invalid").searchParams.get(ADDRESS_PARAMS.theme)

const withPalette = (href: string, theme: SiteThemeName): string => {
  const url = new URL(href, "https://site.invalid")

  url.searchParams.set(ADDRESS_PARAMS.theme, theme)

  return `${url.pathname}${url.search}${url.hash}`
}

/** Every element of a tree, rebuilt by a function of itself. */
const mapElements = (node: LoomNode, of: (element: ElementNode) => ElementNode): LoomNode => {
  if (node.kind !== "element") return node

  const mapped = of(node)

  return { ...mapped, children: mapped.children.map((child) => mapElements(child, of)) }
}

export type RequestedLook = {
  readonly theme: SiteThemeName
}

/**
 * A stored page, wearing what the request asked for.
 *
 * Pure, and it never mutates the tree it is handed — the stored tree is shared
 * between every request this process answers, and a pass that wrote into it
 * would be one reader's palette leaking into the next one's page.
 */
export const asRequested = (tree: LoomTree, { theme }: RequestedLook): LoomTree => {
  const root = mapElements(tree.root, (element) => {
    const href = element.props["href"]

    if (typeof href === "string" && isSameSite(href)) {
      const named = paletteIn(href)

      if (named === null) {
        return { ...element, props: { ...element.props, href: withPalette(href, theme) } }
      }

      /*
       * A switcher link: its palette is its meaning, so the href is left as it
       * is and the one the reader is wearing is marked.
       *
       * **Only `loom.link` is marked.** `current` is that primitive's prop and
       * the registry is strict, so setting it on a `loom.action` is six
       * `invalid-props` diagnostics and a band that does not draw — which is
       * what the first version of this did, and what `pages.test.ts`' *renders
       * with nothing the runtime could not honor* caught.
       */
      return element.type === "loom.link" && named === theme
        ? { ...element, props: { ...element.props, current: true } }
        : element
    }

    return element
  }) as ElementNode

  return {
    ...tree,
    root: {
      ...root,
      props: { ...root.props, [THEME_PROP_KEY]: SITE_THEMES[theme].selection },
    },
  }
}

/** Every same-site href on a page, for the tests that pin what this does. */
export const sameSiteHrefs = (tree: LoomTree): readonly string[] =>
  [...walkTree(tree.root)].flatMap((node) => {
    if (node.kind !== "element") return []

    const href = node.props["href"]

    return typeof href === "string" && isSameSite(href) ? [href] : []
  })
