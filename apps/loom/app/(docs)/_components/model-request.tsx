import {
  docsBareRequest,
  docsModelRequest,
  type PromptBlock,
} from "@/app/(docs)/_lib/prompt/request"

/**
 * The request a model would be sent, printed on the page.
 *
 * A component rather than a fenced block in MDX for the reason the generated
 * API reference exists: a prompt pasted into prose is a copy, and a copy of the
 * catalogue would be wrong the first time somebody registers a primitive. This
 * is built from the same renderers `buildUserMessage` calls, at build time,
 * against the same registry the examples on this page render through.
 *
 * **Deliberately not a `CodeBlock`.** Every fenced block on this site carries a
 * copy button, and these blocks are elided — a reader who copied one would take
 * away a catalogue with fifty-five primitives missing and no sign that anything
 * had been left out. A printout is for reading; the snippets a reader is meant
 * to take are still fenced blocks in the prose.
 */

const COUNT = new Intl.NumberFormat("en-US")

const Block = ({ block }: { readonly block: PromptBlock }) => (
  <section className="border-edge overflow-hidden rounded-lg border">
    <header className="bg-surface-sunken border-edge flex items-baseline justify-between gap-4 border-b px-4 py-2.5">
      <div>
        <h4 className="text-ink text-sm font-semibold">{block.title}</h4>
        <p className="text-ink-muted mt-1 text-xs leading-relaxed">{block.summary}</p>
      </div>
      <span className="text-ink-faint font-mono text-xs whitespace-nowrap">
        {COUNT.format(block.characters)} chars
      </span>
    </header>

    <pre className="bg-code-surface text-code-ink overflow-x-auto p-4 font-mono text-xs leading-relaxed">
      {block.preview.join("\n")}
      {block.elided === undefined ? null : (
        <span className="text-ink-faint">{`\n… ${COUNT.format(block.elided.count)} more ${block.elided.noun}`}</span>
      )}
    </pre>
  </section>
)

export const ModelRequest = ({ id }: { readonly id: string }) => (
  <div className="not-prose my-8 space-y-4">
    {docsModelRequest(id).blocks.map((block) => (
      <Block key={block.id} block={block} />
    ))}
  </div>
)

/**
 * Where the request's size actually goes.
 *
 * The interesting number is not the total — it is that the two blocks the
 * reader would call "the question" are a twentieth of it, and everything else
 * is the vocabulary this deployment chose to register. `measurePrompt` exists
 * to make that a number rather than a feeling, and this is the number.
 */
export const PromptCost = ({ id }: { readonly id: string }) => {
  const { blocks, measurement, registered } = docsModelRequest(id)
  const bare = docsBareRequest(id)
  const share = (characters: number): string =>
    `${Math.round((characters / measurement.total) * 100)}%`

  return (
    <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-sunken text-ink">
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">Block</th>
            <th className="border-edge border-b px-3 py-2 text-right font-semibold">Characters</th>
            <th className="border-edge border-b px-3 py-2 text-right font-semibold">Share</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => (
            <tr key={block.id} className="border-edge border-b">
              <td className="text-ink px-3 py-2">{block.title}</td>
              <td className="text-ink-muted px-3 py-2 text-right font-mono text-xs">
                {COUNT.format(block.characters)}
              </td>
              <td className="text-ink-faint px-3 py-2 text-right font-mono text-xs">
                {share(block.characters)}
              </td>
            </tr>
          ))}

          <tr className="border-edge bg-surface-sunken border-b">
            <td className="text-ink px-3 py-2 font-semibold">
              One request, with {registered.primitives} primitives and {registered.themeIds}{" "}
              theme ids registered
            </td>
            <td className="text-ink px-3 py-2 text-right font-mono text-xs font-semibold">
              {COUNT.format(measurement.total)}
            </td>
            <td className="text-ink-faint px-3 py-2 text-right font-mono text-xs">100%</td>
          </tr>

          <tr>
            <td className="text-ink-muted px-3 py-2">
              The same request, with nothing registered
            </td>
            <td className="text-ink-muted px-3 py-2 text-right font-mono text-xs">
              {COUNT.format(bare.total)}
            </td>
            <td className="text-ink-faint px-3 py-2 text-right font-mono text-xs">
              {share(bare.total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
