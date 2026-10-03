import { PALETTE_SLOTS, STARTER_PALETTES } from "@jam-overture/loom"
import { STARTER_COMPOSITIONS, STARTER_PRIMITIVES } from "@jam-overture/loom/primitives"

import { bandNodesIn } from "./compositions"
import { policyKnobs } from "./policy/knobs"

/**
 * Every number this site states about how big Loom is, read off Loom.
 *
 * **The plain version.** Some sentences on this site are claims about a size —
 * *how many primitives the starter library has*, *how many colors a palette
 * names*, *how many settings a policy has*. Each of those is a number, and a
 * number typed into a sentence is right on the day it is typed and wrong the
 * week after somebody adds one. Nothing breaks when it goes wrong. The page
 * still renders, every test still passes, and a reader is quietly told
 * something untrue.
 *
 * That is not hypothetical. The installation page — the first page of the one
 * path this site exists to get somebody down — said **ninety-eight
 * primitives** while the library had ninety-nine, and had said it for as long
 * as it took somebody to add the ninety-ninth.
 *
 * So each one is registered here instead. The value is read from the thing it
 * counts, a component puts it on the page, and `counts.test.ts` sweeps
 * **everything this route group wrote for a reader to read** — the pages, the
 * titles and summaries in the rail, and every example's title, caption and
 * words — for a number standing in front of one of these nouns.
 *
 * Widening it past the pages found the second stale one: the rail's summary for
 * *What AI may change* promised **thirteen settings** where the page beside it
 * said fourteen. A sweep over page sources would never have looked at it. The ban
 * is on the *shape* rather than on today's value: `ninety-eight primitives` is
 * red, and so is `ninety-nine primitives`, because a correct number typed by
 * hand is the same defect one week earlier.
 *
 * **This was already solved on one page.** `compositions.test.ts` holds
 * *Starting from a band* to exactly this rule, and its note says why:
 * *"a page that typed one would be the one kind of staleness nothing on this
 * site can see, because prose does not fail."* It was right, and it was scoped
 * to the page the author was looking at. The defect was on three others. This
 * module is that rule with the scope taken off it; the page-level check stays
 * where it is, because for that page it is the stronger of the two.
 *
 * **What this cannot see.** A sentence a *component* writes is not swept — the
 * arrival route's promises and the architecture map's paragraphs live in TSX
 * and are reached by rendering rather than by reading, which is a different
 * instrument. A doc comment is not swept — the comment above
 * `bandCount` says *"Forty-four today"* on purpose, and a module's own notes
 * are allowed to be of their day. Neither is a number whose noun is somewhere
 * else in the sentence: *"your brand plus twenty-one others"* names no
 * vocabulary and no regular expression over one page will find it. Both are
 * stated rather than guarded, and the second is filed.
 */

/** A number the site states about Loom, and where it is allowed to appear. */
export type SiteCount = {
  readonly id: string
  /** The number itself, read from the thing it counts and never written here. */
  readonly value: number
  /**
   * The words a reader would put after the number.
   *
   * This is what the sweep searches for, so it is the reader's word rather than
   * the runtime's identifier: a page says *settings*, never `GatePolicy` keys.
   */
  readonly nouns: readonly string[]
  /** One sentence: what is being counted, for a reader of this file. */
  readonly of: string
  /** Where the number comes from, so a reader can go and look. */
  readonly from: string
  /**
   * How a page asks for it, as far as the props it chooses.
   *
   * A prefix rather than the whole element, because whether a sentence wants
   * the digit or the word is the author's call and not this file's. The sweep's
   * other half is that the page claiming a count **asks for it** — a page that
   * renders nothing and types nothing has lost the sentence, which is a
   * different failure from typing the number and would not be caught by
   * refusing numbers.
   */
  readonly rendered: string
  /** The written pages that state it. Each must render it rather than type it. */
  readonly claimedOn: readonly { readonly section: string; readonly page: string }[]
}

/**
 * The counts, each read from its own source of truth.
 *
 * `as const` rather than a plain annotation, because the component that renders
 * these takes an id and a union of the real ids is what makes a typo a
 * compile error rather than a blank space on a page.
 */
export const SITE_COUNTS = [
  {
    id: "starter-primitives",
    rendered: '<Count of="starter-primitives"',
    value: STARTER_PRIMITIVES.length,
    nouns: ["primitives"],
    of: "the primitives the starter library registers",
    from: "STARTER_PRIMITIVES, in @jam-overture/loom-primitives",
    claimedOn: [{ section: "getting-started", page: "installation" }],
  },
  {
    id: "palette-slots",
    rendered: '<Count of="palette-slots"',
    value: PALETTE_SLOTS.length,
    nouns: ["slots"],
    of: "the colors every palette owes",
    from: "PALETTE_SLOTS, in @jam-overture/loom",
    claimedOn: [{ section: "building-with-loom", page: "theming" }],
  },
  {
    id: "starter-palettes",
    rendered: '<Count of="starter-palettes"',
    value: STARTER_PALETTES.length,
    nouns: ["palettes"],
    of: "the palettes registered before a deployment writes one",
    from: "STARTER_PALETTES, in @jam-overture/loom",
    claimedOn: [{ section: "building-with-loom", page: "theming" }],
  },
  {
    id: "policy-settings",
    rendered: '<Count of="policy-settings"',
    value: policyKnobs().length,
    nouns: ["settings", "knobs"],
    of: "the fields a Gate policy has",
    from: "policyKnobs(), which is a Record over keyof GatePolicy",
    claimedOn: [{ section: "building-with-loom", page: "what-ai-may-change" }],
  },
  {
    id: "pricing-band-nodes",
    rendered: '<BandNodes part="pricing"',
    value: bandNodesIn("pricing"),
    nouns: ["nodes"],
    of: "the nodes the library's pricing band builds",
    from: "bandNodesIn(\"pricing\"), which walks the built subtree",
    claimedOn: [{ section: "building-with-loom", page: "starting-from-a-band" }],
  },
  {
    id: "starter-bands",
    rendered: '<BandCount of="bands"',
    value: STARTER_COMPOSITIONS.length,
    nouns: ["bands"],
    of: "the ready-made sections of a page the library can build",
    from: "STARTER_COMPOSITIONS, in @jam-overture/loom-primitives",
    claimedOn: [{ section: "building-with-loom", page: "starting-from-a-band" }],
  },
] as const satisfies readonly SiteCount[]

export type SiteCountId = (typeof SITE_COUNTS)[number]["id"]

export const siteCount = (id: SiteCountId): SiteCount => {
  const found = SITE_COUNTS.find((candidate) => candidate.id === id)

  /**
   * Unreachable while the id is the union above, and thrown rather than
   * defaulted because the alternative is a sentence on a page reading *"the
   * primitives"* with the number silently missing.
   */
  if (found === undefined) throw new Error(`loom: there is no site count called ${id}`)

  return found
}

/**
 * A sentence a page is allowed to keep, because its number is not one of these.
 *
 * Every noun above is an ordinary English word, so a ban on *a number in front
 * of it* will reach sentences that are about something else entirely. Two of
 * them are on this site today and neither is a defect: one is a quantity a
 * reader might choose, the other is a different meaning of the same word. Both
 * are let through **by name, with the reason written down**, and the test holds
 * the phrase to still being on the page — so a sentence rewritten loses its
 * exemption rather than inheriting one.
 */
export type CountExemption = {
  readonly section: string
  readonly page: string
  /** The phrase, exactly as the page writes it. */
  readonly phrase: string
  /** Why it is not a claim about the size of anything. */
  readonly because: string
}

export const COUNT_EXEMPTIONS: readonly CountExemption[] = [
  {
    section: "the-runtime",
    page: "connecting-a-model",
    phrase: "twenty primitives",
    because:
      "A quantity a reader might add to their own registry, in a sentence about what registering more would cost. It is not a count of anything that exists, and it would not become wrong if the library grew.",
  },
  {
    section: "the-runtime",
    page: "what-the-gate-decides",
    phrase: "twelve nodes",
    because:
      "An illustration of scale in a sentence about how stakes are measured — removing twelve nodes against removing one. It names no band and no library, and nothing about it becomes untrue when a band grows.",
  },
  {
    section: "the-runtime",
    page: "what-every-ask-leaves-behind",
    phrase: "ten bands",
    because:
      "A confidence band is a bucket of proposals that claimed roughly the same number, not a band of a page. The word collides and the subject does not.",
  },
]

/**
 * The number words a page could write instead of a digit.
 *
 * Both spellings have to be refused or the rule is a rule about digits: the
 * stale sentence this module was written for said **ninety-eight**, not 98.
 * Only ten and up — a single digit turns up as a heading level, a prop and a
 * confidence of `1`, and a check that flagged those is a check people work
 * around. That line is `compositions.test.ts`' and the reason is its.
 */
const TENS = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
const TEENS = [
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
]
const UNITS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]

const NUMBER = [
  ...TEENS,
  ...TENS.map((ten) => `${ten}(?:-(?:${UNITS.join("|")}))?`),
  /** Past a hundred, which the library is one short of. */
  `(?:a|one|two|three|four|five|six|seven|eight|nine)\\s+hundred(?:\\s+and\\s+[a-z]+(?:-[a-z]+)?)?`,
  /** Any digit run of two or more. */
  "[1-9][0-9]+",
].join("|")

/**
 * The words a page may put between the number and the noun.
 *
 * *"seventeen named slots"* and *"ninety-eight registered primitives"* are the
 * same sentence as the bare pair, so a rule that only matched the pair would be
 * one adjective away from being passed by accident.
 */
const BETWEEN = "(?:more|other|named|registered|starter|remaining|different|separate|distinct|own|of|the|its)"

/** A number standing in front of one of the nouns a count owns. */
export const countPhrasePattern = (nouns: readonly string[]): RegExp =>
  new RegExp(`\\b(?:${NUMBER})\\b(?:\\s+${BETWEEN}\\b)*\\s+(?:${nouns.join("|")})\\b`, "gi")

/**
 * A number, spelled the way prose spells it.
 *
 * **Why this exists at all.** The first version of this module rendered the
 * digit, and `theming-claims.test.ts` had already written down the objection:
 * its note calls spelling a figure in words *"the cheapest way to let a page
 * speak in words rather than in components without becoming the copy that
 * rots"*. It was right about the voice and wrong about the price — the way it
 * kept the words was to require the page to type them, which is the lock the
 * 16 September finding is about. A page can have both: the words are a function
 * of the number, so the number can be read off the runtime and still arrive on
 * the page as *fourteen*.
 *
 * It stops at 999 because nothing this site counts is near it, and it throws
 * rather than falling back to the digit: a sentence reading *"the 1004
 * primitives"* in the middle of spelled prose is the kind of thing that ships.
 *
 * This is the **third** speller in this route group — `compositions.test.ts`
 * has one inline and `theming-claims.test.ts` keeps a three-entry lookup. Both
 * of those are tests spelling a number in order to go looking for it in a page;
 * this one is the page's own. Folding them together is a finding rather than a
 * detour, because the two tests would then derive their expectation from the
 * module that produces it.
 */
const spellTwoDigits = (value: number): string => {
  if (value < 10) return UNITS[value - 1] ?? "zero"
  if (value < 20) return TEENS[value - 10] ?? ""

  const ten = TENS[Math.floor(value / 10) - 2] ?? ""
  const unit = value % 10

  return unit === 0 ? ten : `${ten}-${UNITS[unit - 1] ?? ""}`
}

export const spellOut = (value: number, as: "word" | "Word" = "word"): string => {
  if (!Number.isInteger(value) || value < 0 || value > 999) {
    throw new Error(`loom: ${value} is not a number this site knows how to spell`)
  }

  const word =
    value === 0
      ? "zero"
      : value < 100
        ? spellTwoDigits(value)
        : (() => {
            const hundreds = `${UNITS[Math.floor(value / 100) - 1] ?? ""} hundred`
            const rest = value % 100

            return rest === 0 ? hundreds : `${hundreds} and ${spellTwoDigits(rest)}`
          })()

  /** `"Word"` for a sentence that opens on it, which a caption usually does. */
  return as === "Word" ? `${word.slice(0, 1).toUpperCase()}${word.slice(1)}` : word
}
