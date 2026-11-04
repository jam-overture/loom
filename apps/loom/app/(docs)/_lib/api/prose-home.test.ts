import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { REPOSITORY_ROOT } from "../architecture/source"
import { docsHref, DOCS_LANDING_SLUG, writtenDocsSections, type DocsSection } from "../nav"

import { proseMentions, type ProseMention, type ProseMentionIndex } from "./mentions"
import type { ApiEntry, ApiKind } from "./model"
import {
  generatorSays,
  namesArrived,
  namesPublishedBy,
  pageSourcePath,
  proseHomeFor,
  proseHomes,
  whereProseGoes,
} from "./prose-home"
import { apiEntries } from "./reference"

/**
 * This lane's answer to the 3 October finding, held to the two things that make
 * it an answer rather than a nicety.
 *
 * **It must be derived.** A hand-written map from door to page is the thing
 * §4c's rule about a generated reference exists to refuse, and it would be
 * wrong within a week in the quietest possible way — nothing reads it but a
 * failure message nobody sees until they have published something.
 *
 * **It must name a file that exists.** The whole value of the answer is that a
 * run in another lane can put a sentence in it, or file a finding naming it. A
 * path assembled out of slugs and never checked is a path that is right until
 * the day the directory convention changes, and the only reader who finds out
 * is the one it was written for.
 *
 * The first half below states situations — a door whose prose is on one page, on
 * several, on none — against invented pages, so all three can be shown without
 * the site having to be in all three states. The second half puts it to the
 * real pages and the real package.
 */

const here = dirname(fileURLToPath(import.meta.url))

const symbol = (name: string, kind: ApiKind = "function") => ({
  name,
  kind,
  signature: "",
  cut: undefined,
  summary: "",
})

const entryOf = (specifier: string, slug: string, names: readonly string[]): ApiEntry => ({
  specifier,
  slug,
  types: `./dist/${slug}.d.ts`,
  requires: [],
  files: 0,
  narrower: [],
  standing: {
    packageNames: 0,
    otherDoors: 0,
    doorsSharingNothing: 0,
    widest: true,
    sharedWith: [],
    collisions: [],
  },
  groups: [{ module: slug, title: slug, summary: "", symbols: names.map((name) => symbol(name)) }],
})

const mention = (href: string, pageTitle: string, sectionTitle: string): ProseMention => ({
  href,
  pageTitle,
  sectionTitle,
  headingText: "",
})

/** Two written sections, one of them with a landing page that names things. */
const invented: readonly DocsSection[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    source: "written",
    pages: [
      { slug: DOCS_LANDING_SLUG, title: "Getting started", summary: "" },
      { slug: "your-first-tree", title: "Your first tree", summary: "" },
      { slug: "rendering-a-tree", title: "Rendering a tree", summary: "" },
    ],
  },
  {
    slug: "the-runtime",
    title: "The runtime",
    source: "written",
    pages: [{ slug: "going-to-production", title: "Going to production", summary: "" }],
  },
]

const index = (pairs: readonly (readonly [string, ProseMention])[]): ProseMentionIndex =>
  new Map(pairs.map(([name, where]) => [name, [where]]))

const firstTree = mention("/docs/getting-started/your-first-tree", "Your first tree", "Getting started")
const rendering = mention("/docs/getting-started/rendering-a-tree", "Rendering a tree", "Getting started")
const landing = mention("/docs/getting-started", "Getting started", "Getting started")

describe("where a sentence about a newly published name would go", () => {
  it("has nothing to decide when one page carries the whole door's prose", () => {
    const home = proseHomeFor(
      entryOf("@jam-overture/loom/store", "store", ["memoryStore", "postgresStore"]),
      index([
        ["memoryStore", firstTree],
        ["postgresStore", firstTree],
      ]),
      invented
    )

    expect(home.standing).toBe("one")
    expect(home.pages.map((page) => page.title)).toEqual(["Your first tree"])
    expect(home.sentence).toContain("prose is all on one page")
    expect(home.sentence).toContain("there is nothing to decide")
  })

  it("names the file a sentence would be written into, not just the address", () => {
    const home = proseHomeFor(
      entryOf("@jam-overture/loom/store", "store", ["memoryStore"]),
      index([["memoryStore", firstTree]]),
      invented
    )

    expect(home.pages[0]?.source).toBe(
      "apps/loom/app/(docs)/docs/getting-started/your-first-tree/page.mdx"
    )
    expect(home.sentence).toContain("page.mdx")
  })

  /**
   * A landing page is a page like any other to a reader naming an export on it,
   * and its file is the one place in this convention with no segment of its own.
   * Getting this wrong would hand a run a path that is not there.
   */
  it("names the section's own file when the page that carries the prose is a landing page", () => {
    const home = proseHomeFor(
      entryOf("@jam-overture/loom", "runtime", ["applyDelta"]),
      index([["applyDelta", landing]]),
      invented
    )

    expect(home.pages[0]?.source).toBe("apps/loom/app/(docs)/docs/getting-started/page.mdx")
  })

  it("calls it a judgement when several pages carry the door's prose, commonest first", () => {
    const home = proseHomeFor(
      entryOf("@jam-overture/loom", "runtime", ["createTree", "buildText", "renderLoomTree"]),
      index([
        ["createTree", firstTree],
        ["buildText", firstTree],
        ["renderLoomTree", rendering],
      ]),
      invented
    )

    expect(home.standing).toBe("several")
    expect(home.pages.map((page) => page.title)).toEqual(["Your first tree", "Rendering a tree"])
    expect(home.pages.map((page) => page.named)).toEqual([2, 1])
    expect(home.sentence).toContain("2 written pages")
    expect(home.sentence).toContain("Your first tree")
    expect(home.sentence).toContain("is a judgement")
  })

  /**
   * The case this lane cannot delegate. A door no written page names has no
   * derived home, and the honest answer is that the first sentence about it is a
   * page — so the entry says so rather than offering the nearest page as if it
   * were one.
   */
  it("says a door no page names needs a page written, and offers no candidate", () => {
    const home = proseHomeFor(
      entryOf("@jam-overture/loom/cli", "cli", ["scaffold"]),
      index([["createTree", firstTree]]),
      invented
    )

    expect(home.standing).toBe("none")
    expect(home.pages).toEqual([])
    expect(home.sentence).toContain("no written page names anything published by")
    expect(home.sentence).toContain("That is a page rather than a line")
  })

  /**
   * A shorter shortlist is the one wrong answer this must not give quietly: it
   * reads as a door with less prose than it has, and the run reading it would
   * file against the wrong page.
   */
  it("refuses a mention at an address the navigation does not list", () => {
    expect(() =>
      proseHomeFor(
        entryOf("@jam-overture/loom", "runtime", ["createTree"]),
        index([["createTree", mention("/docs/nowhere/at-all", "Nowhere", "Nowhere")]]),
        invented
      )
    ).toThrow(/navigation lists no page at that address/)
  })

  it("answers for every door it is given, in order", () => {
    const homes = proseHomes(
      [
        entryOf("@jam-overture/loom", "runtime", ["createTree"]),
        entryOf("@jam-overture/loom/cli", "cli", ["scaffold"]),
      ],
      index([["createTree", firstTree]]),
      invented
    )

    expect(homes.map((home) => [home.specifier, home.standing])).toEqual([
      ["@jam-overture/loom", "one"],
      ["@jam-overture/loom/cli", "none"],
    ])
  })
})

describe("the file behind a written page", () => {
  it("puts an ordinary page in its own directory", () => {
    expect(pageSourcePath("the-runtime", "going-to-production")).toBe(
      "apps/loom/app/(docs)/docs/the-runtime/going-to-production/page.mdx"
    )
  })

  it("puts a landing page in its section's directory", () => {
    expect(pageSourcePath("the-runtime", DOCS_LANDING_SLUG)).toBe(
      "apps/loom/app/(docs)/docs/the-runtime/page.mdx"
    )
  })
})

describe("the names that arrived", () => {
  const before = [entryOf("@jam-overture/loom/telemetry", "telemetry", ["journalOf"])]

  it("reports a name the fresh reference holds and the committed one does not", () => {
    const after = [
      entryOf("@jam-overture/loom/telemetry", "telemetry", ["journalOf", "telemetryWindow"]),
    ]

    expect(namesArrived(before, after)).toEqual([
      { specifier: "@jam-overture/loom/telemetry", names: ["telemetryWindow"] },
    ])
  })

  it("says nothing about a door whose names did not move", () => {
    expect(namesArrived(before, before)).toEqual([])
  })

  /**
   * A removed name is not this function's subject and saying so is worth a
   * test: the block it feeds is read by somebody who has just published
   * something, and a withdrawal is a different conversation with a different
   * remedy.
   */
  it("says nothing about a name the package stopped publishing", () => {
    expect(namesArrived(before, [entryOf("@jam-overture/loom/telemetry", "telemetry", [])])).toEqual(
      []
    )
  })

  /**
   * A name reached through two doors is a reader's question about a door, so it
   * is reported under both — the same rule the reference itself follows when it
   * lists one declaration on two pages.
   */
  it("reports a name that arrived on two doors under both of them", () => {
    expect(
      namesArrived(
        [],
        [
          entryOf("@jam-overture/loom", "runtime", ["ok"]),
          entryOf("@jam-overture/loom/sdk", "sdk", ["ok"]),
        ]
      ).map((door) => door.specifier)
    ).toEqual(["@jam-overture/loom", "@jam-overture/loom/sdk"])
  })

  it("counts a name on two doors once when it says how many are new", () => {
    const block = whereProseGoes(
      namesArrived(
        [],
        [
          entryOf("@jam-overture/loom", "runtime", ["ok"]),
          entryOf("@jam-overture/loom/sdk", "sdk", ["ok"]),
        ]
      ),
      []
    )

    expect(block).toContain("1 name is new")
  })

  it("counts a name on two doors once when it counts the package", () => {
    expect(
      namesPublishedBy([
        entryOf("@jam-overture/loom", "runtime", ["ok", "applyDelta"]),
        entryOf("@jam-overture/loom/sdk", "sdk", ["ok"]),
      ]).size
    ).toBe(2)
  })
})

describe("what a run that has just published a name is told", () => {
  const fresh = [
    entryOf("@jam-overture/loom/telemetry", "telemetry", ["journalOf", "telemetryWindow"]),
  ]

  const block = (): string =>
    whereProseGoes(
      namesArrived([entryOf("@jam-overture/loom/telemetry", "telemetry", ["journalOf"])], fresh),
      proseHomes(fresh, index([["journalOf", firstTree]]), invented)
    )

  /**
   * The load-bearing sentence, and the reason this is tested rather than
   * assumed. The entire cost of the 3 October finding was a run believing a
   * page was owed. A block that listed homes without saying nothing is required
   * would reproduce the belief in a friendlier font.
   */
  it("says first that nothing requires prose", () => {
    expect(block()).toContain("Nothing on this site requires prose for a published name")
    expect(block().indexOf("Nothing on this site requires prose")).toBeLessThan(
      block().indexOf("this is where it would go")
    )
  })

  it("names the new name and the door it arrived on", () => {
    expect(block()).toContain("@jam-overture/loom/telemetry — telemetryWindow")
  })

  it("carries the door's own sentence under it", () => {
    expect(block()).toContain("prose is all on one page")
  })

  /**
   * The case where the surface moved and nothing was published — a reworded doc
   * comment, a renamed module title, a signature that got longer. A block
   * listing doors and homes here would send a run looking for a name it never
   * added.
   */
  it("says plainly when the file moved and no name is new", () => {
    expect(whereProseGoes([], [])).toContain("no name is new")
    expect(whereProseGoes([], [])).not.toContain("this is where it would go")
  })
})

describe("what the generator says", () => {
  const fresh = [
    entryOf("@jam-overture/loom/telemetry", "telemetry", ["journalOf", "telemetryWindow"]),
  ]
  const before = [entryOf("@jam-overture/loom/telemetry", "telemetry", ["journalOf"])]

  /**
   * The whole of `docs:api`'s standard output is composed here rather than in
   * the script, and these are the tests that buys. A mutation that deleted the
   * block from the script killed nothing — a script is the one kind of module
   * nothing imports — so the script is now one expression and the decision is
   * here.
   */
  it("says what it wrote, and then where prose goes", () => {
    const said = generatorSays(before, fresh, 1_916)

    expect(said).toContain("wrote 1 entry points and 1916 exports to reference.generated.json")
    expect(said).toContain("Nothing on this site requires prose for a published name")
    expect(said).toContain("telemetryWindow")
    expect(said.endsWith("\n")).toBe(true)
  })

  it("says nothing about prose beyond the plain fact when no name is new", () => {
    const said = generatorSays(before, before, 1_915)

    expect(said).toContain("no name is new")
    expect(said).not.toContain("this is where it would go")
  })

  /**
   * A regeneration with nothing to compare against, which is a first run or a
   * tree where the file has been deleted. Every name looks new there. It must
   * not be spelled the same way as a comparison that found nothing: one means
   * *nothing was published*, the other means *nobody knows*.
   */
  it("says it could not compare when there was no reference to compare against", () => {
    const said = generatorSays(undefined, fresh, 1_916)

    expect(said).toContain("no reference to compare against")
    expect(said).not.toContain("no name is new")
    expect(said).not.toContain("the generated reference is where")
    expect(said).not.toContain("this is where it would go")
  })

  /**
   * And that the script writes it. A source assertion rather than a run,
   * because running the generator writes the committed reference — but without
   * it the one mutation this whole arrangement exists to kill, deleting the
   * write, is still invisible. It is the same instrument `portability.test.ts`
   * uses on git argvs and for the same reason: the thing being checked is a
   * line in a file nothing imports.
   */
  it("is what the script writes, and the script decides nothing else", () => {
    const script = readFileSync(join(here, "generate.ts"), "utf8")

    expect(script).toContain("process.stdout.write(generatorSays(")
    expect(script.match(/process\.stdout\.write/g)).toHaveLength(1)
  })
})

describe("the real pages and the real package", () => {
  const homes = proseHomes(apiEntries)

  it("answers for every door the reference describes, and invents none", () => {
    expect(homes.map((home) => home.specifier)).toEqual(apiEntries.map((entry) => entry.specifier))
    expect(homes.length).toBeGreaterThan(10)
  })

  /**
   * The floor under everything above. Two empty lists agree perfectly, and a
   * `proseMentions` that had read no pages would make every assertion here true
   * while answering *none* for all seventeen doors.
   */
  it("really read the pages, and really found prose", () => {
    expect(proseMentions.size).toBeGreaterThan(50)
    expect(homes.filter((home) => home.standing !== "none").length).toBeGreaterThan(10)
  })

  it("names a file that is on disk, for every candidate it offers", () => {
    const sources = [...new Set(homes.flatMap((home) => home.pages.map((page) => page.source)))]

    expect(sources.length).toBeGreaterThan(10)

    for (const source of sources) {
      expect(existsSync(join(REPOSITORY_ROOT, source)), source).toBe(true)
    }
  })

  /**
   * A candidate has to be a page somebody can write a sentence into, which the
   * generated sections are not: the reference's own pages name every export
   * there is, and offering one of them as a home would be a loop.
   */
  it("offers only written pages, never a generated one", () => {
    const written = new Set(
      writtenDocsSections.flatMap((section) =>
        section.pages.map((page) => docsHref(section.slug, page.slug))
      )
    )

    for (const home of homes) {
      for (const page of home.pages) {
        expect(written.has(page.href), `${home.specifier} → ${page.href}`).toBe(true)
      }
    }
  })

  it("offers each candidate as evidence rather than a guess, commonest first", () => {
    for (const home of homes) {
      for (const page of home.pages) {
        expect(page.named, `${home.specifier} → ${page.href}`).toBeGreaterThan(0)
      }

      expect(
        home.pages.map((page) => page.named),
        home.specifier
      ).toEqual([...home.pages.map((page) => page.named)].sort((a, b) => b - a))
    }
  })

  /**
   * The sum rule, which is what stops this going vacuous. Every door is in
   * exactly one of the three standings, so a module that quietly stopped
   * covering some of them cannot read as a site with less prose than it has.
   */
  it("puts every door in exactly one of the three standings", () => {
    const counted =
      homes.filter((home) => home.standing === "one").length +
      homes.filter((home) => home.standing === "several").length +
      homes.filter((home) => home.standing === "none").length

    expect(counted).toBe(apiEntries.length)
  })

  it("agrees with itself about which standing a door is in", () => {
    for (const home of homes) {
      expect(home.pages.length === 0, home.specifier).toBe(home.standing === "none")
      expect(home.pages.length === 1, home.specifier).toBe(home.standing === "one")
      expect(home.pages.length > 1, home.specifier).toBe(home.standing === "several")
    }
  })

  /**
   * The committed reference held against itself: nothing has arrived, because
   * nothing has changed. It is the one case the generator and the staleness
   * message take on a green tree, and a `namesArrived` that reported something
   * here would print a block on every regeneration.
   */
  it("reports nothing arrived when the reference is held against itself", () => {
    expect(namesArrived(apiEntries, apiEntries)).toEqual([])
  })
})
