import type { CSSProperties, ReactNode } from "react"

import {
  buildElement,
  buildSlot,
  buildText,
  createThemeRegistry,
  createTree,
  sequentialIdFactory,
  type IdFactory,
  type JsonObject,
  type LoomNode,
  type ThemeRegistry,
} from "@loom/runtime"
import { createStarterPrimitiveRegistry } from "@loom/runtime/primitives"
import { renderLoomTree, resolveTheme, themeStyle, THEME_PROP_KEY } from "@loom/runtime/react"
import { describeRegistryError, type PrimitiveRegistry } from "@loom/runtime/sdk"

/**
 * The course, composed rather than marked up.
 *
 * 0067 makes this surface one of the three built *in* Loom: what a reader reads
 * here is a tree of registered primitives, validated by the same registry a host
 * would get from the SDK. Nothing below invents a component, and a paragraph
 * this course needs and the library cannot express is a finding for
 * `Loom primitives` rather than a local `<p>`.
 *
 * The machinery around the prose — the confidence control, the answer box, the
 * queue — is not content and is not built here. It is furniture: it takes input,
 * holds state, and decides what the reader is allowed to see yet, none of which
 * a primitive does.
 */

const built = createStarterPrimitiveRegistry()

if (!built.ok) {
  throw new Error(`loom: the lessons registry was refused — ${describeRegistryError(built.error)}`)
}

export const courseRegistry: PrimitiveRegistry = built.value

export const courseThemes: ThemeRegistry = createThemeRegistry()

/**
 * The house theme, selected here as the surface half of the work that registered
 * it (#103, and the finding it filed against all four surface lanes).
 *
 * The course was on `editorial` because it was the quieter of the two palettes
 * available when this surface was built, and a course is read for twenty minutes
 * at a time rather than scanned. `minimal` is the better answer to that same
 * argument and a stronger one for this surface in particular:
 *
 * - **White paper, black ink, and the green only as a highlight.** A review
 *   question is the thing on the page; a palette that tints the paper puts
 *   something else there. The one place accent now appears on this surface is
 *   what is due today, which is the one thing worth pointing at.
 * - **Outlined rather than filled.** `bg-surface` is the canvas white, so the
 *   answer box and the sitting panel are defined by a hairline instead of a
 *   change of ground — a question and a page that hold the same paper.
 * - **`precise` widens the gutters and tightens the radii.** Space does the
 *   work, which is what the reading column wanted anyway.
 *
 * One face at two weights, which is `minimal-sans`'s own argument: heading and
 * body separated by weight rather than by family. The lessons layout links Geist
 * so the pack's first choice is actually present — see the note there.
 */
export const COURSE_THEME: JsonObject = {
  palette: "minimal",
  fontPack: "minimal-sans",
  stylePreset: "precise",
}

export const heading = (ids: IdFactory, level: number, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, {
    type: "loom.heading",
    props: { level, ...props },
    children: [buildText(ids, text)],
  })

export const prose = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.prose", props, children: [buildText(ids, text)] })

export const stack = (ids: IdFactory, props: JsonObject, children: readonly LoomNode[]): LoomNode =>
  buildElement(ids, { type: "loom.stack", props, children: [...children] })

export const badge = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.badge", props, children: [buildText(ids, text)] })

export const link = (ids: IdFactory, label: string, href: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, {
    type: "loom.link",
    props: { href, ...props },
    children: [buildText(ids, label)],
  })

export const card = (ids: IdFactory, props: JsonObject, children: readonly LoomNode[]): LoomNode =>
  buildElement(ids, { type: "loom.card", props, children: [...children] })

export const section = (
  ids: IdFactory,
  props: JsonObject,
  headingText: string,
  children: readonly LoomNode[]
): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props,
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, headingText, { balance: true })]),
      ...children,
    ],
  })

/**
 * The palette, mounted once by the surface rather than by every fragment.
 *
 * A themed tree mounts its variables on its root (0050), which works when the
 * page *is* one tree. This one is not: a question is a tree rendered on the
 * server and handed to a client component that decides when the reader may see
 * it, so the course is dozens of small trees interleaved with furniture. Giving
 * each one a themed root would mount the same variables dozens of times and
 * wrap every question in a page's padding.
 *
 * So the theme is resolved through the same registry, by the same public
 * function the root primitive uses, and applied to the element the whole surface
 * sits in — one mount, inherited through the cascade by everything under it,
 * furniture included. Nothing here names a colour.
 */
const resolved = resolveTheme({ [THEME_PROP_KEY]: COURSE_THEME }, courseThemes)

if (resolved.outcome !== "themed") {
  throw new Error(`loom: the lessons theme did not resolve — ${resolved.outcome}`)
}

export const COURSE_THEME_STYLE: CSSProperties = themeStyle(resolved.theme)

/**
 * A fragment of the course, rendered: one tree, no root theme, wearing whatever
 * the surface mounted above it.
 */
/**
 * A namespace an id can actually carry: lowercase alphanumerics, and short.
 *
 * `sequentialIdFactory` takes the namespace verbatim and mints `n_<namespace><n>`,
 * which the node id schema then validates — so a key like `set-n-q1` is accepted
 * here and rejected several frames later, inside whichever `buildText` happens
 * to run first. Filed as a finding; the fragment keys are cleaned here meanwhile.
 */
const namespaceOf = (key: string): string => key.replace(/[^0-9a-z]/gi, "").toLowerCase().slice(0, 24)

export const renderFragment = (
  build: (ids: IdFactory) => readonly LoomNode[],
  key: string
): ReactNode => {
  const ids = sequentialIdFactory(namespaceOf(key))
  const tree = createTree(
    buildElement(ids, {
      type: "loom.stack",
      props: { direction: "column", gap: "normal" },
      children: [...build(ids)],
    }),
    ids
  )

  const rendered = renderLoomTree(tree, {
    resolver: courseRegistry,
    validator: courseRegistry,
    themes: courseThemes,
  })

  /**
   * A render diagnostic here is a blank space on the page, not a warning: a node
   * whose props the registry refuses takes its whole subtree with it, so a
   * question with one bad prop renders as an empty card the reader is asked to
   * answer. Better to fail the build of all four surfaces than to serve that.
   */
  if (rendered.diagnostics.length > 0) {
    const codes = rendered.diagnostics.map((diagnostic) => diagnostic.code).join(", ")

    throw new Error(`loom: the lessons fragment "${key}" did not render cleanly — ${codes}`)
  }

  return rendered.element
}
