import { buildElement, buildText, type IdFactory, type LoomNode } from "@jam-overture/loom"

import { SCAFFOLD_ANCHOR } from "./bands"
import { SCAFFOLDING } from "./docs-pages"
import { action, code, prose, section, stack } from "./nodes"

/**
 * The band that says a reader does not have to write the first files at all.
 *
 * ## The gap, which is one command wide
 *
 * `/why-use-it` shows a reader two files and tells them to write both: the
 * component, which is ordinary React, and the file beside it that tells Loom
 * the component exists. The band above this one is those two panels.
 *
 * **The package ships a command that writes the second kind for you, and no
 * page of this site had ever mentioned it.** `loom init` is a published
 * entry point — `package.json` declares `bin: { loom: "./dist/cli/main.js" }`
 * — and `/docs/getting-started/scaffolding-a-project` has taught it for
 * weeks. A sweep of `docs-pages.ts` on `main` finds no link to that page from
 * anywhere on this surface, which is the half of the gap this lane could see
 * and did not.
 *
 * `docs/positioning.md` is why it is worth a band rather than a sentence:
 *
 * > *"Don't worry about the controls. That is the stuff under the hood. The
 * > building part and why this build is better than traditional methods is
 * > preferred."*
 *
 * and, on who is reading,
 *
 * > *"You're writing for a web developer, but assume it is the casual web
 * > developer. Imagine junior level developer."*
 *
 * The thing that turns a curious junior developer into somebody who has
 * actually run this is a first command that leaves something working behind
 * it. The site had an install command and then four files to write by hand.
 *
 * ## What it is allowed to claim, and where that comes from
 *
 * Three files, and they are the three `planInit` writes. The band does not
 * print a count: `SCAFFOLDED` below is one row per file, and `scaffold.test.ts`
 * holds the rows to the plan the real command produces, so a fourth file added
 * to the scaffold is a red test here rather than a sentence on this site that
 * quietly became wrong.
 *
 * ## The one word this band may not print, which is the command that follows
 *
 * The obvious second line of the panel is the command that adds a component of
 * your own, and it is **unprintable on this site**: its grammar contains a word
 * `copy.ts`' `RESERVED_VOCABULARY` keeps off every page, under the maintainer's
 * instruction of 26 September. `voice.test.ts` reads source panels for that
 * rule and says so in as many words, so this is not a check that could be
 * satisfied by moving the string.
 *
 * It is filed rather than worked around, because the two ways out are a word
 * the maintainer took off the site and a rename in `src/cli/`, and neither is
 * this lane's. `scaffold.test.ts` holds the panel to naming no reserved word,
 * so a later run cannot put it back and find out from a reviewer.
 */

/**
 * The command, exactly as a reader pastes it.
 *
 * `npx` rather than a bare `loom`, which is what
 * `/docs/getting-started/scaffolding-a-project` prints. The two are the same
 * command and the difference is whether the package's `bin` is already on a
 * path; a reader arriving from this site has just been shown `npm install`
 * and has not been shown anything that would put it there. `docs-pages.ts`
 * records the same decision about `npm install` against the guide's
 * `pnpm add` and the sentence holds here: two ways to run one instruction is
 * not a defect, and a reader pastes whichever is in front of them.
 *
 * `scaffold.test.ts` hands everything after `npx loom` to the framework's own
 * argument parser, so the panel is a command the CLI accepts rather than a
 * string that looks like one.
 */
export const SCAFFOLD_COMMAND = "npx loom init"

/** How the command is spelled before the arguments, which the test strips. */
export const SCAFFOLD_RUNNER = "npx loom"

/** One file the command writes, and what it is for. */
export type ScaffoldedFile = {
  /**
   * The module the plan writes, by its basename.
   *
   * **Never rendered.** Two of the three are named after words this site is
   * not allowed to print, which is the whole reason the rows carry a `says`
   * instead of a filename. It is here so `scaffold.test.ts` can hold the three
   * lines a reader sees against the three files the command really produces,
   * in the order the plan writes them.
   */
  readonly module: string
  /** The line a reader reads, which names no file and no word of ours. */
  readonly says: string
}

/**
 * The three files, in the order `loom init` writes them.
 *
 * The descriptions are the documentation's own, in this site's register: the
 * guide calls them *"a component of your own"*, *"the list of what AI may
 * use"* and *"a test"*. The middle one loses `may` on the way here, which is
 * the 24 October ruling in `docs/positioning.md` — people say *can*, or *is
 * allowed to*, and *may* is the register of a terms-of-service page.
 *
 * The third line is the one worth reading twice, and it is the scaffold's own
 * argument for why it insists on giving you a test: a component that ignores
 * the edit contract *"renders perfectly and is invisible to the portal, with
 * no error anywhere"*. That is a failure a reader would otherwise meet months
 * later on a page they cannot edit.
 */
export const SCAFFOLDED: readonly ScaffoldedFile[] = [
  { module: "app.page.ts", says: "A part of your own to fill in" },
  { module: "registry.ts", says: "The list of what AI is allowed to use" },
  { module: "registry.test.ts", says: "A test that catches a part the portal cannot see" },
]

const writes = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.list",
    /**
     * Numbered rather than bulleted, because the thing a reader is counting is
     * how much they get for one command. A bullet says *these are some things*
     * and the band's whole point is that it is a short, finite list.
     */
    props: { marker: "number", density: "comfortable", measured: true },
    children: SCAFFOLDED.map(({ says }) =>
      buildElement(ids, {
        type: "loom.list-item",
        props: {},
        children: [buildText(ids, says)],
      })
    ),
  })

/**
 * The band, under the two panels it is the alternative to.
 *
 * **Under them rather than above**, which is the same call `wired.ts` made on
 * 10 November and for the same reason: a reader who has not yet seen what the
 * two files look like cannot tell what a command writing them is worth. The
 * panels make the work concrete; this takes it away.
 *
 * The control is the guide rather than the front of the documentation.
 * `docs-pages.ts` carries why that distinction is worth a constant — a button
 * offering the longer version of a command that lands three pages above the
 * command is a link that works and is not the page the button named.
 */
export const scaffoldBand = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "readable", eyebrow: "Starting from nothing", anchor: SCAFFOLD_ANCHOR },
    "Loom writes the first files for you",
    [
      prose(ids, "Run this in your project and it writes what you would otherwise write by hand.", {
        tone: "muted",
        align: "center",
        measured: true,
      }),
      code(ids, SCAFFOLD_COMMAND, {
        language: "bash",
        tone: "terminal",
        density: "compact",
        wrap: false,
      }),
      writes(ids),
      stack(ids, { direction: "row", gap: "snug", justify: "center", wrap: true }, [
        action(ids, "Read the guide", SCAFFOLDING.path, { variant: "secondary" }),
      ]),
    ],
    { align: "center" }
  )
