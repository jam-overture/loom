import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { EntryProse, ProseMention } from "@/app/(docs)/_lib/api/mentions"
import type { ApiEntry } from "@/app/(docs)/_lib/api/model"
import { ApiEntryReference, apiGroupAnchor, Prose } from "./api-reference"

/**
 * What the reference has to get right when it renders.
 *
 * The generated file is checked elsewhere. What is checked here is the part a
 * reader actually meets: that the sentence arrives before the signature, that
 * every export is reachable by a link rather than by scrolling, and that a
 * backtick in a doc comment becomes code rather than a stray character.
 */

const entry: ApiEntry = {
  specifier: "@jam-overture/loom/react",
  slug: "react",
  types: "./dist/render/index.d.ts",
  requires: [{ package: "react", range: "^19.0.0", optional: true, reach: "loaded" }],
  files: 54,
  narrower: [],
  standing: { packageNames: 0, otherDoors: 0, doorsSharingNothing: 0, widest: true, sharedWith: [], collisions: [] },
  groups: [
    {
      module: "render/addressing",
      title: "Addressing",
      summary: "Which node a click can land on.",
      symbols: [
        {
          name: "addressNode",
          kind: "function",
          signature: "const addressNode: (node: LoomNode) => Addressing",
          truncated: false,
          summary: "The node a click lands on when the user meant `nodeId`.",
        },
      ],
    },
    {
      module: "render/text",
      title: "Text",
      summary: "",
      symbols: [
        {
          name: "NO_TEXT",
          kind: "value",
          signature: "const NO_TEXT: TextResolver",
          truncated: true,
          summary: "",
        },
      ],
    },
  ],
}

/** Nothing on this site names either of these two exports. */
const noProse: EntryProse = { pages: [], named: 0, byName: new Map() }

const mention = (over: Partial<ProseMention> = {}): ProseMention => ({
  href: "/docs/getting-started/rendering-a-tree#pointing-at-a-node",
  pageTitle: "Rendering a tree",
  sectionTitle: "Getting started",
  headingText: "Pointing at a node",
  ...over,
})

describe("an entry point's reference", () => {
  it("says how much is behind the door and where it was read from", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    expect(screen.getByText(/2 exports, in 2 modules/)).toBeTruthy()
    expect(screen.getByText("./dist/render/index.d.ts")).toBeTruthy()
  })

  it("links to every module on the page, with a count", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    const contents = screen.getByRole("navigation", { name: "On this page" })

    expect(within(contents).getByRole("link", { name: "Addressing" }).getAttribute("href")).toBe(
      "#m-render-addressing"
    )
    expect(within(contents).getAllByText("1")).toHaveLength(2)
  })

  it("gives every export an anchor of its own", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={noProse} />)

    expect(container.querySelector("#s-addressNode")).toBeTruthy()
    expect(container.querySelector("#s-NO_TEXT")).toBeTruthy()
  })

  it("puts the sentence before the signature", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={noProse} />)
    const block = container.querySelector("#s-addressNode")
    const text = block?.textContent ?? ""

    expect(text.indexOf("The node a click lands on")).toBeLessThan(text.indexOf("const addressNode"))
  })

  it("says so when a signature was cut short, and only then", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    expect(screen.getAllByText(/Cut short here/)).toHaveLength(1)
  })

  it("leaves out a module's paragraph when it has none rather than printing an empty one", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={noProse} />)

    const described = container.querySelector(`#${apiGroupAnchor("render/addressing")}`)
    const bare = container.querySelector(`#${apiGroupAnchor("render/text")}`)

    /** Module path, module paragraph, the export's own sentence. */
    expect(described?.querySelectorAll("p")).toHaveLength(3)

    /** Module path and the note that a signature was cut short — no empty paragraph between them. */
    expect(bare?.querySelectorAll("p")).toHaveLength(2)
    expect(bare?.textContent).not.toContain("Which node")
  })
})

describe("the way back into the prose", () => {
  const prose: EntryProse = {
    pages: [
      { href: "/docs/getting-started/rendering-a-tree", title: "Rendering a tree", sectionTitle: "Getting started", named: 1 },
    ],
    named: 1,
    byName: new Map([["addressNode", [mention()]]]),
  }

  it("offers the written pages before the list of names", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={prose} />)
    const text = container.textContent ?? ""

    expect(text.indexOf("Start with the prose")).toBeLessThan(text.indexOf("On this page"))
  })

  it("says how few of the exports a written page reaches", () => {
    render(<ApiEntryReference entry={entry} prose={prose} />)

    expect(screen.getByText(/1 of the 2 exports below are shown in use/)).toBeTruthy()
  })

  it("sends a reader from an export to the paragraph that shows it", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={prose} />)
    const link = container.querySelector("#s-addressNode a")

    expect(link?.getAttribute("href")).toBe(
      "/docs/getting-started/rendering-a-tree#pointing-at-a-node"
    )
    expect(container.querySelector("#s-addressNode")?.textContent).toContain(
      "Shown in use on Rendering a tree — Pointing at a node"
    )
  })

  it("says nothing at all under an export no page names", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={prose} />)

    expect(container.querySelector("#s-NO_TEXT")?.textContent).not.toContain("Shown in use")
  })

  it("names the page and not a heading when the mention is above the first one", () => {
    const opening: EntryProse = {
      ...prose,
      byName: new Map([
        ["addressNode", [mention({ href: "/docs/getting-started/rendering-a-tree", headingText: "" })]],
      ]),
    }

    const { container } = render(<ApiEntryReference entry={entry} prose={opening} />)
    const shown = container.querySelector("#s-addressNode")?.textContent ?? ""

    expect(shown).toContain("Shown in use on Rendering a tree")
    expect(shown).not.toContain("—")
  })

  it("joins two pages with an 'and' rather than a comma", () => {
    const two: EntryProse = {
      ...prose,
      byName: new Map([
        [
          "addressNode",
          [
            mention(),
            mention({
              href: "/docs/the-runtime/proposing-a-change",
              pageTitle: "Proposing a change",
              sectionTitle: "The runtime",
              headingText: "",
            }),
          ],
        ],
      ]),
    }

    const { container } = render(<ApiEntryReference entry={entry} prose={two} />)

    expect(container.querySelector("#s-addressNode")?.textContent).toContain(
      "Rendering a tree — Pointing at a node and Proposing a change"
    )
  })

  it("says so plainly when no page names anything behind this import", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    const band = screen.getByRole("navigation", { name: "Written pages about this import" })

    expect(band.textContent).toContain("No written page names any of this import's exports yet")
    expect(band.querySelector("a")).toBeNull()
  })
})

describe("what to install before the import will run", () => {
  const needing = (requires: ApiEntry["requires"]): ApiEntry => ({ ...entry, requires })

  const band = () => screen.getByRole("region", { name: "What to install before this import will run" })

  it("names the package, the range and the command that installs it", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    expect(band().textContent).toContain("react")
    expect(band().textContent).toContain("^19.0.0")
    expect(band().textContent).toContain("pnpm add react")
  })

  it("says that the import itself fails without what it loads", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    expect(band().textContent).toContain("Install this first")
    expect(band().textContent).toContain("the import itself fails")
  })

  it("says the opposite about a package only the types name", () => {
    render(
      <ApiEntryReference
        entry={needing([
          { package: "@anthropic-ai/sdk", range: "^0.115.0", optional: true, reach: "declared" },
        ])}
        prose={noProse}
      />
    )

    expect(band().textContent).toContain("Your program runs without this one")
    expect(band().textContent).toContain("@anthropic-ai/sdk")

    /** Nothing here is loaded, so there is nothing to tell a reader to install first. */
    expect(band().textContent).not.toContain("Install this first")
    expect(band().querySelector("pre")).toBeNull()
  })

  it("keeps the two apart when a door has one of each", () => {
    render(
      <ApiEntryReference
        entry={needing([
          { package: "@anthropic-ai/sdk", range: "^0.115.0", optional: true, reach: "declared" },
          { package: "vitest", range: "^3.0.5", optional: true, reach: "loaded" },
        ])}
        prose={noProse}
      />
    )

    const text = band().textContent ?? ""

    expect(text).toContain("pnpm add vitest")
    expect(text.indexOf("Install this first")).toBeLessThan(text.indexOf("Your program runs without"))
  })

  it("installs both at once when two have to be installed", () => {
    render(
      <ApiEntryReference
        entry={needing([
          { package: "drizzle-orm", range: "^0.45.2", optional: true, reach: "loaded" },
          { package: "vitest", range: "^3.0.5", optional: true, reach: "loaded" },
        ])}
        prose={noProse}
      />
    )

    expect(band().querySelector("pre")?.textContent).toBe("pnpm add drizzle-orm vitest")
    expect(band().textContent).toContain("Install these first")
  })

  it("says a door needs nothing rather than showing a reader an empty band", () => {
    render(<ApiEntryReference entry={needing([])} prose={noProse} />)

    expect(band().textContent).toContain("Nothing to install first")
    expect(band().querySelectorAll("li")).toHaveLength(0)
  })

  /**
   * The sentence used to name `@jam-overture/loom` whatever door it was on,
   * which was true of every door that reached it until 1 October. Loom's
   * second package then gained a door that loads nothing, and the one page in
   * the reference with nothing to install became the one page telling a reader
   * the wrong package arrives with it.
   */
  it("names the package the door actually ships from, not always the framework", () => {
    render(
      <ApiEntryReference
        entry={{
          ...needing([]),
          specifier: "@jam-overture/loom-primitives/compositions",
        }}
        prose={noProse}
      />
    )

    expect(band().textContent).toContain("@jam-overture/loom-primitives")
    expect(band().textContent).not.toContain("with @jam-overture/loom itself")
  })

  it("comes before the prose and the list of names, because it can stop a reader", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={noProse} />)
    const text = container.textContent ?? ""

    expect(text.indexOf("Install this first")).toBeLessThan(text.indexOf("No written page names"))
    expect(text.indexOf("Install this first")).toBeLessThan(text.indexOf("On this page"))
  })

  it("says whether a package is one the host may do without", () => {
    render(
      <ApiEntryReference
        entry={needing([{ package: "react", range: "^19.0.0", optional: false, reach: "loaded" }])}
        prose={noProse}
      />
    )

    expect(band().textContent).toContain("peer dependency")
    expect(band().textContent).not.toContain("optional peer dependency")
  })
})

describe("the narrower door", () => {
  const broadcast = {
    specifier: "@jam-overture/loom/signals/broadcast",
    slug: "signals-broadcast",
    avoids: ["zod"],
    shared: 14,
    files: 9,
  }

  const wide = (narrower: ApiEntry["narrower"]): ApiEntry => ({ ...entry, narrower })

  const band = () => screen.queryByRole("region", { name: "Narrower imports onto part of this one" })

  it("names the other import, what it saves and how much less of the package it goes through", () => {
    render(<ApiEntryReference entry={wide([broadcast])} prose={noProse} />)

    const text = band()?.textContent ?? ""

    expect(text).toContain("A narrower door opens onto part of this one")
    expect(text).toContain("@jam-overture/loom/signals/broadcast")
    expect(text).toContain("publishes 14 of the 2 exports below")
    expect(text).toContain("It does not load")
    expect(text).toContain("zod")
    expect(text).toContain("goes through 9 of the package's built files where this one goes through 54")
  })

  it("links to the narrower door's own page", () => {
    render(<ApiEntryReference entry={wide([broadcast])} prose={noProse} />)

    expect(band()?.querySelector("a")?.getAttribute("href")).toBe("/docs/api-reference/signals-broadcast")
  })

  it("says nothing at all on a door that has none, rather than announcing an absence", () => {
    /*
     * The one place this band departs from the two around it, which both print
     * a sentence when they have nothing. A reader arrives wondering what they
     * must install; nobody arrives wondering whether a narrower door exists,
     * and fifteen of the sixteen pages would be teaching the idea only to take
     * it away again.
     */
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    expect(band()).toBeNull()
  })

  it("comes after what must be installed, which is the more urgent of the two", () => {
    const { container } = render(<ApiEntryReference entry={wide([broadcast])} prose={noProse} />)

    const order = [...container.querySelectorAll("section[aria-label], nav[aria-label]")].map((node) =>
      node.getAttribute("aria-label")
    )

    expect(order).toEqual([
      "What to install before this import will run",
      "Narrower imports onto part of this one",
      "Written pages about this import",
      "On this page",
    ])
  })

  it("joins two narrower doors' packages with an 'or' rather than a comma", () => {
    render(<ApiEntryReference entry={wide([{ ...broadcast, avoids: ["drizzle-orm", "zod"] }])} prose={noProse} />)

    expect(band()?.textContent).toContain("It does not load drizzle-orm or zod, which this import does")
  })

  it("counts the doors in its own heading when there is more than one", () => {
    render(
      <ApiEntryReference
        entry={wide([broadcast, { ...broadcast, specifier: "@jam-overture/loom/other", slug: "other" }])}
        prose={noProse}
      />
    )

    expect(band()?.textContent).toContain("Narrower doors open onto part of this one")
  })
})

describe("what is not behind this door", () => {
  const standing = (over: Partial<ApiEntry["standing"]> = {}): ApiEntry => ({
    ...entry,
    standing: {
      packageNames: 1071,
      otherDoors: 15,
      doorsSharingNothing: 15,
      widest: false,
      sharedWith: [],
      collisions: [],
      ...over,
    },
  })

  const band = () =>
    screen.queryByRole("region", { name: "How much of this package is behind other imports" })

  it("says how much of the package is behind some other import", () => {
    render(<ApiEntryReference entry={standing()} prose={noProse} />)

    const text = band()?.textContent ?? ""

    expect(text).toContain("No import here has everything behind it")
    expect(text).toContain("publishes 2 of the 1,071 names this package publishes")
    expect(text).toContain("The other 1,069 are behind one of the 15 other imports")
    expect(text).toContain("The imports do not nest")
  })

  /**
   * The sentence the root door's page needs, and the only one on the site that
   * contradicts what a reader most likely believes. Everywhere else the
   * heading states the rule; here it has to say the exception is not one.
   */
  it("tells a reader of the widest import that it is not the import with everything", () => {
    render(<ApiEntryReference entry={standing({ widest: true })} prose={noProse} />)

    const text = band()?.textContent ?? ""

    expect(text).toContain("No import here has everything behind it — not even this one")
    expect(text).toContain("more than any other import, and still less than half")
  })

  it("does not call the widest import less than half of itself when it is more", () => {
    render(<ApiEntryReference entry={standing({ widest: true, packageNames: 3 })} prose={noProse} />)

    expect(band()?.textContent).not.toContain("still less than half")
  })

  it("says plainly that no other import shares a name, rather than counting to fifteen", () => {
    render(<ApiEntryReference entry={standing()} prose={noProse} />)

    expect(band()?.textContent).toContain("not one of those imports publishes a single name this one does")
  })

  it("counts the doors that share nothing when some of them do share", () => {
    render(
      <ApiEntryReference
        entry={standing({
          doorsSharingNothing: 13,
          sharedWith: [{ specifier: "@jam-overture/loom/sdk", slug: "sdk", names: 8 }],
        })}
        prose={noProse}
      />
    )

    expect(band()?.textContent).toContain("13 of those 15 publish nothing this one does")
  })

  it("names the imports that publish the same names, with how many, and links to them", () => {
    render(
      <ApiEntryReference
        entry={standing({
          doorsSharingNothing: 13,
          sharedWith: [
            { specifier: "@jam-overture/loom/react", slug: "react", names: 5 },
            { specifier: "@jam-overture/loom/sdk", slug: "sdk", names: 8 },
          ],
        })}
        prose={noProse}
      />
    )

    const text = band()?.textContent ?? ""

    expect(text).toContain("Some of these names are published elsewhere too: 5 by")
    expect(text).toContain("and 8 by")
    expect(text).toContain("the same declarations reached through two doors")
    expect(band()?.querySelector("a")?.getAttribute("href")).toBe("/docs/api-reference/react")
  })

  /**
   * `@jam-overture/loom/signals/broadcast` is the page this is for: every one of
   * its fourteen names is behind the wider signals door as well. A band that
   * said *some* of them there would be understating a fact a reader deciding
   * between two imports needs exactly.
   */
  it("says every one of them when another import publishes the whole surface", () => {
    render(
      <ApiEntryReference
        entry={standing({
          doorsSharingNothing: 14,
          sharedWith: [{ specifier: "@jam-overture/loom/signals", slug: "signals", names: 2 }],
        })}
        prose={noProse}
      />
    )

    expect(band()?.textContent).toContain("Every one of these names is published elsewhere too")
  })

  it("warns that a name means something else behind another import, and links there", () => {
    render(
      <ApiEntryReference
        entry={standing({
          doorsSharingNothing: 14,
          collisions: [{ name: "horizonOf", specifier: "@jam-overture/loom/telemetry", slug: "telemetry" }],
        })}
        prose={noProse}
      />
    )

    const text = band()?.textContent ?? ""

    expect(text).toContain("One name here means something else behind another door")
    expect(text).toContain("horizonOf")
    expect(text).toContain("it is declared differently there — the same name, not the same thing")
    expect(text).toContain("Searching the name finds both")
  })

  it("says nothing about collisions on a door that has none", () => {
    render(<ApiEntryReference entry={standing()} prose={noProse} />)

    expect(band()?.textContent).not.toContain("means something else behind another door")
  })

  /**
   * The band is a comparison, and a package with one door has nothing to
   * compare against. Loom has sixteen and always will have more than one, so
   * this is the shape the component refuses rather than a state the site
   * reaches — but a sentence reading *the other 0 names are behind one of the
   * 0 other imports* is the sort a generated page prints for years.
   */
  it("is absent from a package with one door", () => {
    render(<ApiEntryReference entry={standing({ otherDoors: 0, doorsSharingNothing: 0 })} prose={noProse} />)

    expect(band()).toBeNull()
  })

  it("is absent when this door publishes the whole package", () => {
    render(<ApiEntryReference entry={standing({ packageNames: 2 })} prose={noProse} />)

    expect(band()).toBeNull()
  })

  /**
   * After the two bands about the import a reader is holding, and before the
   * prose. What to install can stop them dead and comes first; which door to
   * take instead is about this import; this is about the other fifteen, and it
   * is the last thing said before the page hands over to the written pages.
   */
  it("comes after the two bands about this import and before the prose", () => {
    const { container } = render(
      <ApiEntryReference
        entry={{
          ...standing(),
          narrower: [
            { specifier: "@jam-overture/loom/x", slug: "x", avoids: ["zod"], shared: 1, files: 1 },
          ],
        }}
        prose={noProse}
      />
    )

    const order = [...container.querySelectorAll("section[aria-label], nav[aria-label]")].map((node) =>
      node.getAttribute("aria-label")
    )

    expect(order).toEqual([
      "What to install before this import will run",
      "Narrower imports onto part of this one",
      "How much of this package is behind other imports",
      "Written pages about this import",
      "On this page",
    ])
  })
})

describe("a doc comment's backticks", () => {
  it("become code", () => {
    const { container } = render(<Prose text="The node the user meant, by `nodeId`." />)

    expect(container.querySelector("code")?.textContent).toBe("nodeId")
    expect(container.textContent).toBe("The node the user meant, by nodeId.")
  })

  it("leave prose with none of them alone", () => {
    const { container } = render(<Prose text="Nothing to mark up here." />)

    expect(container.querySelector("code")).toBeNull()
    expect(container.textContent).toBe("Nothing to mark up here.")
  })
})
