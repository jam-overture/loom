import Link from "next/link"

import { hrefWith, isMoved, type Lever } from "@/app/(portal)/_lib/levers"

/**
 * One dial: the question it answers, where it is, and every other place it
 * could be.
 *
 * ## Links rather than a control
 *
 * Each position is an address, so moving a dial is a navigation and the whole
 * screen re-renders from the record. That is not a workaround for the absence
 * of client code — it is what makes a gameplan **sendable**, which is the
 * property a governance surface needs: the argument for changing a setting has
 * to be something you can put in front of somebody else without asking them to
 * reproduce it.
 *
 * It also means the back button undoes a dial, the position survives a reload,
 * and nothing here needs JavaScript to work at all.
 *
 * ## The position you are on is not a link
 *
 * A link to the screen you are already looking at is a promise that something
 * will happen. It is rendered as text carrying `aria-current`, which is the
 * same answer for a reader using a screen reader and for one using their eyes.
 *
 * ## Where it stands now is marked, and never moves
 *
 * The deployment's own value keeps a mark however far the dial has been
 * dragged. A screen where the current setting becomes indistinguishable from
 * the four hypotheticals the moment you touch it is one where a person loses
 * the thing they came in with — and getting back is the single most likely
 * thing they will want to do next.
 */
export const LeverDial = ({
  lever,
  levers,
}: {
  readonly lever: Lever
  readonly levers: readonly Lever[]
}) => (
  <div className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-4">
    <div className="flex flex-col gap-1">
      <h3 className="text-sm tracking-tight">{lever.question}</h3>
      <p className="text-ink-muted text-xs">{lever.reading}</p>
    </div>

    <ul className="flex flex-wrap gap-2">
      {lever.choices.map((choice) => {
        const here = choice.value === lever.chosen
        const yours = choice.value === lever.now

        return (
          <li key={choice.value}>
            {here ? (
              <span
                aria-current="true"
                data-position="chosen"
                className="border-edge-strong bg-surface-raised inline-block rounded-sm border px-2 py-1 text-xs"
              >
                {choice.label}
                {yours && <span className="text-ink-muted"> · yours</span>}
              </span>
            ) : (
              <Link
                href={hrefWith(levers, lever.id, choice.value)}
                data-position={yours ? "yours" : "other"}
                className="border-edge-subtle text-ink-secondary inline-block rounded-sm border px-2 py-1 text-xs"
              >
                {choice.label}
                {yours && <span className="text-ink-muted"> · yours</span>}
              </Link>
            )}
          </li>
        )
      })}
    </ul>

    {isMoved(lever) && (
      <p className="text-ink-secondary text-xs">
        Moved. Nothing has changed on your site &mdash; this is a question, not a setting.
      </p>
    )}
  </div>
)
