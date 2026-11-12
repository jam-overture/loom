/**
 * What the top bar's search finds: the portal's own screens and the things
 * they let a person do, by the plain words a person would type for them.
 *
 * The maintainer decided its subject on 11 November: *"I would like it to be
 * intuitive. I think largely it should be for searching for portal features.
 * Not necessarily data."* So this is an index written by hand, not a read: a
 * reader's events, a page or a change are found with each screen's own *Find*,
 * and nothing here asks the store anything.
 */

/** Whether a feature lives in one project, or in the portal around them. */
export type FeatureScope = "portal" | "project"

export type Feature = {
  /** What the place is called where it is drawn: its heading, word for word. */
  readonly name: string
  /** The screen it is on, where that is not the feature itself. */
  readonly on?: string
  /** One sentence on what a person does there. */
  readonly does: string
  /** Other words a person might type for it. */
  readonly words: readonly string[]
  readonly scope: FeatureScope
  /** The rest of the address after `/portal`, or after `/portal/<project>`. */
  readonly path: string
}

/**
 * Every screen and feature, in the order a project's rail lists them, then the
 * portal's own. That order breaks a tie between two equally good answers, so the
 * screen a person works in comes before the one that sets it up.
 *
 * A section a screen draws only sometimes (*Whether your site takes its live
 * pages* on *Connect your site*, whose heading says what it found) is reached by
 * its screen's words rather than by a name it may not be showing.
 */
export const FEATURES: readonly Feature[] = [
  {
    name: "Signals",
    does: "What readers do on your pages, as it arrives.",
    words: ["readers", "traffic", "analytics", "visits", "views", "clicks", "arriving", "stats"],
    scope: "project",
    path: "/signals",
  },
  {
    name: "Events",
    on: "Signals",
    does: "Each thing a reader did, newest first, kept for 30 days, with a live view.",
    words: ["event", "signal", "click", "press", "form", "live", "stream", "log", "raw"],
    scope: "project",
    path: "/signals",
  },
  {
    name: "By page",
    on: "Signals",
    does: "How each page is doing: what readers did on it, its goals and where they stopped reading.",
    words: ["per page", "page views", "scroll", "stopped", "drop off", "reached", "parts"],
    scope: "project",
    path: "/signals/pages",
  },
  {
    name: "For review",
    does: "Changes Loom proposes to your pages, waiting for you to accept or turn down.",
    words: [
      "proposals",
      "proposed",
      "suggestions",
      "changes",
      "approve",
      "accept",
      "reject",
      "queue",
      "waiting",
      "ai",
    ],
    scope: "project",
    path: "/review",
  },
  {
    name: "Accepted",
    on: "For review",
    does: "Changes you accepted, followed from Accept to live to whether they helped.",
    words: ["live", "shipped", "result", "verdict", "helped", "hurt", "timeline", "approved"],
    scope: "project",
    path: "/review/accepted",
  },
  {
    name: "Turned down",
    on: "For review",
    does: "Changes you turned down in the last 30 days, which Loom weighs before proposing again.",
    words: ["rejected", "declined", "refused", "dismissed"],
    scope: "project",
    path: "/review/turned-down",
  },
  {
    name: "Pages",
    does: "Every page your site has published, each with its versions and whether a change helped.",
    words: [
      "published",
      "versions",
      "page history",
      "before and after",
      "compare",
      "revert",
      "undo",
      "outline",
    ],
    scope: "project",
    path: "/pages",
  },
  {
    name: "Goals",
    does: "What you want readers to do, and how often they do it.",
    words: ["outcome", "conversion", "target", "metric", "kpi", "rate", "primary", "success"],
    scope: "project",
    path: "/goals",
  },
  {
    name: "New goal",
    on: "Goals",
    does: "Pick something readers do on a part of your pages for Loom to aim at.",
    words: ["add goal", "create goal", "set goal", "track"],
    scope: "project",
    path: "/goals?goal=new",
  },
  {
    name: "Segments",
    does: "Groups of readers your site sorts its readers into, and the rules that sort them.",
    words: ["audience", "group", "cohort", "device", "mobile", "returning", "rules", "targeting"],
    scope: "project",
    path: "/segments",
  },
  {
    name: "New segment",
    on: "Segments",
    does: "Name a group of readers and the conditions that put a reader in it.",
    words: ["add segment", "create segment", "new audience"],
    scope: "project",
    path: "/segments?segment=new",
  },
  {
    name: "Connect your site",
    does: "Everything your site needs to send readers' signals and take Loom's changes.",
    words: [
      "install",
      "setup",
      "set up",
      "integrate",
      "connect",
      "pull",
      "live pages",
      "onboarding",
    ],
    scope: "project",
    path: "/connect",
  },
  {
    name: "Paste this into your site",
    on: "Connect your site",
    does: "The snippet that watches what readers do and sends it to Loom.",
    words: ["snippet", "script", "code", "embed", "tag", "install"],
    scope: "project",
    path: "/connect#snippet",
  },
  {
    name: "The key",
    on: "Connect your site",
    does: "The project's public key, which your pages send with what readers do.",
    words: ["public key", "project key", "new key", "rotate"],
    scope: "project",
    path: "/connect#key",
  },
  {
    name: "Publish your pages",
    on: "Connect your site",
    does: "The command your build runs to send Loom your pages, and the secret key it needs.",
    words: ["publish key", "deploy", "build", "upload", "snapshot", "command"],
    scope: "project",
    path: "/connect#publish",
  },
  {
    name: "Settings",
    does: "The project's name, the address signals come from, the model key and closing it.",
    words: ["rename", "name", "address", "host", "domain", "configure", "preferences", "options"],
    scope: "project",
    path: "/settings",
  },
  {
    name: "Model key",
    on: "Settings",
    does: "The Anthropic key Loom proposes changes with, billed to you.",
    words: ["anthropic", "api key", "claude", "ai", "model", "billing", "llm"],
    scope: "project",
    path: "/settings#model-key",
  },
  {
    name: "Close this project",
    on: "Settings",
    does: "An owner closes the project, or reopens one that is closed.",
    words: ["delete", "remove", "archive", "reopen", "shut down"],
    scope: "project",
    path: "/settings#closing",
  },
  {
    name: "Projects",
    does: "Every project you belong to, and the ones that are closed.",
    words: ["workspace", "home", "switch project", "all projects", "list"],
    scope: "portal",
    path: "",
  },
  {
    name: "New project",
    does: "Start a project for one site.",
    words: ["create project", "add project", "add site", "new site", "start"],
    scope: "portal",
    path: "/new",
  },
  {
    name: "Is anybody trying to get in?",
    does: "Who has been turned away at sign-in lately.",
    words: ["sign-ins", "sign in", "login", "locked out", "turned away", "security", "attempts"],
    scope: "portal",
    path: "/sign-ins",
  },
]

/**
 * Where a feature is, for the project in the address, or `undefined` for a
 * project's feature while no project is open: there is no project to take a
 * person to, and guessing one would be a screen they did not ask for.
 */
export const featureHref = (feature: Feature, projectId: string | undefined): string | undefined =>
  feature.scope === "portal"
    ? `/portal${feature.path}`
    : projectId === undefined
      ? undefined
      : `/portal/${projectId}${feature.path}`

/** Words that say how a person asks rather than what they ask for. */
const ASKING = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "does",
  "find",
  "for",
  "go",
  "how",
  "i",
  "in",
  "is",
  "me",
  "my",
  "of",
  "on",
  "our",
  "the",
  "to",
  "what",
  "where",
  "which",
  "your",
])

/**
 * One word as it is compared: lower case, accents and a plural *s* gone, so
 * *Goals*, *goal* and *GOÄLS* are one word and *press* is not *pres*.
 */
const stem = (word: string): string =>
  word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word

/** The words in some text, as they are compared. */
export const wordsOf = (text: string): readonly string[] =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "")
    .map(stem)

/** The words of a query a person typed, without the ones that only make it a question. */
export const queryWordsOf = (query: string): readonly string[] =>
  wordsOf(query).filter((word) => !ASKING.has(word))

/**
 * How strongly each place a word can be found counts. A word in a feature's
 * name is what the person called it; a word they might type for it is nearly
 * as good; the screen it is on and what it does are context.
 */
const WEIGHTS = { name: 8, words: 4, on: 2, does: 1 } as const

type Field = keyof typeof WEIGHTS

const fieldsOf = (feature: Feature): Readonly<Record<Field, readonly string[]>> => ({
  name: wordsOf(feature.name),
  words: wordsOf(feature.words.join(" ")),
  on: wordsOf(feature.on ?? ""),
  does: wordsOf(feature.does),
})

/** How well one typed word is found in a feature: its best place, or 0 where it is in none. */
const wordScore = (fields: Readonly<Record<Field, readonly string[]>>, typed: string): number =>
  Math.max(
    0,
    ...(Object.keys(WEIGHTS) as readonly Field[]).map((field) =>
      fields[field].some((word) => word.startsWith(typed)) ? WEIGHTS[field] : 0
    )
  )

/**
 * How well a feature answers the words typed, or 0 where any typed word is in
 * none of its places: every word a person types narrows, as in each screen's
 * own *Find*. A name typed out whole outranks one that only begins with it.
 */
const featureScore = (feature: Feature, typed: readonly string[]): number => {
  const fields = fieldsOf(feature)
  const scores = typed.map((word) => wordScore(fields, word))

  if (scores.some((score) => score === 0)) return 0

  const whole = fields.name.join(" ") === typed.join(" ") ? WEIGHTS.name : 0

  return scores.reduce((sum, score) => sum + score, whole)
}

/** At most this many answers: a list a person reads at a glance, not a page of them. */
export const MOST_FOUND = 6

/**
 * Every feature that answers a query, best first, ties in the index's own order.
 * Nothing typed (or only asking words) finds nothing, rather than everything.
 */
export const findFeatures = (
  query: string,
  features: readonly Feature[] = FEATURES
): readonly Feature[] => {
  const typed = queryWordsOf(query)

  if (typed.length === 0) return []

  return [
    ...features
      .map((feature, order) => ({ feature, order, score: featureScore(feature, typed) }))
      .filter(({ score }) => score > 0),
  ]
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ feature }) => feature)
}

/** One answer the search draws: a feature and where it takes a person. */
export type Found = {
  readonly feature: Feature
  readonly href: string
}

export type SearchAnswer = {
  /** What can be opened from here, best first, at most `MOST_FOUND`. */
  readonly found: readonly Found[]
  /** How many more answered but belong to a project, while none is open. */
  readonly inAProject: number
}

/**
 * The search's answer for a query, from where a person is. In a project every
 * feature is a place to go; outside one, a project's features are counted
 * rather than drawn, so the person is told to open a project instead of being
 * shown a link that has nowhere to go.
 */
export const searchAnswer = (query: string, projectId: string | undefined): SearchAnswer => {
  const answering = findFeatures(query)
  const found = answering.flatMap((feature) => {
    const href = featureHref(feature, projectId)

    return href === undefined ? [] : [{ feature, href }]
  })

  return { found: found.slice(0, MOST_FOUND), inAProject: answering.length - found.length }
}

/**
 * The answer a key moves to among `count` answers, from the one marked now
 * (`undefined` for none): down from none is the first, up from none the last,
 * and either end wraps round.
 */
export const movedTo = (
  marked: number | undefined,
  count: number,
  direction: "up" | "down"
): number | undefined => {
  if (count === 0) return undefined
  if (marked === undefined) return direction === "down" ? 0 : count - 1

  return (marked + (direction === "down" ? 1 : count - 1)) % count
}
