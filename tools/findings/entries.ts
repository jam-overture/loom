/**
 * `FINDINGS.md` read as the thing it actually is: a ledger of entries, each
 * with a routine that filed it, a routine that owns it, and a status.
 *
 * The file is the channel between seven routines, none of which can see the
 * others run. Every one of them appends to the bottom of it, which is why it is
 * the single most conflicted path in the repository — and why the conflicts
 * have been resolved by hand, in a hurry, thirty-odd times.
 *
 * Four entries did not survive that. Two headings for one finding with the
 * first left empty; two `**Status:**` lines with no indication which is
 * current. Nothing failed, because nothing has ever read this file except
 * people. That is the gap: a merge that goes wrong here is invisible until
 * somebody notices a finding says two contradictory things about itself.
 */

export type Entry = {
  readonly title: string
  /** 1-based, so a message points at a line somebody can jump to. */
  readonly line: number
  readonly body: string
}

/**
 * Every `## ` heading and the text under it, preamble excluded.
 *
 * A heading inside a fenced code block is not an entry. Findings quote diffs
 * and command output constantly, so this is a real case rather than a defensive
 * one, and the fence state is the only parsing this needs.
 */
export const entriesIn = (markdown: string): readonly Entry[] => {
  const lines = markdown.split("\n")
  const entries: Entry[] = []
  let fenced = false
  let current: { title: string; line: number; body: string[] } | undefined

  lines.forEach((text, index) => {
    if (text.startsWith("```")) fenced = !fenced

    if (!fenced && text.startsWith("## ")) {
      if (current) entries.push({ title: current.title, line: current.line, body: current.body.join("\n") })
      current = { title: text.slice(3).trim(), line: index + 1, body: [] }
      return
    }

    current?.body.push(text)
  })

  if (current) entries.push({ title: current.title, line: current.line, body: current.body.join("\n") })

  return entries
}

export type EntryFault =
  | { readonly code: "no-status"; readonly title: string; readonly line: number }
  | { readonly code: "no-owner"; readonly title: string; readonly line: number }
  | { readonly code: "no-filer"; readonly title: string; readonly line: number }
  | { readonly code: "two-statuses"; readonly title: string; readonly line: number }

export const describeFault = (fault: EntryFault): string => {
  const at = `FINDINGS.md:${fault.line}: ${fault.title}`

  switch (fault.code) {
    case "no-status":
      return `${at} — no **Status:**. An entry with no body is usually a heading a merge kept twice.`
    case "no-owner":
      return `${at} — no **Owned by:**. A finding nobody owns is a note, and notes do not go here.`
    case "no-filer":
      return `${at} — no **Filed by:**.`
    case "two-statuses":
      return `${at} — two **Status:** lines and no "Original status below". Which one is current?`
  }
}

/**
 * Inline code spans removed, for the same reason a fenced block is not an
 * entry: a finding that says *"one entry carries two `**Status:**` lines"* is
 * describing the field, not declaring it. Quoting the ledger's own vocabulary
 * is what these entries are for, and the first run of this check accused the
 * entry that reported the defect it was written to catch.
 */
const withoutQuotations = (body: string): string => body.replace(/`[^`\n]*`/g, "")

const has = (body: string, field: string): boolean => body.includes(`**${field}:**`)

/**
 * A closed finding keeps the status it had, under the one that closed it, and
 * says so — the convention twelve entries already follow. It is the reason this
 * cannot simply require one `**Status:**`: the second line is how a reader sees
 * what the finding claimed before somebody answered it, and losing that would
 * be a worse file.
 *
 * So two are allowed when the entry says which is which, and a third is not
 * allowed at all. What that rules out is exactly the merge artefact: two
 * statuses, both current-looking, neither marked.
 */
const STATUS_PATTERN = /\*\*Status:\*\*/g

/**
 * Matched against the body with its whitespace flattened, and over two nouns.
 *
 * Both concessions were paid for. The first draft looked for the exact string
 * and reported two entries that follow the convention perfectly — one had
 * wrapped it across a line break, the other says *"Original text below"*. A
 * check that fails on where a paragraph happened to wrap is a check people
 * learn to ignore, and the entries it accused were the well-formed ones.
 */
const KEEPS_THE_ORIGINAL = /original (status|text) below/i

export const faultsIn = (entry: Entry): readonly EntryFault[] => {
  const { title, line } = entry
  const body = withoutQuotations(entry.body)
  const faults: EntryFault[] = []

  if (!has(body, "Filed by")) faults.push({ code: "no-filer", title, line })
  if (!has(body, "Owned by")) faults.push({ code: "no-owner", title, line })

  const statuses = body.match(STATUS_PATTERN)?.length ?? 0
  const marked = KEEPS_THE_ORIGINAL.test(body.replace(/\s+/g, " "))

  if (statuses === 0) faults.push({ code: "no-status", title, line })
  else if (statuses > 2 || (statuses === 2 && !marked)) {
    faults.push({ code: "two-statuses", title, line })
  }

  return faults
}

export const faultsInLedger = (markdown: string): readonly EntryFault[] =>
  entriesIn(markdown).flatMap(faultsIn)
