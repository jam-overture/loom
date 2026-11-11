import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { connectionWords, type Keeping, type Pulling } from "@/app/(portal)/_lib/pulling"

/**
 * Whether the site takes its live pages (0358), and keeps them, in plain
 * words, with the request its server makes one click away. This deployment's own site never
 * pulls, so it is shown no request to make.
 */
export const PullingSection = ({
  pulling,
  keeping,
  command,
}: {
  readonly pulling: Pulling
  readonly keeping: Keeping
  readonly command: string
}) => {
  const { title, lines } = connectionWords(pulling, keeping)

  return (
    <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium tracking-tight">{title}</h2>
      {lines.map((line) => (
        <p key={line} className="text-ink-muted text-xs">
          {line}
        </p>
      ))}
      {pulling.kind !== "own-site" && (
        <TechnicalDetail summary="What your site's server asks for">
          <p>
            Your site&rsquo;s server takes its pages with the key above, on a short interval, and
            keeps them. It never sends anything about a reader, and when a pull fails it goes on
            showing the pages it last took, or the page as built.
          </p>
          <pre className="border-edge-subtle bg-surface-page m-0 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed">
            {command}
          </pre>
        </TechnicalDetail>
      )}
    </section>
  )
}
