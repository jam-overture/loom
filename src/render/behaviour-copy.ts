"use client"

import { createElement, useCallback, useEffect, useState } from "react"

import { controlClass, controlDisplay } from "./control.js"

/**
 * The one control in the runtime that runs on the client.
 *
 * Everything else Loom renders is a projection of the tree and nothing more
 * ([0008](../../decisions/0008-the-renderer-is-a-total-pure-projection.md)). A
 * copy button cannot be: writing to the clipboard is a click handler, and a
 * click handler is not expressible in JSON, which is what a primitive's props
 * are ([0009](../../decisions/0009-primitives-receive-props-in-a-bag.md)).
 * So it lives here, behind `"use client"`, and a primitive receives it already
 * built — see `behaviour.ts` for why that is the shape rather than a prop, a
 * host-installed script, or a primitive of its own.
 *
 * **It renders nothing until it knows it will work.** The server render and the
 * first client render are both empty, and the button appears from an effect
 * once `navigator.clipboard.writeText` is actually there. That costs a paint
 * and buys the property the finding this closes insisted on: a button that
 * looks like it copies and does not is worse for a visitor than no button, and
 * an insecure origin, an old browser and a page served with scripting off are
 * three ordinary ways to get one. Nothing here guesses; it asks.
 *
 * The two labels arrive as props because they are the primitive's declared
 * strings, resolved through the text seam like every other string a component
 * owns (0063). There is no English in this file.
 */

export type CopyControlProps = {
  /** What goes on the clipboard: the text of the node the behaviour belongs to. */
  readonly value: string
  /** The control's name, in the language this deployment serves. */
  readonly label: string
  /** What it says for a moment after a successful write. */
  readonly copiedLabel: string
}

/**
 * How long the control shows its confirmation. Long enough to read, short
 * enough that a reader who copies twice sees the second one happen.
 */
const CONFIRMATION_MS = 2000

type ControlState = "unusable" | "idle" | "copied"

/**
 * `var()` with a fallback, rather than the `tokens.ts` helpers, for two reasons
 * that point the same way: those live in `src/primitives/`, which the render
 * seam must not depend on, and a control that only looks right on a themed page
 * would render invisible in a preview pane that mounts no theme. The variables
 * themselves are this package's own — `theme/apply.ts` emits every one of them.
 *
 * `display` is the one line a primitive can take back, because it is the one a
 * primitive has to: an inline declaration beats the rule a stylesheet would aim
 * at the control's class, and whether a button belongs at this width is not
 * something the runtime knows. See `controlDisplay` for the two names that
 * override it.
 */
const BUTTON_STYLE = {
  display: controlDisplay("copy", "inline-flex"),
  alignItems: "center",
  gap: "var(--loom-spacing-1, 4px)",
  paddingBlock: "var(--loom-spacing-1, 4px)",
  paddingInline: "var(--loom-spacing-2, 8px)",
  fontFamily: "inherit",
  fontSize: "var(--loom-scale-1, 0.75rem)",
  lineHeight: 1.2,
  color: "var(--loom-fg-muted, currentColor)",
  background: "var(--loom-bg-surface, transparent)",
  border: "1px solid var(--loom-border-subtle, currentColor)",
  borderRadius: "var(--loom-radius-sm, 4px)",
  cursor: "pointer",
} as const

export const CopyControl = ({ value, label, copiedLabel }: CopyControlProps) => {
  const [state, setState] = useState<ControlState>("unusable")

  /**
   * Deliberately an effect rather than a render-time check. Reading
   * `navigator` while rendering would make the server's markup and the
   * browser's first render disagree, which React resolves by keeping the
   * server's — so the button would be missing exactly where it works.
   */
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
      setState("idle")
    }
  }, [])

  useEffect(() => {
    if (state !== "copied") return undefined

    const timer = setTimeout(() => setState("idle"), CONFIRMATION_MS)

    return () => clearTimeout(timer)
  }, [state])

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(
      () => setState("copied"),
      /**
       * A refused clipboard — a permission the reader denied, a document that
       * lost focus — leaves the control saying what it says. Announcing a copy
       * that did not happen is the failure this whole control is arranged to
       * avoid, and there is no second sentence here to say it with.
       */
      () => setState("idle")
    )
  }, [value])

  if (state === "unusable") return null

  return createElement(
    "button",
    {
      type: "button",
      className: controlClass("copy"),
      onClick: copy,
      style: BUTTON_STYLE,
    },
    createElement("span", { "aria-live": "polite" }, state === "copied" ? copiedLabel : label)
  )
}
