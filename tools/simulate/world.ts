import type { PageFeatures } from "./page.js"
import type { Persona, World } from "./persona.js"

/**
 * The worlds a simulation runs in (`docs/simulation.md`, *The world and its
 * personas*).
 *
 * **These rules are invented.** They are plausible, not measured, and a model
 * that learns to win here has learned these rules and nothing about people
 * (0384 clause 7). What they are for is that we know them, so the true effect
 * of any change is exact and every verdict can be scored.
 *
 * Two worlds, because a proposer tuned until it wins in one has learned that
 * one. `HELD_OUT_WORLD` keeps the same five kinds of reader with different
 * rules, and nobody looks at its results while changing the proposer.
 */

/** Words a hurried reader will pass before giving up on the goal entirely. */
const HURRIED_PATIENCE_WORDS = 400

/** What each control competing with the goal costs a reader who came for one thing. */
const CLUTTER_COST = 0.15

const clutter = (page: PageFeatures): number => 1 / (1 + CLUTTER_COST * page.controlsBeforeGoal)

const patience = (page: PageFeatures, words: number): number =>
  Math.max(0.2, 1 - page.wordsBeforeGoal / words)

const SEARCHED_FOR = ["framework", "react", "ai", "dynamic"] as const

const saysWhatTheySearched = (page: PageFeatures): boolean =>
  SEARCHED_FOR.some((word) => new RegExp(`\\b${word}\\b`, "u").test(page.topHeadings))

const hurriedPhoneReader: Persona = {
  name: "Hurried phone reader",
  traits: { device: "phone", source: "social", returning: false },
  share: 35,
  weekend: 1.5,
  trend: 0.004,
  stay: 0.45,
  bandMs: 2_500,
  wander: 0.01,
  chance: (page) =>
    (page.goalBand !== undefined && page.goalBand <= 1 ? 0.12 : 0.03) *
    clutter(page) *
    patience(page, HURRIED_PATIENCE_WORDS),
}

const developerComparing: Persona = {
  name: "Developer comparing",
  traits: { device: "desktop", source: "search", returning: false },
  share: 20,
  weekend: 0.6,
  trend: -0.003,
  stay: 0.85,
  bandMs: 9_000,
  wander: 0.05,
  chance: (page) => (page.codeBeforeGoal ? 0.12 : 0.04),
}

const pricingChecker: Persona = {
  name: "Pricing checker",
  traits: { device: "desktop", source: "direct", returning: false },
  share: 15,
  weekend: 1,
  trend: 0,
  stay: 0.7,
  bandMs: 5_000,
  wander: 0.02,
  chance: (page) => (page.priceBeforeGoal ? 0.15 : 0.03),
}

const returningUser: Persona = {
  name: "Returning user",
  traits: { device: "desktop", source: "direct", returning: true },
  share: 15,
  weekend: 0.8,
  trend: 0,
  stay: 0.3,
  bandMs: 1_500,
  wander: 0.01,
  chance: (page) => (page.goalIsSignIn ? (page.goalBand === 0 ? 0.5 : 0.2) : 0.01),
}

const skimmerFromSearch: Persona = {
  name: "Skimmer from search",
  traits: { device: "phone", source: "search", returning: false },
  share: 15,
  weekend: 1,
  trend: 0.002,
  stay: 0.6,
  bandMs: 1_800,
  wander: 0.01,
  chance: (page) => (saysWhatTheySearched(page) ? 0.08 : 0.01) * clutter(page),
}

export const FIRST_WORLD: World = {
  name: "First world",
  personas: [
    hurriedPhoneReader,
    developerComparing,
    pricingChecker,
    returningUser,
    skimmerFromSearch,
  ],
}

/**
 * The same readers, with rules the proposer is never tuned against: words cost
 * more than controls, a phone reader forgives a lower goal, and a developer
 * cares less about code than about a short page.
 */
export const HELD_OUT_WORLD: World = {
  name: "Held-out world",
  personas: [
    {
      ...hurriedPhoneReader,
      stay: 0.55,
      chance: (page) => 0.08 * patience(page, HURRIED_PATIENCE_WORDS / 2),
    },
    {
      ...developerComparing,
      chance: (page) => 0.09 * patience(page, 1_200) * (page.codeBeforeGoal ? 1.3 : 1),
    },
    { ...pricingChecker, chance: (page) => (page.priceBeforeGoal ? 0.1 : 0.05) * clutter(page) },
    returningUser,
    {
      ...skimmerFromSearch,
      stay: 0.5,
      chance: (page) => (saysWhatTheySearched(page) ? 0.06 : 0.02),
    },
  ],
}
