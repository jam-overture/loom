import { readFileSync } from "node:fs"
import { join } from "node:path"

import { renderLoomTree } from "@jam-overture/loom/react"
import { describe, expect, it } from "vitest"

import { REPOSITORY_ROOT } from "../architecture/source"
import { docsExamples } from "../examples/catalogue"
import { docsRegistry, docsThemes } from "../loom/registry"
import { PUBLISHED_AS } from "../packages"

import {
  ownAcceptedDiagnostics,
  ownAcceptedTree,
  ownAuditReading,
  ownCatalogueEntry,
  ownClosedChoices,
  ownDeclaredText,
  ownEntry,
  ownRefusals,
} from "./proving"
import { OWN_PRIMITIVE_PATH, OWN_PRIMITIVE_TYPE, OWN_SOUND_PROPS, ownRegistry } from "./registry"
import { readOwnPrimitiveSource } from "./source"
import { serviceStatus } from "./status.service"

/**
 * The primitive *A primitive of your own* writes, and everything that page
 * claims about it.
 *
 * `proving.ts` already refuses to produce a row whose render did not reach the
 * fault it is filed under, so a loosened schema stops the build rather than
 * printing a confident claim. What is left for a test is the half a producer
 * cannot check about itself: that the set of rows is the set a reader needs,
 * that the page and the file say the same thing, and that the one primitive on
 * this site registered outside `docsRegistry` is registered where it is on
 * purpose.
 */

const PAGE = join(
  REPOSITORY_ROOT,
  "apps",
  "loom",
  "app",
  "(docs)",
  "docs",
  "building-with-loom",
  "a-primitive-of-your-own",
  "page.mdx"
)

const pageSource = (): string => readFileSync(PAGE, "utf8")

const fileSource = (): string => readFileSync(join(REPOSITORY_ROOT, ...OWN_PRIMITIVE_PATH), "utf8")

/** The schema, sliced out of the file the page shows whole. */
const schemaBlock = (source: string): string => {
  const start = source.indexOf("const props = z")
  const end = source.indexOf(".strict()", start)

  expect(start, "the file no longer declares its schema as `const props = z`").toBeGreaterThan(-1)
  expect(end, "the file no longer closes its schema with `.strict()`").toBeGreaterThan(-1)

  return source.slice(start, end + ".strict()".length)
}

describe("the primitive the page writes", () => {
  it("is registered beside the whole starter library and not instead of it", () => {
    expect(ownRegistry.primitives.length).toBe(docsRegistry.primitives.length + 1)

    const added = ownRegistry.primitives
      .map((primitive) => primitive.type)
      .filter((type) => !docsRegistry.primitives.some((known) => known.type === type))

    expect(added).toEqual([OWN_PRIMITIVE_TYPE])
  })

  it("is the only example on the site rendered through a registry of its own", () => {
    const carrying = [...docsExamples.values()].filter((example) => example.registry !== undefined)

    expect(carrying.map((example) => example.id)).toEqual(["a-primitive-of-your-own"])
    expect(carrying[0]?.registry).toBe(ownRegistry)
  })

  it("names the type in exactly one place", () => {
    expect(serviceStatus.type).toBe(OWN_PRIMITIVE_TYPE)
  })

  /**
   * The page quotes the schema and shows the whole file, so the quote is the one
   * thing on the page that can disagree with the code beside it. The slice is
   * compared rather than mentioned, which is the 8 October lesson about a test
   * that reads another file for a name: assert on the use, not the word.
   */
  it("quotes its schema on the page exactly as the file writes it", () => {
    expect(pageSource()).toContain(schemaBlock(fileSource()))
  })

  /**
   * The file reaches the starter library at this workspace's door because the
   * library is published from `dist/` here. A reader installs it and reaches it
   * at another name, so the block on the page is the file with the specifiers
   * turned over — and a page naming the workspace's door is what
   * `teaches.test.ts` refuses outright.
   */
  it("shows the file in the import names a reader would type", () => {
    const shown = readOwnPrimitiveSource()
    const file = fileSource()
    const turned = [...PUBLISHED_AS].filter(([here]) => file.includes(`"${here}"`))

    expect(turned.length, "the file imports nothing that is renamed on the way out").toBeGreaterThan(0)

    for (const [here, published] of turned) {
      expect(shown, `the block still names ${here}`).not.toContain(`"${here}"`)
      expect(shown, `the block does not name ${published}`).toContain(`"${published}"`)
    }
  })
})

describe("what a model is told about it", () => {
  it("catalogues every prop the schema declares, and nothing else", () => {
    const catalogued = ownCatalogueEntry()

    expect(catalogued.props?.map((prop) => prop.name)).toEqual(["service", "since", "state"])
  })

  it("marks the optional prop optional and the rest required", () => {
    const required = new Map(
      (ownCatalogueEntry().props ?? []).map((prop) => [prop.name, prop.required])
    )

    expect(required.get("service")).toBe(true)
    expect(required.get("state")).toBe(true)
    expect(required.get("since")).toBe(false)
  })

  it("lists every value the closed prop may take", () => {
    expect(ownClosedChoices()).toEqual([
      { name: "state", options: ["operational", "degraded", "offline"] },
    ])
  })

  it("declares one word per state, and no others", () => {
    expect(ownDeclaredText().map((pair) => pair.key)).toEqual([
      "operational",
      "degraded",
      "offline",
    ])

    for (const pair of ownDeclaredText()) expect(pair.value.length).toBeGreaterThan(0)
  })

  /**
   * The page's claim about the catalogue is a claim about what is *missing* from
   * it: a model is told names and requiredness and is told no types and no
   * bounds. Worth a test because it is the reason `description` carries the
   * weight the page says it does.
   */
  it("tells a model nothing about the bounds the schema holds", () => {
    expect(JSON.stringify(ownCatalogueEntry())).not.toContain("60")
    expect(ownEntry().declaredProps?.every((prop) => Object.keys(prop).length === 2)).toBe(true)
  })
})

describe("what it refuses", () => {
  it("produces a row for every attempt, each reaching its own fault", () => {
    const refusals = ownRefusals()

    expect(refusals.length).toBeGreaterThan(0)
    expect(refusals.map((refusal) => refusal.code)).toEqual([
      "unknown-primitive",
      "invalid-props",
      "invalid-props",
      "invalid-props",
      "invalid-props",
    ])
  })

  it("prints the runtime's own sentence and never an empty one", () => {
    for (const refusal of ownRefusals()) {
      expect(refusal.reported.length, refusal.asked).toBeGreaterThan(0)
      expect(refusal.story.length, refusal.asked).toBeGreaterThan(0)
    }
  })

  it("has one complaint per render, because a refused node is never called", () => {
    const { diagnostics } = renderLoomTree(ownAcceptedTree(), {
      resolver: docsRegistry,
      validator: docsRegistry,
      themes: docsThemes,
    })

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["unknown-primitive"])
  })

  /**
   * The accepted case, which is the half that makes the list above evidence. A
   * table of refusals with no sound render beside it passes just as well against
   * a schema that refuses everything.
   */
  it("reports nothing at all about a sound tree", () => {
    expect(ownAcceptedDiagnostics()).toEqual([])
  })

  it("renders the sound tree through its own registry with words on the screen", () => {
    const rendered = renderLoomTree(ownAcceptedTree(), {
      resolver: ownRegistry,
      validator: ownRegistry,
      themes: docsThemes,
    })

    expect(rendered.theme, "the example mounts no theme").toBeDefined()
    expect(String(OWN_SOUND_PROPS["service"]).length).toBeGreaterThan(0)
  })
})

describe("whether a person can edit it", () => {
  it("carries the editable decoration the portal selects by", () => {
    expect(ownAuditReading().decorated).toBe(true)
  })

  it("places the children it is handed, which is where the detail lives", () => {
    expect(ownAuditReading().rendersChildren).toBe(true)
  })

  it("declares no region it then fails to place", () => {
    expect(ownAuditReading().unplacedSlots).toEqual([])
  })

  it("never throws on props its own schema accepts", () => {
    expect(ownAuditReading().threw).toEqual([])
  })

  /**
   * The probe builds the default configuration and then each closed choice's
   * values one at a time, so the count is one more than the states. Asserted
   * because the page prints it, and a number on a page that nothing holds is the
   * one kind of staleness nothing on this site can see.
   */
  it("is probed in the default configuration and in every state", () => {
    const states = ownClosedChoices().flatMap((choice) => choice.options)

    expect(ownAuditReading().configurations).toBe(states.length + 1)
  })
})
