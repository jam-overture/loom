import type { LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { INSTALL_COMMAND, PACKAGES, RUNTIME_PACKAGE, STARTER_PACKAGE } from "../copy"
import { treeFor } from "../render"
import { DEFAULT_THEME, HOME, SITE_THEME_NAMES } from "../site"
import { readerCopy } from "../words"

/**
 * The two names the front door asks a stranger to install, held to being
 * readable.
 *
 * ## What a phone was being shown
 *
 * The install band prints one line and the panel is the deliberate `wrap: false`
 * on this site, so at 390 the command goes off the end of its own box.
 * Re-measured on a production build on 18 October, on `minimal` and on `bold`:
 *
 * ```
 * pre        x 15 y 5658  361x41
 * pre code   x 24 y 5670  504x16
 * ```
 *
 * 504 pixels of command in a 361-pixel panel, so 143 of them are past the edge
 * — and there is no track saying so, because `loom.code` contains the overflow
 * with `overflow-x: auto` and a touch viewport draws that scrollbar only while
 * a finger is moving it. What a reader gets at rest is
 * `npm install @jam-overture/loom @jam-overtu` and no sign the line continues.
 *
 * **That was survivable, and the paragraph above it was not.** It read *"One
 * package is Loom itself. The other is the set of 107 components this page is
 * drawn from"* — a description of a line, which describes nothing to somebody
 * who cannot see the line. The names appeared on the front door in exactly one
 * place and it was the place a phone cuts off, so this site asked a stranger to
 * install a package whose name it never showed them.
 *
 * ## The rule, and why it is about the page rather than about the string
 *
 * A name is read somewhere that is not the panel. It is written against the
 * **served tree** rather than against the paragraph, because what it is
 * defending is not today's sentence: the band's copy has been rewritten by
 * nearly every run of this lane, the shortest way to say this will always be
 * *one package … the other*, and a sweep for plainer words would reach for it
 * first. A rule naming the paragraph would be deleted with the paragraph.
 *
 * `readerCopy` is the instrument because it is already the one the register
 * rules use, and because it joins a maximal run of inline children back into
 * the one string a reader reads — so a name wrapped in `loom.code-span` is read
 * as part of the sentence around it rather than as a fragment that happens to
 * be in the tree. The panel's own text is a text node under `loom.code` and is
 * excluded by its field, which is the whole distinction being drawn.
 *
 * The missing affordance in the panel is `loom.code`'s and is filed. Nothing
 * here asserts anything about it: the panel is still the only place the whole
 * command appears, and the rule below says so from the other side.
 */

const ORIGIN = "https://loom.example"

const frontDoor = (theme = DEFAULT_THEME): LoomTree =>
  treeFor(HOME, { origin: ORIGIN, theme })

/** The text node a `loom.code` panel holds, as `readerCopy` fields it. */
const PANEL_FIELD = "loom.code#text"

/**
 * A package name, matched as a name rather than as a run of characters.
 *
 * `@jam-overture/loom` is a prefix of `@jam-overture/loom-primitives`, so a
 * substring check would call the runtime named on a page that names only the
 * starter library — which is one of the two states this file exists to refuse.
 * The same matcher, for the same reason, is in `docs-pages.test.ts`; it is
 * four lines and copied rather than shared because the two files are about
 * different claims and a module named *the package matcher* would be a place
 * for a third caller to grow.
 *
 * **The lookahead admits a full stop and this was found by writing it the other
 * way first.** A name is allowed to be followed by anything that cannot
 * continue it — so a word character, a hyphen or a slash refuses the match, and
 * punctuation does not. The first version refused `.` as well, on the reasoning
 * that an npm name may contain one, and the self-check below went red on
 * `@jam-overture/loom.`: a name at the end of a sentence. That is a rule
 * failing on correct copy, which is the worse of the two errors here, and the
 * ambiguity it was reaching for is not a dot. It is the hyphen between these
 * two names.
 */
const namesPackage = (text: string, name: string): boolean =>
  new RegExp(`${name.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&")}(?![\\w/-])`).test(text)

/** Everything a reader reads on the front door except the command panel. */
const prose = (theme = DEFAULT_THEME): readonly string[] =>
  readerCopy(frontDoor(theme).root)
    .filter(({ field }) => field !== PANEL_FIELD)
    .map(({ text }) => text)

describe("the packages the front door asks a stranger to install", () => {
  it("reads a front door with words on it, so the rules below mean something", () => {
    expect(prose().length).toBeGreaterThan(20)
    expect(PACKAGES.length).toBe(2)
  })

  it.each(PACKAGES)("says %s somewhere that is not the command panel", (name) => {
    expect(
      prose().some((text) => namesPackage(text, name)),
      `nothing on the front door names ${name} outside the panel, so a phone — where the command is cut at 361 of 504 pixels — never shows the reader what they are installing`
    ).toBe(true)
  })

  /**
   * Under every palette, because the band is composed once and themed three
   * ways, and a rule read under one of them would not notice a run that made
   * the paragraph conditional on the theme.
   */
  it.each(SITE_THEME_NAMES)("still says both under %s", (theme) => {
    for (const name of PACKAGES) {
      expect(prose(theme).some((text) => namesPackage(text, name))).toBe(true)
    }
  })

  /**
   * The other side of it. The names being in the prose is not a reason to stop
   * printing the command, and the obvious tidy-up — *the paragraph says both
   * names now, so the panel can say `npm install loom`* — is the one this
   * guards against.
   */
  it("still prints the whole command in the panel", () => {
    const panel = readerCopy(frontDoor().root).filter(({ field }) => field === PANEL_FIELD)

    expect(panel.map(({ text }) => text)).toContain(INSTALL_COMMAND)
  })

  /**
   * The matcher, checked against the one pair of names it has to tell apart.
   */
  it("reads a whole name, so the starter library does not stand in for the runtime", () => {
    expect(namesPackage(STARTER_PACKAGE, STARTER_PACKAGE)).toBe(true)
    expect(namesPackage(STARTER_PACKAGE, RUNTIME_PACKAGE)).toBe(false)
    expect(namesPackage(`${RUNTIME_PACKAGE}/sdk`, RUNTIME_PACKAGE)).toBe(false)
    expect(namesPackage(`${RUNTIME_PACKAGE}.`, RUNTIME_PACKAGE)).toBe(true)
    expect(namesPackage(`Install ${RUNTIME_PACKAGE}, then the rest.`, RUNTIME_PACKAGE)).toBe(true)
  })
})
