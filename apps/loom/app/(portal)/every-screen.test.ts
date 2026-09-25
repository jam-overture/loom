import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "./_test/plain-language"
import { surfaceTextIn } from "./_test/surface-text"
import { namedScreens } from "./_lib/screen-names"
import { isForwarding, portalScreens, screenSource } from "./_lib/screen-source"

/**
 * The rules that hold on every screen in the portal, checked on every screen in
 * the portal.
 *
 * Seven screens carried a `reading-order.test.ts` of their own and each one
 * repeated the same two or three universal assertions alongside the one thing
 * that was actually about that screen. The universal half is here now, run over
 * whatever the filesystem holds; the per-screen half stays where it is, because
 * "the page comes before the index of the page" is a fact about the page screen
 * and belongs beside it.
 *
 * The reason this file exists rather than an eighth copy is in
 * `_lib/screen-source.ts`: **a guard somebody has to remember to write guards
 * the screens somebody remembered.** `/portal/trust` had no guard, and its first
 * contact with this one turned up a notice reporting a good result inside the
 * dashed box that means "nothing here yet".
 */

/** Everything in the lane, not only the routes. A component can misread as easily as a page. */
const sourcesUnder = (directory: string): readonly { file: string; source: string }[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return sourcesUnder(path)
    if (!entry.name.endsWith(".tsx") || entry.name.includes(".test.")) return []

    return [{ file: path, source: readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "") }]
  })

const GROUP = join(process.cwd(), "app", "(portal)")

const screens = portalScreens()
const rendered = screens
  .map((screen) => ({ ...screen, source: screenSource(screen.file) }))
  .filter((screen) => !isForwarding(screen.source))

describe("the portal's screens, enumerated from the filesystem", () => {
  it("finds the screens that exist and none that do not", () => {
    const routes = screens.map((screen) => screen.route)

    expect(routes).toContain("/portal")
    expect(routes).toContain("/portal/pages/[treeId]")
    expect(routes).toContain("/portal/trust")
    expect(routes).not.toContain("/portal/nowhere")
  })

  /**
   * Guards the guard. If the enumeration silently returned nothing — a renamed
   * app directory, a `process.cwd()` that is not what this test assumes — every
   * rule below would pass over an empty list and report green.
   */
  it("finds more than a handful, so an empty sweep cannot pass as clean", () => {
    expect(screens.length).toBeGreaterThan(10)
    expect(rendered.length).toBeGreaterThan(8)
  })
})

/**
 * **A screen has one name.**
 *
 * On 7 September `/portal/activity` was called four different things by four
 * different parts of this portal — `Activity` in the rail, `Activity` in its own
 * heading, `What's been asked` in the strip, and `Everything anyone has asked
 * for →` at the foot of the front door. None of them was wrong on its own and no
 * test could see the set. `_lib/screen-names.ts` holds the argument.
 *
 * The check is that a declared name never appears as a literal in this route
 * group. Comments are already stripped, so the module's own reasoning about the
 * names it holds is not mistaken for a second copy of one — the same
 * arrangement that lets a guard sit under a comment naming the very string it
 * forbids.
 *
 * `.ts` files are swept as well as `.tsx`, which is what catches the case that
 * actually happened: the strip's labels lived in `_lib/page-views.ts` and
 * nothing rendered them from a component.
 */
describe("the name of a screen", () => {
  const NAMED = namedScreens()

  const everySource = (directory: string): readonly { file: string; source: string }[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) return everySource(path)
      if (!/\.tsx?$/u.test(entry.name) || entry.name.includes(".test.")) return []
      if (path === join(GROUP, "_lib", "screen-names.ts")) return []

      return [{ file: path, source: screenSource(path) }]
    })

  const sources = everySource(GROUP)

  it("finds the lane to sweep, so an empty sweep cannot pass as clean", () => {
    expect(sources.length).toBeGreaterThan(40)
    expect(NAMED.length).toBeGreaterThan(2)
  })

  it.each(NAMED.map((screen) => [screen.route, screen.name]))(
    "is written once for %s",
    (_route, name) => {
      const copies = sources
        .filter((entry) => entry.source.includes(name))
        .map((entry) => entry.file.slice(GROUP.length + 1))

      expect(copies).toEqual([])
    }
  )

  /**
   * The other end of the same rule: the name a screen used to have.
   *
   * A rename that only adds the new name leaves the old one wherever nobody
   * grepped. `_lib/waiting.ts` read "What was asked for stays in Activity" at
   * the moment a person decides whether to throw a change away — a sixth
   * wording, found by looking at a screenshot after four tests about naming had
   * already been written and passed.
   *
   * Bounded by letters on both sides, which is what lets `ActivityPage` and
   * `/portal/activity` stay exactly as they are. A symbol is a symbol and a
   * route is an address; neither is something a reader is shown.
   */
  it.each(
    NAMED.flatMap((screen) => screen.formerly.map((was) => [`${screen.route} — ${was}`, was]))
  )("no longer calls anything %s", (_label, was) => {
    const pattern = new RegExp(`(?<![A-Za-z])${was}(?![A-Za-z])`, "u")
    const left = sources
      .filter((entry) => pattern.test(entry.source))
      .map((entry) => entry.file.slice(GROUP.length + 1))

    expect(left).toEqual([])
  })

  /**
   * Guards the guard. If the sweep read nothing, or the names were compared
   * against sources they can never appear in, every case above would pass over
   * an empty list — so one string that is definitely in this lane has to be
   * found by exactly the same search.
   */
  it("detects a literal that is in the lane", () => {
    const found = sources.filter((entry) => entry.source.includes("TechnicalDetail"))

    expect(found.length).toBeGreaterThan(5)
  })
})

describe("what every screen owes a reader", () => {
  /**
   * The defect this rule was written for cost a screenshot to find and no test
   * could have caught it: `lg:flex-row-reverse` reads correctly at 1280px and,
   * at 390px where the row is not a row, puts an address book before the thing
   * it addresses. Focus order follows the source too, so the same reversal
   * costs a keyboard user at every width.
   *
   * Three screens pinned this separately. It is pinned over the whole lane
   * here, components included — a component can reverse a row as easily as a
   * page, and none of the three per-screen copies could see one that did.
   */
  it.each(sourcesUnder(GROUP).map((entry) => [entry.file.slice(GROUP.length + 1), entry.source]))(
    "%s never reverses a row or a column to place something",
    (_name, source) => {
      expect(source).not.toContain("flex-row-reverse")
      expect(source).not.toContain("flex-col-reverse")
    }
  )

  /**
   * The governing principle, made mechanical: **plain language is the default
   * and the technical record is one click away.** A screen that opens a
   * `<TechnicalDetail>` before it has said what a reader is looking at has
   * inverted it, and no component test can see the inversion because every one
   * of them renders the disclosure on its own.
   */
  it.each(rendered.map((screen) => [screen.route, screen.source]))(
    "%s names its subject before it opens the technical record",
    (_route, source) => {
      const disclosure = source.indexOf("<TechnicalDetail")

      if (disclosure === -1) return

      const heading = source.indexOf("<h1")

      expect(heading).toBeGreaterThan(-1)
      expect(heading).toBeLessThan(disclosure)
    }
  )

  /**
   * **The record is never as loud as the sentence it sits under.**
   *
   * The other half of the same principle, and the half a reading-order check
   * cannot see: a disclosure can be in the right place on the page and still
   * be rendered darker than the plain sentence above it, which is the
   * hierarchy inverted for anybody who reads a screen before they read it word
   * by word. `/portal/sign-ins` shipped exactly that, and the screen fixed it
   * by muting its own contents by hand — a fix that works on one screen and
   * teaches the next twenty nothing.
   *
   * `TechnicalDetail` sets the altitude now, so what is left to guard is a
   * screen raising it again. The bare `text-ink` utility is the body ink — the
   * altitude of a plain sentence — and inside a disclosure it is always the
   * record out-shouting the thing it is a footnote to. Two `<pre>` blocks on
   * `/portal/pieces` had it when this rule was written.
   *
   * Bounded on the right so `text-ink-muted`, `text-ink-secondary` and
   * `text-ink-placeholder` are untouched: those are the record's own steps and
   * every one of them is quieter than a sentence.
   */
  const disclosures = sourcesUnder(GROUP).flatMap((entry) =>
    [...entry.source.matchAll(/<TechnicalDetail[\s\S]*?<\/TechnicalDetail>/gu)].map(
      (match, index) =>
        [`${entry.file.slice(GROUP.length + 1)} #${index + 1}`, match[0]] as const
    )
  )

  it("finds the disclosures this lane writes, so an empty sweep cannot pass as clean", () => {
    expect(disclosures.length).toBeGreaterThan(20)
  })

  it.each(disclosures.map(([label, block]) => [label, block]))(
    "%s keeps the record quieter than a plain sentence",
    (_label, block) => {
      expect(block).not.toMatch(/text-ink(?![a-z-])/u)
    }
  )
})

/**
 * Sentence case, over the whole lane.
 *
 * A heading is the largest text on a screen and the first thing read, so a lower
 * case one is the loudest possible signal about which voice the surface is
 * written in. `something here failed` was the portal's error screen until this
 * run — the one screen where a person is already deciding whether this software
 * is looked after.
 *
 * Headings whose text is an interpolation are skipped by the case rule rather
 * than exempted from every rule: a heading that renders a value cannot be case
 * checked from the source, and the rule below is the one that applies to it.
 */
describe("every heading a reader meets", () => {
  const allHeadings = sourcesUnder(GROUP).flatMap((entry) =>
    [...entry.source.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gu)]
      .map((match) => (match[1] ?? "").trim().replace(/\s+/gu, " "))
      .map((text) => [entry.file.slice(GROUP.length + 1), text] as const)
  )

  const headings = allHeadings.filter(([, text]) => !text.startsWith("{"))

  it("finds the headings this lane writes", () => {
    expect(headings.length).toBeGreaterThan(8)
  })

  it.each(headings.map(([file, text]) => [`${file} — ${text}`, text]))(
    "starts %s with a capital",
    (_label, text) => {
      expect(text.slice(0, 1)).toBe(text.slice(0, 1).toUpperCase())
    }
  )

  /**
   * **A heading is never a machine identifier.**
   *
   * `/portal/pages/[treeId]` was headed `<h1>{treeId}</h1>` — `t_seed1`, the
   * largest text on the busiest screen in the portal — for as long as the screen
   * existed. It was filed as a finding by the run that added the rule above,
   * because a heading that is *only* a name is a different problem from a
   * heading in the wrong case, and it is the problem this rule closes.
   *
   * The check is on the expression rather than on what it evaluates to, which is
   * all a source read can see: a heading may not interpolate anything whose name
   * says it is a tree id. That is exactly why `_lib/page-name.ts` hands screens a
   * `PageName` whose readable half is `name` — the words a person reads and the
   * identifier they quote are two fields, so a screen cannot reach for the wrong
   * one by accident, and a rewrite that put the id back in the heading has to
   * type the word to do it.
   */
  const interpolated = allHeadings.filter(([, text]) => text.startsWith("{"))

  it("finds the headings that render a value rather than a literal", () => {
    expect(interpolated.length).toBeGreaterThan(0)
  })

  it.each(interpolated.map(([file, text]) => [`${file} — ${text}`, text]))(
    "does not head %s with an identifier",
    (_label, text) => {
      expect(text.toLowerCase()).not.toContain("treeid")
    }
  )
})

describe("every plain sentence a reader meets", () => {
  /**
   * **A `PlainLine` reaches a reader through `PlainSentence`, and nowhere else.**
   *
   * `PlainSentence` was written on 29 August for a reason it did not manage to
   * enforce: a sentence held as three pieces can be perfectly assembled and
   * still rendered with a piece dropped, and no `readingOf` test can see that.
   * Three components went on spreading a line by hand anyway — the revision row,
   * the reversal note and the proposal effect — for a fortnight, each with its
   * own `<span className="font-mono">` around the subject.
   *
   * That stopped being cosmetic when a subject stopped always being an
   * identifier. A named part is *words and an id*, and every one of those
   * hand-written spans would have set the words in monospace along with the id
   * — which undoes the naming, because a reader skims monospace as machinery
   * and skips it. Widening `PlainLine["subject"]` broke all three at compile
   * time. This rule is for the failure a type cannot reach: the next component,
   * written by hand, that happens to get it right on the day it is written.
   *
   * The shape rather than the field name, because `before` and `after` are not
   * `PlainLine`'s alone — `ValueChange` on `/portal/pages` uses the same two
   * words for the value a change wrote over and the one it wrote. What is
   * unmistakable is the spread itself: the sentence's opening, then its subject
   * in a span of the component's own making.
   */
  const HAND_SPREAD = /\{[A-Za-z.]*\.before\}\s*<[^>]*>\s*\{[A-Za-z.]*\.subject\}/u

  /**
   * The detector, checked against a line written the old way.
   *
   * A guard that has quietly stopped matching passes for ever and reports
   * nothing, which is worse than one that fails — this lane disarmed a demo
   * guard exactly that way on 8 September by renaming the thing it looked for.
   * So the pattern is proved on the markup it was written to catch before it is
   * trusted on the markup it finds.
   */
  it("recognises a line spread by hand", () => {
    expect(
      HAND_SPREAD.test('{line.before}<span className="font-mono">{line.subject}</span>{line.after}')
    ).toBe(true)
  })

  it("does not mistake a value that merely has a before for a sentence", () => {
    expect(HAND_SPREAD.test('{change.before === null ? <Absent /> : <span>{change.before}</span>}')).toBe(
      false
    )
  })

  const byHand = sourcesUnder(GROUP)
    .filter((entry) => HAND_SPREAD.test(entry.source))
    .map((entry) => entry.file.slice(GROUP.length + 1))

  it("finds no component in the lane rendering a sentence by hand", () => {
    expect(byHand).toEqual([])
  })
})

/**
 * **The governing principle, over the whole lane.**
 *
 * > Plain language is the default. The technical record is one click away.
 * > Nothing is ever removed.
 *
 * This is the one rule in this file that is not new to the portal and *was* new
 * to this file. It has been enforced since 11 September by `runtimeWordsIn` —
 * on the morning this was written, 45 assertions across 16 test files, each one
 * put there by somebody who remembered to put it there, which is the
 * arrangement the rest of this file exists to replace.
 *
 * What that cost, measured on the run that added this: **four leaks in files
 * nobody had written one for.** `reversal-note.tsx` said *"wipe out what
 * revision 4 did"* on the surface of `/portal/history`; `reversal.ts` said
 * *"only goes back as far as revision 9"*; the history screen's empty state
 * said *revision 0*; and `/portal/trust`'s failure notice said it *"reads the
 * log"*. Every one of them is a screen a person meets, and every one of them
 * was in a file whose tests were about something else.
 *
 * Two further facts about the sweep are in `_test/surface-text.ts`, and they
 * are the reason it parses rather than greps: a regex over this lane reports
 * type arguments as sentences, and misses a sentence broken across an
 * expression — which is the exact shape of the `reversal-note.tsx` leak.
 *
 * The record is not swept. A `<TechnicalDetail>` subtree is *supposed* to say
 * `revision` and `delta` and `fold`; several tests assert that it does, and one
 * that did not would be the disclosure failing to be a disclosure.
 */
describe("the words a reader meets before they have asked for any", () => {
  const surface = sourcesUnder(GROUP).flatMap((entry) =>
    surfaceTextIn(entry.file, entry.file.slice(GROUP.length + 1))
  )

  it("finds the sentences this lane renders, so an empty sweep cannot pass as clean", () => {
    expect(surface.length).toBeGreaterThan(200)
  })

  /**
   * Guards the guard, from both ends. The extractor has to see a plain sentence
   * on the surface and has to *not* see the one under a disclosure — a sweep
   * that skipped everything would report a clean lane for ever.
   */
  it("reads the surface and skips the record", () => {
    const said = surface.map((entry) => entry.text)

    expect(said).toContain("Jump to a version")
    expect(said.some((text) => text.includes("What the record says"))).toBe(false)
  })

  it.each(surface.map((entry) => [entry.where, entry.text]))(
    "%s says it without the runtime's vocabulary",
    (_where, text) => {
      expect(runtimeWordsIn(text), text).toEqual([])
    }
  )
})
