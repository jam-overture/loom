import type { CataloguedPrimitive } from "@loom/runtime"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { catalogueLineFor, plainPieceName, settingsOf, spacesReading } from "@/app/(portal)/_lib/piece-view"

/**
 * One kind of piece, as somebody deciding what to ask for reads it.
 *
 * What this card used to be, in full: a monospace `loom.card`, a monospace
 * `slots: header, footer` beside it, the author's description, and a row of
 * monospace chips reading `variant?` — where the `?` was the only thing on the
 * screen saying whether a setting had to be given, and nothing said so.
 * `No props.` and `Props cannot be enumerated from this schema.` were the two
 * other states, printed at a reader who has not written a Zod schema.
 *
 * Every one of those strings is still here. The plain name leads, the type stays
 * beside it — it is the string this reader will meet on every other screen in
 * the portal, so replacing it would break the connection rather than simplify
 * it — and the registry's own vocabulary is one click down, under the line the
 * model is actually given.
 */
export const PieceCard = ({ primitive }: { readonly primitive: CataloguedPrimitive }) => {
  const settings = settingsOf(primitive)
  const spaces = spacesReading(primitive)

  return (
    <div className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-md tracking-tight">{plainPieceName(primitive.type)}</h2>
        <span className="text-ink-muted font-mono text-2xs">{primitive.type}</span>
      </div>

      <p className="text-ink-secondary text-sm">{primitive.description}</p>

      <p className="text-ink-muted text-xs">{settings.reading}</p>

      {settings.kind === "some" && (
        <ul className="flex flex-wrap gap-1">
          {settings.required.map((name) => (
            <li
              key={name}
              className="border-edge-subtle rounded-sm border px-1.5 py-0.5 font-mono text-2xs"
            >
              {name}
              <span className="text-ink-muted ml-1 font-sans">needed</span>
            </li>
          ))}
          {settings.optional.map((name) => (
            <li
              key={name}
              className="border-edge-subtle rounded-sm border border-dashed px-1.5 py-0.5 font-mono text-2xs"
            >
              {name}
              <span className="text-ink-muted ml-1 font-sans">optional</span>
            </li>
          ))}
        </ul>
      )}

      {spaces !== undefined && <p className="text-ink-muted text-xs">{spaces}</p>}

      {/*
       * The disclosure that makes the page's claim checkable rather than
       * reassuring. The heading above says the AI can only use what is on this
       * page; this is the line it is handed, produced by the runtime's own
       * formatter rather than by a second one here that would agree today and
       * drift tomorrow.
       */}
      <TechnicalDetail summary="The line the AI is given about this piece">
        <p className="text-ink-secondary">
          Every time you ask for a change, this line goes into the request, exactly as it
          reads here.
          {/*
           * Only where there is one to explain. The notation was described on
           * every card in the first render of this screen, including the one
           * whose line reads `props: none` and contains no `?` at all — a
           * sentence about a mark that is not there, which is how a screen
           * teaches a reader to distrust it.
           */}
          {settings.kind === "some" && settings.optional.length > 0 && (
            <>
              {" "}
              A trailing <span className="font-mono">?</span> marks a setting that can be left
              out.
            </>
          )}
        </p>
        <pre className="text-ink border-edge-subtle bg-surface-hover overflow-x-auto rounded-sm border p-2 font-mono whitespace-pre-wrap">
          {catalogueLineFor(primitive)}
        </pre>
        {primitive.props === undefined && (
          <p>
            This one&rsquo;s settings could not be listed: what it declares is not a plain
            object of fields, so their names cannot be read off it. The runtime says{" "}
            <span className="font-mono">props: not declared</span> rather than{" "}
            <span className="font-mono">props: none</span>, because &ldquo;I cannot tell
            you&rdquo; and &ldquo;there are none&rdquo; are different facts.
          </p>
        )}
      </TechnicalDetail>
    </div>
  )
}
