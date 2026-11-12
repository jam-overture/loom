/**
 * What a pull request body looks like when it comes back from GitHub wrong.
 *
 * ## The defect, as measured rather than as theorised
 *
 * A markdown link posted to GitHub from a routine session can arrive with a run
 * of backticks — and, since 10 November, apostrophes — wrapping its URL. The
 * body GitHub stores holds them: a read through the API returns them in the raw
 * markdown, so whatever inserts them does it before GitHub sees it. Re-posting
 * the same text changes nothing, which is how the round-trip is known to be
 * deterministic rather than flaky.
 *
 * Six entries in `FINDINGS.md` carry it across four lanes and seven weeks; the
 * 23 September entry alone runs a tally to twenty-three read-backs by 6 October. They agree on one thing and disagree on everything
 * else. The agreement is that **URL length moves the outcome**. The
 * disagreement is where the boundary falls: 157 survived and 158 did not on one
 * body; markdown links of 145–147 survived beside one of 151 that did not on a
 * second; 124 survived and 150 did not on a third, in both the forms the first
 * two had used to tell the bands apart. No constant fits all three. The only
 * reading that does is that the limit is the tail of some other budget the
 * whole body spends, and the longest body had the lowest boundary.
 *
 * **So there is no safe length a run can compute in advance**, and five
 * explanations that each lasted one measurement are written into the 23
 * September entry as a graveyard. This module exists because of what is left
 * when they are all dead: the read-back. Post the body, read it back, and look.
 * That check is one call, it is how every one of those measurements exists, and it
 * is the only thing that has ever been reliable.
 *
 * ## What this module is, and what it is not
 *
 * It is the *look* half, written down so it is a command rather than a habit.
 * It is a pure function over the text a read-back returns and it knows nothing
 * about GitHub, the network or a pull request number — `main.ts` fetches
 * nothing either, and takes the body as a file, for the same reason `pnpm weigh`
 * takes one.
 *
 * It is **not** a check over this repository and it is not in `pnpm verify`.
 * The damage happens between a session and GitHub, to text that is never
 * committed; a sweep over `reports/` would answer a question nobody is asking
 * and would open with fifty-two faults of history. `docs/routines.md`, *Posting
 * to GitHub*, is where a run meets this.
 */

/**
 * The characters that have been observed inserted. Backticks in all five
 * instances before 10 November, backticks and apostrophes together in the two
 * since — in runs of two, three and four, growing within a single body.
 *
 * Both are listed rather than the one that started it because the entry that
 * recorded the apostrophes is also the entry that records how a rule naming one
 * spelling of an act stops working the moment somebody reaches for the other.
 */
const INSERTED = "[`']"

/** Where the run sat, relative to the link it ate. */
export type Position = "before-label" | "inside-parens" | "after-link" | "around-bare-url"

export type Mangling = {
  readonly url: string
  /** 1-based, so a message points at a line of the body somebody can find. */
  readonly line: number
  /** The characters that were inserted, exactly as they arrived. */
  readonly run: string
  readonly position: Position
}

const describePosition = (position: Position): string => {
  switch (position) {
    case "before-label":
      return "before the link's opening bracket"
    case "inside-parens":
      return "inside the parentheses, before the URL"
    case "after-link":
      return "after the closing parenthesis"
    case "around-bare-url":
      return "wrapping the bare URL"
  }
}

export const describeMangling = (mangling: Mangling): string =>
  `line ${mangling.line}: ${JSON.stringify(mangling.run)} ${describePosition(mangling.position)} — ${mangling.url}`

/**
 * A markdown link, written to tolerate the runs rather than to reject them.
 *
 * Four capture groups and three of them are the defect. `lead` is a run of one
 * or more, because a URL cannot begin with a backtick or an apostrophe under
 * any spelling — there is no clean body in which `](` is followed by one. The
 * other two are runs of **two** or more: a single backtick against a bracket is
 * an ordinary code span sitting next to an ordinary link, and accusing that
 * would make this a check people learn to ignore.
 *
 * `between` is the emphasis and punctuation the trailing run has been observed
 * behind — ``)**,''`` and ``),``` `` are both recorded. It deliberately matches
 * no whitespace: a code span that starts a word after a link is a different
 * thing from a run welded onto it, and the space is the whole difference.
 */
const LINK = new RegExp(
  String.raw`(?<before>${INSERTED}{2,})?` +
    String.raw`\[[^\]\n]*\]` +
    String.raw`\((?<lead>${INSERTED}+)?(?<url>[^)\s]*)\)` +
    String.raw`(?<between>[*_~,.;:!?]{0,4}(?<trail>${INSERTED}{2,}))?`,
  "g"
)

/**
 * A URL standing on its own, with a run on both sides of it.
 *
 * Both sides are required. A bare URL that merely follows a code span is not
 * this, and the one bare instance on record — 158 characters on #378, alone on
 * its line through three revisions — came back wrapped at both ends.
 */
const WRAPPED_BARE = new RegExp(String.raw`(?<lead>${INSERTED}{2,})(?<url>https?://[^\s\`')]+)(?<trail>${INSERTED}{2,})`, "g")

/**
 * Fenced blocks are skipped, which is the same parsing `tools/findings` does
 * and for the same reason: a body that *reports* this defect quotes it, and the
 * first thing a check like this does if it reads fences is accuse the entry
 * written to describe what it catches.
 */
const unfenced = (body: string): readonly { readonly text: string; readonly line: number }[] => {
  let fenced = false

  return body.split("\n").flatMap((text, index) => {
    if (text.trimStart().startsWith("```")) {
      fenced = !fenced
      return []
    }

    return fenced ? [] : [{ text, line: index + 1 }]
  })
}

/**
 * Every run this body came back carrying, in reading order.
 *
 * A link may be eaten at both ends, and that is two entries rather than one:
 * the runs have been different lengths within a single body, and a reader
 * fixing it by hand wants to see each place.
 */
export const manglingIn = (body: string): readonly Mangling[] => {
  const found: Mangling[] = []

  for (const { text, line } of unfenced(body)) {
    for (const match of text.matchAll(LINK)) {
      const { before, lead, trail, url = "" } = match.groups ?? {}

      if (before !== undefined) found.push({ url, line, run: before, position: "before-label" })
      if (lead !== undefined) found.push({ url, line, run: lead, position: "inside-parens" })
      if (trail !== undefined) found.push({ url, line, run: trail, position: "after-link" })
    }

    for (const match of text.matchAll(WRAPPED_BARE)) {
      const { lead = "", url = "" } = match.groups ?? {}
      found.push({ url, line, run: lead, position: "around-bare-url" })
    }
  }

  return found
}

/**
 * Every URL the body carries, however it is written, so a clean read-back says
 * how much it looked at rather than only that it found nothing.
 *
 * *Nine links, none mangled* and *no links at all* are different facts about a
 * body, and a run that reads only the second one learns nothing about whether
 * the check was pointed at the right text.
 */
const URL_PATTERN = /https?:\/\/[^\s)<>"'`\]]+/g

export const urlsIn = (body: string): readonly string[] =>
  unfenced(body).flatMap(({ text }) => [...text.matchAll(URL_PATTERN)].map((match) => match[0]))
