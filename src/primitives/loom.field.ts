import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { LIBRARY_CLASS, libraryStylesheet } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"

/**
 * One thing a form asks for: a label, the control under it, and the note that
 * says what to type.
 *
 * Hermes held these as a `fields` list of `ContactFormField` inside the
 * `contactform` block, which is 0052's first half exactly — twelve field
 * shapes in one array, where adding a phone number was a `configure` carrying
 * all twelve and no individual field had an author. Here each one is a node, so
 * a form gains a field by `insert` and reorders by `move`.
 *
 * **`type` stays a prop**, and it is the near-miss worth naming. It selects
 * among a closed set of renderings of the same content — the label, the name
 * and the requirement are identical whichever it is — and no delta operation
 * adds or removes a node when it changes. That is the granularity doc's
 * "changes how, not how many". A `fields` array would have been structure in a
 * prop bag; an input type is not.
 *
 * **The children are the choices**, and only a `select` has any. That is why
 * the hint is a prop rather than child prose, which is the one place this
 * primitive declines to follow 0059: a node whose children mean one thing for
 * six of its seven types and another for the seventh is a node nobody can read.
 *
 * Two things here are better than what Hermes had, rather than a port of it.
 * Hermes' `dropdown` type had **nowhere to put its options** — a select with no
 * choices, in a registry that shipped for a year — and here they are child
 * `loom.option` nodes. And `autocomplete` is emitted, derived from the type
 * where the type implies it, because a contact form that makes someone type
 * their own email address again is a form that measurably fewer people finish.
 */

const FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "url",
  "number",
  "date",
  "textarea",
  "select",
] as const

type FieldType = (typeof FIELD_TYPES)[number]

/**
 * A closed vocabulary rather than the open string HTML takes. The value goes
 * into an attribute browsers act on, it is AI-authored, and the tokens that
 * matter to the forms this library builds are countable — so an enum buys the
 * catalogue a list a model can choose from and costs nothing anybody wanted.
 */
const AUTOCOMPLETE_TOKENS = [
  "off",
  "name",
  "given-name",
  "family-name",
  "email",
  "tel",
  "organization",
  "url",
  "street-address",
  "postal-code",
  "country-name",
] as const

const props = z
  .object({
    /**
     * The key this field's answer arrives under. It is the one prop here that
     * is not for a reader: an endpoint reads it, so a form whose fields are
     * renamed by a proposal delivers different keys to the same address, and
     * the pattern keeps that within what a host can map.
     */
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z][A-Za-z0-9_.-]*$/),
    label: z.string().min(1).max(80),
    type: z.enum(FIELD_TYPES).optional(),
    required: z.boolean().optional(),
    placeholder: z.string().min(1).max(80).optional(),
    /** The line under the label: a format, a reassurance, what happens next. */
    hint: z.string().min(1).max(200).optional(),
    /**
     * `row` takes the whole width of a form laid out in pairs — a message is
     * not the same size as a first name. It moves no node, so it is layout and
     * a prop.
     */
    span: z.enum(["column", "row"]).optional(),
    autocomplete: z.enum(AUTOCOMPLETE_TOKENS).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** What the browser may fill in when the type says it plainly and nobody said otherwise. */
const IMPLIED_AUTOCOMPLETE: Partial<Record<FieldType, string>> = {
  email: "email",
  tel: "tel",
  url: "url",
}

const CONTROL: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  paddingBlock: space(3),
  paddingInline: space(3),
  background: colour("bg-surface"),
  color: colour("fg-default"),
  border: `1px solid ${colour("border-default")}`,
  borderRadius: radius("md"),
  fontFamily: family("body"),
  fontWeight: weight("body"),
  fontSize: size(3),
  lineHeight: 1.4,
}

const controlFor = (
  given: Props,
  type: FieldType,
  ids: { readonly control: string; readonly hint: string | undefined },
  children: ReactNode
): ReactNode => {
  const shared = {
    id: ids.control,
    name: given.name,
    className: LIBRARY_CLASS.input,
    ...(given.required === true ? { required: true } : {}),
    ...(ids.hint === undefined ? {} : { "aria-describedby": ids.hint }),
  }

  /**
   * A `<select>` takes no `placeholder` attribute — the word means a first
   * choice that is not one, which is an option rather than a hint — so the prop
   * reaches the two elements that have it and becomes a disabled option below.
   */
  const placeholder =
    given.placeholder === undefined ? {} : { placeholder: given.placeholder }

  const autocomplete = given.autocomplete ?? IMPLIED_AUTOCOMPLETE[type]

  if (type === "textarea") {
    return createElement("textarea", {
      ...shared,
      ...placeholder,
      rows: 5,
      style: { ...CONTROL, resize: "vertical", minHeight: "7rem" },
    })
  }

  if (type === "select") {
    /**
     * The native arrow is switched off and drawn in CSS, because the one the
     * browser supplies is the operating system's colour and cannot be told
     * about the palette — a light grey chevron that disappears on the bold
     * canvas. The replacement is `currentColor`, so it is the palette's by
     * construction.
     *
     * `defaultValue=""` selects the placeholder rather than the first real
     * choice, which is what makes an unanswered select say "Choose one" instead
     * of quietly submitting whatever happened to be first.
     */
    return createElement(
      "div",
      { className: LIBRARY_CLASS.select, style: { position: "relative", display: "flex" } },
      createElement(
        "select",
        {
          ...shared,
          ...(given.placeholder === undefined ? {} : { defaultValue: "" }),
          style: {
            ...CONTROL,
            appearance: "none",
            WebkitAppearance: "none",
            paddingInlineEnd: space(6),
            cursor: "pointer",
          },
        },
        given.placeholder === undefined
          ? null
          : createElement(
              "option",
              { value: "", disabled: true },
              given.placeholder
            ),
        children
      )
    )
  }

  return createElement("input", {
    ...shared,
    ...placeholder,
    type,
    ...(autocomplete === undefined ? {} : { autoComplete: autocomplete }),
    ...(type === "number" ? { inputMode: "numeric" as const } : {}),
    style: CONTROL,
  })
}

export const loomField = definePrimitive({
  type: "loom.field",
  description:
    "One question on a loom.form: a label, its control, and an optional hint. A select's choices are loom.option children.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const type: FieldType = given.type ?? "text"
    const control = String(loom.nodeId)
    const hint = given.hint === undefined ? undefined : `${control}-hint`

    return createElement(
      "div",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.field,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(2),
          /** Without this a long placeholder makes a grid column refuse to shrink. */
          minWidth: "0",
          ...(given.span === "row" ? { gridColumn: "1 / -1" } : {}),
        },
      },
      libraryStylesheet(),
      createElement(
        "label",
        {
          htmlFor: control,
          style: {
            fontFamily: family("body"),
            fontWeight: weight("heading"),
            fontSize: size(2),
            color: colour("fg-default"),
          },
        },
        given.label,
        /**
         * The mark is decoration: `required` on the control is what actually
         * announces the requirement, and an asterisk read aloud as "star" in
         * the middle of a label is noise.
         */
        given.required !== true
          ? null
          : createElement(
              "span",
              { "aria-hidden": true, style: { color: colour("accent-strong") } },
              " *"
            )
      ),
      hint === undefined
        ? null
        : createElement(
            "p",
            {
              id: hint,
              style: { margin: "0", fontSize: size(2), color: colour("fg-muted") },
            },
            given.hint
          ),
      controlFor(given, type, { control, hint }, children)
    )
  },
})
