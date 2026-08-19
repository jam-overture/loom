/**
 * The two kinds of words on this site, kept apart on purpose.
 *
 * **Facts** are claims about the repository that a test checks against the
 * repository. A marketing page that says "37 primitives" is worth nothing if
 * the number is a guess someone typed, and worth a great deal if it cannot be
 * wrong — so the numbers here are held against the registry and the decisions
 * directory rather than against a memory of them.
 *
 * **Placeholders** are the sentences that are not engineering's to write.
 * Positioning, audience, pricing and licensing are the maintainer's; where the
 * page needed a shape before it could have an answer, the shape is built and
 * the words are marked — visibly on the page, and here, so that a review can
 * see the whole list at once instead of hunting for it.
 */

/** Checked against the repository by `facts.test.ts`. */
export const FACTS = {
  /** `loom.*.ts` modules in `src/primitives` — one file per registered type. */
  primitives: "41",
  /** Numbered records in `decisions/`, README excluded. */
  decisions: "70",
  /** Delta operations. The whole vocabulary of structural change. */
  operations: "4",
} as const

/**
 * Copy that is waiting on an answer, keyed by where it sits.
 *
 * Every one of these appears verbatim in a page tree, and a test holds the two
 * against each other in both directions: a placeholder that stopped being used
 * is a question that has quietly been answered by deletion, and a placeholder
 * used but unlisted is one nobody will remember to ask about.
 */
export const PLACEHOLDER_COPY = {
  pricingNotice:
    "Placeholder — pricing is not decided. The band below is structure, so that the shape can be reviewed before the numbers exist.",
  tierStarterName: "Tier one",
  tierStarterPrice: "—",
  tierTeamName: "Tier two",
  tierTeamPrice: "—",
  tierEnterpriseName: "Tier three",
  tierEnterprisePrice: "Talk to us",
  licence: "Licensing is not settled, and this line is where it will be stated.",
} as const

export type PlaceholderKey = keyof typeof PLACEHOLDER_COPY

/** The list, for the test and for the report. */
export const PLACEHOLDER_STRINGS: readonly string[] = Object.values(PLACEHOLDER_COPY)
