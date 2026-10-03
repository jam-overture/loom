import { readFileSync } from "node:fs"
import { join } from "node:path"

import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { entryPoints } from "@/app/(docs)/_lib/entry-points"

import { Specifier } from "./specifier"

/**
 * The heading of every page in the API reference, rendered.
 *
 * Two claims, and the ordering of them is deliberate. **What the heading says**
 * comes first, because the component now assembles it out of pieces, and a
 * heading that came back with a slash dropped or two segments swapped would be
 * an instruction to type an import that does not resolve — on the one page
 * whose whole job is to say what to type. Nothing asserted the words of this
 * heading until this file existed.
 *
 * **Where it breaks** comes second, and it is the cosmetic half: a `<wbr/>` is
 * invisible, so a missing one shows up at exactly one viewport width and only
 * if somebody takes the picture.
 *
 * Both are made against the server transform as well as against jsdom, because
 * `tools/prerender/hazards.ts` exists for the fact that those two renderers
 * disagree about adjacent text children — and it says itself that it cannot see
 * a junction across a tag. Every junction here is across a tag, so the check
 * that reads the built page cannot stand in for this file.
 */

const WBR = /<wbr\s*\/?>/gu
const COMMENT = /<!--.*?-->/gsu

/** What a reader is served, with the markers taken out: just the words. */
const servedText = (specifier: string): string =>
  renderToStaticMarkup(<Specifier of={specifier} />)
    .replace(COMMENT, "")
    .replace(/<[^>]*>/gu, "")

describe("an import specifier in a heading", () => {
  it("reads as the specifier, in the DOM", () => {
    for (const { specifier } of entryPoints) {
      const { container } = render(<Specifier of={specifier} />)

      expect(container.textContent).toBe(specifier)
    }
  })

  /**
   * The same claim, against the renderer that writes the file a reader
   * downloads. If React ever separated these children with something that is
   * not invisible, this is the assertion that would say so.
   */
  it("reads as the specifier, in the markup the build writes", () => {
    for (const { specifier } of entryPoints) {
      expect(servedText(specifier)).toBe(specifier)
    }
  })

  /**
   * No hydration separator between the segments, which is what makes the
   * sentence above true rather than lucky: React writes `<!-- -->` between two
   * adjacent *text* children, and a `<wbr/>` between them is why there are
   * none to write.
   */
  it("needs no hydration separator between the segments", () => {
    for (const { specifier } of entryPoints) {
      expect(renderToStaticMarkup(<Specifier of={specifier} />)).not.toContain("<!-- -->")
    }
  })

  it("offers a break at every slash and nowhere else", () => {
    for (const { specifier } of entryPoints) {
      const markup = renderToStaticMarkup(<Specifier of={specifier} />)
      const slashes = [...specifier].filter((character) => character === "/").length

      expect(markup.match(WBR) ?? []).toHaveLength(slashes)
    }
  })

  /**
   * Where each break sits, rather than how many there are. A component that
   * emitted the right number of `<wbr/>`s in the wrong places would pass every
   * assertion above.
   */
  it("puts each break immediately after its slash", () => {
    const markup = renderToStaticMarkup(<Specifier of="@jam-overture/loom/signals/broadcast" />)

    expect(markup.replace(WBR, "|")).toBe("@jam-overture/|loom/|signals/|broadcast")
  })

  /**
   * Every door this package publishes is scoped, so every one of them has at
   * least one slash and this case cannot be taken from the list. It is in
   * because the component is given a heading rather than a door, and a heading
   * with nothing to break at must come back untouched rather than with an
   * invisible element appended to it.
   */
  it("prints a specifier with no slash as itself, with nothing added", () => {
    expect(renderToStaticMarkup(<Specifier of="react" />)).toBe("react")
    expect(entryPoints.every(({ specifier }) => specifier.includes("/"))).toBe(true)
  })

  /**
   * The floor: the two loops above are satisfied by an empty list of doors, and
   * the breaks they check for only exist on a door with a subpath.
   */
  it("is asked about the real doors, and more than one of them has a slash to break at", () => {
    expect(entryPoints.length).toBeGreaterThan(1)
    expect(entryPoints.filter(({ specifier }) => specifier.includes("/")).length).toBeGreaterThan(1)
  })

  /**
   * And the hole every other assertion in this file leaves open: all of them
   * stay green if the page stops asking for this at all. That is this lane's
   * 2 October finding in one sentence — *every assertion about a produced block
   * is about what the producer computes* — and the component is a Server
   * Component in a route, so there is nothing to render it from here.
   *
   * Read off disk instead, which is how `_lib/content.test.ts` holds each
   * page's metadata call. It asserts a thin thing — that the route names the
   * component — and a thin assertion about the one step nothing else covers is
   * worth more than another thorough one about a step two files already hold.
   *
   * From `process.cwd()` rather than `import.meta.url`, which the four other
   * files in this application that read a route off disk also do and which is
   * not a style choice: a `.tsx` test runs in the DOM project, where Vite
   * rewrites `import.meta.url` to something `fileURLToPath` refuses.
   */
  it("is what the reference route prints its heading through", () => {
    const route = join(process.cwd(), "app", "(docs)", "docs", "api-reference", "[entry]", "page.tsx")
    const source = readFileSync(route, "utf8")

    expect(source).toContain("<Specifier of={listed.page.heading ?? listed.page.title} />")
    expect(source).toContain('from "@/app/(docs)/_components/specifier"')
  })
})
