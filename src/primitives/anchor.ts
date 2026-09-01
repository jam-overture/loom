import type { CSSProperties } from "react"
import { z } from "zod"

import { space } from "./tokens.js"

/**
 * The name a band answers to, so a page can link to a place inside itself.
 *
 * A Loom page could link to any document on the web except its own second
 * screen. `linkUrlSchema` has always accepted `…/pricing#plans`, so the address
 * half was never the problem; nothing in the library rendered an `id`, so there
 * was nothing at the other end. `loom.editable` spreads `data-loom-node`, which
 * is identity for the renderer and the portal rather than a fragment target.
 * Filed by the marketing routine on 26 August, when the front door wanted a
 * *read the whole record* control pointing at a panel 1,200px below the reader
 * and had to send them to another page instead.
 *
 * It is a prop by 0052's fixed-field half — there is exactly one of it, it
 * labels the node rather than being its content, and changing it is exactly a
 * `configure`. The finding left three questions open with it, and this is where
 * they are answered.
 *
 * **Which primitives carry one.** The bands a page's own navigation points at,
 * and nothing else: `loom.section`, `loom.hero` and `loom.callout`. Putting it
 * on every primitive would be a prop on seventy schemas to serve the three
 * things a table of contents ever lists, and the grammar budget (0014) is the
 * reason that is a cost rather than a kindness. A tree that needs to point at
 * something finer wraps it in a section, which is a node it can already make.
 *
 * **What it accepts.** A fragment and not a string: lower case, digits, single
 * hyphens between them. An anchor is the one value in the library that a model
 * writes *directly into the document as markup*, so it is the one place to keep
 * narrow — `id="my section"` is two attributes to a parser, and an id starting
 * with a digit was invalid in the selector grammar for twenty years. The schema
 * refusing it is a diagnostic the render seam reports (0011); a sanitiser that
 * quietly rewrote it would leave every link to it pointing at a name nobody
 * wrote.
 *
 * **What it does not check: that it is unique.** Two nodes may carry the same
 * anchor and the schema cannot see it, because a schema validates one node's
 * props and duplication is a fact about a tree. That is `loom.marquee`'s
 * duplicate-identity problem in a different dress, and the honest answer is the
 * same one: it belongs to whatever walks the whole tree, which is the render
 * seam rather than this file. Filed for the framework lane rather than faked
 * here — a per-node schema that pretended to enforce it would be enforcing
 * nothing.
 *
 * The remaining half of the finding — that `loom.decorative()` must strip an
 * anchor, since 0093 exists so a copy carries no identity and an anchor is
 * identity — is also the seam's, and filed with it. Nothing in the library
 * makes a decorative copy of a band today; `loom.marquee` copies its own
 * children, and a section inside a marquee is not a page anybody has built.
 */

export const anchorSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "an anchor is lower-case words joined by single hyphens")

/** The `id` attribute, or nothing at all — never an empty one, which is a target. */
export const anchorAttributes = (anchor: string | undefined): { readonly id?: string } =>
  anchor === undefined ? {} : { id: anchor }

/**
 * Room above a band the reader was sent to, so it does not land flush against
 * the top of the window — or underneath a host's fixed header, which is the
 * case that makes this worth setting rather than leaving to the browser. It
 * costs nothing on a band nobody linked to, because a `scroll-margin` is read
 * only when something scrolls to the element.
 */
export const anchorStyle = (anchor: string | undefined): CSSProperties =>
  anchor === undefined ? {} : { scrollMarginBlockStart: space(6) }
