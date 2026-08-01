/**
 * Who may sign in, and under what name their changes are recorded.
 *
 * The roster is configuration rather than a table, which is the honest shape for
 * what it is: a handful of people with commit-equivalent access to a
 * pre-production alpha. A users table would imply a lifecycle — invitation,
 * recovery, deactivation — that nothing in this portal implements, and an
 * implied lifecycle nobody built is worse than an explicit list.
 *
 * The key is the identity (0027). A reviewer presents a key and the roster says
 * who that is, rather than the reviewer typing a name and proving it separately:
 * a name that can be typed is a name that can be typed by anyone.
 */

import { timingSafeEqual } from "./session"

export type Reviewer = {
  readonly actor: string
  readonly key: string
}

export type RosterProblem =
  | { readonly code: "no-entries" }
  /** Not `actor:key` — the commonest paste error, and it fails closed. */
  | { readonly code: "malformed-entry"; readonly entry: string }
  | { readonly code: "invalid-actor"; readonly actor: string }
  | { readonly code: "weak-key"; readonly actor: string }
  | { readonly code: "duplicate-actor"; readonly actor: string }

/**
 * An actor id is stored in provenance and rendered in the portal, so it is kept
 * to characters that survive both without escaping. An email address fits, which
 * is what a host will reach for first.
 */
const ACTOR_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._@+-]{1,63}$/

/**
 * The key is the whole credential — there is no second factor and no rate
 * limit — so a short one is a configuration mistake, not a preference. 24
 * characters is `openssl rand -hex 16` and above.
 */
export const MINIMUM_KEY_LENGTH = 24

export type RosterResult =
  | { readonly ok: true; readonly value: readonly Reviewer[] }
  | { readonly ok: false; readonly error: RosterProblem }

export const parseRoster = (value: string | undefined): RosterResult => {
  const entries = (value ?? "")
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  if (entries.length === 0) return { ok: false, error: { code: "no-entries" } }

  const reviewers: Reviewer[] = []

  for (const entry of entries) {
    const separator = entry.indexOf(":")
    if (separator <= 0) return { ok: false, error: { code: "malformed-entry", entry } }

    const actor = entry.slice(0, separator).trim()
    const key = entry.slice(separator + 1).trim()

    if (!ACTOR_PATTERN.test(actor)) return { ok: false, error: { code: "invalid-actor", actor } }
    if (key.length < MINIMUM_KEY_LENGTH) return { ok: false, error: { code: "weak-key", actor } }
    if (reviewers.some((reviewer) => reviewer.actor === actor)) {
      return { ok: false, error: { code: "duplicate-actor", actor } }
    }

    reviewers.push({ actor, key })
  }

  return { ok: true, value: reviewers }
}

export const describeRosterProblem = (problem: RosterProblem): string => {
  switch (problem.code) {
    case "no-entries":
      return "LOOM_PORTAL_REVIEWERS is empty, so nobody can sign in."
    case "malformed-entry":
      return `LOOM_PORTAL_REVIEWERS has an entry that is not actor:key — "${problem.entry}".`
    case "invalid-actor":
      return `"${problem.actor}" is not a usable actor id. Use letters, digits, and . _ @ + -`
    case "weak-key":
      return `The key for ${problem.actor} is shorter than ${MINIMUM_KEY_LENGTH} characters. It is the whole credential.`
    case "duplicate-actor":
      return `${problem.actor} appears twice in LOOM_PORTAL_REVIEWERS.`
  }
}

const textEncoder = new TextEncoder()

/**
 * Which reviewer, if any, presented this key.
 *
 * Every entry is compared even after one matches. Stopping early would make the
 * response time a measure of how far down the roster the presented key matched,
 * which for a short list is a usable oracle: a caller could learn the position
 * of a valid key without ever holding one.
 */
export const authenticate = (reviewers: readonly Reviewer[], presented: string): string | null => {
  const presentedBytes = textEncoder.encode(presented)

  return reviewers.reduce<string | null>(
    (matched, reviewer) =>
      timingSafeEqual(textEncoder.encode(reviewer.key), presentedBytes) ? reviewer.actor : matched,
    null
  )
}
