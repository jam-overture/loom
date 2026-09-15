import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen, PHONE, WIDE } from "../../tools/specimen/specimen.js"

/**
 * The three tables the marketing lane measured, at the two widths where they
 * behave differently.
 *
 * This specimen exists to be photographed **on a phone**, which is the opposite
 * of how the library's specimens are usually read. Every other one in this
 * directory is a wide shot with a phone shot beside it for completeness; here
 * the wide shot is the control — *nothing may change at 1280* is half of what
 * this run claims — and the phone shot is the subject.
 *
 * The three subjects are the three shapes a table takes, and they fail
 * differently, which is why one fix would have been the wrong number of fixes:
 *
 * - **A comparison of four subjects** is wider than a phone on purpose, scrolls
 *   inside its own edge, and used to say nothing about the three subjects to
 *   the right of the fold. That is the 13 September finding.
 * - **A table of sentences** fits a phone and pays for it in height: three
 *   prose columns at a hundred pixels each was one row 504 pixels tall. That is
 *   the 14 September measurement, and the row in it is quoted close enough to
 *   reproduce the number.
 * - **A table of values** fits a phone and is *right* there. It is in the
 *   photograph as the thing the fix must not break: a run that made this one
 *   scroll would have traded a real defect for a new one, and only a table of
 *   short cells beside a table of long ones can show that it did not.
 */

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()
  const text = (value: string) => buildText(idFactory, value)

  const heading = (level: number, words: string) =>
    buildSlot(idFactory, "heading", [
      buildElement(idFactory, { type: "loom.heading", props: { level }, children: [text(words)] }),
    ])

  const prose = (words: string, props: JsonObject = {}) =>
    buildElement(idFactory, { type: "loom.prose", props, children: [text(words)] })

  const cell = (props: JsonObject, words?: string) =>
    buildElement(idFactory, {
      type: "loom.table-cell",
      props,
      ...(words === undefined ? {} : { children: [text(words)] }),
    })

  const row = (props: JsonObject, cells: readonly ReturnType<typeof cell>[]) =>
    buildElement(idFactory, { type: "loom.table-row", props, children: [...cells] })

  const subject = (name: string, note?: string) =>
    buildElement(idFactory, {
      type: "loom.comparison",
      props: { role: "subject", ...(note === undefined ? {} : { note }) },
      children: [text(name)],
    })

  const verdict = (props: JsonObject, words?: string) =>
    buildElement(idFactory, {
      type: "loom.comparison",
      props,
      ...(words === undefined ? {} : { children: [text(words)] }),
    })

  /**
   * Four subjects and a criterion column, which is the maximum the band
   * documents and the shape `/who-can-ask` actually ships. Four is the case
   * that matters: it is the width at which a phone shows the criterion and one
   * answer, so it is the width at which a reader has to be told that there are
   * three more.
   */
  const comparison = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Comparison", anchor: "comparison" },
    children: [
      heading(2, "Four subjects, one of which is off the edge of a phone"),
      prose(
        "The band is wider than a phone deliberately. What it never said is that it was wider — so a reader who did not happen to swipe read one subject and left believing it was the only one.",
        { size: "lead", tone: "muted" }
      ),
      buildElement(idFactory, {
        type: "loom.comparison-table",
        props: { caption: "How a change reaches the page", feature: "fourth" },
        children: [
          buildSlot(idFactory, "columns", [
            buildElement(idFactory, {
              type: "loom.comparison-row",
              props: {},
              children: [
                subject("Hand-edited"),
                subject("A CMS field"),
                subject("Code generation"),
                subject("Loom", "a tree and a delta"),
              ],
            }),
          ]),
          buildElement(idFactory, {
            type: "loom.comparison-row",
            props: { heading: "Reversible" },
            children: [
              verdict({ mark: "no" }),
              verdict({ mark: "partial" }),
              verdict({ mark: "no" }),
              verdict({ mark: "yes" }),
            ],
          }),
          buildElement(idFactory, {
            type: "loom.comparison-row",
            props: { heading: "Reviewed before it lands" },
            children: [
              verdict({ mark: "yes" }),
              verdict({ mark: "no" }),
              verdict({ mark: "partial", note: "if anyone reads it" }),
              verdict({ mark: "yes" }),
            ],
          }),
          buildElement(idFactory, {
            type: "loom.comparison-row",
            props: { heading: "Needs a deploy", note: "counted from the request" },
            children: [
              verdict({ mark: "yes" }),
              verdict({ mark: "no" }),
              verdict({ mark: "yes" }),
              verdict({ mark: "no" }),
            ],
          }),
          buildElement(idFactory, {
            type: "loom.comparison-row",
            props: { heading: "New code at runtime" },
            children: [
              verdict({ mark: "no" }),
              verdict({ mark: "no" }),
              verdict({ mark: "yes" }),
              verdict({ mark: "no" }),
            ],
          }),
        ],
      }),
    ],
  })

  /**
   * Three columns of sentences, which is the table the 14 September entry
   * measured at 504 pixels for one row. The cells are quoted at the length that
   * produced the number rather than trimmed to make the photograph flattering.
   */
  const sentences = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Prose", anchor: "prose" },
    children: [
      heading(2, "Three columns of sentences"),
      prose(
        "This one fits a phone, and that was the problem: it paid for fitting in height, and a single row took most of the screen.",
        { size: "lead", tone: "muted" }
      ),
      buildElement(idFactory, {
        type: "loom.table",
        props: { caption: "The same trip, weighed twice", tone: "panel", rules: "rows", prose: true },
        children: [
          buildSlot(idFactory, "columns", [
            row({}, [
              cell({ role: "column" }, "Where it is decided"),
              cell({ role: "column" }, "What that means for a reader"),
              cell({ role: "column" }, "Whose problem it is when it is wrong"),
            ]),
          ]),
          row({}, [
            cell({ role: "row" }, "In the tree"),
            cell({}, "The change is a node, so it can be moved, removed and put back without anybody writing code for the putting back."),
            cell({}, "The runtime's, and it is answerable for it in the record every proposal leaves behind."),
          ]),
          row({}, [
            cell({ role: "row" }, "In a prop"),
            cell({}, "The change is reachable only if somebody predicted it, and the prediction was made months before the reader arrived."),
            cell({}, "The library's, and nothing on the page reports that the adaptation was refused rather than considered."),
          ]),
          row({ tone: "highlight" }, [
            cell({ role: "row" }, "In generated code"),
            cell({}, "The change is whatever the model wrote, and the page is a different page from the one anybody reviewed."),
            cell({}, "Everyone's, eventually, which is the reason this framework does not do it."),
          ]),
        ],
      }),
    ],
  })

  /**
   * The control. Short cells, a numeric column, and it fits a phone with room
   * to spare — so if the fix has made *this* scroll, the photograph says so
   * immediately and the fix is wrong.
   */
  const values = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Values", anchor: "values" },
    children: [
      heading(2, "The table the fix must leave alone"),
      prose("Four short columns. It fits a phone today, and a change that made it scroll would be a new defect wearing the old one's fix.", {
        size: "lead",
        tone: "muted",
      }),
      buildElement(idFactory, {
        type: "loom.table",
        props: { caption: "Proposals, by week", density: "tight", rules: "grid" },
        children: [
          buildSlot(idFactory, "columns", [
            row({}, [
              cell({ role: "column" }, "Week"),
              cell({ role: "column", align: "end" }, "Asked"),
              cell({ role: "column", align: "end" }, "Landed"),
              cell({ role: "column", align: "end" }, "Undone"),
            ]),
          ]),
          row({}, [
            cell({ role: "row" }, "Aug 25"),
            cell({ numeric: true }, "1,204"),
            cell({ numeric: true }, "1,118"),
            cell({ numeric: true }, "12"),
          ]),
          row({}, [
            cell({ role: "row" }, "Sep 1"),
            cell({ numeric: true }, "1,431"),
            cell({ numeric: true }, "1,390"),
            cell({ numeric: true }, "9"),
          ]),
          row({}, [
            cell({ role: "row" }, "Sep 8"),
            cell({ numeric: true }, "1,677"),
            cell({ numeric: true }, "1,650"),
            cell({ numeric: true }, "4"),
          ]),
        ],
      }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
    children: [comparison, sentences, values],
  })

  return createTree(page, idFactory)
}

export default defineSpecimen({
  name: "tables-on-a-phone",
  title: "Three tables, at the width where they stop agreeing",
  build,
  viewports: [PHONE, WIDE],
  themes: [
    {
      label: "editorial",
      selection: themeSelectionSchema.parse({
        palette: "editorial",
        fontPack: "editorial-serif",
        stylePreset: "comfortable",
      }),
    },
    {
      label: "bold",
      selection: themeSelectionSchema.parse({
        palette: "bold",
        fontPack: "bold-sans",
        stylePreset: "airy-modern",
      }),
    },
  ],
})
