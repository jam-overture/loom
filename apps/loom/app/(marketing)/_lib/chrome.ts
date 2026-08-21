import { buildElement, buildSlot, type IdFactory, type LoomNode } from "@loom/runtime"

import { PLACEHOLDER_COPY } from "./copy"
import { action, link, prose, stack } from "./nodes"
import {
  DECISIONS_URL,
  HOME,
  internalHref,
  otherThemes,
  PORTAL,
  PRODUCT_SURFACES,
  REPOSITORY_URL,
  SITE_ROUTES,
  SITE_THEMES,
  surfaceHref,
  type SiteRoute,
  type SiteThemeName,
} from "./site"

/**
 * The header and the footer, as nodes.
 *
 * They are in the tree rather than in a layout, and that is the point of the
 * site: if the chrome were markup wrapped around the render, then "the whole
 * page is data" would be true of the middle of the page and false at the top
 * and the bottom of it. A menu item here is a `loom.link`, and the wordmark is
 * a `loom.logo` — both registered primitives a proposal could address, move or
 * re-word like anything else.
 *
 * **It is also the way into the rest of the product.** Marketing, the
 * documentation and the portal are one application (0067) with this surface at
 * its root (0070), so a visitor reaches everything else from here. The header
 * carries the menu and the way in; the footer carries the whole map. Neither
 * knows anything about another route group beyond its front-door path, which is
 * what keeps a link into it correct across whatever that lane does behind it.
 *
 * This is the second version of both. The first composed them out of nested
 * `loom.stack`s holding quiet buttons and filed what that cost as findings
 * against `Loom primitives` — no navigation landmark, no way to say which item
 * is the current page, no named groups in the footer. `loom.nav`, `loom.footer`,
 * `loom.link-list` and `loom.link` came back in #97 answering exactly those, so
 * the workarounds are gone and the findings with them.
 */

/**
 * What the footer says above the palette links.
 *
 * Exported because two test files assert it, and a string spelled out in three
 * places is a string that gets re-worded in one of them. It was "Same tree,
 * another palette:" until 20 August — accurate, and one of our nouns, on the
 * front door.
 */
export const PALETTE_SWITCHER_LABEL = "The same page, a different palette:"

export type ChromeContext = {
  readonly origin: string
  readonly theme: SiteThemeName
  /** The route being rendered, so the menu can mark it rather than drop it. */
  readonly current: SiteRoute
}

/**
 * A menu item, and the page the reader is already on says so.
 *
 * The first header left the current route out of its own menu, because nothing
 * in the tree could mark it — a menu that changed length as you walked through
 * the site. `current` emits `aria-current="page"` and pins the underline, which
 * is the accessible fact and the styling in one prop.
 */
const menuLink = (ids: IdFactory, context: ChromeContext, route: SiteRoute): LoomNode =>
  link(ids, route.label, internalHref(context.origin, route.path, context.theme), {
    scale: "medium",
    ...(route.path === context.current.path ? { current: true } : {}),
  })

const wordmark = (ids: IdFactory, context: ChromeContext): LoomNode =>
  buildElement(ids, {
    type: "loom.logo",
    props: { name: "Loom", href: internalHref(context.origin, HOME.path, context.theme) },
  })

/**
 * The bar across the top: the mark, the menu, and the one thing the page wants
 * you to do.
 *
 * The menu is this site's pages and the documentation, because those are the
 * two a visitor can read without an account. The portal is the action rather
 * than a menu item, and its word is **Sign in** rather than its name: a
 * stranger has no idea what a portal is, and the bar's right-hand action is
 * where every site they have used puts the way in.
 */
export const siteHeader = (ids: IdFactory, context: ChromeContext): LoomNode =>
  buildElement(ids, {
    type: "loom.nav",
    props: { tone: "surface", position: "sticky", align: "end" },
    children: [
      buildSlot(ids, "brand", [wordmark(ids, context)]),
      ...SITE_ROUTES.map((route) => menuLink(ids, context, route)),
      ...PRODUCT_SURFACES.filter((surface) => !surface.guarded).map((surface) =>
        link(ids, surface.label, surfaceHref(context.origin, surface), { scale: "medium" })
      ),
      buildSlot(ids, "actions", [
        action(ids, "Sign in", surfaceHref(context.origin, PORTAL), {
          variant: "secondary",
          scale: "small",
        }),
      ]),
    ],
  })

const linkGroup = (
  ids: IdFactory,
  label: string,
  links: readonly LoomNode[]
): LoomNode =>
  buildElement(ids, {
    type: "loom.link-list",
    props: { label, direction: "column" },
    children: [...links],
  })

/**
 * The band that closes the page, and the only complete map of the product on
 * it.
 *
 * Three named groups rather than one row of links: `loom.link-list` makes the
 * visible heading and the landmark's accessible name the same string, so a
 * screen reader announces three named groups instead of one anonymous run.
 */
export const siteFooter = (ids: IdFactory, context: ChromeContext): LoomNode =>
  buildElement(ids, {
    type: "loom.footer",
    props: { tone: "plain", columns: "three" },
    children: [
      buildSlot(ids, "brand", [
        wordmark(ids, context),
        prose(ids, "Your AI can change this page. You can see exactly what it changed.", {
          size: "small",
          tone: "muted",
        }),
      ]),
      linkGroup(
        ids,
        "This site",
        SITE_ROUTES.map((route) =>
          link(ids, route.label, internalHref(context.origin, route.path, context.theme), {
            tone: "muted",
            scale: "small",
            ...(route.path === context.current.path ? { current: true } : {}),
          })
        )
      ),
      linkGroup(
        ids,
        "The product",
        PRODUCT_SURFACES.map((surface) =>
          link(ids, surface.label, surfaceHref(context.origin, surface), {
            tone: "muted",
            scale: "small",
          })
        )
      ),
      linkGroup(ids, "The project", [
        link(ids, "Source", REPOSITORY_URL, { tone: "muted", scale: "small", external: true }),
        link(ids, "Decisions", DECISIONS_URL, { tone: "muted", scale: "small", external: true }),
      ]),
      buildSlot(ids, "note", [
        prose(ids, PLACEHOLDER_COPY.licence, { size: "small", tone: "muted" }),
        /**
         * The re-theme, offered rather than described. Each is an ordinary link
         * to the same route wearing another palette, and what comes back is the
         * same tree with three different ids on its root — which is the whole of
         * what a re-theme is (0049).
         */
        stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
          prose(ids, PALETTE_SWITCHER_LABEL, { size: "small", tone: "muted" }),
          ...otherThemes(context.theme).map((name) =>
            link(
              ids,
              SITE_THEMES[name].label,
              internalHref(context.origin, context.current.path, name),
              { tone: "muted", scale: "small" }
            )
          ),
        ]),
      ]),
    ],
  })
