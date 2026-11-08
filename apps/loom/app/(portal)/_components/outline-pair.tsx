import {
  foldedOutlineOf,
  type Comparison,
  type Mark,
  type OutlineRow,
} from "@/app/(portal)/_lib/compare"

/** Deeper than this and the outline would be all indent at half a drawer's width. */
const DEEPEST_DRAWN = 5

/** Green on *After* for what arrived, red and dashed on *Before* for what went, as the board draws them. */
const MARKED: Readonly<Record<Mark, { readonly box: string; readonly word: string }>> = {
  added: { box: "bg-applied text-applied-ink border-applied-ink border-2", word: "added" },
  changed: { box: "bg-applied text-applied-ink border-applied-ink border-2", word: "changed" },
  moved: { box: "border-applied-ink border-2", word: "moved" },
  removed: {
    box: "bg-rejected text-rejected-ink border-rejected-ink border-2 border-dashed",
    word: "taken off",
  },
}

const MOVED_FROM = "border-rejected-ink border-2 border-dashed"

const indent = (depth: number) => ({ marginLeft: `${Math.min(depth, DEEPEST_DRAWN) * 0.5}rem` })

const Outline = ({
  label,
  rows,
  side,
}: {
  label: string
  rows: readonly OutlineRow[]
  side: "before" | "after"
}) => (
  <section aria-label={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
    <h4 className="text-ink-muted m-0 text-xs font-medium">{label}</h4>
    {rows.length === 0 ? (
      <p className="text-ink-muted m-0 text-xs">No parts on the page.</p>
    ) : (
      <ol className="border-edge-subtle m-0 flex list-none flex-col gap-1 rounded-md border p-2">
        {foldedOutlineOf(rows).map((line) => {
          if (line.kind === "folded") {
            return (
              <li
                key={line.key}
                style={indent(line.depth)}
                className="text-ink-muted px-1.5 text-[11px] italic"
              >
                {line.count === 1 ? "1 part unchanged" : `${line.count} parts unchanged`}
              </li>
            )
          }

          const { row } = line
          const box =
            row.mark === undefined
              ? "border-edge-subtle border"
              : row.mark === "moved" && side === "before"
                ? MOVED_FROM
                : MARKED[row.mark].box

          return (
            <li
              key={row.nodeId}
              style={indent(row.depth)}
              className={`flex min-w-0 items-baseline gap-1.5 rounded px-1.5 py-0.5 text-xs ${box}`}
              title={row.nodeId}
            >
              <span className="min-w-0 truncate">{row.name}</span>
              {row.mark === undefined ? null : (
                <span className="shrink-0 text-[11px] italic">{MARKED[row.mark].word}</span>
              )}
            </li>
          )
        })}
      </ol>
    )}
  </section>
)

/**
 * A page before a change and after it, side by side as two small outlines
 * (`_lib/compare.ts`), with the sentence saying what changed above them: what
 * arrived outlined green on *After*, what went, or moved from where it was,
 * red and dashed on *Before*. Each part's id is one point away, and the parts
 * away from any change fold into a line saying how many. *Compare* on a page's
 * history and the drawer for a change waiting on *For review* both draw it.
 */
export const OutlinePair = ({ comparison }: { readonly comparison: Comparison }) => (
  <>
    <p className="m-0 text-xs">{comparison.summary}</p>
    <div className="flex flex-col gap-3 sm:flex-row">
      <Outline label="Before" rows={comparison.before} side="before" />
      <Outline label="After" rows={comparison.after} side="after" />
    </div>
  </>
)
