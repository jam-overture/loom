import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  asAReaderWouldWrite,
  asThisWorkspaceResolves,
  PUBLISHED_AS,
  publishedSpecifier,
  workspaceSpecifier,
} from "./packages"

/**
 * The two-names-for-one-module map, held against the manifests that decide it.
 *
 * A hand-kept list of which doors are workspace-only is wrong the week somebody
 * publishes or withholds one, and the symptom is the worst kind: a page telling
 * a stranger to import something that throws on their machine and resolves on
 * ours, so every test in this repository stays green. So the *set* is derived
 * from the framework's own manifest here and compared, and only the **name** is
 * a string this lane states.
 */

const repoRoot = (path: string): string => fileURLToPath(new URL(`../../../../../${path}`, import.meta.url))

const manifest = (): {
  readonly name: string
  readonly exports: Record<string, unknown>
  readonly publishConfig?: { readonly exports?: Record<string, unknown> }
} => JSON.parse(readFileSync(repoRoot("package.json"), "utf8"))

const specifierOf = (name: string, subpath: string): string =>
  subpath === "." ? name : `${name}${subpath.slice(1)}`

/** Every door this workspace can open, by the specifier a file here would write. */
const hereDoors = (): readonly string[] => {
  const { name, exports } = manifest()

  return Object.keys(exports).map((subpath) => specifierOf(name, subpath))
}

/** Every door the registry can open — `publishConfig.exports` where there is one. */
const publishedDoors = (): readonly string[] => {
  const { name, exports, publishConfig } = manifest()

  return Object.keys(publishConfig?.exports ?? exports).map((subpath) => specifierOf(name, subpath))
}

describe("the doors this workspace has and the registry does not", () => {
  /**
   * The load-bearing one. If a door is withheld from the published manifest and
   * nobody adds it here, the site goes on printing a specifier that is
   * `ERR_PACKAGE_PATH_NOT_EXPORTED` for every reader — which is exactly what
   * happened on 27 September and is the finding this file closes.
   */
  it("are exactly the ones the site knows to rename", () => {
    const withheld = hereDoors().filter((door) => !publishedDoors().includes(door))

    expect([...withheld].sort()).toEqual([...PUBLISHED_AS.keys()].sort())
  })

  /**
   * And the premise the assertion above rests on, stated rather than assumed: the
   * framework really does publish a narrower map than the workspace has. If
   * `publishConfig.exports` were ever dropped, `publishedDoors` would fall back
   * to the workspace's own map, every door would look published, and the test
   * above would pass with an empty set on both sides while the site was wrong.
   */
  it("is a real distinction and not two readings of one map", () => {
    expect(manifest().publishConfig?.exports).toBeDefined()
    expect(publishedDoors().length).toBeLessThan(hereDoors().length)
  })

  /**
   * The one fact here that no manifest in this repository can check, checked
   * against the file that decides it.
   *
   * `tools/package/manifest.ts` is what `pnpm package:primitives` assembles the
   * published package from, so the name it carries is the name on the registry.
   * It is another lane's file and outside this application's compilation, so it
   * is read as text rather than imported — a narrow way to hold a cross-lane
   * fact, and a loud failure if that name ever changes.
   */
  it("names the library by the name it is actually published under, door by door", () => {
    const assembled = readFileSync(repoRoot("tools/package/manifest.ts"), "utf8")

    for (const published of PUBLISHED_AS.values()) {
      const slash = published.indexOf("/", published.indexOf("/") + 1)
      const packageName = slash === -1 ? published : published.slice(0, slash)
      const subpath = slash === -1 ? "." : `.${published.slice(slash)}`

      expect(assembled, packageName).toContain(`name: "${packageName}"`)
      expect(assembled, subpath).toContain(`"${subpath}": {`)
    }
  })
})

describe("which name a specifier is shown and compiled under", () => {
  it("shows a reader the package they can install", () => {
    expect(publishedSpecifier("@jam-overture/loom/primitives")).toBe("@jam-overture/loom-primitives")
  })

  it("compiles it as the door this workspace actually has", () => {
    expect(workspaceSpecifier("@jam-overture/loom-primitives")).toBe("@jam-overture/loom/primitives")
  })

  it("leaves every other specifier alone, in both directions", () => {
    for (const door of publishedDoors()) {
      expect(publishedSpecifier(door), door).toBe(door)
      expect(workspaceSpecifier(door), door).toBe(door)
    }

    expect(publishedSpecifier("react")).toBe("react")
    expect(workspaceSpecifier("zod")).toBe("zod")
  })

  it("round-trips, so neither direction can drift from the other", () => {
    for (const [here, published] of PUBLISHED_AS) {
      expect(workspaceSpecifier(published)).toBe(here)
      expect(publishedSpecifier(here)).toBe(published)
    }
  })
})

describe("a whole file, as a reader would write it", () => {
  it("renames the door a reader does not have", () => {
    const source = 'import { createStarterPrimitiveRegistry } from "@jam-overture/loom/primitives"\n'

    expect(asAReaderWouldWrite(source)).toBe(
      'import { createStarterPrimitiveRegistry } from "@jam-overture/loom-primitives"\n'
    )
  })

  it("takes single quotes too, because a reader's file is not this repository's style", () => {
    expect(asAReaderWouldWrite("from '@jam-overture/loom/primitives'")).toBe(
      "from '@jam-overture/loom-primitives'"
    )
  })

  /**
   * Quoted-exact, and this is the case that makes it worth being. A specifier
   * that merely *starts with* a renamed one is a different module, and a
   * substring rewrite would maul it — `@jam-overture/loom/primitives/x` would
   * come back as `@jam-overture/loom-primitives/x`, which is a real package with
   * a real subpath and so would fail somewhere far away rather than here.
   */
  it("leaves a longer specifier that merely starts with a renamed one alone", () => {
    const source = 'from "@jam-overture/loom/primitives/tokens"'

    expect(asAReaderWouldWrite(source)).toBe(source)
  })

  /**
   * The case the fixture above used to be, and it changed sides on 1 October
   * rather than going away: `…/primitives/compositions` is a door of its own
   * now, so it is renamed — **to its own target, not to the shorter one's.**
   *
   * Two keys where one is a prefix of the other is the arrangement in which a
   * substring rewrite is wrong twice over, and the map has had that shape only
   * since the second door was added. So both directions are asserted on both
   * keys in one place.
   */
  it("renames two doors where one is a prefix of the other, each to its own", () => {
    const source =
      'import { heroBand } from "@jam-overture/loom/primitives/compositions"\n' +
      'import { createStarterPrimitiveRegistry } from "@jam-overture/loom/primitives"\n'

    const read = asAReaderWouldWrite(source)

    expect(read).toBe(
      'import { heroBand } from "@jam-overture/loom-primitives/compositions"\n' +
        'import { createStarterPrimitiveRegistry } from "@jam-overture/loom-primitives"\n'
    )
    expect(asThisWorkspaceResolves(read)).toBe(source)
  })

  it("changes nothing in a file that never reaches for one", () => {
    const source = 'import { createTree } from "@jam-overture/loom"\nconst x = "@jam-overture/loom/react"\n'

    expect(asAReaderWouldWrite(source)).toBe(source)
  })
})

describe("the quickstart, as a reader reads it and as this repository runs it", () => {
  const onDisk = (): string =>
    readFileSync(repoRoot("apps/loom/app/(docs)/_lib/quickstart/quickstart.ts"), "utf8")

  /**
   * The claim the *Quickstart* page makes in as many words — *read from the
   * repository as this page built* — held to the one difference it is allowed.
   *
   * Two names for one module is a thing a reader could be lied to with, so the
   * size of the lie is asserted rather than described: the block on the page and
   * the module this repository executes are the same file, character for
   * character, once the names in the map are put back.
   */
  it("differ by the names in the map and by nothing else", () => {
    expect(asThisWorkspaceResolves(asAReaderWouldWrite(onDisk()))).toBe(onDisk())
  })

  it("really does differ, so the assertion above is not comparing a file with itself", () => {
    expect(asAReaderWouldWrite(onDisk())).not.toBe(onDisk())
  })

  /**
   * **It used to require every renamed door to be in the quickstart**, which
   * was true while there was one and stopped being true the moment the library
   * gained a second. A quickstart that imported a named band to satisfy a test
   * would be a worse quickstart, so the requirement is the one that was always
   * the point — no published name in this file — plus the clause that stops
   * that from passing vacuously on a file that reaches for neither.
   */
  it("leaves the file this repository compiles on the workspace's door", () => {
    for (const [, published] of PUBLISHED_AS) {
      expect(onDisk(), published).not.toContain(`"${published}"`)
    }

    expect([...PUBLISHED_AS.keys()].filter((here) => onDisk().includes(`"${here}"`))).not.toEqual([])
  })
})
