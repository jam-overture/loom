import {
  ceilingFor,
  dispositionKindSchema,
  dispositionReasonCodeSchema,
  ESCALATION_LADDER,
  intentOriginSchema,
  type ElementNode,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { BECAUSE, NOT_A_RULE, WEIGHT } from "../adapt/record"
import { FRONT_DOOR_POLICY, protectedInPlainWords } from "../adapt/run"
import { RESERVED_VOCABULARY } from "../copy"
import { spellCapitalised } from "../journey"
import { treeFor } from "../render"
import { askHref, DEFAULT_THEME, SITE_THEME_NAMES, THE_RULES } from "../site"
import { uses, wordsOf } from "../words"

import { RULES } from "./the-rules"

/**
 * The page that explains what a rule is, held to the two things that make it
 * worth having.
 *
 * **It has to be complete**, because its claim is *these are all of the
 * questions* and *there is no fourth answer* — a page listing seven of eight rules
 * is worse than a page listing none, since a reader who checks one of the six is
 * given a reason to believe the missing one does not exist.
 *
 * **It has to be true of this deployment**, because the band in the middle
 * prints the rules this site is served under rather than an example of some
 * rules. Every figure in it is asserted against `FRONT_DOOR_POLICY` rather than
 * against the string the page happens to hold, so a policy edited without the
 * page being rebuilt is a failure here rather than a landing page describing a
 * line the site does not hold.
 *
 * The generic suites already cover the rest: `pages.test.ts` holds every route
 * to rendering cleanly, mounting the palette, naming no colour of its own,
 * carrying the chrome and having exactly one first-level heading, and
 * `voice.test.ts` holds every route's opening band to the register. None of that
 * is repeated here — a second copy is a second thing to keep in step, and the
 * copy that drifts is the one nobody is reading.
 */

const ORIGIN = "https://loom.example"

const page = (theme = DEFAULT_THEME): LoomTree =>
  treeFor(THE_RULES, { origin: ORIGIN, theme })

const words = (theme = DEFAULT_THEME): string => wordsOf(page(theme).root)

/**
 * Every address the page holds, off the page rather than off the markup.
 *
 * The rendered HTML escapes the ampersand in a query string, so a check against
 * markup is a check against the escaping as much as against the link. These are
 * the addresses as the page actually carries them.
 */
const hrefs = (theme = DEFAULT_THEME): readonly string[] =>
  [...ofType(page(theme).root, "loom.action"), ...ofType(page(theme).root, "loom.link")].flatMap(
    (element) => (typeof element.props["href"] === "string" ? [element.props["href"]] : [])
  )

const ofType = (node: LoomNode, type: string): readonly ElementNode[] =>
  node.kind === "element" && node.type === type
    ? [node, ...node.children.flatMap((child) => ofType(child, type))]
    : node.kind === "text"
      ? []
      : node.children.flatMap((child) => ofType(child, type))

const propsOf = (type: string, key: string): readonly string[] =>
  ofType(page().root, type).flatMap((element) =>
    typeof element.props[key] === "string" ? [element.props[key]] : []
  )

describe("the questions the page lists", () => {
  /**
   * The assertion this file exists for.
   *
   * The runtime's list of reason codes is every answer its rules can give, and
   * exactly one of them — `within-policy` — is not a rule but the note taken
   * when none of them fired. Everything else is a question this page claims to
   * be showing you.
   *
   * So an eighth rule in `src/runtime/gate.ts` takes **this** lane red, and that
   * is deliberate. It is the same asymmetry the front door's counts were put
   * under on 27 August: a number that moves without changing a claim should need
   * nobody, and a number that moves *because* a claim stopped being true should
   * need the lane that wrote the claim. This page's claim is completeness.
   */
  it("is every reason the rules can give, and nothing else", () => {
    const listed = RULES.map((rule) => rule.code)

    expect([...listed, NOT_A_RULE].sort()).toEqual([...dispositionReasonCodeSchema.options].sort())
  })

  it("names each of them once, so a reader counting them counts right", () => {
    expect(new Set(RULES.map((rule) => rule.code)).size).toBe(RULES.length)
  })

  /**
   * The half of this band that was a promise until 13 September.
   *
   * The whole point of the list is *the first no wins*, which is a claim about
   * precedence — and the order was written out by hand here, because
   * `ESCALATION_RULES` was a module constant in `src/runtime/gate.ts` that
   * nothing outside the runtime could read. This lane filed that on 28 August;
   * #181 exported `ESCALATION_LADDER`, derived from the rules themselves.
   *
   * So the order is checked in two places and they are different checks. This
   * one holds the list; the one below holds the **rendered page**, because a
   * correctly ordered list printed in some other order would pass here and be
   * wrong where a reader is standing.
   */
  it("asks them in the order the Gate asks them", () => {
    expect(RULES.map((rule) => rule.code)).toEqual([...ESCALATION_LADDER])
  })

  it("prints them in that order too, where the reader is", () => {
    const text = words()
    const positions = ESCALATION_LADDER.map((code) => text.indexOf(BECAUSE[code]))

    expect(positions.filter((at) => at < 0)).toEqual([])
    expect([...positions].sort((left, right) => left - right)).toEqual(positions)
  })

  it("tells the reader how many there are, off the list rather than by hand", () => {
    expect(words()).toContain(`${spellCapitalised(RULES.length)} questions, asked in this order`)
  })

  /**
   * The property that makes the page worth writing here rather than anywhere
   * else: the sentence beside each question is the one the front door's panel
   * will print on the day that rule fires, because it is the same string.
   *
   * A page that explained the rules in its own words would be a second
   * description to keep in step with the first, and the two would drift where
   * nobody could see it — a reader never has this page and a live verdict on one
   * screen.
   */
  it.each(RULES)("says of $code exactly what the record will say", (rule) => {
    expect(propsOf("loom.milestone", "body")).toContain(BECAUSE[rule.code])
  })

  it("prints each question as its own step, in the order the list holds", () => {
    expect(propsOf("loom.milestone", "title")).toEqual(RULES.map((rule) => rule.asks))
  })
})

describe("the three answers", () => {
  it("is one per answer the rules can actually return", () => {
    expect(propsOf("loom.feature", "title").length).toBeGreaterThanOrEqual(
      dispositionKindSchema.options.length
    )
  })

  it("promises no fourth", () => {
    expect(words()).toContain("There are three answers, and there is no fourth")
    expect(dispositionKindSchema.options).toHaveLength(3)
  })

  /**
   * The refusal is the answer a reader is least likely to believe, so the page
   * has to say the thing that makes it a floor rather than a strong suggestion —
   * and `run.ts` is where that is true: an approval re-runs the rules, and a
   * refusal comes back refused however emphatically it was approved.
   */
  it("says a refusal cannot be overridden, because it cannot", () => {
    expect(words()).toContain("There is no button that overrides this")
  })
})

describe("the rules this site is published under", () => {
  const shown = (): string => words()

  it("names everything this deployment protects, in the words the site uses", () => {
    for (const protectedThing of protectedInPlainWords()) {
      expect(shown()).toContain(protectedThing)
    }
  })

  /**
   * And nothing it does not protect, which is the half the loop above cannot
   * see.
   *
   * Both the page and the check above read the same list, so dropping something
   * from the policy drops it from both and the page stays "correct" while the
   * claim it makes gets smaller. The failure that matters runs the other way —
   * a page promising to defend something this site would in fact let a machine
   * delete — and only an exact match catches it. Mutation-verified: removing a
   * type from `FRONT_DOOR_POLICY` passes the loop above and fails this.
   */
  it("and claims nothing it does not, which is the direction that could embarrass us", () => {
    const row = ofType(page().root, "loom.table-cell")
      .map((cell) => wordsOf(cell))
      .find((text) => text.includes("a change that destroys either is refused"))

    expect(row).toBe(
      `${protectedInPlainWords().join(", and ")} — a change that destroys either is refused, and saying yes does not help`
    )
  })

  it.each([
    ["how sure it has to be", FRONT_DOOR_POLICY.minimumConfidence],
    ["how unsure is too unsure", FRONT_DOOR_POLICY.confidenceFloor],
  ])("states %s as this deployment set it", (_what, confidence) => {
    expect(shown()).toContain(`${Math.round(confidence * 100)} out of 100`)
  })

  it.each([
    ["a lot comes off", FRONT_DOOR_POLICY.removalThresholds.medium],
    ["a great deal comes off", FRONT_DOOR_POLICY.removalThresholds.high],
    ["a change is broad", FRONT_DOOR_POLICY.breadthThreshold],
  ])("states the point at which %s", (_what, threshold) => {
    expect(shown()).toContain(String(threshold))
  })

  it("states the floor in the one word the site uses for that weight", () => {
    expect(shown()).toContain(`Anything ${WEIGHT[FRONT_DOOR_POLICY.refusalFloor]}`)
  })

  /**
   * Every origin, because the interesting half of a policy is that the same
   * change is weighed differently depending on who wanted it — and a table
   * missing the scheduled one would be missing the row the reader this site is
   * for came to see.
   */
  it.each(intentOriginSchema.options)("says what %s may do before you are asked", (origin) => {
    expect(shown()).toContain(`Anything ${WEIGHT[ceilingFor(FRONT_DOOR_POLICY, origin)]}`)
  })

  it("gives each origin its own row, named in plain words", () => {
    const keys = ofType(page().root, "loom.table-cell").filter(
      (cell) => cell.props["role"] === "row"
    )

    expect(keys.length).toBeGreaterThanOrEqual(intentOriginSchema.options.length)
    for (const key of keys) expect(wordsOf(key).length).toBeGreaterThan(0)
  })
})

describe("the two demonstrations", () => {
  /**
   * Both links are real requests against the published front door, and the page
   * says what each of them will do. The one it calls refused has to be the one
   * the rules refuse, or this page is the only thing on the site making a claim
   * it has not checked.
   *
   * The verdicts themselves are held by `adapt.test.ts` against the served front
   * door in all ten states, so what is asserted here is the address — that this
   * page points at the request whose refusal it describes, rather than at some
   * other one that happens to exist.
   */
  it("points at the request its own words describe as refused", () => {
    expect(hrefs()).toContain(askHref(ORIGIN, { theme: DEFAULT_THEME, ask: "drop-pitch" }))
  })

  it("points at the request its own words describe as held", () => {
    expect(hrefs()).toContain(askHref(ORIGIN, { theme: DEFAULT_THEME, ask: "problem" }))
  })

  it("carries the palette the reader is wearing into both of them", () => {
    for (const theme of SITE_THEME_NAMES) {
      expect(hrefs(theme)).toContain(askHref(ORIGIN, { theme, ask: "drop-pitch" }))
    }
  })
})

/**
 * The register, held to the strictest reading available.
 *
 * The front door may use none of the reserved words and a mechanism page may
 * use one once it has said the same thing plainly first. This page needs
 * neither latitude — it is about a decision a reader makes, not about the
 * machinery that carries it out — so it is held to the front door's rule
 * rather than the mechanism page's, on the whole page rather than on its
 * opening band.
 *
 * That is a promise about what this page is for. The moment it needs one of
 * these words, it has started explaining the implementation instead of the
 * decision, and this test is where that is noticed.
 */
describe("the words on it", () => {
  it.each(RESERVED_VOCABULARY)("never says %s, anywhere on the page", (term) => {
    expect(uses(words(), term)).toBe(false)
  })

  /**
   * Under all three palettes rather than the default one, because the palette
   * is the one thing about this page that changes without anybody editing it —
   * and the footer's switcher writes the names of the other two into the words
   * a reader gets. A register held only on the house palette is a register held
   * on two thirds of what the site actually serves.
   */
  it.each(SITE_THEME_NAMES)("keeps its register wearing the %s palette", (theme) => {
    const said = words(theme)

    expect(RESERVED_VOCABULARY.filter((term) => uses(said, term))).toEqual([])
  })
})
