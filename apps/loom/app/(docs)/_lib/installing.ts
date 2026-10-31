import ts from "typescript"

import { ARRIVAL_ROUTE } from "./arrival/route"
import { pagesWithFences } from "./fences/extract"
import { docsEntryAt, docsHref, docsOrder } from "./nav"
import { packageOf } from "./packages"

/**
 * Everything this site tells a reader to import, and the command that installs
 * it.
 *
 * **The plain version.** A page here shows you code and expects you to paste it
 * into your own project. That only works if you already have the packages the
 * code imports. One page — *Installation* — is where a stranger is told what to
 * install, and nothing connected the two: the command was typed into the page
 * by hand, the code blocks were written on twenty other pages, and neither knew
 * the other existed.
 *
 * They had already come apart. On 28 October 2026 the command installed four
 * packages and the site's code blocks imported eight. The one that mattered is
 * `zod`: the Installation page's own prose called it *"the only hard
 * dependency"* two screens below a command that did not install it, and
 * `import { z } from "zod"` is on *A primitive of your own* — **stop five of
 * the arrival route**, the hour this site promises a stranger. A reader
 * following that hour, having run the one command it sends them to, reached the
 * page where they register a primitive and got `Cannot find module 'zod'`.
 * Nothing was red. The block compiles here, because this repository has zod.
 *
 * So the list below is the one statement of what a reader installs, and three
 * things are read off it rather than typed: the command the Installation page
 * prints, the table of what each package is for, and the page where a reader
 * first meets each one. What holds it true is the sweep — every bare specifier
 * in every code block on the site — and the faults below, which stop the build
 * rather than failing a test, for the reason `arrival/route.ts` gives for the
 * same choice: a page that has started lying to a stranger should not render.
 *
 * **What this is not.** It is not a dependency manifest and it does not check
 * versions. The question it answers is narrower and is the one a stranger has:
 * *if I do what this site says, in the order it says it, will the next block I
 * paste run?*
 */

/** Whether a package is installed for the app or only for its tests. */
export type InstallKind = "run" | "dev"

export type Installable = {
  /** The package name, exactly as a reader would type it. */
  readonly name: string
  readonly kind: InstallKind
  /**
   * Whether the Installation page's command installs it.
   *
   * Everything the arrival route needs is `true`, and that is a rule below
   * rather than a convention: the route passes Installation and no other page
   * that installs anything, so a reader on it has run exactly one command.
   */
  readonly inTheCommand: boolean
  /**
   * When a reader needs it, in a sentence they could repeat.
   *
   * Two packages that are needed for the same reason share the sentence, and
   * the table renders them as one row with one command — `drizzle-orm` and
   * `postgres` are never wanted apart.
   */
  readonly when: string
  /**
   * Why it is here when no code block on this site imports it.
   *
   * Required for exactly that case and refused otherwise, because a package
   * nothing imports is the shape a stale entry has, and the only honest
   * defence against deleting it is a sentence saying what it is for.
   */
  readonly thoughNothingImportsIt?: string
}

/**
 * The list.
 *
 * Ordered as the command reads, which is the order a reader meets them: the
 * framework, the library, what renders them, what validates them. The three at
 * the foot are the ones a reader adds when they get to the page that needs
 * them, and the table says which page that is.
 */
export const INSTALLABLE: readonly Installable[] = [
  {
    name: "@jam-overture/loom",
    kind: "run",
    inTheCommand: true,
    when: "always. It is the framework: the tree, the change model and the Gate.",
  },
  {
    name: "@jam-overture/loom-primitives",
    kind: "run",
    inTheCommand: true,
    when: "you want the starter library rather than a vocabulary of your own.",
  },
  {
    name: "react",
    kind: "run",
    inTheCommand: true,
    when: "you are rendering. The tree itself has no opinion about React.",
  },
  {
    name: "react-dom",
    kind: "run",
    inTheCommand: true,
    when: "you are rendering in a browser. Your framework imports it; your own code need not.",
    thoughNothingImportsIt:
      "no block on this site imports it — React's renderer is reached through the framework you " +
      "mount in, and a reader who leaves it out finds that out at build time rather than here.",
  },
  {
    name: "zod",
    kind: "run",
    inTheCommand: true,
    when:
      "always. Every primitive declares its props as a Zod schema, validated where a tree becomes an " +
      "element, and a primitive of your own imports it directly.",
  },
  {
    name: "vitest",
    kind: "dev",
    inTheCommand: false,
    when: "you are writing the tests these pages show you how to write.",
  },
  {
    name: "drizzle-orm",
    kind: "run",
    inTheCommand: false,
    when: "you are persisting trees rather than holding them in memory.",
  },
  {
    name: "postgres",
    kind: "run",
    inTheCommand: false,
    when: "you are persisting trees rather than holding them in memory.",
  },
  {
    name: "@anthropic-ai/sdk",
    kind: "run",
    inTheCommand: false,
    when: "you want a model to interpret a sentence into a proposal.",
  },
]

/**
 * Every package a code block on this site imports, and the pages that import
 * it.
 *
 * Read with `ts.preProcessFile`, which is the scanner `api/requires.ts` already
 * reads imports with here, and the right instrument for this one: it is a
 * scanner rather than a parser, so a `sketch` — a block abridged with an
 * ellipsis and deliberately never compiled — still gives up the imports written
 * at the top of it. A reader copies a sketch too.
 *
 * Bash blocks are skipped: a shell command is not an import. Relative
 * specifiers are skipped because they name the reader's own files, and `@/`
 * because it is this application's alias and appears in no block a reader
 * copies — if one ever did, it would arrive here as a package named `@` and the
 * first fault below would say so.
 */
export const importedPackages = (): ReadonlyMap<string, readonly string[]> => {
  const found = new Map<string, string[]>()

  for (const page of pagesWithFences()) {
    const href = docsHref(page.sectionSlug, page.pageSlug)

    for (const fence of page.fences) {
      if (fence.language === "bash") continue

      for (const { fileName } of ts.preProcessFile(fence.code, true, true).importedFiles) {
        if (fileName.startsWith(".") || fileName.startsWith("@/")) continue

        const name = packageOf(fileName)
        const pages = found.get(name) ?? []

        if (!pages.includes(href)) pages.push(href)
        found.set(name, pages)
      }
    }
  }

  return found
}

/** The address of the page the command is printed on. */
export const INSTALL_PAGE: string = docsHref("getting-started", "installation")

const commandFor = (kind: InstallKind, entries: readonly Installable[]): string | undefined => {
  const names = entries.filter((entry) => entry.inTheCommand && entry.kind === kind).map((entry) => entry.name)

  if (names.length === 0) return undefined

  return `pnpm add ${kind === "dev" ? "-D " : ""}${names.join(" ")}`
}

/**
 * The lines the Installation page prints, in the order they are run.
 *
 * Built from the list so that the block a reader copies and the list these
 * rules are checked against cannot be two lists — the same argument
 * `QuickstartInstall` carries, and the same failure it was written after.
 *
 * One line today, because nothing a reader needs before the route is done is a
 * dev dependency. It is a list rather than a string so that the day one is, it
 * arrives on its own `pnpm add -D` line instead of being run as a dependency.
 */
export const installCommands = (entries: readonly Installable[] = INSTALLABLE): readonly string[] =>
  (["run", "dev"] as const).flatMap((kind) => {
    const line = commandFor(kind, entries)

    return line === undefined ? [] : [line]
  })

/** What a reader types to add one group of packages that the command leaves out. */
export const addCommandFor = (entries: readonly Installable[]): string =>
  `pnpm add ${entries[0]?.kind === "dev" ? "-D " : ""}${entries.map((entry) => entry.name).join(" ")}`

export type NeedRow = {
  /** The packages this row is about — more than one where they are never wanted apart. */
  readonly packages: readonly string[]
  readonly when: string
  /** `undefined` where the command above already installs them. */
  readonly add?: string
  /** The first page, in reading order, with a block that imports one of them. */
  readonly firstUsedOn?: { readonly href: string; readonly title: string }
}

/**
 * The table, grouped by the reason rather than by the package.
 *
 * Grouping on the sentence is what makes `drizzle-orm` and `postgres` one row
 * without anything declaring them a pair: they are a pair because the answer to
 * *when do I need this* is the same sentence, and if that ever stops being true
 * they separate by themselves.
 */
export const whatYouNeed = (
  entries: readonly Installable[] = INSTALLABLE,
  imported: ReadonlyMap<string, readonly string[]> = importedPackages()
): readonly NeedRow[] => {
  const order = new Map<string, number>(docsOrder.map((entry, at) => [entry.href, at]))
  const rows = new Map<string, Installable[]>()

  for (const entry of entries) {
    rows.set(entry.when, [...(rows.get(entry.when) ?? []), entry])
  }

  return [...rows.values()].map((group) => {
    const pages = group
      .flatMap((entry) => imported.get(entry.name) ?? [])
      .sort((first, second) => (order.get(first) ?? docsOrder.length) - (order.get(second) ?? docsOrder.length))

    const first = pages[0]
    const entry = first === undefined ? undefined : docsEntryAt(first)

    return {
      packages: group.map((member) => member.name),
      when: group[0]?.when ?? "",
      ...(group.every((member) => member.inTheCommand) ? {} : { add: addCommandFor(group) }),
      ...(first === undefined || entry === undefined
        ? {}
        : { firstUsedOn: { href: first, title: entry.page.title } }),
    }
  })
}

/**
 * Everything wrong with the pair, as sentences somebody can act on.
 *
 * A list rather than the first fault, for the reason the arrival route's
 * account gives: a page is usually added with its siblings, and reporting one
 * at a time costs a build per page.
 */
export const installFaults = (
  entries: readonly Installable[] = INSTALLABLE,
  imported: ReadonlyMap<string, readonly string[]> = importedPackages(),
  route: readonly { readonly href: string }[] = ARRIVAL_ROUTE
): readonly string[] => {
  const faults: string[] = []
  const known = new Map(entries.map((entry) => [entry.name, entry] as const))

  for (const [name, pages] of imported) {
    if (known.has(name)) continue

    faults.push(
      `${pages[0]} has a block importing ${name}, and nothing on this site tells a reader to install it`
    )
  }

  for (const entry of entries) {
    const pages = imported.get(entry.name)

    if (pages === undefined && entry.thoughNothingImportsIt === undefined) {
      faults.push(
        `the install list carries ${entry.name}, no block on this site imports it, and it says no reason`
      )
    }

    if (pages !== undefined && entry.thoughNothingImportsIt !== undefined) {
      faults.push(
        `${entry.name} excuses itself as imported by nothing, and ${pages[0]} imports it`
      )
    }
  }

  /*
   * The route's own hour, which is the rule the whole file exists for. A
   * stranger on it has run the command on Installation and nothing else, so
   * every package they are shown an import of has to be in that command.
   */
  if (!route.some((step) => step.href === INSTALL_PAGE)) {
    faults.push(
      `the install command is printed on ${INSTALL_PAGE}, which the arrival route does not stop at`
    )
  }

  for (const step of route) {
    for (const [name, pages] of imported) {
      if (!pages.includes(step.href)) continue
      if (known.get(name)?.inTheCommand !== false) continue

      faults.push(
        `the arrival route stops at ${step.href}, which imports ${name}, and the command on ${INSTALL_PAGE} does not install it`
      )
    }
  }

  return faults
}

export const INSTALL_FAULTS: readonly string[] = installFaults()

if (INSTALL_FAULTS.length > 0) {
  throw new Error(
    `loom: this site tells a reader to import something it does not tell them to install —\n  - ${INSTALL_FAULTS.join("\n  - ")}`
  )
}
