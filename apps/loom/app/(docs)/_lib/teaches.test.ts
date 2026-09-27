import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { apiEntries } from "./api/reference"
import { entryPoints } from "./entry-points"
import { PUBLISHED_AS } from "./packages"
import { readQuickstartSource } from "./quickstart/program"

/**
 * **Nothing this site tells a stranger to type may be a door the registry
 * refuses.**
 *
 * This is the test that did not exist on 27 September, and its absence is the
 * whole of that day's defect. 0194 withheld `./primitives` from the framework's
 * published `exports`, the starter library became its own package, and every
 * check in this repository stayed green — because every check resolved imports
 * against the *workspace*, where the old door is still open. The site went on
 * teaching `@jam-overture/loom/primitives` to readers for whom it is
 * `ERR_PACKAGE_PATH_NOT_EXPORTED`, on the first page of *Getting started*, in
 * the quickstart file it tells them to save and run, and as one of the doors in
 * the API reference.
 *
 * A test that resolves imports cannot see this, because the fault is that they
 * resolve. So this one reads **what the page says** rather than what it means:
 * the prose and the code blocks a reader copies, the quickstart block, the
 * entry-point table and the generated reference. The set of forbidden names is
 * derived from the framework's own manifest, so a seventeenth door withheld
 * tomorrow is caught by this without anybody adding a line.
 */

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

const filesUnder = (root: string, named: string): readonly string[] =>
  readdirSync(root).flatMap((entry) => {
    const path = join(root, entry)

    if (statSync(path).isDirectory()) return filesUnder(path, named)

    return entry === named ? [path] : []
  })

const pages = (): readonly { readonly path: string; readonly text: string }[] =>
  filesUnder(here("../docs"), "page.mdx").map((path) => ({
    path: path.slice(path.indexOf("(docs)")),
    text: readFileSync(path, "utf8"),
  }))

/** A specifier as it is written in code: inside quotes, or inside backticks in prose. */
const asWritten = (specifier: string): readonly string[] => [
  `"${specifier}"`,
  `'${specifier}'`,
  `\`${specifier}\``,
]

describe("what the site tells a reader to import", () => {
  const withheld = [...PUBLISHED_AS.keys()]

  it("has something to check, so this file cannot pass by having nothing to say", () => {
    expect(withheld.length).toBeGreaterThan(0)
    expect(pages().length).toBeGreaterThan(10)
  })

  it("names no door that is missing from the published package, on any page", () => {
    for (const page of pages()) {
      for (const specifier of withheld) {
        for (const written of asWritten(specifier)) {
          expect(page.text, `${page.path} says ${written}`).not.toContain(written)
        }
      }
    }
  })

  /**
   * The quickstart is the sharpest case on the site: a whole file a reader is
   * told to save and run, shown verbatim. It is also a real module here, so it
   * imports the workspace's door and is reconciled at the seam it is read
   * through — which means this asserts the seam as much as the file.
   */
  it("names no such door in the quickstart it tells a reader to run", () => {
    for (const specifier of withheld) {
      for (const written of asWritten(specifier)) {
        expect(readQuickstartSource()).not.toContain(written)
      }
    }
  })

  it("offers no such door in the entry-point table or the generated reference", () => {
    for (const specifier of withheld) {
      expect(entryPoints.map((entry) => entry.specifier)).not.toContain(specifier)
      expect(apiEntries.map((entry) => entry.specifier)).not.toContain(specifier)
    }
  })

  /**
   * And the site really does teach the packages instead, which is the half that
   * stops all of the above from being satisfied by a site that says nothing.
   */
  it("teaches the package each of them ships as", () => {
    const everything = [
      ...pages().map((page) => page.text),
      readQuickstartSource(),
      entryPoints.map((entry) => entry.specifier).join("\n"),
      apiEntries.map((entry) => entry.specifier).join("\n"),
    ].join("\n")

    for (const published of PUBLISHED_AS.values()) {
      expect(everything, published).toContain(published)
    }
  })

  /**
   * The quickstart states its install command **once**.
   *
   * It was stated three times — in `program.ts`, in the quickstart file's own
   * header comment, and hand-typed as a fenced block in the page. Two of the
   * three were updated when the library became its own package and the third
   * was the one a reader reads, so the page went on printing a command that
   * installs neither the library it imports nor anything that would make the
   * file run. Nothing failed: the test that checks the command reads the copy
   * in `program.ts`.
   *
   * The block is rendered from that list now, so this asserts the absence of the
   * copy rather than the agreement of two — an agreement is what a third copy
   * quietly stops being part of.
   */
  it("prints the quickstart's install command from the list that decides it, not a copy", () => {
    const quickstart = pages().find((page) => page.path.includes("getting-started/quickstart"))

    expect(quickstart).toBeDefined()
    expect(quickstart?.text).toContain("<QuickstartInstall />")

    /* In a fenced block, which is a command. The page also says the words
       "pnpm add" in a sentence about what `pnpm add` leaves behind, and that is
       prose rather than a second copy of anything. */
    const fenced = [...(quickstart?.text ?? "").matchAll(/```[a-z]*\n(?<body>[\s\S]*?)```/gu)].map(
      (match) => match.groups?.body ?? ""
    )

    expect(fenced.filter((body) => body.includes("pnpm add"))).toEqual([])
  })

  /**
   * Installation is where a stranger starts, so the package they will not
   * otherwise know to install has to be on it — in the command, not only in a
   * table further down.
   */
  it("puts every package in the install command on the page a stranger starts from", () => {
    const installation = pages().find((page) => page.path.includes("getting-started/installation"))

    expect(installation).toBeDefined()

    const command = installation?.text.match(/```bash\n(?<line>[^`]*)```/u)?.groups?.line ?? ""

    expect(command).toContain("@jam-overture/loom")

    for (const published of PUBLISHED_AS.values()) {
      expect(command, published).toContain(published)
    }
  })
})
