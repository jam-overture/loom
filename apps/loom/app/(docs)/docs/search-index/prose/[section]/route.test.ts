import { describe, expect, it } from "vitest"

import { docsSections } from "@/app/(docs)/_lib/nav"
import { searchProse } from "@/app/(docs)/_lib/search/build"
import { parseSearchProse, searchProsePath } from "@/app/(docs)/_lib/search/model"
import { docsSectionOfPath, proseSectionsIn } from "@/app/(docs)/_lib/search/shards"

import { generateStaticParams, GET } from "./route"

/**
 * The addresses this route really answers on.
 *
 * `dynamicParams` is off, so **an address this route does not prebuild is a
 * 404**, and a 404 here is silent: the search box treats a section whose words
 * never arrive exactly as it treats one still in flight, which is to carry on
 * without them. A regression narrowing this list to the written sections would
 * therefore lose the reader nothing visible and nothing red — the sentences of
 * a whole section would simply stop being findable.
 *
 * So the list is held against the sections the **browser** will ask for, built
 * the way the browser builds it, rather than against a list written here.
 */

const served = async (section: string): Promise<unknown> => {
  const response = await GET(new Request(`https://loom.test${searchProsePath(section)}`), {
    params: Promise.resolve({ section }),
  })

  return response.json()
}

describe("the words of one section, as an address", () => {
  it("is prebuilt for every section the browser will ask for", () => {
    expect([...generateStaticParams()].map((params) => params.section).sort()).toEqual(
      [...docsSections.map((section) => section.slug)].sort()
    )
  })

  /**
   * The same list, arrived at from the other end: the sections the browser
   * derives from the table of contents. If these two ever disagree, one section
   * of the site stops being searchable by its sentences.
   */
  it("is prebuilt for every section an address on this site is in", () => {
    const sections = proseSectionsIn({
      entries: searchProse().bodies.map(([href]) => ({
        href,
        title: href,
        context: "",
        kind: "heading" as const,
        summary: "",
        body: "",
        code: "",
        family: "",
      })),
    })

    const prebuilt = generateStaticParams().map((params) => params.section)

    for (const section of sections) {
      expect(prebuilt, section).toContain(section)
    }
  })

  it("hands back the words of the section it was asked for, and no others", async () => {
    const words = parseSearchProse(await served("the-runtime"))

    expect(words.bodies.length).toBeGreaterThan(0)

    for (const [href] of words.bodies) {
      expect(docsSectionOfPath(href), href).toBe("the-runtime")
    }
  })

  /**
   * The section nobody wrote, which until 26 September answered with an empty
   * file.
   *
   * Its pages are built from data and have no MDX to read, so this address was
   * thirteen bytes — and every sentence on seventeen pages was unfindable. The
   * words are now read off what those pages render (`search/generated.ts`), so
   * the file this route serves for the reference is a file like any other, and
   * the answer to *why can the browser ask for every section* is no longer that
   * one of them is empty.
   *
   * A section with genuinely nothing in it still answers `{"bodies":[]}` rather
   * than 404, which is what the two tests above are about and is why this one
   * does not need to arrange for one to exist.
   */
  it("hands back the reference's words, which no file on disk holds", async () => {
    const words = parseSearchProse(await served("api-reference"))

    expect(words.bodies.length).toBeGreaterThan(10)

    for (const [href, body] of words.bodies) {
      expect(docsSectionOfPath(href), href).toBe("api-reference")
      expect(body.length, href).toBeGreaterThan(400)
    }

    const front = words.bodies.find(([href]) => href === "/docs/api-reference")?.[1] ?? ""

    expect(front).toContain("No import has everything behind it")
  })
})
