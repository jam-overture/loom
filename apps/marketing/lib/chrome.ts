import { buildElement, type IdFactory, type LoomNode } from "@loom/runtime"

import { PLACEHOLDER_COPY } from "./copy"
import { action, prose, stack } from "./nodes"
import {
  internalHref,
  otherTheme,
  REPOSITORY_URL,
  SITE_ROUTES,
  type SiteRoute,
  type SiteThemeName,
} from "./site"

/**
 * The header and the footer, as nodes.
 *
 * They are in the tree rather than in a layout, and that is the point of the
 * site: if the chrome were markup wrapped around the render, then "the whole
 * page is data" would be true of the middle of the page and false at the top
 * and the bottom of it. A nav item here is a `loom.action`, and the wordmark is
 * a `loom.logo` — both registered primitives a proposal could address, move or
 * re-word like anything else.
 *
 * It costs something. There is no nav primitive, so nothing can say *which*
 * item is the current page; both are filed as findings rather than worked
 * around with markup.
 */

export type ChromeContext = {
  readonly origin: string
  readonly theme: SiteThemeName
  /** The route being rendered, so the header can leave it out of its own links. */
  readonly current: SiteRoute
}

const navLink = (ids: IdFactory, context: ChromeContext, route: SiteRoute): LoomNode =>
  action(ids, route.label, internalHref(context.origin, route.path, context.theme), {
    variant: "quiet",
    scale: "small",
  })

export const siteHeader = (ids: IdFactory, context: ChromeContext): LoomNode =>
  stack(ids, { direction: "row", justify: "between", align: "center", gap: "normal" }, [
    buildElement(ids, {
      type: "loom.logo",
      props: { name: "Loom", href: internalHref(context.origin, "/", context.theme) },
    }),
    stack(
      ids,
      { direction: "row", gap: "snug", align: "center" },
      SITE_ROUTES.map((route) => navLink(ids, context, route))
    ),
  ])

export const siteFooter = (ids: IdFactory, context: ChromeContext): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "surface", width: "full" },
    children: [
      stack(ids, { direction: "row", justify: "between", align: "start", gap: "loose" }, [
        stack(ids, { gap: "tight" }, [
          prose(ids, "Loom — the interface is data.", { size: "small" }),
          prose(ids, PLACEHOLDER_COPY.licence, { size: "small", tone: "muted" }),
        ]),
        stack(ids, { direction: "row", gap: "snug", align: "center" }, [
          ...SITE_ROUTES.map((route) => navLink(ids, context, route)),
          action(ids, "Source", REPOSITORY_URL, {
            variant: "quiet",
            scale: "small",
            external: true,
          }),
        ]),
      ]),
      /**
       * The re-theme, offered rather than described. It is an ordinary link to
       * the same route wearing the other palette, and what comes back is the
       * same tree with three different ids on its root — which is the whole of
       * what a re-theme is (0049).
       */
      stack(ids, { direction: "row", gap: "snug", align: "center" }, [
        prose(ids, "Same tree, other palette:", { size: "small", tone: "muted" }),
        action(
          ids,
          otherTheme(context.theme) === "bold" ? "Bold" : "Editorial",
          internalHref(context.origin, context.current.path, otherTheme(context.theme)),
          { variant: "quiet", scale: "small" }
        ),
      ]),
    ],
  })
