import { describe, expect, it } from "vitest"

import { ARRIVAL_ROUTE } from "./arrival/route"
import {
  addCommandFor,
  importedPackages,
  INSTALL_FAULTS,
  INSTALL_PAGE,
  INSTALLABLE,
  installCommands,
  installFaults,
  type Installable,
  whatYouNeed,
} from "./installing"
import { docsOrder } from "./nav"
import { QUICKSTART_DEPENDENCIES } from "./quickstart/program"

const entry = (over: Partial<Installable> & { readonly name: string }): Installable => ({
  kind: "run",
  inTheCommand: true,
  when: "always.",
  ...over,
})

const imports = (pairs: readonly (readonly [string, readonly string[]])[]) => new Map(pairs)

describe("what the site tells a reader to import", () => {
  const found = importedPackages()

  /*
   * A sweep that came back with nothing would pass every rule below, so the
   * first two say what it reached — the shape `marketing-14` named and this
   * repository has now written into seven sweeps.
   */
  it("reads the code blocks of the real site, so no rule below is vacuous", () => {
    expect(found.size).toBeGreaterThanOrEqual(8)
    expect([...found.values()].flat().length).toBeGreaterThanOrEqual(20)
  })

  /**
   * The set, written out.
   *
   * A sweep held only against itself is the 27 September failure, and this is
   * the written-out case that holds the rule: eight packages, counted by hand
   * on 28 October 2026 and read off the pages every run since. A ninth arriving
   * is a page importing something new, which is exactly the day somebody should
   * be made to decide whether a reader can install it.
   */
  it("finds every package a code block imports, and no others", () => {
    expect([...found.keys()].sort()).toEqual([
      "@anthropic-ai/sdk",
      "@jam-overture/loom",
      "@jam-overture/loom-primitives",
      "drizzle-orm",
      "postgres",
      "react",
      "vitest",
      "zod",
    ])
  })

  it("names the pages that import one, as addresses the site really serves", () => {
    const addresses = new Set(docsOrder.map((page) => page.href))

    for (const [name, pages] of found) {
      expect(pages.length, name).toBeGreaterThan(0)

      for (const href of pages) expect(addresses, `${name} on ${href}`).toContain(href)
    }
  })
})

describe("the account of what a reader installs", () => {
  it("is clean on the site as it stands", () => {
    expect(INSTALL_FAULTS).toEqual([])
  })

  it("refuses a package a page imports and nothing installs", () => {
    expect(
      installFaults([entry({ name: "zod" })], imports([["left-pad", ["/docs/getting-started/your-first-tree"]]]), [
        { href: INSTALL_PAGE },
      ])
    ).toContain(
      "/docs/getting-started/your-first-tree has a block importing left-pad, and nothing on this site tells a reader to install it"
    )
  })

  it("refuses an entry nothing imports that gives no reason", () => {
    expect(installFaults([entry({ name: "left-pad" })], imports([]), [{ href: INSTALL_PAGE }])).toEqual([
      "the install list carries left-pad, no block on this site imports it, and it says no reason",
    ])
  })

  it("accepts an entry nothing imports that gives one", () => {
    expect(
      installFaults(
        [entry({ name: "react-dom", thoughNothingImportsIt: "your framework imports it" })],
        imports([]),
        [{ href: INSTALL_PAGE }]
      )
    ).toEqual([])
  })

  it("refuses an excuse that has stopped being true", () => {
    expect(
      installFaults(
        [entry({ name: "react-dom", thoughNothingImportsIt: "your framework imports it" })],
        imports([["react-dom", ["/docs/the-runtime/what-your-app-has-to-do"]]]),
        [{ href: INSTALL_PAGE }]
      )
    ).toEqual(["react-dom excuses itself as imported by nothing, and /docs/the-runtime/what-your-app-has-to-do imports it"])
  })

  /**
   * The failure this file was written for, written out.
   *
   * On 28 October 2026 `zod` was imported by *A primitive of your own*, which
   * is the route's fifth stop, and the command on *Installation* did not
   * install it. Nothing was red: the block compiles in this repository, which
   * has zod, and a reader following the hour does not.
   */
  it("refuses a package the route meets that the one command does not install", () => {
    expect(
      installFaults(
        [entry({ name: "zod", inTheCommand: false, when: "you are writing a primitive." })],
        imports([["zod", ["/docs/building-with-loom/a-primitive-of-your-own"]]]),
        [{ href: INSTALL_PAGE }, { href: "/docs/building-with-loom/a-primitive-of-your-own" }]
      )
    ).toEqual([
      `the arrival route stops at /docs/building-with-loom/a-primitive-of-your-own, which imports zod, and the command on ${INSTALL_PAGE} does not install it`,
    ])
  })

  it("says nothing about a package only an off-route page imports", () => {
    expect(
      installFaults(
        [entry({ name: "zod", inTheCommand: false, when: "you are writing a primitive." })],
        imports([["zod", ["/docs/the-runtime/when-nothing-comes-back"]]]),
        [{ href: INSTALL_PAGE }]
      )
    ).toEqual([])
  })

  it("refuses a route that never passes the page the command is on", () => {
    expect(installFaults([], imports([]), [{ href: "/docs/getting-started/quickstart" }])).toEqual([
      `the install command is printed on ${INSTALL_PAGE}, which the arrival route does not stop at`,
    ])
  })

  it("reports every fault rather than the first", () => {
    expect(
      installFaults([entry({ name: "left-pad" })], imports([["ms", ["/docs/getting-started/your-first-tree"]]]), [
        { href: INSTALL_PAGE },
      ])
    ).toHaveLength(2)
  })
})

describe("the command the page prints", () => {
  const lines = installCommands()

  it("installs the two Loom packages, what renders them and what validates them", () => {
    expect(lines[0]).toBe(
      "pnpm add @jam-overture/loom @jam-overture/loom-primitives react react-dom zod"
    )
  })

  it("is one line, because nothing the route needs is a dev dependency", () => {
    expect(lines).toHaveLength(1)
  })

  it("puts a dev dependency on a -D line of its own when one is in the command", () => {
    expect(
      installCommands([
        entry({ name: "@jam-overture/loom" }),
        entry({ name: "vitest", kind: "dev" }),
      ])
    ).toEqual(["pnpm add @jam-overture/loom", "pnpm add -D vitest"])
  })

  /**
   * The regression in one line. `zod` is imported on *Primitives and the
   * registry*, which is the route's fifth stop, and on 28 October 2026 the
   * command did not install it.
   */
  it("installs everything the arrival route's own pages import", () => {
    const found = importedPackages()
    const stops = new Set(ARRIVAL_ROUTE.map((step) => step.href))
    const command = lines.join("\n")

    const onTheRoute = [...found]
      .filter(([, pages]) => pages.some((href) => stops.has(href)))
      .map(([name]) => name)

    expect(onTheRoute).toContain("zod")

    for (const name of onTheRoute) expect(command, name).toContain(name)
  })

  it("leaves a package out of it where the list says so", () => {
    expect(lines.join("\n")).not.toContain("drizzle-orm")
    expect(lines.join("\n")).not.toContain("vitest")
  })

  it("builds a dev line with -D and a run line without", () => {
    expect(addCommandFor([entry({ name: "vitest", kind: "dev" })])).toBe("pnpm add -D vitest")
    expect(addCommandFor([entry({ name: "postgres" })])).toBe("pnpm add postgres")
  })
})

describe("the table of what you need", () => {
  const rows = whatYouNeed()

  it("gives a row to every package in the list", () => {
    expect(rows.flatMap((row) => row.packages).sort()).toEqual(INSTALLABLE.map((one) => one.name).sort())
  })

  it("puts two packages wanted for the same reason in one row, with one command", () => {
    const row = rows.find((one) => one.packages.includes("drizzle-orm"))

    expect(row?.packages).toEqual(["drizzle-orm", "postgres"])
    expect(row?.add).toBe("pnpm add drizzle-orm postgres")
  })

  it("asks for the test runner as a dev dependency, on the page that first imports it", () => {
    const row = rows.find((one) => one.packages.includes("vitest"))

    expect(row?.add).toBe("pnpm add -D vitest")
    expect(row?.firstUsedOn?.href).toBe("/docs/building-with-loom/a-primitive-of-your-own")
  })

  it("asks for no second command where the one above already installs them", () => {
    for (const row of rows) {
      const inCommand = row.packages.every(
        (name) => INSTALLABLE.find((one) => one.name === name)?.inTheCommand === true
      )

      expect(row.add === undefined, row.packages.join(" ")).toBe(inCommand)
    }
  })

  it("names the first page in reading order that imports one", () => {
    const at = new Map(docsOrder.map((page, index) => [page.href, index]))
    const found = importedPackages()

    for (const row of rows) {
      const pages = row.packages.flatMap((name) => found.get(name) ?? [])

      if (pages.length === 0) {
        expect(row.firstUsedOn, row.packages.join(" ")).toBeUndefined()
        continue
      }

      const earliest = Math.min(...pages.map((href) => at.get(href) ?? Number.MAX_SAFE_INTEGER))

      expect(row.firstUsedOn?.href, row.packages.join(" ")).toBe(docsOrder[earliest]?.href)
      expect(row.firstUsedOn?.title, row.packages.join(" ")).toBe(docsOrder[earliest]?.page.title)
    }
  })

  it("has no page for the one package nothing on this site imports", () => {
    const row = rows.find((one) => one.packages.includes("react-dom"))

    expect(row?.firstUsedOn).toBeUndefined()
    expect(INSTALLABLE.find((one) => one.name === "react-dom")?.thoughNothingImportsIt).toBeDefined()
  })

  /**
   * The site prints **two** install commands, and this is the line between
   * them.
   *
   * The quickstart's is `QUICKSTART_DEPENDENCIES`, and it is right that it is
   * its own list: it answers a different question — what one file, shown
   * verbatim and run by `quickstart.test.ts`, imports — rather than what a
   * reader following the pages needs. What would be wrong is the two drifting
   * into naming different packages, which is how `zod` came to be installed by
   * the quickstart and by nothing a reader on the arrival route ever reaches.
   *
   * So they are not merged and they are not allowed to disagree: every package
   * the quickstart installs is one this list has an entry for.
   */
  it("knows every package the quickstart's own command installs", () => {
    expect(QUICKSTART_DEPENDENCIES.length).toBeGreaterThan(1)

    for (const name of QUICKSTART_DEPENDENCIES) {
      expect(INSTALLABLE.map((one) => one.name), name).toContain(name)
    }
  })

  it("says when each one is wanted, in a sentence", () => {
    for (const row of rows) {
      expect(row.when.length, row.packages.join(" ")).toBeGreaterThan(20)
      expect(row.when.endsWith("."), row.packages.join(" ")).toBe(true)
    }
  })
})
