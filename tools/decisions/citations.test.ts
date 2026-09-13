import { describe, expect, it } from "vitest"

import {
  checkCitations,
  citationsIn,
  describeCitationProblem,
  proseIn,
  type Citation,
} from "./citations.js"

const RECORDS = new Set([
  "0009-primitives-receive-props-in-a-bag.md",
  "0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md",
  "0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md",
])

const linkTo = (label: string, file: string) => `[${label}](../../decisions/${file})`

const comment = (body: string) => `/**\n * ${body}\n */\nexport const x = 1\n`

describe("citationsIn", () => {
  it("reads the form this repository uses three hundred times", () => {
    expect(citationsIn("is both halves of that seam (0095).")).toEqual<readonly Citation[]>([
      { kind: "bare", number: 95 },
    ])
  })

  it("reads two records cited in one parenthetical", () => {
    expect(citationsIn("the seam whose shape it borrows (0065, 0095)")).toEqual<readonly Citation[]>(
      [
        { kind: "bare", number: 65 },
        { kind: "bare", number: 95 },
      ]
    )
  })

  it("reads a citation introduced by a word", () => {
    expect(citationsIn("nothing reaches inside the framework (see 0018)")).toEqual<
      readonly Citation[]
    >([{ kind: "bare", number: 18 }])
  })

  /**
   * The luminance transfer in `src/theme/separation.ts` is
   * `0.2126 * r + 0.7152 * g + 0.0722 * b`, and a word boundary sits happily
   * either side of the four digits inside `0.0722`. The first draft of this
   * check reported two CIE constants as citations of records nobody wrote.
   */
  it("does not read a decimal constant as a record number", () => {
    expect(citationsIn("const y = transfer(0.2126 * r + 0.7152 * g + 0.0722 * b)")).toEqual([])
  })

  it("reads a link as one citation carrying both halves", () => {
    expect(citationsIn(`props are JSON (${linkTo("0009", "0009-primitives-receive-props-in-a-bag.md")}).`)).toEqual<
      readonly Citation[]
    >([{ kind: "link", number: 9, opens: "0009-primitives-receive-props-in-a-bag.md" }])
  })

  it("reads a link with an anchor on the end", () => {
    expect(citationsIn("[0095](0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md#decision)")).toEqual<
      readonly Citation[]
    >([
      {
        kind: "link",
        number: 95,
        opens: "0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md",
      },
    ])
  })

  /** Counting a link's own label twice would report one wrong link as two problems. */
  it("does not read a link's label a second time as a bare citation", () => {
    const text = `(${linkTo("0094", "0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md")})`

    expect(citationsIn(text)).toHaveLength(1)
  })

  it("ignores four digits outside a parenthetical, because prose counts things", () => {
    expect(citationsIn("the ladder gained a seventh rung, and 0035 added the sixth")).toEqual([])
  })
})

describe("proseIn", () => {
  it("keeps a markdown file whole", () => {
    expect(proseIn("decisions/0095-a.md", "a record (0094)")).toBe("a record (0094)")
  })

  it("reads a block comment and not the code under it", () => {
    const source = comment("borrows the shape (0095).") + 'const file = "0094-a.md"\n'

    expect(proseIn("src/frame/origin.ts", source)).toContain("(0095)")
    expect(proseIn("src/frame/origin.ts", source)).not.toContain("0094-a.md")
  })

  /**
   * The tests in this directory build fixtures out of string literals naming
   * records that do not exist on purpose. Reading the whole file would make the
   * check fail on the tests that prove it works.
   */
  it("does not read a fixture in a string literal", () => {
    const source = 'const fixture = "[0001](0001-a-decision.md)"\n'

    expect(checkCitations("tools/decisions/decisions.test.ts", source, RECORDS)).toEqual([])
  })

  it("reads a whole-line comment", () => {
    expect(proseIn("src/x.ts", "  // the shape it borrows (0095)\n")).toContain("(0095)")
  })

  /** A `//` inside a URL is not a comment, and the rest of that line is code. */
  it("does not treat the slashes in a URL as the start of a comment", () => {
    const source = 'const url = "https://example.test/0094"\n'

    expect(proseIn("src/x.ts", source)).toBe("")
  })
})

describe("checkCitations", () => {
  it("is quiet about a citation of a record that exists", () => {
    expect(checkCitations("src/frame/index.ts", comment("that seam (0095)."), RECORDS)).toEqual([])
  })

  it("reports a citation of a number nobody has written", () => {
    const problems = checkCitations("src/frame/index.ts", comment("that seam (0201)."), RECORDS)

    expect(problems).toEqual([{ code: "unknown-record", source: "src/frame/index.ts", number: 201 }])
  })

  /**
   * The failure this module was written for. A label and a file are two copies
   * of one fact, and two copies can disagree — which is the only reason a
   * citation of a record that *exists* can be caught at all.
   */
  it("reports a link whose label and file name different records", () => {
    const text = comment(
      `that seam (${linkTo("0094", "0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md")}).`
    )

    expect(checkCitations("src/frame/index.ts", text, RECORDS)).toEqual([
      {
        code: "link-number-mismatch",
        source: "src/frame/index.ts",
        number: 94,
        opens: "0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md",
      },
    ])
  })

  /**
   * Both control comments in the render seam linked 0009 to a slug nobody ever
   * wrote — the right number, the right subject, a dead link. Found on this
   * check's first run over `src/`.
   */
  it("reports a link to a filename that is not a record here", () => {
    const text = comment(
      `props are JSON (${linkTo("0009", "0009-a-primitive-declares-its-props-and-the-seam-enforces-them.md")}).`
    )

    expect(checkCitations("src/render/behaviour-copy.ts", text, RECORDS)).toEqual([
      {
        code: "link-unknown-record",
        source: "src/render/behaviour-copy.ts",
        number: 9,
        opens: "0009-a-primitive-declares-its-props-and-the-seam-enforces-them.md",
      },
    ])
  })

  it("reports a mismatched link once rather than as both faults", () => {
    const text = comment(`that seam (${linkTo("0094", "0201-a-record-that-is-not-here.md")}).`)

    expect(checkCitations("src/frame/index.ts", text, RECORDS)).toHaveLength(1)
  })
})

describe("describeCitationProblem", () => {
  it("pads the number back to the four digits a reader will search for", () => {
    expect(
      describeCitationProblem({ code: "unknown-record", source: "src/x.ts", number: 9 })
    ).toBe("src/x.ts cites 0009, and there is no such record")
  })

  it("says which file a wrong link opens", () => {
    expect(
      describeCitationProblem({
        code: "link-number-mismatch",
        source: "src/x.ts",
        number: 94,
        opens: "0095-a.md",
      })
    ).toBe("src/x.ts cites 0094 with a link that opens 0095-a.md")
  })

  it("says a link resolves to nothing", () => {
    expect(
      describeCitationProblem({
        code: "link-unknown-record",
        source: "src/x.ts",
        number: 9,
        opens: "0009-invented.md",
      })
    ).toBe("src/x.ts links 0009 to 0009-invented.md, which is not a record here")
  })
})
