import {
  ownAcceptedDiagnostics,
  ownAuditReading,
  ownCatalogueEntry,
  ownClosedChoices,
  ownDeclaredText,
  ownRefusals,
  type OwnRefusal,
} from "@/app/(docs)/_lib/own/proving"
import { OWN_PRIMITIVE_FILENAME, OWN_PRIMITIVE_TYPE } from "@/app/(docs)/_lib/own/registry"
import { readOwnPrimitiveSource } from "@/app/(docs)/_lib/own/source"

import { CodeBlock } from "./code-block"
import { LongCode } from "./long-code"

/**
 * The four blocks on *A primitive of your own* that nobody typed.
 *
 * The page's subject is a primitive a reader writes, and the four things worth
 * knowing about one — what it looks like, what a model is told about it, what it
 * refuses, and whether a person can edit it — are all claims that would be right
 * on the day they were typed. `_lib/own/proving.ts` produces each of them by
 * running the primitive, and this file only arranges what comes back.
 *
 * Every one is a server component. Nothing here reaches the browser but text.
 */

/**
 * The whole file, read off disk as the page builds, in the import names a reader
 * would write.
 *
 * The quickstart's arrangement, for the quickstart's reason: a file shown as a
 * fenced block is a second copy of it, and the copy is the one that goes stale.
 * `LongCode` changes the height of the box and never the block inside it, so the
 * copy button still reads the whole file and find-in-page still matches the part
 * below the fold.
 */
export const OwnPrimitiveFile = () => {
  const source = readOwnPrimitiveSource()

  return (
    <div className="my-6 [&_div.not-prose]:my-0 [&_div.not-prose]:rounded-none">
      <div className="border-edge bg-surface-sunken text-ink-faint flex items-center justify-between gap-3 rounded-t-lg border border-b-0 px-3 py-2 font-mono text-xs">
        <span className="text-ink">{OWN_PRIMITIVE_FILENAME}</span>
        <span className="tracking-wide uppercase">read from the repository as this page built</span>
      </div>

      <LongCode lines={source.split("\n").length} label={OWN_PRIMITIVE_FILENAME}>
        <CodeBlock>{source}</CodeBlock>
      </LongCode>
    </div>
  )
}

/**
 * The catalogue row an interpreter puts in front of a model, for this one
 * primitive.
 *
 * It is worth showing rather than describing because of what is *missing* from
 * it: there are no types in here and no bounds. A model is told the names, which
 * of them are required, and whatever the author wrote in `description` — which
 * is why that sentence carries so much more weight than it looks like it does.
 */
export const OwnPrimitiveCatalogue = () => {
  const entry = ownCatalogueEntry()
  const choices = ownClosedChoices()
  const text = ownDeclaredText()

  return (
    <div className="not-prose border-edge bg-surface my-6 rounded-lg border" data-own-catalogue>
      <div className="border-edge flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <p className="text-ink m-0 font-mono text-sm">{entry.type}</p>
        <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
          what a model is handed
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 py-3">
        <p className="text-ink-muted m-0 text-sm">{entry.description}</p>

        <div>
          <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">Props</p>
          <ul className="m-0 mt-1 flex list-none flex-wrap gap-2 pl-0">
            {(entry.props ?? []).map((prop) => (
              <li
                key={prop.name}
                className="border-edge text-ink m-0 rounded-md border px-2 py-1 font-mono text-xs"
                data-own-prop={prop.name}
              >
                {prop.name}
                <span className="text-ink-faint">{prop.required ? " · required" : " · optional"}</span>
              </li>
            ))}
          </ul>
        </div>

        {choices.map((choice) => (
          <div key={choice.name}>
            <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
              Every value <span className="font-mono normal-case">{choice.name}</span> may take
            </p>
            <p className="text-ink m-0 mt-1 font-mono text-xs" data-own-choice={choice.name}>
              {choice.options.map(String).join(" · ")}
            </p>
          </div>
        ))}

        <div>
          <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
            Words declared beside the component
          </p>
          <ul className="m-0 mt-1 flex list-none flex-col gap-1 pl-0">
            {text.map((pair) => (
              <li key={pair.key} className="text-ink m-0 font-mono text-xs" data-own-text={pair.key}>
                {pair.key} <span className="text-ink-faint">→</span> {pair.value}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

const Refusal = ({ refusal }: { readonly refusal: OwnRefusal }) => (
  <li className="border-edge bg-surface m-0 rounded-lg border p-0" data-own-refusal={refusal.asked}>
    <div className="border-edge flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
      <p className="text-ink m-0 font-mono text-sm">{refusal.asked}</p>
      <p className="text-ink-faint m-0 font-mono text-xs">{refusal.code}</p>
    </div>

    <div className="flex flex-col gap-3 px-4 py-3">
      <p className="text-ink-muted m-0 text-sm">{refusal.story}</p>

      <div className="bg-surface-sunken border-edge rounded-md border px-3 py-2">
        <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
          What the render reported
        </p>
        <p className="text-ink m-0 overflow-x-auto font-mono text-xs whitespace-pre-wrap">
          {refusal.reported}
        </p>
      </div>
    </div>
  </li>
)

/**
 * Each refusal, produced by a render that was refused.
 *
 * `proving.ts` throws if any of these stops reaching the fault it is filed
 * under, so the build stops rather than the page printing a confident sentence
 * about a schema that has since loosened.
 */
export const OwnPrimitiveRefusals = () => (
  <ul className="not-prose my-6 flex list-none flex-col gap-3 pl-0" data-own-refusals>
    {ownRefusals().map((refusal) => (
      <Refusal key={refusal.asked} refusal={refusal} />
    ))}
  </ul>
)

/**
 * The audit, run on the registry this page renders through.
 *
 * *Scaffolding a project* says what `auditRegistry` is for and why the
 * scaffolder writes the test that runs it. This is it run, on the primitive a
 * reader has just watched being written, which is the half a written page cannot
 * show.
 */
export const OwnPrimitiveAudit = () => {
  const reading = ownAuditReading()
  const accepted = ownAcceptedDiagnostics()

  const rows: readonly { readonly question: string; readonly answer: string; readonly good: boolean }[] = [
    {
      question: "Can a person select it in the portal?",
      answer: reading.decorated ? "yes — the decoration is on what it drew" : "no — it dropped loom.editable",
      good: reading.decorated,
    },
    {
      question: "Does it place the children it is handed?",
      answer: reading.rendersChildren ? "yes" : "no — the detail under each row would vanish",
      good: reading.rendersChildren,
    },
    {
      question: "Any region it declared and never placed?",
      answer: reading.unplacedSlots.length === 0 ? "none" : reading.unplacedSlots.join(", "),
      good: reading.unplacedSlots.length === 0,
    },
    {
      question: "Did it throw on props its own schema accepts?",
      answer: reading.threw.length === 0 ? "never, under every state probed" : reading.threw.join("; "),
      good: reading.threw.length === 0,
    },
    {
      question: "Does a sound tree report anything?",
      answer: accepted.length === 0 ? "nothing at all" : accepted.join("; "),
      good: accepted.length === 0,
    },
  ]

  return (
    <div className="not-prose border-edge bg-surface my-6 rounded-lg border" data-own-audit>
      <div className="border-edge flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <p className="text-ink m-0 text-base font-semibold">What the audit saw</p>
        <p className="text-ink-faint m-0 font-mono text-xs">
          {OWN_PRIMITIVE_TYPE} · {reading.configurations} configurations probed
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col pl-0">
        {rows.map((row) => (
          <li
            key={row.question}
            className="border-edge flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3 last:border-b-0"
            data-own-audit-row={row.good ? "clear" : "flagged"}
          >
            <p className="text-ink-muted m-0 text-sm">{row.question}</p>
            <p className="text-ink m-0 font-mono text-xs">{row.answer}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
