import {
  cloneElement,
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react"

import type { ThemeVariables } from "../theme/apply.js"

import {
  asCallablePrimitive,
  type CallablePrimitive,
  type LoomPrimitive,
  type LoomPrimitiveProps,
} from "./primitive.js"

/**
 * A render whose colors are values rather than references.
 *
 * The renderer is a total pure projection into React
 * ([0008](../../decisions/0008-the-renderer-is-a-total-pure-projection.md)) and a
 * primitive paints itself by *naming* a custom property — `loom.section` emits
 * `var(--loom-bg-surface)`, and the root mounts the theme as variables
 * ([0050](../../decisions/0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)).
 * Those two facts are what make a re-theme one `configure` on the root and
 * nothing else (0049), and together they assume a cascade.
 *
 * Something has to render where there is no cascade. An image renderer takes
 * inline styles and literal values; it resolves no custom properties, so a
 * projection whose every color is a `var()` renders as a blank rectangle. So
 * does an email body, and so does anything else that has to show a page outside
 * a browser. `Loom marketing` hit it first and drew its share card by hand,
 * reading the resolved theme itself, and filed the hand-drawn copy of a page as
 * the finding.
 *
 * This is the substitution the browser would have done, done here instead: the
 * same walk the renderer already produced, with every `var(--loom-…)` in an
 * inline style replaced by what the mounted theme says it is. Nothing about any
 * primitive changes, and nothing about the tree changes — a primitive still
 * names a slot and still never learns which palette answered it.
 *
 * **What it does not reach**, because a browser is doing more than substitution:
 *
 * - **The library stylesheet.** `:hover`, `:last-child`, keyframes and
 *   `::after` are the five things that cannot be said inline, and no renderer
 *   without a cascade evaluates them either — so a medium that needs this is a
 *   medium those rules were never going to reach.
 * - **Inside a component element.** A control renders on the client, so its
 *   subtree does not exist yet. Its own `style` prop is substituted; what it
 *   returns is not there to walk.
 *
 * Both are the same shape of limit: this resolves the values a render *has*
 * produced, and does not run the parts of CSS that are not values.
 */

/** A CSS value with the theme's variables resolved, and what could not be. */
export type VariableSubstitution = {
  readonly value: string
  /**
   * Custom properties the theme does not declare **and** that named no
   * fallback. A reference with a fallback is not reported: the fallback is the
   * value, exactly as it is in a browser, and `--loom-mono-family` is written
   * that way on purpose (0085).
   */
  readonly unresolved: readonly string[]
}

const REFERENCE = "var("

/** A quote closes at its own kind, and a backslash inside one escapes anything. */
const endOfQuoted = (text: string, open: number): number => {
  const quote = text[open]

  for (let index = open + 1; index < text.length; index += 1) {
    if (text[index] === "\\") {
      index += 1
      continue
    }
    if (text[index] === quote) return index
  }

  return text.length - 1
}

/**
 * The index of the next `var(` outside a quoted string, or -1.
 *
 * The quote check is not pedantry: a font stack is the value most likely to
 * carry a parenthesis, and `'Foo (Text)'` is a family somebody has shipped.
 */
const nextReference = (text: string, from: number): number => {
  for (let index = from; index < text.length; index += 1) {
    const character = text[index]

    if (character === '"' || character === "'") {
      index = endOfQuoted(text, index)
      continue
    }

    if (text.startsWith(REFERENCE, index)) return index
  }

  return -1
}

/** The index of the `)` closing the `(` at `open`, or -1 if nothing does. */
const closingParen = (text: string, open: number): number => {
  let depth = 0

  for (let index = open; index < text.length; index += 1) {
    const character = text[index]

    if (character === '"' || character === "'") {
      index = endOfQuoted(text, index)
      continue
    }

    if (character === "(") depth += 1
    else if (character === ")") {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return -1
}

type Reference = {
  readonly name: string
  /** Absent when the reference named none — which is different from an empty one. */
  readonly fallback: string | undefined
}

/** `--loom-accent, #fff` → the name, and everything after the first comma. */
const readReference = (inner: string): Reference => {
  let depth = 0

  for (let index = 0; index < inner.length; index += 1) {
    const character = inner[index]

    if (character === '"' || character === "'") {
      index = endOfQuoted(inner, index)
      continue
    }

    if (character === "(") depth += 1
    else if (character === ")") depth -= 1
    else if (character === "," && depth === 0) {
      /**
       * Trimmed, because the space after the comma is how a reference is
       * written and not part of the value — `var(--x, red)` falls back to `red`
       * in a browser, not to ` red`.
       */
      return { name: inner.slice(0, index).trim(), fallback: inner.slice(index + 1).trim() }
    }
  }

  return { name: inner.trim(), fallback: undefined }
}

const substitute = (value: string, variables: ThemeVariables, unresolved: Set<string>): string => {
  let out = ""
  let index = 0

  while (index < value.length) {
    const at = nextReference(value, index)

    if (at === -1) return out + value.slice(index)

    out += value.slice(index, at)

    const close = closingParen(value, at + REFERENCE.length - 1)

    /**
     * An unclosed `var(` is not a reference this can read, and guessing where it
     * ends would invent a value. The rest of the declaration is copied through
     * exactly as the primitive wrote it.
     */
    if (close === -1) return out + value.slice(at)

    const reference = readReference(value.slice(at + REFERENCE.length, close))
    const declared = reference.name.startsWith("--") ? variables[reference.name] : undefined

    if (declared !== undefined) {
      /**
       * The declared value is written through as-is and not walked again. Every
       * variable the theme mounts is a literal, so there is nothing to resolve
       * — and not re-entering is what makes a theme that somehow referred to
       * itself a value rather than a hang.
       */
      out += declared
    } else if (reference.fallback !== undefined) {
      out += substitute(reference.fallback, variables, unresolved)
    } else {
      if (reference.name.startsWith("--")) unresolved.add(reference.name)
      out += value.slice(at, close + 1)
    }

    index = close + 1
  }

  return out
}

export const substituteVariables = (
  value: string,
  variables: ThemeVariables
): VariableSubstitution => {
  const unresolved = new Set<string>()

  return { value: substitute(value, variables, unresolved), unresolved: [...unresolved].sort() }
}

/** A projection with the theme resolved into it, and what the theme did not answer. */
export type InlinedProjection = {
  readonly element: ReactNode
  readonly unresolved: readonly string[]
}

type StyleObject = Readonly<Record<string, unknown>>

const isStyleObject = (style: unknown): style is StyleObject =>
  typeof style === "object" && style !== null && !Array.isArray(style)

const inlineStyle = (
  style: StyleObject,
  variables: ThemeVariables,
  unresolved: Set<string>
): StyleObject | undefined => {
  let next: Record<string, unknown> | undefined

  for (const [property, value] of Object.entries(style)) {
    if (typeof value !== "string" || !value.includes(REFERENCE)) continue

    const resolved = substitute(value, variables, unresolved)
    if (resolved === value) continue

    next = next ?? { ...style }
    next[property] = resolved
  }

  return next
}

type ElementProps = {
  readonly style?: unknown
  readonly children?: ReactNode
}

const inlineNode = (node: ReactNode, variables: ThemeVariables, unresolved: Set<string>): ReactNode => {
  if (Array.isArray(node)) {
    const children = node as readonly ReactNode[]
    let changed = false

    const next = children.map((child) => {
      const walked = inlineNode(child, variables, unresolved)
      if (walked !== child) changed = true
      return walked
    })

    return changed ? next : node
  }

  if (!isValidElement(node)) return node

  const element = node as ReactElement<ElementProps>
  const { style, children } = element.props

  const nextStyle = isStyleObject(style) ? inlineStyle(style, variables, unresolved) : undefined
  const nextChildren = children === undefined ? undefined : inlineNode(children, variables, unresolved)
  const childrenChanged = nextChildren !== undefined && nextChildren !== children

  if (!nextStyle && !childrenChanged) return node

  /**
   * `cloneElement` rather than `createElement`, because it carries the key and
   * the ref across. Ids are React keys here (§1), so an element that lost its
   * key on the way through would be reconciled as a delete and an insert — the
   * one property the whole projection is built to keep.
   */
  return cloneElement(element, {
    ...(nextStyle ? { style: nextStyle } : {}),
    ...(childrenChanged ? { children: nextChildren } : {}),
  })
}

/**
 * The projection, with every theme reference in an inline style replaced by
 * what the mounted theme says it is.
 *
 * Pure and structurally sharing: a subtree with nothing to substitute comes back
 * as the identical element, so a render this changes nothing about is the render
 * it was handed.
 */
export const inlineThemeVariables = (
  element: ReactNode,
  variables: ThemeVariables
): InlinedProjection => {
  const unresolved = new Set<string>()

  return {
    element: inlineNode(element, variables, unresolved),
    unresolved: [...unresolved].sort(),
  }
}

type LiteralThemeProps = LoomPrimitiveProps & {
  readonly primitive: CallablePrimitive
  readonly variables: ThemeVariables
}

/**
 * One node's primitive, rendered and then resolved.
 *
 * The substitution cannot be a pass over what `renderLoomTree` returns, and the
 * reason is worth stating because it is the whole shape of this file: the
 * projection is a tree of *component* elements, and what a primitive paints does
 * not exist until something renders it. A walk over the projection sees
 * `<loom.card>` and no styles at all.
 *
 * So it happens one node in, where the styles are. This stands in for the
 * primitive, calls it, and substitutes into what it produced — stopping at the
 * child elements, which are the next nodes' stand-ins and resolve their own
 * output the same way when they are rendered. Every node pays for itself and
 * nothing is walked twice.
 *
 * **Calling the primitive rather than mounting it** is what keeps this one
 * element per node instead of two. A primitive is a pure function of the props
 * the seam hands it and holds no state (0008) — that is the same property the
 * whole projection rests on, and a primitive that broke it would already have
 * broken rendering the same tree twice. Hooks are what the rule forbids, and
 * this is where forbidding them pays.
 */
const LiteralTheme = ({ primitive, variables, ...forwarded }: LiteralThemeProps): ReactNode =>
  inlineThemeVariables(primitive(forwarded), variables).element

LiteralTheme.displayName = "loom(literal-theme)"

/**
 * A node's primitive, standing behind the substitution, under the node's own key.
 *
 * A class component is mounted as it always was and keeps its references: it
 * cannot be called, and the alternative — rendering it and walking the result —
 * is the pass this file exists because nothing can do. Nothing in this package
 * is one, and a host that registers one gets a page rather than an exception.
 */
export const literalThemeElement = (
  primitive: LoomPrimitive,
  variables: ThemeVariables,
  key: string,
  forwarded: LoomPrimitiveProps
): ReactElement => {
  const callable = asCallablePrimitive(primitive)

  return callable.ok
    ? createElement(LiteralTheme, { key, primitive: callable.value, variables, ...forwarded })
    : createElement(primitive, { key, ...forwarded })
}
