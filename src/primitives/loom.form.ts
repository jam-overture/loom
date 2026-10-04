import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"
import type { SubmissionTarget } from "../submit/endpoint.js"
import type { SubmissionOutcome } from "../submit/resolution.js"

import { LIBRARY_CLASS, libraryStylesheet } from "./stylesheet.js"
import { colour, radius, size, space, WIDTHS } from "./tokens.js"

/**
 * The band where a page stops telling and starts asking: a set of
 * `loom.field`s, the control that sends them, and the fine print underneath.
 *
 * It is the first primitive in this library that **posts anywhere**, and the
 * first user of the submission seam
 * ([0065](../../decisions/0065-a-submission-names-a-destination-and-never-carries-one.md)),
 * which has existed with no caller since 18 August. The address is not here and
 * cannot be: the tree names a registered endpoint under `loom:submit`, the
 * deployment resolves it before the walk, and what arrives at this component is
 * an action, a method and whatever hidden fields the host needs carried. No
 * prop on this primitive, or on any of its children, can reach the network —
 * which is the property that makes a form safe to let a model author at all.
 *
 * **It has no heading slot, deliberately.** Hermes' `contactform` carried
 * `title`, `desc` and `btnText` as fields, and all three are the port map's
 * first verdict: a heading is a `loom.heading`, the sentence under it is a
 * `loom.prose`, and the label on the button is that button's child text. A
 * form that owned them would make "move the explanation below the fields" a
 * prop nobody predicted. Compose it: `loom.section` > heading + prose + form.
 *
 * ## The three states, and why a disabled fieldset is the answer
 *
 * 0065 gives a form three distinguishable conditions and refuses to let them
 * collapse: **absent** is a tree that never said where to post, **unavailable**
 * is a deployment that could not answer right now, and **ready** is a target.
 * The failure the seam exists to prevent is a submit button that silently goes
 * nowhere, so the two that are not `ready` render the form **disabled**, with a
 * line saying so.
 *
 * `<fieldset disabled>` is what does it, and it is the reason the fields and
 * the submit control are inside one. It disables every control it contains
 * without any of them knowing why — which matters, because `loom.submit`
 * reaches the node that declared the submission and not its children, so a
 * `loom.button` cannot possibly know the form it sits in has no address. The
 * alternative was a `disabled` prop on the button that some other node had to
 * set correctly, which is a rule no schema states and every edit breaks.
 *
 * The hidden fields stay **outside** the fieldset. A disabled control is not a
 * successful one, so a CSRF token inside a fieldset that is ever disabled is a
 * token that never gets sent.
 */

const FORM_TEXT = {
  /**
   * Three strings rather than one, because the seam distinguishes three
   * conditions and a visitor reads them differently: one is a page that is not
   * finished, one is worth trying again in a minute, and one is not. None of
   * them says "endpoint", "registry" or "unavailable" — the reason belongs in
   * the render diagnostics, where the person who can fix it is looking.
   */
  untargeted: "This form is not connected yet, so it cannot be sent.",
  unavailable: "This form cannot be sent just now. Please try again in a moment.",
  refused: "This form is not accepting messages at the moment.",
} as const

type FormTextKey = keyof typeof FORM_TEXT

const props = z
  .object({
    /**
     * Three genuinely different renderings of the same fields, and none of them
     * changes which fields exist: a column, a pair of columns that collapses to
     * one on a phone, and a single row ending in its own submit — the shape a
     * newsletter signup has had since newsletters.
     */
    layout: z.enum(["stacked", "paired", "inline"]).optional(),
    width: z.enum(["full", "wide", "readable"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

type Layout = NonNullable<Props["layout"]>

const FIELD_ARRANGEMENT: Readonly<Record<Layout, CSSProperties>> = {
  stacked: { display: "flex", flexDirection: "column", gap: space(4) },
  /**
   * A floor per column fed to `auto-fit`, never a count — `loom.feature-grid`'s
   * distinction, and it holds here for the same reason: nothing about this
   * truncates the list, so changing the layout moves no node.
   *
   * The floor is `max(15rem, 45%)` rather than a fixed length, and the
   * percentage is what makes the name honest: two columns of 45% fit and three
   * do not, so a form laid out in pairs is laid out in pairs at any width — and
   * the `15rem` takes over on a phone, where 45% of the screen is not a field
   * anybody can type in.
   */
  paired: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(max(15rem, 45%), 1fr))",
    gap: space(4),
  },
  inline: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: space(3),
  },
}

const NOTICE: CSSProperties = {
  margin: "0",
  paddingBlock: space(3),
  paddingInline: space(4),
  background: colour("bg-surface-muted"),
  border: `1px solid ${colour("border-default")}`,
  borderRadius: radius("md"),
  color: colour("fg-muted"),
  fontSize: size(2),
}

/** The declared string for a state, or nothing at all when the form works. */
const noticeKeyFor = (outcome: SubmissionOutcome | undefined): FormTextKey | undefined => {
  if (outcome === undefined) return "untargeted"
  if (outcome.status === "ready") return undefined

  return outcome.unavailable.reason === "refused" ? "refused" : "unavailable"
}

const hiddenFields = (target: SubmissionTarget | undefined): readonly ReactNode[] =>
  (target?.fields ?? []).map((field) =>
    createElement("input", {
      key: field.name,
      type: "hidden",
      name: field.name,
      value: field.value,
    })
  )

export const loomForm = definePrimitive({
  type: "loom.form",
  description:
    "A form: loom.field children, a loom.button in its submit region, and the destination the deployment resolved.",
  props,
  slots: ["submit", "note"],
  copy: [],
  /**
   * The one primitive in this library that posts, saying so
   * ([0087](../../decisions/0087-a-primitive-that-posts-declares-it-and-the-audit-checks.md)).
   *
   * It posted correctly before this line and the probe could see it, which is
   * why nothing was broken and nothing goes red now. What the declaration buys
   * is the *other* direction: a later refactor that reads `loom.submit` and
   * forgets to put the action back on the `<form>` moves this out of `submits`
   * and into `unwiredSubmitters`, and the audit says so. Undeclared, that same
   * edit reads as a primitive that simply stopped posting — indistinguishable
   * from one that never did.
   */
  submits: true,
  text: FORM_TEXT,
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, FormTextKey>) => {
    const layout: Layout = given.layout ?? "stacked"
    const outcome = loom.submit
    const target = outcome?.status === "ready" ? outcome.target : undefined
    const notice = noticeKeyFor(outcome)
    const submit = loom.slots["submit"]

    const fields = createElement(
      "div",
      {
        className: layout === "inline" ? LIBRARY_CLASS.formInline : undefined,
        style: FIELD_ARRANGEMENT[layout],
      },
      children,
      /** In a row, the control is the end of the row rather than the next one. */
      layout === "inline" ? submit : null
    )

    return createElement(
      "form",
      {
        ...loom.editable,
        ...(target === undefined ? {} : { action: target.action, method: target.method }),
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(4),
          width: "100%",
          maxWidth: WIDTHS[given.width ?? "full"],
        },
      },
      libraryStylesheet(),
      ...hiddenFields(target),
      /**
       * Outside the fieldset, so the one thing worth reading is the one thing
       * not dimmed.
       */
      notice === undefined
        ? null
        : createElement("p", { style: NOTICE }, loom.text[notice]),
      createElement(
        "fieldset",
        {
          ...(target === undefined ? { disabled: true } : {}),
          style: {
            /** A fieldset arrives with a border, padding and a min width that fights every grid. */
            border: "0",
            margin: "0",
            padding: "0",
            minInlineSize: "0",
            display: "flex",
            flexDirection: "column",
            gap: space(4),
            ...(target === undefined ? { opacity: 0.6 } : {}),
          },
        },
        fields,
        layout === "inline" || submit === undefined
          ? null
          : createElement("div", { style: { display: "flex" } }, submit),
        loom.slots["note"] === undefined
          ? null
          : createElement(
              "div",
              { style: { color: colour("fg-muted"), fontSize: size(2) } },
              loom.slots["note"]
            )
      )
    )
  },
})
