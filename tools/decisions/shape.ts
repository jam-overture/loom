import { everyMemberOf } from "../../src/closed-set.js"

/**
 * The four sections a record has to have, held against the records.
 *
 * `decisions/README.md` states the format and says why the last of the four
 * matters: *"the rejected options are the part a future reader cannot
 * reconstruct."* Nothing looked. `pnpm decisions:index` builds the table from
 * the front matter and `record-claims.test.ts` holds a record's counts against
 * the lists in `src/`; neither reads the body's shape, so a record could ship
 * without the section that carries its reasoning and no run would ever say so.
 *
 * One has. 0081 has had no *Alternatives considered* since 26 August, found by
 * `Loom docs` on 8 September writing a page that walks the section for every
 * record and asking why one came back empty — which is a bad way to find it,
 * because the finder is a page and a page can only notice the day somebody
 * writes one.
 *
 * This is the same class as the numbering clash and belongs in the same place:
 * beside the tool that already reads every record on every run.
 */

export type RequiredSection = "Context" | "Decision" | "Consequences" | "Alternatives considered"

/**
 * In the order `decisions/README.md` gives them, which is the order they are
 * written in and so the order a missing one is reported in.
 */
export const REQUIRED_SECTIONS: readonly RequiredSection[] = everyMemberOf<RequiredSection>()([
  "Context",
  "Decision",
  "Consequences",
  "Alternatives considered",
])

/**
 * The records that may be missing a section, and what each one is owed.
 *
 * An allowlist rather than a softer rule, because the point of the check is that
 * the next record cannot ship without its reasoning — a `note:` everyone learns
 * to scroll past would not do that. 0081 is the whole list. Backfilling it would
 * mean writing down alternatives nobody weighed and presenting them as the ones
 * that were, which is worse than the gap: the section exists so a reader can
 * trust that what it says was actually considered.
 *
 * The exemption is checked in both directions. A record that gains the section
 * it was excused makes its own entry here stale, and a stale exemption is
 * reported — so the list cannot quietly outlive the reason for it.
 */
export const SECTION_EXEMPTIONS: ReadonlyMap<string, readonly RequiredSection[]> = new Map([
  [
    "0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md",
    ["Alternatives considered"] as const,
  ],
])

export type ShapeProblem =
  | { readonly code: "missing-section"; readonly file: string; readonly section: RequiredSection }
  | { readonly code: "needless-exemption"; readonly file: string; readonly section: RequiredSection }

export const describeShapeProblem = (problem: ShapeProblem): string => {
  switch (problem.code) {
    case "missing-section":
      return `${problem.file} has no "## ${problem.section}" section`
    case "needless-exemption":
      return `${problem.file} now has "## ${problem.section}", so its exemption in shape.ts can go`
  }
}

/**
 * Whether a record carries a section.
 *
 * A trailing qualifier counts: 0014 writes `## Decision (proposed)` because it
 * was undecided when it was written, which is the record being honest rather
 * than malformed. Anchored to the start of a line so a section named inside a
 * paragraph is not mistaken for the section itself.
 */
const carries = (content: string, section: RequiredSection): boolean =>
  new RegExp(`^## ${section}\\b`, "m").test(content)

export const checkShape = (
  file: string,
  content: string,
  exemptions: ReadonlyMap<string, readonly RequiredSection[]> = SECTION_EXEMPTIONS
): readonly ShapeProblem[] => {
  const excused = exemptions.get(file) ?? []

  return REQUIRED_SECTIONS.flatMap((section): readonly ShapeProblem[] => {
    if (carries(content, section)) {
      return excused.includes(section) ? [{ code: "needless-exemption", file, section }] : []
    }

    return excused.includes(section) ? [] : [{ code: "missing-section", file, section }]
  })
}
