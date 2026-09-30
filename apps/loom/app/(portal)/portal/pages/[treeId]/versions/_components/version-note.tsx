import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { VersionChange } from "@/app/(portal)/_lib/progression"

/**
 * What made this version, in sentences, under the picture of it.
 *
 * The same four facts `/portal/history` reads off a change — who asked, who let
 * it through, how sure the thing that wrote it was, and what it actually did —
 * arranged for a reader who is **looking at the result** rather than scanning a
 * list of them. That is the whole difference between this and `RevisionRow`, and
 * it is why this is a component of its own rather than that one reused: a row in
 * a list has to carry enough to be told apart from the row above it, including
 * what undoing it would put back. A caption under a picture has to say one thing
 * — *this is what changed between the last picture and this one* — and every
 * extra clause competes with the picture it is a caption for.
 *
 * Nothing is dropped to get there. What a row carries and this does not is on
 * the row, one tab away, and the strip at the top of the screen is the link.
 *
 * The record behind the disclosure is this screen's own and not a copy of the
 * row's: the operations themselves, and the runtime's name for the version. A
 * reader checking the sentences above against the change model needs the
 * operations, and this is the only place on this screen they exist.
 */
/**
 * Who asked, who let it through and how sure it was, as one sentence a reader
 * meets after the change itself. Exported so a test asserts the join rather than
 * either half of it — the mistake this shape exists to prevent is a dropped
 * clause, which every `toContain` on one of the three would pass over.
 */
export const provenanceReading = (change: VersionChange): string =>
  [change.view.who, change.view.allowed, change.view.sure]
    .filter((said): said is string => said !== undefined)
    .join(" ")

export const VersionNote = ({ change }: { readonly change: VersionChange }) => (
  <div className="flex flex-col gap-2">
    <ul className="flex flex-col gap-1 text-sm">
      {change.view.changes.map((line, at) => (
        <li key={at}>
          <PlainSentence line={line} />
        </li>
      ))}
    </ul>

    {/*
      * Joined rather than set side by side in the markup, because `allowed` is
      * absent whenever the record does not know who let a change through — and
      * three expressions in a row with one of them `undefined` renders as two
      * spaces where a sentence should be. `whoAllowed` is deliberately silent in
      * that case (a change nobody had to approve and one approved by an unnamed
      * host are indistinguishable), so the absence is a normal state and not an
      * edge one.
      */}
    <p className="text-ink-muted text-xs">
      <time dateTime={change.at}>{change.when}</time>
      {" · "}
      {provenanceReading(change)}
    </p>

    <TechnicalDetail summary="What the record says">
      <p className="font-mono">{change.onTheRecord}</p>
      <ul className="flex flex-col gap-1">
        {change.operations.map((operation, at) => (
          <li key={at} className="font-mono break-all">
            {JSON.stringify(operation)}
          </li>
        ))}
      </ul>
    </TechnicalDetail>
  </div>
)
