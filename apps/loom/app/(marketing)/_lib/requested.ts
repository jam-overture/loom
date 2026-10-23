import { walkTree, type ElementNode, type LoomNode, type LoomTree } from "@jam-overture/loom"
import { THEME_PROP_KEY } from "@jam-overture/loom/react"

import { ADDRESS_PARAMS, SITE_PATHS, SITE_THEMES, type SiteThemeName } from "./site"

/**
 * The base a path is parsed against. Never read, never in the output — a path
 * is not a URL, so one has to be borrowed to reach `pathname` and
 * `searchParams` at all. `.invalid` is reserved by RFC 2606.
 */
const NO_ORIGIN = "https://site.invalid"

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

/**
 * Whether an href points at a **page of this site**, rather than merely at
 * something on this origin.
 *
 * The difference is the whole of the rule, and the first version of this got
 * it wrong by testing for a leading slash: `/demo`, `/docs` and `/portal` are
 * other surfaces of this deployment, served from the same host and built by
 * other lanes, and a palette this site invented means nothing to any of them.
 * Putting `?theme=bold` on the way out would be marketing's livery following a
 * reader into a tool that has never heard of it.
 *
 * Caught by `chrome.test.ts`' *carries the visitor's palette on its own links
 * and not into another surface*, which existed before any of this and was
 * right about a property that outlived the implementation it was written for.
 *
 * **Built from `site.ts`' `SITE_PATHS` as of 23 October, and renamed.** This
 * file wrote the projection out for itself, which was a third spelling of it:
 * four test files had the same thing inline and now read that export. Keeping
 * the local name would have left two things called `SITE_PATHS` in one route
 * group, one a sorted `readonly string[]` and one a `ReadonlySet<string>`,
 * which is how two readers come to disagree about which one they have — so this
 * one is named for the question it answers instead.
 *
 * Nothing here changed: a `Set` of a sorted list has the membership of a `Set`
 * of an unsorted one, and `.has` is all that reads it. Measured rather than
 * left at that, because this is a module `pageTreeFor` reaches — all 75 served
 * trees hash identically either way, and the report for
 * `marketing-14-a-sweep-says-what-it-reached` quotes the digest.
 */
const ON_THIS_SITE: ReadonlySet<string> = new Set(SITE_PATHS)

const isSameSite = (href: string): boolean =>
  href.startsWith("/") && ON_THIS_SITE.has(new URL(href, NO_ORIGIN).pathname)

/**
 * The palette named in an href, where it names one.
 *
 * Parsed against a throwaway base because a path is not a URL — the base is
 * never read and never reaches the output.
 */
const paletteIn = (href: string): string | null =>
  new URL(href, NO_ORIGIN).searchParams.get(ADDRESS_PARAMS.theme)

const withPalette = (href: string, theme: SiteThemeName): string => {
  const url = new URL(href, NO_ORIGIN)

  url.searchParams.set(ADDRESS_PARAMS.theme, theme)

  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Every element of a tree, rebuilt by a function of itself.
 *
 * **It descends through nodes that are not elements**, which the first version
 * did not: it returned any non-element node untouched, and a slot is a node
 * with children. The site's chrome puts its brand link inside
 * `buildSlot(ids, "brand", …)`, so the link to `/` was never reached and the
 * header came back wearing no palette at all — found by `chrome.test.ts`'
 * *carries the visitor's palette on its own links*, not by reading this.
 */
const mapElements = (node: LoomNode, of: (element: ElementNode) => ElementNode): LoomNode => {
  const children = "children" in node ? (node.children as readonly LoomNode[] | undefined) : undefined

  if (node.kind !== "element") {
    return children === undefined
      ? node
      : ({ ...node, children: children.map((child) => mapElements(child, of)) } as LoomNode)
  }

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

      /*
       * **A link that already names a palette is left exactly as it is.** Its
       * palette is its own meaning — the footer's switcher is a row of *this
       * one means bold* — and overwriting them with the reader's would turn
       * the switcher into three links to the page you are already on.
       *
       * An earlier version also marked the one the reader was wearing, with
       * `current`. It is gone, and the reason is worth keeping: `pages.test.ts`
       * asserts that re-theming a page *changes only the root's variables*,
       * which is 0049's claim about what a re-theme is. Marking a different
       * link per palette changes the markup below the root and breaks it. The
       * mark was a nicety invented in passing; the invariant is a decision
       * somebody recorded, and a nicety does not get to quietly cost one.
       */
      return named === null
        ? { ...element, props: { ...element.props, href: withPalette(href, theme) } }
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
