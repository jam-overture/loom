import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { LIBRARY_CLASS, libraryStylesheet } from "./stylesheet.js"
import { color, family, radius, size, space, weight } from "./tokens.js"

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
 * **`checkbox` is the ninth type and the only one whose control comes before
 * its label.** A contact form that cannot ask for consent is a real gap — every
 * form with a privacy line has one — and it is an enum member rather than a
 * primitive because the content model is this one exactly: a name, a label, a
 * requirement and a hint. What it is not is a *group* of tick boxes. One
 * consent line is one field; a set of them is a set of fields, each addressable,
 * which is 0052 giving the right answer without being asked.
 *
 * **A radio group is the tenth type and is not here**, deliberately. Its
 * choices are the same content model as a `select`'s — a label and a value, so
 * `loom.option` by every test that matters — and a choice inside a `<select>`
 * must be an `<option>` while a choice in a radio group must be an `<input>`
 * with a label. Nothing in this library lets a container tell a child which
 * element to be: a render is a pure function of one node, and the two ways
 * round it are a context a Server Component cannot read and a second primitive
 * that differs from `loom.option` by its markup alone. Filed rather than
 * guessed at, with both shapes written down.
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
  "checkbox",
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
  background: color("bg-surface"),
  color: color("fg-default"),
  border: `1px solid ${color("border-default")}`,
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

  if (type === "checkbox") {
    /**
     * The one control in this file that is not a box you type in, so it takes
     * none of `CONTROL` — a consent tick stretched to `width: 100%` is a
     * rectangle with a tick lost at one end of it.
     *
     * `accent-color` is why this is two enum members rather than a hand-drawn
     * control: it themes the native checkbox from the palette, so the tick is
     * the browser's — with the browser's focus ring, the browser's touch
     * behavior and the platform's idea of what a checkbox looks like — and it
     * is still `accent` under every registered palette. Drawing our own would
     * have meant re-implementing all three to change one color.
     */
    return createElement("input", {
      ...shared,
      type: "checkbox",
      style: {
        flex: "0 0 auto",
        width: size(4),
        height: size(4),
        accentColor: color("accent"),
        /** Sat on the first line of the label rather than on the box's top edge. */
        marginBlockStart: "0.1em",
        cursor: "pointer",
      },
    })
  }

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
     * browser supplies is the operating system's color and cannot be told
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

    const label = createElement(
      "label",
      {
        htmlFor: control,
        style: {
          fontFamily: family("body"),
          /**
           * A consent line is a sentence the reader agrees to, not a name for a
           * box above it, so it is set in the body weight and the reading size.
           * Every other field's label is a name and takes the heading weight.
           */
          fontWeight: type === "checkbox" ? weight("body") : weight("heading"),
          fontSize: type === "checkbox" ? size(3) : size(2),
          lineHeight: type === "checkbox" ? 1.5 : undefined,
          color: type === "checkbox" ? color("fg-muted") : color("fg-default"),
          ...(type === "checkbox" ? { cursor: "pointer" } : {}),
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
            { "aria-hidden": true, style: { color: color("accent-strong") } },
            " *"
          )
    )

    const note =
      hint === undefined
        ? null
        : createElement(
            "p",
            {
              id: hint,
              style: { margin: "0", fontSize: size(2), color: color("fg-muted") },
            },
            given.hint
          )

    /**
     * A checkbox is the one field whose control comes *before* its label, and
     * that is not a styling preference — a tick box after the sentence it
     * governs is a box a reader has to look back for. The hint is indented to
     * the label's edge so the three parts read as one paragraph.
     */
    if (type === "checkbox") {
      return createElement(
        "div",
        {
          ...loom.editable,
          className: LIBRARY_CLASS.field,
          style: {
            display: "flex",
            flexDirection: "column",
            gap: space(2),
            minWidth: "0",
            ...(given.span === "row" ? { gridColumn: "1 / -1" } : {}),
          },
        },
        libraryStylesheet(),
        createElement(
          "div",
          { style: { display: "flex", alignItems: "flex-start", gap: space(3) } },
          controlFor(given, type, { control, hint }, children),
          label
        ),
        note === null
          ? null
          : createElement(
              "div",
              { style: { paddingInlineStart: `calc(${size(4)} + ${space(3)})` } },
              note
            )
      )
    }

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
      label,
      note,
      controlFor(given, type, { control, hint }, children)
    )
  },
})
